from __future__ import annotations

import json
import os
import pickle
import time
from functools import lru_cache
from pathlib import Path
from typing import Dict, List, Sequence

import chromadb
from llama_index.core import Document, VectorStoreIndex
from llama_index.core.node_parser import SentenceSplitter
from llama_index.core.schema import BaseNode
from llama_index.embeddings.openai import OpenAIEmbedding
from llama_index.llms.openai import OpenAI
from llama_index.vector_stores.chroma import ChromaVectorStore

from src.config.settings import get_settings


def _atomic_replace(src: Path, dst: Path, attempts: int = 10, delay: float = 0.1) -> None:
    # Why: on Windows, os.replace fails with PermissionError if the target file
    # is briefly held by another process (Next.js reading doc_metadata.json,
    # antivirus, indexer service). Retry with backoff to ride out transient locks.
    last_error: OSError | None = None
    for i in range(attempts):
        try:
            os.replace(src, dst)
            return
        except PermissionError as e:
            last_error = e
            time.sleep(delay * (i + 1))
    assert last_error is not None
    raise last_error


class IndexManager:
    """
    Wraps LlamaIndex + Chroma vector store.

    - Uses a persistent Chroma client backed by the filesystem
    - Supports incremental indexing via targeted node insertion
    """

    def __init__(self) -> None:
        settings = get_settings()

        self._chroma_client = chromadb.PersistentClient(path=str(settings.chroma_db_dir))
        self._collection = self._chroma_client.get_or_create_collection(settings.index_name)
        self._vector_store = ChromaVectorStore(chroma_collection=self._collection)
        self._llm = OpenAI(api_key=settings.openai_api_key, model=settings.openai_model)
        self._embed_model = OpenAIEmbedding(
            api_key=settings.openai_api_key,
            model=settings.embedding_model,
            dimensions=settings.embedding_dimensions,
        )

        # Build index from existing vector store (auto-populated when empty)
        self._index = VectorStoreIndex.from_vector_store(
            self._vector_store,
            llm=self._llm,
            embed_model=self._embed_model,
        )

        self._parser = SentenceSplitter(
            chunk_size=settings.chunk_size,
            chunk_overlap=settings.chunk_overlap,
        )

        self._metadata_path = settings.data_dir / "doc_metadata.json"
        self._metadata: Dict[str, Dict] = self._load_metadata()

        # Pickle cache of all nodes, needed for BM25 keyword retrieval
        self._nodes_path = settings.data_dir / "nodes_cache.pkl"
        self._nodes_cache: List[BaseNode] = self._load_nodes_cache()

    # ------------------------------------------------------------------
    # Metadata management
    # ------------------------------------------------------------------
    def _load_metadata(self) -> Dict[str, Dict]:
        if not self._metadata_path.exists():
            return {}
        try:
            return json.loads(self._metadata_path.read_text(encoding="utf-8"))
        except Exception:
            return {}

    def _save_metadata(self) -> None:
        # Atomic write: write to .tmp then rename to avoid corrupted reads
        self._metadata_path.parent.mkdir(parents=True, exist_ok=True)
        tmp_path = self._metadata_path.with_suffix(self._metadata_path.suffix + ".tmp")
        tmp_path.write_text(
            json.dumps(self._metadata, indent=2, ensure_ascii=False),
            encoding="utf-8",
        )
        _atomic_replace(tmp_path, self._metadata_path)

    # ------------------------------------------------------------------
    # Node cache for BM25 retrieval
    # ------------------------------------------------------------------
    def _load_nodes_cache(self) -> List[BaseNode]:
        """Load cached nodes for BM25 retrieval."""
        if not self._nodes_path.exists():
            return []
        try:
            with open(self._nodes_path, "rb") as f:
                return pickle.load(f)
        except Exception:
            return []

    def _save_nodes_cache(self) -> None:
        """Save nodes cache for BM25 retrieval."""
        with open(self._nodes_path, "wb") as f:
            pickle.dump(self._nodes_cache, f)

    def get_all_nodes(self) -> List[BaseNode]:
        """
        Get all nodes for BM25 retrieval.
        Returns cached nodes if available.
        """
        return self._nodes_cache

    def rebuild_nodes_cache(self, documents: Sequence[Document]) -> int:
        """
        Rebuild the nodes cache from documents.
        Use this to enable hybrid search on an existing index.

        Returns the number of nodes cached.
        """
        self._nodes_cache = []
        for doc in documents:
            nodes = self._build_nodes([doc])
            self._nodes_cache.extend(nodes)
        self._save_nodes_cache()
        return len(self._nodes_cache)

    # ------------------------------------------------------------------
    # Index-APIs
    # ------------------------------------------------------------------
    @property
    def index(self) -> VectorStoreIndex:
        """Return the underlying VectorStoreIndex."""

        return self._index

    def _build_nodes(self, documents: Sequence[Document]) -> List[BaseNode]:
        """Split documents into semantic chunks (nodes)."""

        all_nodes: List[BaseNode] = []
        for doc in documents:
            nodes = self._parser.get_nodes_from_documents([doc])
            all_nodes.extend(nodes)
        return all_nodes

    def delete_document(self, doc_id: str) -> bool:
        """
        Delete all nodes belonging to a document from the index.

        Returns True on success, False if the document does not exist.
        """
        try:
            self._index.delete_ref_doc(doc_id, delete_from_docstore=True)
            self._nodes_cache = [
                node for node in self._nodes_cache
                if node.ref_doc_id != doc_id
            ]
            self._save_nodes_cache()

            if doc_id in self._metadata:
                del self._metadata[doc_id]
                self._save_metadata()

            return True
        except Exception:
            return False

    def upsert_documents(self, documents: Sequence[Document]) -> int:
        """
        Insert new or updated documents into the index.

        Deletes old versions of a document before inserting new chunks to
        prevent duplicates and stale data. Expects documents that have
        already been identified as new or changed (e.g. via content_hash).
        """

        if not documents:
            return 0

        for doc in documents:
            doc_id = doc.doc_id

            if doc_id in self._metadata:
                print(f"  🗑️  Removing old version of: {doc.metadata.get('name', doc_id)}")
                self.delete_document(doc_id)

            nodes = self._build_nodes([doc])
            self._index.insert_nodes(nodes)
            self._nodes_cache.extend(nodes)

            print(f"  ✅ Indexed {len(nodes)} chunk(s) for: {doc.metadata.get('name', doc_id)}")

            content_hash = doc.metadata.get("content_hash")
            self._metadata[doc_id] = {
                "source": doc.metadata.get("source"),
                "path": doc.metadata.get("path"),
                "url": doc.metadata.get("url"),
                "name": doc.metadata.get("name"),
                "content_hash": content_hash,
            }
            # Persist per document so UI can reflect indexing progress live.
            self._save_metadata()

        self._save_nodes_cache()
        return len(documents)

    def get_changed_documents(self, documents: Sequence[Document]) -> List[Document]:
        """Return only documents that are new or whose content has changed."""

        changed: List[Document] = []

        for doc in documents:
            doc_id = doc.doc_id
            new_hash = doc.metadata.get("content_hash")

            meta = self._metadata.get(doc_id)
            old_hash = meta.get("content_hash") if meta else None

            if old_hash != new_hash:
                changed.append(doc)

        return changed

    def delete_documents_by_path(self, file_path: str) -> int:
        """Delete all document parts whose metadata 'path' matches the given file path."""
        doc_ids = [
            doc_id for doc_id, meta in self._metadata.items()
            if meta.get("path") == file_path
        ]
        for doc_id in doc_ids:
            self.delete_document(doc_id)
        return len(doc_ids)

    def delete_documents_by_prefix(self, path_prefix: str) -> int:
        """Delete all documents whose metadata 'path' starts with the given prefix (folder deletion)."""
        doc_ids = [
            doc_id for doc_id, meta in self._metadata.items()
            if meta.get("path", "").startswith(path_prefix)
        ]
        for doc_id in doc_ids:
            self.delete_document(doc_id)
        return len(doc_ids)

    def delete_documents_by_url(self, url: str) -> int:
        """Delete all document parts whose metadata 'url' matches the given URL."""
        doc_ids = [
            doc_id for doc_id, meta in self._metadata.items()
            if meta.get("url") == url
        ]
        for doc_id in doc_ids:
            self.delete_document(doc_id)
        return len(doc_ids)

@lru_cache(maxsize=1)
def get_index_manager() -> IndexManager:
    """Singleton IndexManager instance shared by the API and background jobs."""

    return IndexManager()

