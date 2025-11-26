# 🚀 START HERE - Complete Setup Guide

## ✅ Prerequisites Checklist

Before starting, make sure you have:

- [x] Python 3.10+ installed
- [x] Virtual environment activated (`.venv\Scripts\Activate.ps1`)
- [x] `.env` file with valid `OPENAI_API_KEY`
- [x] Model set to `gpt-4o-mini` (not `gpt-5-mini`)

---

## 🎯 Quick Start (3 Steps)

### Step 1: Install Dependencies

```powershell
pip install -r requirements.txt
```

This installs:
- FastAPI + Uvicorn (backend)
- Gradio (web interface)
- LlamaIndex (RAG framework)
- Advanced parsers (PDF, DOCX, etc.)

### Step 2: Add Documents & Index

```powershell
# Add some documents to data/sources/ first!
# Then run:

python -m src.updater.advanced_jobs
```

**If you don't have documents yet**, create a test file:

```powershell
# Create test document
New-Item -ItemType Directory -Force -Path "data\sources"
"This is a test document about artificial intelligence and machine learning." | Out-File -FilePath "data\sources\test.txt" -Encoding UTF8
```

### Step 3: Launch the Interface

```powershell
python run_web_interface.py
```

Then open: **http://127.0.0.1:8000**

---

## 🎨 What You'll See

### Main Interface (http://127.0.0.1:8000)
- 💬 **Chat Interface** - Ask questions naturally
- 📚 **Source Citations** - See which documents were used
- 🎚️ **Top-K Slider** - Adjust how many sources to retrieve
- 📝 **Example Questions** - Quick start templates

### API Documentation (http://127.0.0.1:8000/docs)
- 📖 **Interactive API Docs** - Test endpoints directly
- 🔧 **Schema Explorer** - See request/response formats

### Health Check (http://127.0.0.1:8000/health)
- 💚 **System Status** - Verify server is running

---

## 🔧 Troubleshooting

### Issue 1: "No API key found for OpenAI"

**Fix**: Update your `.env` file:

```bash
OPENAI_API_KEY=sk-proj-your-actual-key-here
OPENAI_MODEL=gpt-4o-mini
```

**Verify**:
```powershell
python verify_env.py
```

### Issue 2: "Index not initialized"

**Fix**: Run the indexing job:

```powershell
python -m src.updater.advanced_jobs
```

### Issue 3: "No documents found"

**Fix**: Add documents to `data/sources/`:

```powershell
# Create test document
"Sample content about your topic." | Out-File -FilePath "data\sources\sample.txt" -Encoding UTF8

# Then index it
python -m src.updater.advanced_jobs
```

### Issue 4: "Port 8000 already in use"

**Fix**: Use a different port:

```powershell
uvicorn src.app.main:app --reload --port 8001
```

Then open: http://127.0.0.1:8001

### Issue 5: Model "gpt-5-mini" doesn't exist

**Fix**: Change in `.env`:

```bash
OPENAI_MODEL=gpt-4o-mini
```

---

## 📁 Directory Structure

```
rag-seminararbeit/
├── data/
│   ├── sources/          ← Add your documents here!
│   │   ├── test.txt
│   │   ├── document.pdf
│   │   └── presentation.pptx
│   ├── chroma/           ← Vector database (auto-created)
│   └── doc_metadata.json ← Document tracking (auto-created)
├── src/
│   ├── app/
│   │   ├── main.py       ← FastAPI app
│   │   └── gradio_interface.py ← Web UI
│   ├── ingestion/
│   │   ├── loader.py     ← Basic loader
│   │   └── advanced_loader.py ← Advanced parsers
│   └── updater/
│       ├── jobs.py       ← Basic indexing
│       └── advanced_jobs.py ← Advanced indexing
├── .env                  ← Your configuration
└── run_web_interface.py  ← Startup script
```

---

## 💡 Usage Examples

### Example 1: Ask a Question

1. Open http://127.0.0.1:8000
2. Type: "What are the main topics in the documents?"
3. Press Enter
4. See the answer with source citations!

### Example 2: Adjust Retrieval

1. Move the "top_k" slider (1-10)
2. Lower = faster, more focused
3. Higher = more comprehensive, slower

### Example 3: Use API

```powershell
# PowerShell
$body = @{
    question = "What is machine learning?"
    top_k = 5
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://127.0.0.1:8000/query" `
    -Method Post `
    -ContentType "application/json" `
    -Body $body
```

---

## 🎓 Next Steps

### Add More Documents

```powershell
# 1. Copy files to data/sources/
# Supports: PDF, DOCX, PPTX, TXT, MD, HTML, etc.

# 2. Re-index (only processes new/changed files)
python -m src.updater.advanced_jobs

# 3. Restart server (if using --reload, it auto-restarts)
```

### Customize the Interface

Edit `src/app/gradio_interface.py`:
- Change theme
- Add example questions
- Modify layout

### Use Advanced Features

```powershell
# Semantic chunking (better quality)
python -m src.updater.advanced_jobs --semantic

# Force reindex everything
python -m src.updater.advanced_jobs --force

# Process only PDFs
python -m src.updater.advanced_jobs --pdf-only
```

---

## 📚 Documentation

- **This Guide**: `START_HERE.md` ← You are here
- **Quick Start**: `QUICK_START.md`
- **Gradio Setup**: `GRADIO_SETUP.md`
- **Advanced Parsing**: `ADVANCED_PARSING.md`
- **Quick Reference**: `PARSING_QUICK_REFERENCE.md`
- **Main README**: `README.md`

---

## 🆘 Still Need Help?

### Check Configuration
```powershell
python verify_env.py
```

### Test Imports
```powershell
python -c "from src.config.settings import get_settings; print('✅ Config OK')"
python -c "import gradio; print('✅ Gradio OK')"
python -c "from llama_index.core import Document; print('✅ LlamaIndex OK')"
```

### View Logs
Watch the console output when running commands - it shows detailed progress and errors.

---

## 🎉 You're Ready!

Once you see:
```
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
```

Open your browser to **http://127.0.0.1:8000** and start querying! 🚀

