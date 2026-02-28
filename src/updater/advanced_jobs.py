"""
Advanced update job using LlamaIndex's parsing pipelines.

This version uses:
- SimpleDirectoryReader for automatic file type detection
- Advanced chunking strategies (sentence or semantic splitting)
- Better progress reporting
- Support for multiple file formats (PDF, DOCX, PPTX, etc.)
"""

import asyncio
from datetime import datetime
from src.ingestion.advanced_loader import load_all_documents_advanced
from src.indexing import get_index_manager


async def run_advanced_update_job(
    parser_type: str = "sentence",
    force_reindex: bool = False,
) -> None:
    """
    Advanced update routine with LlamaIndex parsing pipeline.
    
    Args:
        parser_type: Type of parser to use ('sentence' or 'semantic')
        force_reindex: If True, reindex all documents regardless of changes
    
    Features:
    - Automatic file type detection (PDF, DOCX, TXT, MD, etc.)
    - Advanced chunking strategies
    - Incremental indexing (only processes changed documents)
    - Better error handling and progress reporting
    """
    print()
    print("=" * 60)
    print("🚀 Starting Advanced Update Job")
    print(f"⏰ Time: {datetime.utcnow().isoformat()}")
    print(f"🔧 Parser: {parser_type}")
    print(f"🔄 Force reindex: {force_reindex}")
    print("=" * 60)
    print()
    
    try:
        # Initialize index manager
        print("📊 Initializing index manager...")
        index_manager = get_index_manager()
        print("✅ Index manager ready")
        print()
        
        # Load documents using advanced parsers
        documents = await load_all_documents_advanced()
        
        if not documents:
            print("⚠️  No documents found!")
            print()
            print("💡 Tips:")
            print("   1. Add files to data/sources/")
            print("   2. Add URLs to SOURCE_URLS in .env")
            print("   3. Supported formats: PDF, DOCX, PPTX, TXT, MD, HTML, etc.")
            print()
            return
        
        # Detect changed documents (unless force reindex)
        if force_reindex:
            print("🔄 Force reindex enabled - processing all documents")
            changed_docs = documents
        else:
            print("🔍 Detecting changed documents...")
            changed_docs = index_manager.get_changed_documents(documents)
        
        if not changed_docs:
            print("✅ No new or changed documents found.")
            print("   All documents are up to date!")
            print()
            return
        
        print(f"📝 Found {len(changed_docs)} document(s) to process")
        print()
        
        # Upsert documents into the index
        print("💾 Indexing documents...")
        count = index_manager.upsert_documents(changed_docs)
        
        print()
        print("=" * 60)
        print(f"✅ Successfully indexed {count} document(s)")
        print(f"⏰ Completed: {datetime.utcnow().isoformat()}")
        print("=" * 60)
        print()
        print("🎉 Ready to query! Start the web interface:")
        print("   python run_web_interface.py")
        print()
        
    except Exception as e:
        print()
        print("=" * 60)
        print(f"❌ Error during update job: {e}")
        print("=" * 60)
        print()
        raise


async def run_pdf_only_job() -> None:
    """
    Update job that only processes PDF files.
    Useful for large document collections where you want to process specific types.
    """
    from src.ingestion.advanced_loader import load_pdfs_only
    
    print("📄 Processing PDF files only...")
    index_manager = get_index_manager()
    
    documents = load_pdfs_only()
    if not documents:
        print("⚠️  No PDF files found in data/sources/")
        return
    
    changed_docs = index_manager.get_changed_documents(documents)
    if not changed_docs:
        print("✅ All PDF files are up to date")
        return
    
    count = index_manager.upsert_documents(changed_docs)
    print(f"✅ Indexed {count} PDF document(s)")


async def run_office_docs_job() -> None:
    """
    Update job that only processes Microsoft Office documents.
    """
    from src.ingestion.advanced_loader import load_office_docs_only
    
    print("📊 Processing Office documents only...")
    index_manager = get_index_manager()
    
    documents = load_office_docs_only()
    if not documents:
        print("⚠️  No Office documents found in data/sources/")
        return
    
    changed_docs = index_manager.get_changed_documents(documents)
    if not changed_docs:
        print("✅ All Office documents are up to date")
        return
    
    count = index_manager.upsert_documents(changed_docs)
    print(f"✅ Indexed {count} Office document(s)")


if __name__ == "__main__":
    # Parse command line arguments
    import sys
    
    parser_type = "sentence"  # default
    force_reindex = False
    
    if len(sys.argv) > 1:
        if "--semantic" in sys.argv:
            parser_type = "semantic"
        if "--force" in sys.argv:
            force_reindex = True
        if "--pdf-only" in sys.argv:
            asyncio.run(run_pdf_only_job())
            sys.exit(0)
        if "--office-only" in sys.argv:
            asyncio.run(run_office_docs_job())
            sys.exit(0)
    
    # Run the advanced update job
    asyncio.run(run_advanced_update_job(
        parser_type=parser_type,
        force_reindex=force_reindex,
    ))

