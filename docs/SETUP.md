# Setup Guide

## Prerequisites

- Python 3.11+
- Node.js 18+ and npm
- OpenAI API key

## 1. Python Environment

```bash
cd rag-seminararbeit
python -m venv .venv

# Windows
.venv\Scripts\activate

# Linux/Mac
source .venv/bin/activate

pip install --upgrade pip
pip install -r requirements.txt
```

## 2. Frontend

```bash
cd frontend
npm install
cd ..
```

## 3. Environment Variables

Copy `env.example` to `.env` and fill in your values:

```bash
# Required
OPENAI_API_KEY=sk-your-key-here
OPENAI_MODEL=gpt-5-mini

# Optional (defaults shown)
DATA_DIR=./data
CHROMA_DB_DIR=./data/chroma
LOCAL_DATA_DIR=./data/sources
INDEX_NAME=rag_index
CHUNK_SIZE=512
CHUNK_OVERLAP=50

# URL sources (comma-separated)
SOURCE_URLS=https://example.com/gesetz1,https://example.com/gesetz2

# Frontend auth
JWT_SECRET=your-secret-key-min-32-chars
```

Settings are loaded via `src/config/settings.py` using pydantic-settings.

## 4. Add Documents

Place files in `data/sources/` (subfolders allowed):
- Supported: PDF, DOCX, PPTX, TXT, MD, HTML

Or use the web UI at `/documents` to upload files and manage URL sources.

## 5. Index Documents

```bash
# Recommended (supports all file formats)
python -m src.updater.advanced_jobs

# Basic (only .txt and .md)
python -m src.updater.jobs
```

## 6. Start the Application

```bash
# Terminal 1 - Backend
uvicorn src.app.main:app --reload --port 8000

# Terminal 2 - Frontend
cd frontend
npm run dev
```

- Frontend: http://localhost:3000
- API Docs: http://localhost:8000/docs
- Health Check: http://localhost:8000/health

## Default Admin Login

```
Email:    admin@amiko.local
Password: admin123
```

Change this password immediately after first login.

## Common Commands

### Update Index

```bash
# Index local files
python -m src.updater.advanced_jobs

# Check URL sources for changes
python -m src.updater.url_refresh_job

# Apply pending URL updates
python -m src.updater.apply_url_updates --all
```

### User Management (CLI)

```bash
python -m src.auth.register_user
python -m src.auth.list_users
python -m src.auth.delete_user
python -m src.auth.verify_user
```

## File Locations

| Path | Description |
|---|---|
| `data/sources/` | Your documents |
| `data/chroma/` | Vector store (auto-generated) |
| `data/auth.db` | User database (auto-generated) |
| `data/doc_metadata.json` | Document metadata (auto-generated) |
| `data/url_sources.json` | URL sources config (auto-generated) |

## Troubleshooting

**"Module not found"** - Make sure your venv is activated and run `pip install -r requirements.txt`

**"OpenAI API key not found"** - Check that `.env` exists with `OPENAI_API_KEY=sk-...`

**"No documents found"** - Add files to `data/sources/` and run `python -m src.updater.advanced_jobs`

**"Port already in use"** - Use `--port 8001` for backend or `npm run dev -- -p 3001` for frontend

**Reset vector store** - Delete `data/chroma/` and `data/doc_metadata.json`, then re-index
