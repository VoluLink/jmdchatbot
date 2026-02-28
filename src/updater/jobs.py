import asyncio
from datetime import datetime

from src.ingestion import load_all_documents
from src.indexing import get_index_manager


async def run_update_job() -> None:
    """
    Simple incremental update routine:

    - Loads all configured document sources
    - Detects new or changed documents
    - Upserts them into the index
    """

    index_manager = get_index_manager()

    documents = await load_all_documents()
    changed_docs = index_manager.get_changed_documents(documents)

    if not changed_docs:
        print(f"[{datetime.utcnow().isoformat()}] No new or changed documents found.")
        return

    count = index_manager.upsert_documents(changed_docs)
    print(f"[{datetime.utcnow().isoformat()}] {count} document(s) updated.")


if __name__ == "__main__":
    asyncio.run(run_update_job())

