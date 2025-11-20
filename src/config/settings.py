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
    openai_model: str = "gpt-4o-mini"

    # Pfade
    base_dir: Path = Path(__file__).resolve().parents[2]
    data_dir: Path = base_dir / "data"
    chroma_db_dir: Path = data_dir / "chroma"

    # Index / Collection
    index_name: str = "rag_index"

    # Ingestion
    local_data_dir: Path = data_dir / "sources"
    source_urls: List[str] = []

    # Chunking
    chunk_size: int = 1024
    chunk_overlap: int = 100

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

