from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Dict, Iterable, List, Sequence

import chromadb
from llama_index.core import Document, VectorStoreIndex
from llama_index.core.node_parser import SentenceSplitter
from llama_index.core.schema import BaseNode
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

        # Index aus bestehendem VectorStore aufbauen (wenn leer, wird er automatisch gefüllt)
        self._index = VectorStoreIndex.from_vector_store(
            self._vector_store,
            llm=self._llm,
        )

        # Chunking
        self._parser = SentenceSplitter(
            chunk_size=settings.chunk_size,
            chunk_overlap=settings.chunk_overlap,
        )

        # Pfad für Dokument-Metadaten (Hash, Quelle, etc.)
        self._metadata_path = settings.data_dir / "doc_metadata.json"
        self._metadata: Dict[str, Dict] = self._load_metadata()

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

    def upsert_documents(self, documents: Sequence[Document]) -> int:
        """
        Füge neue/geänderte Dokumente in den Index ein.

        Die Funktion erwartet, dass die übergebenen Dokumente bereits
        als "neu oder geändert" erkannt wurden (z. B. über content_hash).
        """

        if not documents:
            return 0

        # Indexiere Nodes inkrementell.
        nodes = self._build_nodes(documents)
        self._index.insert_nodes(nodes)

        # Metadaten aktualisieren.
        for doc in documents:
            doc_id = doc.doc_id
            content_hash = doc.metadata.get("content_hash")
            self._metadata[doc_id] = {
                "source": doc.metadata.get("source"),
                "path": doc.metadata.get("path"),
                "url": doc.metadata.get("url"),
                "content_hash": content_hash,
            }

        self._save_metadata()
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


@lru_cache(maxsize=1)
def get_index_manager() -> IndexManager:
    """
    Singleton-Instanz des IndexManagers (für API & Jobs).
    """

    return IndexManager()

