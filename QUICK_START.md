# ⚡ Quick Start Guide

Get your RAG system running in 3 steps!

## 🚀 Step 1: Install Dependencies

```powershell
# Activate virtual environment
.venv\Scripts\Activate.ps1

# Install all dependencies (including Gradio)
pip install -r requirements.txt
```

## 📊 Step 2: Build the Index

```powershell
# Index your documents (first time only)
python -m src.updater.jobs
```

This will:
- ✅ Load documents from `data/sources/`
- ✅ Process web sources from `.env`
- ✅ Build vector embeddings
- ✅ Store in ChromaDB

## 🎨 Step 3: Launch the Web Interface

```powershell
# Start the server
python run_web_interface.py
```

Then open: **http://127.0.0.1:8000**

---

## 🎯 What You Get

### 1. Beautiful Chat Interface
- Ask questions in natural language
- Get AI-powered answers with sources
- See relevance scores for each source
- Adjust retrieval settings with sliders

### 2. REST API
- `/docs` - Interactive API documentation
- `/query` - Query endpoint for integrations
- `/health` - System health check

### 3. Both Run Simultaneously!
- Use the chat UI for exploration
- Use the API for automation

---

## 💡 Example Usage

### In the Chat Interface:

```
You: What are the main topics in the documents?

AI: Based on the documents, the main topics include...

📚 Sources:
Source 1 (Relevance: 87%)
- File: data/sources/document1.txt

Source 2 (Relevance: 82%)
- File: data/sources/document2.txt
```

### Via API (PowerShell):

```powershell
$body = @{
    question = "What are the main topics?"
    top_k = 5
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://127.0.0.1:8000/query" `
    -Method Post `
    -ContentType "application/json" `
    -Body $body
```

---

## 🔧 Configuration

Edit `.env` file:

```bash
# Required
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-4o-mini

# Optional (have defaults)
DATA_DIR=./data
CHROMA_DB_DIR=./data/chroma
LOCAL_DATA_DIR=./data/sources
SOURCE_URLS=https://example.com/doc1,https://example.com/doc2
```

---

## 📝 Adding More Documents

1. Drop files in `data/sources/`
2. Run: `python -m src.updater.jobs`
3. Restart server (or it auto-reloads)

The system only processes **new/changed** documents! ⚡

---

## 🆘 Troubleshooting

### "Index not initialized"
→ Run: `python -m src.updater.jobs`

### Port already in use
→ Run: `uvicorn src.app.main:app --reload --port 8001`

### Slow responses
→ Reduce top_k slider (try 3-5 instead of 10)

---

## 📚 More Information

- **Detailed Setup**: [GRADIO_SETUP.md](GRADIO_SETUP.md)
- **Full Documentation**: [README.md](README.md)

---

**🎉 That's it! You're ready to query your documents with AI!**

