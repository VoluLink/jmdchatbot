from __future__ import annotations

import hashlib
from pathlib import Path
from typing import List, Sequence

import httpx
from llama_index.core import Document

from src.config.settings import get_settings


def _read_text_file(path: Path) -> str:
    """Read a text file, ignoring encoding errors."""

    return path.read_text(encoding="utf-8", errors="ignore")


def _hash_content(content: str) -> str:
    """
    Generate a stable SHA-256 hash from document content.

    Used for incremental indexing to detect changed documents.
    """

    return hashlib.sha256(content.encode("utf-8")).hexdigest()


def load_local_documents(root_dir: Path | None = None) -> List[Document]:
    """Load all text documents (.txt, .md) from a local directory."""

    settings = get_settings()
    root = root_dir or settings.local_data_dir
    documents: List[Document] = []

    if not root.exists():
        return documents

    for path in root.rglob("*"):
        if not path.is_file():
            continue
        if path.suffix.lower() not in {".txt", ".md"}:
            continue

        text = _read_text_file(path)
        if not text.strip():
            continue

        doc_id = str(path.relative_to(root))
        content_hash = _hash_content(text)

        documents.append(
            Document(
                text=text,
                doc_id=doc_id,
                metadata={
                    "source": "local",
                    "path": str(path),
                    "content_hash": content_hash,
                },
            )
        )

    return documents


async def _fetch_url(client: httpx.AsyncClient, url: str) -> str:
    """Fetch the text content of a URL."""

    resp = await client.get(url, timeout=30)
    resp.raise_for_status()
    return resp.text


async def load_web_documents(urls: Sequence[str]) -> List[Document]:
    """Fetch and wrap documents from a list of URLs."""

    documents: List[Document] = []
    if not urls:
        return documents

    async with httpx.AsyncClient(follow_redirects=True) as client:
        for url in urls:
            try:
                text = await _fetch_url(client, url)
            except Exception:
                # Skip unreachable URLs so the rest of the batch still loads
                continue

            if not text.strip():
                continue

            content_hash = _hash_content(text)

            documents.append(
                Document(
                    text=text,
                    doc_id=url,
                    metadata={
                        "source": "url",
                        "url": url,
                        "content_hash": content_hash,
                    },
                )
            )

    return documents


async def load_all_documents() -> List[Document]:
    """Aggregate all document sources (local files + URLs)."""

    settings = get_settings()
    local_docs = load_local_documents(settings.local_data_dir)
    web_docs = await load_web_documents(settings.source_urls)
    return [*local_docs, *web_docs]

