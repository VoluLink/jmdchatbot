"""
Rebuild nodes cache for hybrid search (BM25).

Run this script if you have an existing index but the nodes cache is empty.
This is required to enable hybrid search on existing data.

Usage:
    python -m src.updater.rebuild_nodes_cache
"""

import asyncio

from src.config.settings import get_settings
from src.indexing import get_index_manager
from src.ingestion.advanced_loader import load_all_documents_advanced


async def main():
    print("=" * 60)
    print("Rebuilding nodes cache for hybrid search (BM25)")
    print("=" * 60)

    settings = get_settings()
    index_manager = get_index_manager()

    # Check current cache status
    current_nodes = len(index_manager.get_all_nodes())
    print(f"\nCurrent cached nodes: {current_nodes}")

    # Load all documents using advanced loader (handles PDFs, DOCX, etc.)
    print("\nLoading documents from sources...")
    documents = await load_all_documents_advanced()
    print(f"Found {len(documents)} documents")

    if not documents:
        print("\nNo documents found. Nothing to cache.")
        return

    # Rebuild cache
    print("\nRebuilding nodes cache...")
    node_count = index_manager.rebuild_nodes_cache(documents)

    print(f"\nDone! Cached {node_count} nodes for BM25 retrieval.")
    print(f"Hybrid search is now {'enabled' if settings.use_hybrid_search else 'disabled (set USE_HYBRID_SEARCH=true in .env)'}")


if __name__ == "__main__":
    asyncio.run(main())
