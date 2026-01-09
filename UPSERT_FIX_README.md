# Upsert Fix: Proper Document Update Handling

## Problem (Before Fix)

The original `upsert_documents()` method only **inserted** new nodes without deleting old ones:

```python
# OLD BEHAVIOR ❌
def upsert_documents(documents):
    nodes = build_nodes(documents)
    index.insert_nodes(nodes)  # Only INSERT, no DELETE
```

### What Went Wrong:

**Example Scenario:**
- Day 1: URL source "AufenthaltG" has 5000 words → Creates 50 chunks
- Day 10: Law updated, now 5100 words → Creates 51 NEW chunks
- **Result: 101 chunks in the index (50 old + 51 new)** ❌

**Problems:**
1. **Duplicate data** - Same document exists twice in the index
2. **Stale information** - RAG retrieves outdated chunks
3. **Wasted storage** - Vector store grows unnecessarily
4. **Inconsistent results** - Queries return mix of old and new info

## Solution (After Fix)

The fixed `upsert_documents()` method now properly **deletes old versions** before inserting new ones:

```python
# NEW BEHAVIOR ✅
def upsert_documents(documents):
    for doc in documents:
        if doc_id in metadata:
            # 1. DELETE old chunks
            delete_document(doc_id)
        
        # 2. INSERT new chunks
        nodes = build_nodes([doc])
        index.insert_nodes(nodes)
```

### What Changed:

**Same Scenario Now:**
- Day 1: URL source "AufenthaltG" → 50 chunks indexed
- Day 10: Law updated → **Old 50 chunks deleted**, 51 new chunks added
- **Result: 51 chunks in the index (only latest version)** ✅

**Benefits:**
1. ✅ **No duplicates** - Only one version exists
2. ✅ **Always current** - Only latest content is retrieved
3. ✅ **Efficient storage** - No waste
4. ✅ **Consistent results** - Queries use current data only

## Implementation Details

### New Method: `delete_document()`

```python
def delete_document(self, doc_id: str) -> bool:
    """
    Delete all nodes/chunks of a document from the index.
    """
    # Uses LlamaIndex's delete_ref_doc() to remove all chunks
    self._index.delete_ref_doc(doc_id, delete_from_docstore=True)
    
    # Clean up metadata
    del self._metadata[doc_id]
    self._save_metadata()
```

### Updated Method: `upsert_documents()`

```python
def upsert_documents(self, documents: Sequence[Document]) -> int:
    """
    Insert new/changed documents into the index.
    
    IMPORTANT: Deletes old versions before inserting new chunks.
    This prevents duplicate/stale data in the index.
    """
    for doc in documents:
        # Step 1: Delete old version (if exists)
        if doc_id in self._metadata:
            self.delete_document(doc_id)
        
        # Step 2: Create and insert new chunks
        nodes = self._build_nodes([doc])
        self._index.insert_nodes(nodes)
        
        # Step 3: Update metadata
        self._metadata[doc_id] = {...}
```

### Additional Helper Methods

```python
def get_all_document_ids(self) -> List[str]:
    """Get all doc_ids currently in the index."""
    return list(self._metadata.keys())

def get_document_metadata(self, doc_id: str) -> Dict | None:
    """Get metadata for a specific document."""
    return self._metadata.get(doc_id)
```

## Testing

Run the test script to verify the fix:

```bash
python -m scripts.test_upsert_fix
```

The test demonstrates:
1. Indexing version 1 of a document
2. Updating to version 2 (same doc_id)
3. Verifying old chunks are deleted
4. Confirming only latest version remains

## Impact on Existing Features

### URL Sources ✅
- When clicking "Update Index" for a changed URL
- Old chunks are now properly removed
- Only latest content is indexed

### File Uploads ✅
- When re-uploading a file with same name
- Previous version is deleted
- New version replaces it completely

### Manual Indexing Jobs ✅
- When running update jobs
- Changed files get properly replaced
- No accumulation of old versions

## Performance Notes

- **Deletion is fast**: Uses vector store's native delete operation
- **Atomic per document**: Each document is delete → insert as a unit
- **No full reindex needed**: Only changed documents are affected

## Migration

No migration needed! The fix is backward compatible:
- Existing metadata is preserved
- First update will work as before
- Subsequent updates benefit from proper deletion

## Future Enhancements

Possible improvements:
1. **Batch deletion** - Delete multiple documents in one operation
2. **Soft delete** - Keep old versions with timestamps
3. **Diff-based updates** - Only update changed chunks (more complex)
4. **Audit log** - Track document version history

---

**Status:** ✅ Fixed and tested  
**Date:** 2026-01-09  
**Impact:** High - Prevents data quality issues in RAG system

