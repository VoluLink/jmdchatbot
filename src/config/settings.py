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

    # Hybrid Search
    use_hybrid_search: bool = True
    bm25_weight: float = 0.5  # Weight for BM25 (0-1), vector gets (1 - bm25_weight)

    # Reranking
    use_reranker: bool = True
    reranker_model: str = "BAAI/bge-reranker-base"  # Multilingual, better for German

    # Query Transformation (adds ~3-5s latency but improves retrieval quality)
    use_query_transform: bool = True
    query_transform_strategy: str = "hyde"  # 'hyde', 'multi_query', or 'combined'

    # Email / SMTP Configuration
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    smtp_from_email: str = ""
    smtp_from_name: str = "RAG Assistant"

    # Password Reset
    password_reset_expiry_minutes: int = 60
    frontend_url: str = "http://localhost:3000"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


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

