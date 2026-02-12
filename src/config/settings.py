from functools import lru_cache
from pathlib import Path
from typing import List, Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Zentraler App-Config.

    Werte kommen standardmäßig aus einer `.env`-Datei
    im Projektroot oder aus echten Umgebungsvariablen.
    """

    # OpenAI / LLM
    openai_api_key: str
    openai_model: str = "gpt-5-mini"

    # Embedding Model (text-embedding-3-large has better retrieval quality)
    embedding_model: str = "text-embedding-3-large"
    embedding_dimensions: int = 1536  # Can reduce for faster search (256, 512, 1024, 1536, 3072)

    # Pfade
    base_dir: Path = Path(__file__).resolve().parents[2]
    data_dir: Path = base_dir / "data"
    chroma_db_dir: Path = data_dir / "chroma"

    # Index / Collection
    index_name: str = "rag_index"

    # Ingestion
    local_data_dir: Path = data_dir / "sources"
    source_urls: List[str] = []

    # Chunking (smaller chunks = better precision, larger = more context)
    chunk_size: int = 512  # Reduced from 1024 for better retrieval precision
    chunk_overlap: int = 50  # Reduced proportionally

    # Frontend/CORS
    frontend_url: Optional[str] = None
    cors_allowed_origins: str = ""

    # Hybrid Search
    use_hybrid_search: bool = True
    bm25_weight: float = 0.5  # Weight for BM25 (0-1), vector gets (1 - bm25_weight)

    # Reranking
    use_reranker: bool = True
    reranker_model: str = "BAAI/bge-reranker-base"  # Multilingual, better for German

    # Query Transformation (adds ~3-5s latency but improves retrieval quality)
    use_query_transform: bool = True
    query_transform_strategy: str = "hyde"  # 'hyde', 'multi_query', or 'combined'

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def resolved_cors_origins(self) -> List[str]:
        origins: List[str] = [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
        ]

        if self.frontend_url:
            origins.append(self.frontend_url)

        if self.cors_allowed_origins:
            origins.extend(
                item.strip()
                for item in self.cors_allowed_origins.split(",")
                if item.strip()
            )

        # Normalize and deduplicate while preserving order.
        normalized: List[str] = []
        seen = set()
        for origin in origins:
            clean = origin.rstrip("/")
            if clean and clean not in seen:
                normalized.append(clean)
                seen.add(clean)
        return normalized


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """
    Singleton-artiger Zugriff auf Settings.
    """

    settings = Settings()
    # Stelle sicher, dass Datenverzeichnisse existieren.
    settings.data_dir.mkdir(parents=True, exist_ok=True)
    settings.chroma_db_dir.mkdir(parents=True, exist_ok=True)
    settings.local_data_dir.mkdir(parents=True, exist_ok=True)
    return settings

