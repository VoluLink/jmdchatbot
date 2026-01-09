"""
Apply pending URL source updates to the index.

Run this manually after reviewing pending changes:
    python -m src.updater.apply_url_updates [--source-id ID] [--all]
"""

import asyncio
import json
import sys
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List

from llama_index.core import Document

from src.indexing import get_index_manager


URL_SOURCES_PATH = Path("data/url_sources.json")


def load_url_sources() -> List[Dict[str, Any]]:
    """Load URL sources from JSON file."""
    if not URL_SOURCES_PATH.exists():
        return []
    try:
        with open(URL_SOURCES_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"❌ Error loading URL sources: {e}")
        return []


def save_url_sources(sources: List[Dict[str, Any]]) -> None:
    """Save URL sources to JSON file."""
    try:
        with open(URL_SOURCES_PATH, "w", encoding="utf-8") as f:
            json.dump(sources, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f"❌ Error saving URL sources: {e}")


def apply_update(source: Dict[str, Any], index_manager: Any) -> bool:
    """
    Apply a pending update for a single URL source.
    
    Returns True if successful, False otherwise.
    """
    if not source.get("pendingUpdate"):
        print(f"⚠️  No pending update for: {source['name']}")
        return False
    
    name = source["name"]
    url = source["url"]
    
    print(f"📥 Applying update: {name}")
    
    try:
        content = source.get("pendingContent")
        content_hash = source.get("pendingHash")
        
        if not content or not content_hash:
            print(f"❌ Missing pending content for: {name}")
            return False
        
        # Create Document
        doc = Document(
            text=content,
            doc_id=url,
            metadata={
                "source": "url",
                "url": url,
                "name": name,
                "content_hash": content_hash,
                "indexed_at": datetime.now().isoformat(),
            },
        )
        
        # Update index
        index_manager.upsert_documents([doc])
        
        # Clear pending status
        source["pendingUpdate"] = False
        source["pendingContent"] = None
        source["pendingHash"] = None
        source["lastIndexed"] = datetime.now().isoformat()
        
        print(f"✅ Updated: {name}")
        return True
        
    except Exception as e:
        print(f"❌ Error applying update for {name}: {e}")
        return False


async def main() -> None:
    """Main entry point."""
    print()
    print("=" * 60)
    print("📝 Apply URL Source Updates")
    print(f"⏰ Time: {datetime.now().isoformat()}")
    print("=" * 60)
    print()
    
    sources = load_url_sources()
    
    if not sources:
        print("ℹ️  No URL sources configured")
        print()
        return
    
    # Parse command line args
    source_id = None
    apply_all = False
    
    if "--all" in sys.argv:
        apply_all = True
    elif "--source-id" in sys.argv:
        try:
            idx = sys.argv.index("--source-id")
            source_id = sys.argv[idx + 1]
        except (IndexError, ValueError):
            print("❌ Invalid --source-id argument")
            print()
            print("Usage:")
            print("  python -m src.updater.apply_url_updates --all")
            print("  python -m src.updater.apply_url_updates --source-id ID")
            return
    
    # Filter sources with pending updates
    pending_sources = [s for s in sources if s.get("pendingUpdate")]
    
    if not pending_sources:
        print("✅ No pending updates")
        print()
        return
    
    print(f"Found {len(pending_sources)} source(s) with pending updates:")
    for s in pending_sources:
        print(f"  • {s['name']} (ID: {s['id']})")
    print()
    
    # Determine which sources to update
    if source_id:
        to_update = [s for s in pending_sources if s["id"] == source_id]
        if not to_update:
            print(f"❌ Source ID not found or no pending update: {source_id}")
            print()
            return
    elif apply_all:
        to_update = pending_sources
    else:
        print("❌ Must specify --all or --source-id")
        print()
        print("Usage:")
        print("  python -m src.updater.apply_url_updates --all")
        print("  python -m src.updater.apply_url_updates --source-id ID")
        return
    
    # Initialize index manager
    index_manager = get_index_manager()
    
    # Apply updates
    success_count = 0
    for source in to_update:
        if apply_update(source, index_manager):
            success_count += 1
    
    # Save updated sources
    save_url_sources(sources)
    
    print()
    print("=" * 60)
    print(f"✅ Applied {success_count}/{len(to_update)} update(s)")
    print("=" * 60)
    print()


if __name__ == "__main__":
    asyncio.run(main())

