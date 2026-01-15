from __future__ import annotations

import json
import pickle
from functools import lru_cache
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Sequence

import chromadb
from llama_index.core import Document, VectorStoreIndex
from llama_index.core.node_parser import SentenceSplitter
from llama_index.core.schema import BaseNode, TextNode
from llama_index.embeddings.openai import OpenAIEmbedding
from llama_index.llms.openai import OpenAI
from llama_index.vector_stores.chroma import ChromaVectorStore

from src.config.settings import get_settings


class IndexManager:
    """
    Kapselt LlamaIndex + Chroma-VectorStore.

    - nutzt einen persistenten Chroma-Client
    - unterstützt inkrementelles Indexing durch gezieltes Einfügen von Nodes
    """

    def __init__(self) -> None:
        settings = get_settings()

        # Chroma persistent im Dateisystem
        self._chroma_client = chromadb.PersistentClient(path=str(settings.chroma_db_dir))
        self._collection = self._chroma_client.get_or_create_collection(settings.index_name)
        self._vector_store = ChromaVectorStore(chroma_collection=self._collection)

        # LLM für LlamaIndex
        self._llm = OpenAI(api_key=settings.openai_api_key, model=settings.openai_model)

        # Embedding-Modell für LlamaIndex (configurable model with dimensions)
        self._embed_model = OpenAIEmbedding(
            api_key=settings.openai_api_key,
            model=settings.embedding_model,
            dimensions=settings.embedding_dimensions,
        )

        # Index aus bestehendem VectorStore aufbauen (wenn leer, wird er automatisch gefüllt)
        self._index = VectorStoreIndex.from_vector_store(
            self._vector_store,
            llm=self._llm,
            embed_model=self._embed_model,
        )

        # Chunking
        self._parser = SentenceSplitter(
            chunk_size=settings.chunk_size,
            chunk_overlap=settings.chunk_overlap,
        )

        # Pfad für Dokument-Metadaten (Hash, Quelle, etc.)
        self._metadata_path = settings.data_dir / "doc_metadata.json"
        self._metadata: Dict[str, Dict] = self._load_metadata()

        # Pfad für Node-Speicherung (für BM25 Retrieval)
        self._nodes_path = settings.data_dir / "nodes_cache.pkl"
        self._nodes_cache: List[BaseNode] = self._load_nodes_cache()

    # ------------------------------------------------------------------
    # Metadaten-Verwaltung
    # ------------------------------------------------------------------
    def _load_metadata(self) -> Dict[str, Dict]:
        if not self._metadata_path.exists():
            return {}
        try:
            return json.loads(self._metadata_path.read_text(encoding="utf-8"))
        except Exception:
            return {}

    def _save_metadata(self) -> None:
        self._metadata_path.write_text(
            json.dumps(self._metadata, indent=2, ensure_ascii=False),
            encoding="utf-8",
        )

    # ------------------------------------------------------------------
    # Node-Cache für BM25 Retrieval
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
        """
        Zugriff auf den zugrundeliegenden VectorStoreIndex.
        """

        return self._index

    def _build_nodes(self, documents: Sequence[Document]) -> List[BaseNode]:
        """
        Erzeuge semantische Chunks (Nodes) aus Dokumenten.
        """

        all_nodes: List[BaseNode] = []
        for doc in documents:
            nodes = self._parser.get_nodes_from_documents([doc])
            all_nodes.extend(nodes)
        return all_nodes

    def delete_document(self, doc_id: str) -> bool:
        """
        Lösche alle Nodes eines Dokuments aus dem Index.

        Returns True wenn erfolgreich gelöscht, False wenn Dokument nicht existiert.
        """
        try:
            # Delete all nodes/chunks associated with this document ID
            self._index.delete_ref_doc(doc_id, delete_from_docstore=True)

            # Remove nodes from BM25 cache
            self._nodes_cache = [
                node for node in self._nodes_cache
                if node.ref_doc_id != doc_id
            ]
            self._save_nodes_cache()

            # Remove from metadata
            if doc_id in self._metadata:
                del self._metadata[doc_id]
                self._save_metadata()

            return True
        except Exception as e:
            # Document might not exist in index yet (first time indexing)
            return False

    def upsert_documents(self, documents: Sequence[Document]) -> int:
        """
        Füge neue/geänderte Dokumente in den Index ein.
        
        WICHTIG: Löscht alte Versionen eines Dokuments, bevor neue Chunks eingefügt werden.
        Dies verhindert doppelte/veraltete Daten im Index.

        Die Funktion erwartet, dass die übergebenen Dokumente bereits
        als "neu oder geändert" erkannt wurden (z. B. über content_hash).
        """

        if not documents:
            return 0

        # Für jedes Dokument: Alte Nodes löschen, dann neue einfügen
        for doc in documents:
            doc_id = doc.doc_id

            # Lösche alte Version des Dokuments (falls vorhanden)
            if doc_id in self._metadata:
                print(f"  🗑️  Removing old version of: {doc.metadata.get('name', doc_id)}")
                self.delete_document(doc_id)

            # Erstelle neue Chunks/Nodes
            nodes = self._build_nodes([doc])

            # Füge neue Nodes ein
            self._index.insert_nodes(nodes)

            # Add to nodes cache for BM25
            self._nodes_cache.extend(nodes)

            print(f"  ✅ Indexed {len(nodes)} chunk(s) for: {doc.metadata.get('name', doc_id)}")

            # Metadaten aktualisieren
            content_hash = doc.metadata.get("content_hash")
            self._metadata[doc_id] = {
                "source": doc.metadata.get("source"),
                "path": doc.metadata.get("path"),
                "url": doc.metadata.get("url"),
                "name": doc.metadata.get("name"),
                "content_hash": content_hash,
            }

        self._save_metadata()
        self._save_nodes_cache()
        return len(documents)

    def get_changed_documents(self, documents: Sequence[Document]) -> List[Document]:
        """
        Filtert alle Dokumente heraus, die neu oder inhaltlich geändert sind.
        """

        changed: List[Document] = []

        for doc in documents:
            doc_id = doc.doc_id
            new_hash = doc.metadata.get("content_hash")

            meta = self._metadata.get(doc_id)
            old_hash = meta.get("content_hash") if meta else None

            if old_hash != new_hash:
                changed.append(doc)

        return changed

    def get_all_document_ids(self) -> List[str]:
        """
        Gibt alle doc_ids zurück, die aktuell im Index sind.
        """
        return list(self._metadata.keys())

    def get_document_metadata(self, doc_id: str) -> Dict | None:
        """
        Gibt Metadaten für ein bestimmtes Dokument zurück.
        """
        return self._metadata.get(doc_id)


@lru_cache(maxsize=1)
def get_index_manager() -> IndexManager:
    """
    Singleton-Instanz des IndexManagers (für API & Jobs).
    """

    return IndexManager()

