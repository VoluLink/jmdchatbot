"""
Advanced Document Loader using LlamaIndex's built-in parsers.

This module leverages LlamaIndex's powerful parsing pipeline to handle:
- PDF files (with text extraction)
- Word documents (.docx)
- PowerPoint (.pptx)
- HTML files
- Markdown files
- Plain text files
- And more...
"""

from __future__ import annotations

import hashlib
from pathlib import Path
from typing import List, Optional

import httpx
from llama_index.core import Document, SimpleDirectoryReader

from src.config.settings import get_settings


def _hash_content(content: str) -> str:
    """
    Generate a stable hash from document content.
    
    Used for incremental indexing to detect document changes.
    """
    return hashlib.sha256(content.encode("utf-8")).hexdigest()


def load_local_documents_advanced(
    root_dir: Optional[Path] = None,
    recursive: bool = True,
    required_exts: Optional[List[str]] = None,
) -> List[Document]:
    """
    Load documents using LlamaIndex's SimpleDirectoryReader.
    
    This automatically handles multiple file formats:
    - .txt, .md (plain text)
    - .pdf (PDF extraction)
    - .docx (Word documents)
    - .pptx (PowerPoint)
    - .html, .htm (HTML parsing)
    - .json, .csv (structured data)
    - And more with appropriate readers
    
    Args:
        root_dir: Directory to load from (defaults to settings.local_data_dir)
        recursive: Whether to search subdirectories
        required_exts: List of file extensions to include (e.g., [".pdf", ".txt"])
                      If None, loads all supported formats
    
    Returns:
        List of LlamaIndex Document objects with metadata
    """
    settings = get_settings()
    root = root_dir or settings.local_data_dir
    
    if not root.exists():
        print(f"⚠️  Directory {root} does not exist. Creating it...")
        root.mkdir(parents=True, exist_ok=True)
        return []
    
    try:
        reader = SimpleDirectoryReader(
            input_dir=str(root),
            recursive=recursive,
            required_exts=required_exts,
            filename_as_id=True,
            errors="ignore",
        )

        documents = reader.load_data()

        # Enrich each document with a content hash for incremental indexing
        for doc in documents:
            file_path = doc.metadata.get("file_path", "unknown")
            content_hash = _hash_content(doc.text)
            doc.metadata.update({
                "source": "local",
                "path": file_path,
                "content_hash": content_hash,
                "file_name": doc.metadata.get("file_name", Path(file_path).name),
                "file_type": doc.metadata.get("file_type", Path(file_path).suffix),
            })
        
        print(f"✅ Loaded {len(documents)} documents from {root}")
        return documents
        
    except Exception as e:
        print(f"❌ Error loading documents from {root}: {e}")
        return []


async def load_web_documents_advanced(urls: List[str]) -> List[Document]:
    """
    Load documents from URLs with better error handling.
    
    Args:
        urls: List of URLs to fetch
    
    Returns:
        List of Document objects
    """
    documents: List[Document] = []
    
    if not urls:
        return documents
    
    async with httpx.AsyncClient(follow_redirects=True) as client:
        for url in urls:
            try:
                print(f"📥 Fetching: {url}")
                resp = await client.get(url, timeout=30)
                resp.raise_for_status()
                text = resp.text
                
                if not text.strip():
                    print(f"⚠️  Empty content from {url}")
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
                            "content_type": resp.headers.get("content-type", "unknown"),
                        },
                    )
                )
                print(f"✅ Loaded: {url}")
                
            except httpx.HTTPError as e:
                print(f"❌ HTTP error fetching {url}: {e}")
            except Exception as e:
                print(f"❌ Error fetching {url}: {e}")
    
    return documents


async def load_all_documents_advanced() -> List[Document]:
    """
    Load all documents from all sources using advanced parsers.
    
    Returns:
        Combined list of documents from local and web sources
    """
    settings = get_settings()
    
    print("=" * 60)
    print("📚 Loading Documents with Advanced Parsers")
    print("=" * 60)
    print()
    
    print("📁 Loading local documents...")
    local_docs = load_local_documents_advanced(settings.local_data_dir)
    print(f"   Found {len(local_docs)} local documents")
    print()

    print("🌐 Loading web documents...")
    web_docs = await load_web_documents_advanced(settings.source_urls)
    print(f"   Found {len(web_docs)} web documents")
    print()
    
    total_docs = [*local_docs, *web_docs]
    print(f"📊 Total: {len(total_docs)} documents loaded")
    print("=" * 60)
    print()
    
    return total_docs


def load_pdfs_only(root_dir: Optional[Path] = None) -> List[Document]:
    """Load only PDF files."""
    return load_local_documents_advanced(root_dir, required_exts=[".pdf"])


def load_office_docs_only(root_dir: Optional[Path] = None) -> List[Document]:
    """Load only Microsoft Office documents."""
    return load_local_documents_advanced(
        root_dir,
        required_exts=[".docx", ".pptx", ".xlsx"]
    )

