# 📋 Parsing Quick Reference

## 🚀 Quick Commands

### Standard Usage (Recommended)
```powershell
# Install dependencies first (one time)
pip install -r requirements.txt

# Index all supported file types
python -m src.updater.advanced_jobs
```

### Advanced Options
```powershell
# Force reindex everything
python -m src.updater.advanced_jobs --force

# Use AI-powered semantic chunking
python -m src.updater.advanced_jobs --semantic

# Process only PDFs
python -m src.updater.advanced_jobs --pdf-only

# Process only Office docs
python -m src.updater.advanced_jobs --office-only

# Combine options
python -m src.updater.advanced_jobs --semantic --force
```

---

## 📁 Supported File Types

| Format | Extensions | Auto-Detected? |
|--------|------------|----------------|
| PDF | `.pdf` | ✅ Yes |
| Word | `.docx` | ✅ Yes |
| PowerPoint | `.pptx` | ✅ Yes |
| Text | `.txt` | ✅ Yes |
| Markdown | `.md`, `.markdown` | ✅ Yes |
| HTML | `.html`, `.htm` | ✅ Yes |
| JSON | `.json` | ✅ Yes |
| CSV | `.csv` | ✅ Yes |

---

## ⚡ Chunking Strategies

| Strategy | Command | Speed | Quality | Best For |
|----------|---------|-------|---------|----------|
| **Sentence** | `python -m src.updater.advanced_jobs` | ⚡⚡⚡ | Good | General use |
| **Semantic** | `python -m src.updater.advanced_jobs --semantic` | ⚡ | Excellent | High quality needs |

---

## 🎯 Common Workflows

### Workflow 1: First Time Setup
```powershell
# 1. Install dependencies
pip install -r requirements.txt

# 2. Add documents to data/sources/
# (Copy your PDFs, DOCX, TXT files here)

# 3. Index documents
python -m src.updater.advanced_jobs

# 4. Start web interface
python run_web_interface.py
```

### Workflow 2: Adding New Documents
```powershell
# 1. Add new files to data/sources/

# 2. Re-run indexing (only processes new files)
python -m src.updater.advanced_jobs

# 3. Restart web interface if needed
python run_web_interface.py
```

### Workflow 3: Updating Existing Documents
```powershell
# 1. Update files in data/sources/

# 2. Re-run indexing (detects changes automatically)
python -m src.updater.advanced_jobs

# Changed files are automatically re-indexed!
```

---

## 🆚 Basic vs Advanced

| Feature | Basic | Advanced |
|---------|-------|----------|
| **Command** | `python -m src.updater.jobs` | `python -m src.updater.advanced_jobs` |
| **File Types** | TXT, MD only | PDF, DOCX, PPTX, HTML, etc. |
| **Parsing** | Simple text read | Format-specific parsers |
| **Chunking** | Fixed size | Sentence or semantic |
| **Speed** | Fast | Moderate |
| **Quality** | Basic | High |

**Recommendation**: Use **Advanced** unless you only have simple text files.

---

## 🔧 Configuration

### Adjust Chunk Size

Edit `.env`:
```bash
# Default: 1024 tokens per chunk
CHUNK_SIZE=1024

# Default: 100 tokens overlap
CHUNK_OVERLAP=100
```

Smaller chunks = More precise but more API calls  
Larger chunks = Less precise but fewer API calls

### Recommended Settings

| Use Case | CHUNK_SIZE | CHUNK_OVERLAP |
|----------|------------|---------------|
| **General** | 1024 | 100 |
| **Long documents** | 2048 | 200 |
| **Short Q&A** | 512 | 50 |
| **Code docs** | 1536 | 150 |

---

## 💡 Tips & Tricks

### Tip 1: Organize by Type
```
data/sources/
├── pdfs/
├── word_docs/
├── presentations/
└── text_files/
```

### Tip 2: Test with Small Batch
Start with 2-3 documents, verify they work, then add more.

### Tip 3: Use Incremental Indexing
The system only processes changed files - no need to reindex everything!

### Tip 4: Monitor Progress
Watch the console output for detailed progress information.

### Tip 5: Check File Encoding
If you get encoding errors, ensure files are UTF-8 encoded.

---

## 🐛 Troubleshooting

### Problem: "No documents found"
**Solution**: Add files to `data/sources/` directory

### Problem: "Failed to parse PDF"
**Solution**: 
- Ensure PDF contains text (not scanned images)
- Try converting to text manually
- Check if PDF is password-protected

### Problem: "Out of memory"
**Solution**:
- Process in batches (`--pdf-only`, `--office-only`)
- Reduce `CHUNK_SIZE` in `.env`
- Use sentence splitter (default)

### Problem: "Slow indexing"
**Solution**:
- Use sentence splitter (default, not `--semantic`)
- Reduce `CHUNK_OVERLAP`
- Process specific file types only

---

## 📊 Performance Guide

### Small Collection (< 50 files)
```powershell
python -m src.updater.advanced_jobs --semantic
```
Use semantic chunking for best quality.

### Medium Collection (50-500 files)
```powershell
python -m src.updater.advanced_jobs
```
Use default sentence chunking for good balance.

### Large Collection (> 500 files)
```powershell
# Process by type
python -m src.updater.advanced_jobs --pdf-only
python -m src.updater.advanced_jobs --office-only
python -m src.updater.advanced_jobs
```
Process in batches to manage memory.

---

## 🎓 Examples

### Example: Research Papers
```powershell
# Add PDFs to data/sources/research/
python -m src.updater.advanced_jobs --semantic
python run_web_interface.py
```

### Example: Company Documents
```powershell
# Add DOCX, PPTX, PDF to data/sources/
python -m src.updater.advanced_jobs
python run_web_interface.py
```

### Example: Mixed Content
```powershell
# Add various file types
python -m src.updater.advanced_jobs
python run_web_interface.py
```

---

**Need more details? See [ADVANCED_PARSING.md](ADVANCED_PARSING.md)**

