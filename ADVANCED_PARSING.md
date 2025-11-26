# 🚀 Advanced Document Parsing with LlamaIndex

Your RAG system now includes LlamaIndex's powerful parsing pipelines!

## 📚 What's New?

### Automatic File Type Detection

The system now automatically handles:

| File Type | Extension | Description |
|-----------|-----------|-------------|
| **PDF** | `.pdf` | Extracts text from PDF documents |
| **Word** | `.docx` | Parses Microsoft Word documents |
| **PowerPoint** | `.pptx` | Extracts text from presentations |
| **Text** | `.txt` | Plain text files |
| **Markdown** | `.md`, `.markdown` | Markdown formatted documents |
| **HTML** | `.html`, `.htm` | Web pages and HTML documents |
| **JSON** | `.json` | Structured JSON data |
| **CSV** | `.csv` | Comma-separated values |

### Advanced Chunking Strategies

Two intelligent chunking methods:

1. **Sentence Splitter** (Default - Fast)
   - Splits by sentences
   - Respects chunk size and overlap
   - Good for most use cases

2. **Semantic Splitter** (AI-Powered)
   - Uses embeddings to find natural break points
   - Better semantic coherence
   - Slower but higher quality

---

## 🎯 How to Use

### Option 1: Use Advanced Loader (Recommended)

```powershell
# Run the advanced update job
python -m src.updater.advanced_jobs
```

This will:
- ✅ Automatically detect all supported file types
- ✅ Parse PDFs, Word docs, PowerPoint, etc.
- ✅ Use intelligent chunking
- ✅ Only process new/changed documents

### Option 2: Use Original Loader (Simple)

```powershell
# Run the basic update job (only .txt and .md)
python -m src.updater.jobs
```

---

## 🔧 Advanced Options

### Force Reindex All Documents

```powershell
python -m src.updater.advanced_jobs --force
```

### Use Semantic Chunking (AI-Powered)

```powershell
python -m src.updater.advanced_jobs --semantic
```

### Process Only PDFs

```powershell
python -m src.updater.advanced_jobs --pdf-only
```

### Process Only Office Documents

```powershell
python -m src.updater.advanced_jobs --office-only
```

### Combine Options

```powershell
python -m src.updater.advanced_jobs --semantic --force
```

---

## 📁 File Organization

### Recommended Structure

```
data/sources/
├── research/
│   ├── paper1.pdf
│   ├── paper2.pdf
│   └── notes.md
├── presentations/
│   ├── slides.pptx
│   └── overview.docx
├── documentation/
│   ├── manual.pdf
│   ├── guide.md
│   └── faq.txt
└── web_content/
    ├── article.html
    └── data.json
```

The system will recursively scan all subdirectories!

---

## 🎨 Parsing Pipeline Architecture

```
📁 File System
    ↓
🔍 SimpleDirectoryReader (Auto-detects file types)
    ↓
📄 File-Specific Parsers
    ├─ PDFReader (pypdf)
    ├─ DocxReader (python-docx)
    ├─ PptxReader (python-pptx)
    ├─ HTMLReader (beautifulsoup4)
    └─ TextReader (built-in)
    ↓
✂️ Node Parser (Chunking)
    ├─ SentenceSplitter (fast)
    └─ SemanticSplitter (AI-powered)
    ↓
🔢 Embeddings (OpenAI)
    ↓
💾 ChromaDB Vector Store
    ↓
🤖 Query Engine
```

---

## 🆚 Comparison: Basic vs Advanced

| Feature | Basic Loader | Advanced Loader |
|---------|-------------|-----------------|
| **File Types** | `.txt`, `.md` only | PDF, DOCX, PPTX, HTML, etc. |
| **Parsing** | Simple text read | Format-specific parsers |
| **Chunking** | Fixed size | Sentence or semantic |
| **Progress** | Minimal | Detailed reporting |
| **Error Handling** | Basic | Comprehensive |
| **Speed** | Fast | Slightly slower (better quality) |

---

## 💡 Best Practices

### 1. **Start with Advanced Loader**

Unless you only have simple text files, use the advanced loader:

```powershell
python -m src.updater.advanced_jobs
```

### 2. **Use Sentence Splitter for Speed**

The default sentence splitter is fast and works well for most cases:

```powershell
# This is the default - no flags needed
python -m src.updater.advanced_jobs
```

### 3. **Use Semantic Splitter for Quality**

For better semantic coherence (e.g., legal documents, research papers):

```powershell
python -m src.updater.advanced_jobs --semantic
```

### 4. **Organize Files by Type**

Keep similar documents together in subdirectories for easier management.

### 5. **Test with Small Batches**

Start with a few documents to test, then add more:

```powershell
# Add 2-3 test files first
python -m src.updater.advanced_jobs

# Verify they work in the web interface
python run_web_interface.py

# Then add more documents
```

---

## 🔍 Programmatic Usage

### Load Specific File Types

```python
from src.ingestion.advanced_loader import (
    load_pdfs_only,
    load_office_docs_only,
    load_text_docs_only,
)

# Load only PDFs
pdf_docs = load_pdfs_only()

# Load only Office documents
office_docs = load_office_docs_only()

# Load only text files
text_docs = load_text_docs_only()
```

### Custom Chunking

```python
from src.ingestion.advanced_loader import (
    load_local_documents_advanced,
    parse_documents_to_nodes,
)

# Load documents
docs = load_local_documents_advanced()

# Parse with sentence splitter
nodes = parse_documents_to_nodes(docs, parser_type="sentence")

# Or use semantic splitter
nodes = parse_documents_to_nodes(docs, parser_type="semantic")
```

### Load Specific Extensions

```python
from src.ingestion.advanced_loader import load_local_documents_advanced

# Load only specific file types
docs = load_local_documents_advanced(
    required_exts=[".pdf", ".docx", ".txt"]
)
```

---

## 📊 Performance Considerations

### File Type Processing Speed

| File Type | Speed | Notes |
|-----------|-------|-------|
| `.txt`, `.md` | ⚡⚡⚡ Very Fast | Direct text reading |
| `.html` | ⚡⚡ Fast | HTML parsing overhead |
| `.pdf` | ⚡ Moderate | Depends on PDF complexity |
| `.docx`, `.pptx` | ⚡ Moderate | XML parsing required |

### Chunking Strategy Speed

| Strategy | Speed | Quality | Best For |
|----------|-------|---------|----------|
| **Sentence** | ⚡⚡⚡ Fast | Good | General use, large collections |
| **Semantic** | ⚡ Slow | Excellent | High-quality needs, smaller collections |

### Recommendations

- **< 100 documents**: Use semantic splitter
- **100-1000 documents**: Use sentence splitter
- **> 1000 documents**: Use sentence splitter, batch process

---

## 🐛 Troubleshooting

### "No module named 'pypdf'"

Install the advanced parsing dependencies:

```powershell
pip install -r requirements.txt
```

### "Failed to parse PDF"

Some PDFs are scanned images and need OCR. Consider:
1. Using text-based PDFs instead
2. Pre-processing with OCR tools
3. Converting to text manually

### "Out of memory"

For large document collections:
1. Process in batches (use `--pdf-only`, `--office-only`)
2. Reduce `chunk_size` in `.env`
3. Use sentence splitter instead of semantic

### "Slow indexing"

Speed up by:
1. Using sentence splitter (default)
2. Processing specific file types only
3. Reducing `chunk_overlap` in `.env`

---

## 🎓 Examples

### Example 1: Research Papers

```powershell
# Add PDFs to data/sources/research/
# paper1.pdf, paper2.pdf, paper3.pdf

# Index with semantic chunking for better quality
python -m src.updater.advanced_jobs --semantic

# Start querying
python run_web_interface.py
```

### Example 2: Mixed Document Collection

```powershell
# Add various files to data/sources/
# - reports.docx
# - presentation.pptx
# - notes.md
# - data.pdf

# Index with default settings
python -m src.updater.advanced_jobs

# Query the collection
python run_web_interface.py
```

### Example 3: Large PDF Collection

```powershell
# Add 100+ PDFs to data/sources/pdfs/

# Index PDFs only with fast chunking
python -m src.updater.advanced_jobs --pdf-only

# Later, add other documents
python -m src.updater.advanced_jobs
```

---

## 🔄 Migration from Basic to Advanced

Already using the basic loader? Easy migration:

```powershell
# 1. Install new dependencies
pip install -r requirements.txt

# 2. Run advanced loader (it will detect existing index)
python -m src.updater.advanced_jobs

# 3. Add new file types (PDFs, DOCX, etc.)
# They'll be automatically detected and indexed!
```

The advanced loader is **fully compatible** with the existing index!

---

## 📚 Additional Resources

- [LlamaIndex Documentation](https://docs.llamaindex.ai/)
- [SimpleDirectoryReader Guide](https://docs.llamaindex.ai/en/stable/module_guides/loading/simpledirectoryreader/)
- [Node Parsers Guide](https://docs.llamaindex.ai/en/stable/module_guides/loading/node_parsers/)

---

**🎉 You now have enterprise-grade document parsing capabilities!**

