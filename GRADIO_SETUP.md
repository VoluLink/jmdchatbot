# 🎨 Gradio Web Interface Setup

Your RAG system now has a beautiful, user-friendly web interface powered by Gradio!

## 🚀 Quick Start

### 1. Install Dependencies

```powershell
# Activate your virtual environment
.venv\Scripts\Activate.ps1

# Install new dependencies (includes Gradio)
pip install -r requirements.txt
```

### 2. Initialize the Index (First Time Only)

```powershell
python -m src.updater.jobs
```

This will:
- Load documents from `data/sources/`
- Load web sources from your `.env` file
- Build the vector index in ChromaDB

### 3. Start the Web Interface

**Option A: Using the startup script (Recommended)**

```powershell
python run_web_interface.py
```

**Option B: Using uvicorn directly**

```powershell
uvicorn src.app.main:app --reload
```

### 4. Access the Interface

Open your browser and go to:

- **🎨 Gradio Chat UI**: http://127.0.0.1:8000
- **📚 API Docs (Swagger)**: http://127.0.0.1:8000/docs
- **💚 Health Check**: http://127.0.0.1:8000/health

---

## 🎯 Features

### Chat Interface
- **💬 Conversational UI**: Ask questions naturally
- **📊 Source Citations**: See which documents were used
- **🎚️ Adjustable Retrieval**: Control how many sources to fetch (top_k slider)
- **📝 Example Questions**: Quick-start with pre-written examples
- **🔄 Chat History**: Keep track of your conversation

### API Access
- **REST API**: Still available at `/query` endpoint
- **Auto-generated Docs**: Interactive API testing at `/docs`
- **Health Monitoring**: Check system status at `/health`

---

## 📖 How to Use

### Basic Usage

1. **Type your question** in the chat input box
2. **Adjust the top_k slider** (1-10) to control how many sources to retrieve
   - Lower (1-3): Faster, more focused answers
   - Higher (5-10): More comprehensive, but slower
3. **Press Enter** or click "Submit"
4. **View the answer** with source citations and relevance scores

### Example Questions

```
- "What are the main topics covered in the documents?"
- "Can you summarize the key points about data protection?"
- "What information is available about [your topic]?"
- "Explain the relationship between [concept A] and [concept B]"
```

---

## 🔧 Configuration

### Adjusting Settings

Edit your `.env` file to configure:

```bash
# OpenAI Configuration
OPENAI_API_KEY=your_api_key_here
OPENAI_MODEL=gpt-4o-mini

# Data Directories
DATA_DIR=./data
CHROMA_DB_DIR=./data/chroma
LOCAL_DATA_DIR=./data/sources

# Web Sources (comma-separated URLs)
SOURCE_URLS=https://example.com/doc1,https://example.com/doc2
```

### Customizing the Gradio Interface

Edit `src/app/gradio_interface.py` to:
- Change the theme: `theme=gr.themes.Soft()` → `theme=gr.themes.Base()`
- Modify example questions
- Adjust default top_k value
- Add custom styling

---

## 🆚 Gradio vs FastAPI Endpoints

### Use Gradio When:
- ✅ You want a quick, visual interface
- ✅ Demoing to non-technical users
- ✅ Testing queries interactively
- ✅ Exploring your document collection

### Use FastAPI Endpoints When:
- ✅ Building integrations with other systems
- ✅ Programmatic access needed
- ✅ Building a custom frontend (React, Vue, etc.)
- ✅ Automation and scripting

**Good news**: Both are available simultaneously! 🎉

---

## 🐛 Troubleshooting

### "Index not initialized" Error

**Solution**: Run the indexing job first:
```powershell
python -m src.updater.jobs
```

### Port Already in Use

**Solution**: Change the port:
```powershell
uvicorn src.app.main:app --reload --port 8001
```

### Gradio Not Loading

**Solution**: Check if Gradio is installed:
```powershell
pip install gradio
```

### Slow Responses

**Possible causes**:
- High top_k value (try reducing to 3-5)
- Large document collection
- OpenAI API rate limits

---

## 🔄 Updating Documents

### Adding New Documents

1. **Local files**: Drop them in `data/sources/`
2. **Web sources**: Add URLs to `.env` under `SOURCE_URLS`
3. **Re-run indexing**:
   ```powershell
   python -m src.updater.jobs
   ```
4. **Restart the server** (if using `--reload`, it should auto-restart)

The system uses **incremental indexing**, so it only processes new/changed documents!

---

## 📊 Architecture

```
User Browser
    ↓
Gradio UI (http://127.0.0.1:8000)
    ↓
FastAPI Backend
    ↓
LlamaIndex Query Engine
    ↓
ChromaDB Vector Store
    ↓
OpenAI LLM (GPT-4o-mini)
```

---

## 🎨 Customization Ideas

### Change the Theme

```python
# In src/app/gradio_interface.py
demo = gr.Blocks(
    theme=gr.themes.Glass(),  # Try: Soft, Base, Glass, Monochrome
)
```

### Add Authentication

```python
gradio_app.launch(
    auth=("username", "password"),
)
```

### Enable Public Sharing

```python
gradio_app.launch(
    share=True,  # Creates a public URL
)
```

---

## 📚 Additional Resources

- [Gradio Documentation](https://gradio.app/docs)
- [FastAPI Documentation](https://fastapi.tiangolo.com)
- [LlamaIndex Documentation](https://docs.llamaindex.ai)

---

## 🎉 You're All Set!

Your RAG system now has a beautiful web interface. Happy querying! 🚀

