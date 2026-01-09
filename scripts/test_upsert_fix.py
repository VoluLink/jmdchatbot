"""
Test script to demonstrate the proper upsert behavior.

This shows that when a document is updated, old chunks are deleted
before new ones are added, preventing duplicate/stale data.
"""

import asyncio
from llama_index.core import Document
from src.indexing import get_index_manager


async def test_upsert_behavior():
    print("\n" + "=" * 60)
    print("🧪 Testing Upsert Behavior (Delete Old + Insert New)")
    print("=" * 60 + "\n")
    
    index_manager = get_index_manager()
    
    # Test document ID
    test_doc_id = "test_url_source"
    
    # Version 1 of the document
    doc_v1 = Document(
        text="This is version 1 of the document. It contains old information.",
        doc_id=test_doc_id,
        metadata={
            "source": "url",
            "url": "https://example.com/test",
            "name": "Test Document",
            "content_hash": "hash_v1",
        }
    )
    
    print("📝 Step 1: Indexing VERSION 1 of document...")
    index_manager.upsert_documents([doc_v1])
    
    # Check how many documents are indexed
    all_docs = index_manager.get_all_document_ids()
    print(f"✅ Documents in index: {len(all_docs)}")
    print(f"   Doc IDs: {all_docs}\n")
    
    # Version 2 of the document (updated content)
    doc_v2 = Document(
        text="This is version 2 of the document. It has been updated with NEW information. The old version should be completely removed.",
        doc_id=test_doc_id,  # Same doc_id!
        metadata={
            "source": "url",
            "url": "https://example.com/test",
            "name": "Test Document",
            "content_hash": "hash_v2",  # Different hash
        }
    )
    
    print("📝 Step 2: Updating to VERSION 2 (same doc_id)...")
    print("   Expected behavior:")
    print("   1. Delete all old chunks from v1")
    print("   2. Insert new chunks from v2")
    print()
    
    index_manager.upsert_documents([doc_v2])
    
    # Check metadata
    metadata = index_manager.get_document_metadata(test_doc_id)
    print(f"\n✅ Document metadata after update:")
    print(f"   Content hash: {metadata.get('content_hash')}")
    print(f"   Expected: hash_v2")
    print(f"   Match: {metadata.get('content_hash') == 'hash_v2'}")
    
    # Verify still only 1 document
    all_docs_after = index_manager.get_all_document_ids()
    print(f"\n✅ Documents in index after update: {len(all_docs_after)}")
    print(f"   (Should still be same count, not doubled!)")
    
    # Clean up test document
    print(f"\n🧹 Cleaning up test document...")
    index_manager.delete_document(test_doc_id)
    
    print("\n" + "=" * 60)
    print("✅ Test completed!")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    asyncio.run(test_upsert_behavior())

