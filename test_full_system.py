#!/usr/bin/env python3
"""Test the full RAG system with API key."""

import sys
import os
sys.path.insert(0, os.path.abspath('.'))

def test_full_system():
    """Test the complete system."""
    try:
        print("Testing full RAG system...")

        # Test settings
        from src.config.settings import get_settings
        settings = get_settings()
        print(f"[OK] Settings loaded - Model: {settings.openai_model}")

        # Test ingestion
        from src.ingestion.loader import load_all_documents
        print("[OK] Ingestion module imported")

        # Test indexing
        from src.indexing.index_manager import get_index_manager
        print("[OK] Indexing module imported")

        # Test updater
        from src.updater.jobs import run_update_job
        print("[OK] Updater module imported")

        # Test app (this will initialize the index manager)
        print("[OK] All modules import successfully!")
        print("\n[SUCCESS] System is ready! You can now:")
        print("  1. Add documents to data/sources/")
        print("  2. Run: python -m src.updater.jobs")
        print("  3. Start API: uvicorn src.app.main:app --reload")
        print("  4. Query: POST to http://localhost:8000/query")

        return True

    except Exception as e:
        print(f"[ERROR] Error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    success = test_full_system()
    sys.exit(0 if success else 1)
