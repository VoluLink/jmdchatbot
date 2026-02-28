"""
Background job to refresh URL sources based on their fetch intervals.

Run this periodically (e.g., every 5 minutes via cron/scheduler) to:
- Check which URLs need refreshing based on their fetchInterval
- Fetch updated content
- Update the index if content changed
"""

import asyncio
import json
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List

import httpx
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


def should_fetch(source: Dict[str, Any]) -> bool:
    """Check if a URL source should be fetched based on its interval (in days)."""
    if not source.get("enabled", True):
        return False

    last_fetched_str = source.get("lastFetched")
    if not last_fetched_str:
        # Never fetched, should fetch now
        return True

    try:
        last_fetched = datetime.fromisoformat(last_fetched_str.replace("Z", "+00:00"))
        interval_days = source.get("fetchIntervalDays", 1)
        next_fetch = last_fetched + timedelta(days=interval_days)
        return datetime.now() >= next_fetch
    except Exception as e:
        print(f"⚠️  Error parsing lastFetched for {source.get('name')}: {e}")
        return True  # Fetch if we can't parse the date


async def fetch_url_content(url: str, timeout: int = 30) -> str:
    """Fetch content from a URL."""
    async with httpx.AsyncClient(follow_redirects=True) as client:
        resp = await client.get(url, timeout=timeout)
        resp.raise_for_status()
        return resp.text


def _hash_content(content: str) -> str:
    """Generate hash for content comparison."""
    import hashlib
    return hashlib.sha256(content.encode("utf-8")).hexdigest()


async def refresh_url_source(source: Dict[str, Any], index_manager: Any) -> bool:
    """
    Refresh a single URL source - detect changes only, don't auto-index.
    
    Returns True if content changed, False otherwise.
    """
    url = source["url"]
    name = source["name"]
    
    print(f"📥 Fetching: {name} ({url})")
    
    try:
        content = await fetch_url_content(url)
        
        if not content.strip():
            source["lastError"] = "Empty content"
            source["lastFetched"] = datetime.now().isoformat()
            source["pendingUpdate"] = False
            return False
        
        content_hash = _hash_content(content)
        
        # Create Document
        doc = Document(
            text=content,
            doc_id=url,  # Use URL as doc_id
            metadata={
                "source": "url",
                "url": url,
                "name": name,
                "content_hash": content_hash,
                "fetched_at": datetime.now().isoformat(),
            },
        )
        
        # Check if content changed
        changed_docs = index_manager.get_changed_documents([doc])
        
        if changed_docs:
            # Content changed - flag for manual update, don't auto-index
            source["lastFetched"] = datetime.now().isoformat()
            source["lastError"] = None
            source["pendingUpdate"] = True
            source["pendingContent"] = content  # Store for later indexing
            source["pendingHash"] = content_hash
            print(f"⚠️  Changes detected: {name} (pending manual update)")
            return True
        else:
            # Content unchanged
            source["lastFetched"] = datetime.now().isoformat()
            source["lastError"] = None
            source["pendingUpdate"] = False
            print(f"ℹ️  Unchanged: {name}")
            return False
            
    except Exception as e:
        error_msg = str(e)
        source["lastError"] = error_msg
        source["lastFetched"] = datetime.now().isoformat()
        source["pendingUpdate"] = False
        print(f"❌ Error fetching {name}: {error_msg}")
        return False


async def run_url_refresh_job() -> None:
    """
    Main job to refresh URL sources.
    
    This should be run periodically (e.g., every 5-10 minutes).
    """
    print()
    print("=" * 60)
    print("🔄 Starting URL Refresh Job")
    print(f"⏰ Time: {datetime.now().isoformat()}")
    print("=" * 60)
    print()
    
    sources = load_url_sources()
    
    if not sources:
        print("ℹ️  No URL sources configured")
        print()
        return
    
    # Filter sources that need fetching
    sources_to_fetch = [s for s in sources if should_fetch(s)]
    
    if not sources_to_fetch:
        print(f"✅ All {len(sources)} URL sources are up to date")
        print()
        return
    
    print(f"📊 Found {len(sources_to_fetch)} URL(s) to refresh (out of {len(sources)} total)")
    print()
    
    # Initialize index manager
    index_manager = get_index_manager()
    
    # Refresh each URL
    updated_count = 0
    for source in sources_to_fetch:
        was_updated = await refresh_url_source(source, index_manager)
        if was_updated:
            updated_count += 1
    
    # Save updated sources (with new lastFetched timestamps)
    save_url_sources(sources)
    
    print()
    print("=" * 60)
    print(f"✅ URL Refresh Job Complete")
    print(f"   Checked: {len(sources_to_fetch)}")
    print(f"   Changes detected: {updated_count}")
    print(f"   Unchanged: {len(sources_to_fetch) - updated_count}")
    if updated_count > 0:
        print()
        print(f"⚠️  {updated_count} source(s) have pending updates.")
        print("   Review and approve updates in the UI.")
    print("=" * 60)
    print()


if __name__ == "__main__":
    asyncio.run(run_url_refresh_job())

