import asyncio
from datetime import datetime

from src.ingestion import load_all_documents
from src.indexing import get_index_manager


async def run_update_job() -> None:
    """
    Einfache Update-Routine:

    - lädt alle konfigurierten Dokumentquellen
    - erkennt neue/aktualisierte Dokumente
    - fügt diese inkrementell in den Index ein
    """

    index_manager = get_index_manager()

    documents = await load_all_documents()
    changed_docs = index_manager.get_changed_documents(documents)

    if not changed_docs:
        print(f"[{datetime.utcnow().isoformat()}] Keine neuen/geänderten Dokumente gefunden.")
        return

    count = index_manager.upsert_documents(changed_docs)
    print(f"[{datetime.utcnow().isoformat()}] {count} Dokument(e) aktualisiert.")


if __name__ == "__main__":
    # Ermöglicht: python -m src.updater.jobs
    asyncio.run(run_update_job())

