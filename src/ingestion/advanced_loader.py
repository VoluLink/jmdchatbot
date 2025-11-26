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
from llama_index.core.node_parser import (
    SentenceSplitter,
    SemanticSplitterNodeParser,
)
from llama_index.core.schema import BaseNode

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
        # Use LlamaIndex's SimpleDirectoryReader for automatic parsing
        reader = SimpleDirectoryReader(
            input_dir=str(root),
            recursive=recursive,
            required_exts=required_exts,
            filename_as_id=True,  # Use filename as doc_id
            errors="ignore",  # Skip files that can't be read
        )
        
        documents = reader.load_data()
        
        # Add custom metadata and content hash
        for doc in documents:
            # Get the file path from metadata
            file_path = doc.metadata.get("file_path", "unknown")
            
            # Calculate content hash for change detection
            content_hash = _hash_content(doc.text)
            
            # Enhance metadata
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
    
    # Load local documents
    print("📁 Loading local documents...")
    local_docs = load_local_documents_advanced(settings.local_data_dir)
    print(f"   Found {len(local_docs)} local documents")
    print()
    
    # Load web documents
    print("🌐 Loading web documents...")
    web_docs = await load_web_documents_advanced(settings.source_urls)
    print(f"   Found {len(web_docs)} web documents")
    print()
    
    total_docs = [*local_docs, *web_docs]
    print(f"📊 Total: {len(total_docs)} documents loaded")
    print("=" * 60)
    print()
    
    return total_docs


def create_node_parser(
    parser_type: str = "sentence",
    chunk_size: Optional[int] = None,
    chunk_overlap: Optional[int] = None,
) -> SentenceSplitter | SemanticSplitterNodeParser:
    """
    Create a node parser for chunking documents.
    
    LlamaIndex provides several parsing strategies:
    - 'sentence': Split by sentences (fast, good for most cases)
    - 'semantic': Split by semantic similarity (slower, better quality)
    
    Args:
        parser_type: Type of parser ('sentence' or 'semantic')
        chunk_size: Size of chunks in tokens
        chunk_overlap: Overlap between chunks in tokens
    
    Returns:
        Configured node parser
    """
    settings = get_settings()
    chunk_size = chunk_size or settings.chunk_size
    chunk_overlap = chunk_overlap or settings.chunk_overlap
    
    if parser_type == "semantic":
        print("🧠 Using Semantic Splitter (AI-powered chunking)")
        # Semantic splitter uses embeddings to find natural break points
        return SemanticSplitterNodeParser(
            buffer_size=1,
            breakpoint_percentile_threshold=95,
        )
    else:
        print(f"📝 Using Sentence Splitter (chunk_size={chunk_size}, overlap={chunk_overlap})")
        # Sentence splitter is faster and works well for most cases
        return SentenceSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
        )


def parse_documents_to_nodes(
    documents: List[Document],
    parser_type: str = "sentence",
) -> List[BaseNode]:
    """
    Parse documents into nodes (chunks) using LlamaIndex parsers.
    
    Args:
        documents: List of documents to parse
        parser_type: Type of parser to use
    
    Returns:
        List of nodes (document chunks)
    """
    if not documents:
        return []
    
    parser = create_node_parser(parser_type=parser_type)
    nodes = parser.get_nodes_from_documents(documents)
    
    print(f"✂️  Split {len(documents)} documents into {len(nodes)} chunks")
    
    return nodes


# Convenience function for specific file types
def load_pdfs_only(root_dir: Optional[Path] = None) -> List[Document]:
    """Load only PDF files."""
    return load_local_documents_advanced(root_dir, required_exts=[".pdf"])


def load_office_docs_only(root_dir: Optional[Path] = None) -> List[Document]:
    """Load only Microsoft Office documents."""
    return load_local_documents_advanced(
        root_dir,
        required_exts=[".docx", ".pptx", ".xlsx"]
    )


def load_text_docs_only(root_dir: Optional[Path] = None) -> List[Document]:
    """Load only text-based documents."""
    return load_local_documents_advanced(
        root_dir,
        required_exts=[".txt", ".md", ".markdown"]
    )

