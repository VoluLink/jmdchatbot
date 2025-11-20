#!/usr/bin/env python3
"""Test script to verify all modules can be imported."""

import sys
import os
sys.path.insert(0, os.path.abspath('.'))

def test_imports():
    """Test all module imports."""
    try:
        import src.config.settings
        print('[OK] Settings import successful')

        import src.ingestion.loader
        print('[OK] Ingestion loader import successful')

        import src.indexing.index_manager
        print('[OK] Indexing manager import successful')

        import src.updater.jobs
        print('[OK] Updater jobs import successful')

        import src.app.main
        print('[OK] FastAPI app import successful')

        print('\n[SUCCESS] All imports successful! The project is ready to run.')
        return True

    except Exception as e:
        print(f'[ERROR] Import failed: {e}')
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    success = test_imports()
    sys.exit(0 if success else 1)
