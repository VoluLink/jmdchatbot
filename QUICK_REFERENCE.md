# 🚀 Quick Reference Guide

## Essential Commands

### Setup (First Time)
```bash
# 1. Create virtual environment
python -m venv venv
venv\Scripts\activate  # Windows
source venv/bin/activate  # Linux/Mac

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure environment
cp env.example .env
# Edit .env: Add your OPENAI_API_KEY

# 4. Start backend
uvicorn src.app.main:app --reload --port 8000

# 5. Start frontend (new terminal)
cd frontend
npm install
npm run dev
```

### Daily Development
```bash
# Activate environment
venv\Scripts\activate  # Windows
source venv/bin/activate  # Linux/Mac

# Start backend
uvicorn src.app.main:app --reload

# Start frontend (separate terminal)
cd frontend && npm run dev
```

## Common Tasks

### 📄 Add Documents
```bash
# Option 1: Copy to folder
cp your-file.pdf data/sources/

# Option 2: Use UI
# Navigate to http://localhost:3000/documents
# Click "Datei hochladen"

# Then index them
python -m src.updater.jobs
```

### 🔗 Add URL Source
```bash
# Via UI:
# 1. Go to http://localhost:3000/documents
# 2. Scroll to "URL-Quellen"
# 3. Click "URL hinzufügen"
# 4. Enter URL and name
# 5. Click "Check URLs" to fetch
# 6. Click "Update Index" when changes appear
```

### 🔄 Update Index
```bash
# Update from files
python -m src.updater.jobs

# Check URL sources for changes
python -m src.updater.url_refresh_job

# Apply URL updates
python -m src.updater.apply_url_updates --all
```

### 👤 User Management
```bash
# Register new user
python -m src.auth.register_user

# List all users
python -m src.auth.list_users

# Delete user
python -m src.auth.delete_user

# Verify login
python -m src.auth.verify_user
```

### 🧪 Testing
```bash
# Test upsert fix
python -m scripts.test_upsert_fix

# Run all tests (if using pytest)
pytest
```

## API Endpoints

### Query
```bash
POST http://localhost:8000/query
Content-Type: application/json

{
  "query": "Was sind die Voraussetzungen für §25b?"
}
```

### Health Check
```bash
GET http://localhost:8000/
```

## File Locations

### Configuration
- `.env` - Your environment variables (create from `env.example`)
- `requirements.txt` - Python dependencies
- `frontend/package.json` - Frontend dependencies

### Data
- `data/sources/` - Your documents (PDF, DOCX, etc.)
- `data/chroma/` - Vector store (auto-generated)
- `data/auth.db` - User database (auto-generated)
- `data/doc_metadata.json` - Document metadata (auto-generated)
- `data/url_sources.json` - URL sources config (auto-generated)

### Code
- `src/app/main.py` - FastAPI backend
- `src/indexing/index_manager.py` - Vector index management
- `src/ingestion/loader.py` - Document loading
- `frontend/src/app/page.tsx` - Chat interface
- `frontend/src/app/documents/page.tsx` - Document management

## URLs

- **Frontend:** http://localhost:3000
- **Backend:** http://localhost:8000
- **API Docs:** http://localhost:8000/docs
- **Chat:** http://localhost:3000/
- **Documents:** http://localhost:3000/documents
- **Settings:** http://localhost:3000/settings

## Troubleshooting

### "Module not found"
```bash
pip install -r requirements.txt
```

### "OpenAI API key not found"
```bash
# Check .env file exists and contains:
OPENAI_API_KEY=sk-your-actual-key
```

### "No documents found"
```bash
# Add documents to data/sources/
# Then run:
python -m src.updater.jobs
```

### "Port already in use"
```bash
# Backend (change port)
uvicorn src.app.main:app --port 8001

# Frontend (change port)
cd frontend
npm run dev -- -p 3001
```

### Reset Everything
```bash
# Delete vector store
rm -rf data/chroma/

# Delete metadata
rm data/doc_metadata.json

# Reindex
python -m src.updater.jobs
```

## Environment Variables

### Required
```bash
OPENAI_API_KEY=sk-your-key-here
OPENAI_MODEL=gpt-4o-mini
```

### Optional (with defaults)
```bash
INDEX_NAME=rag_index
CHUNK_SIZE=1024
CHUNK_OVERLAP=100
```

## Git Commands

### Initial Commit
```bash
git add .
git commit -m "Initial commit with cleanup"
git push origin main
```

### Daily Workflow
```bash
# Check status
git status

# Add changes
git add .

# Commit
git commit -m "Your message"

# Push
git push
```

### What NOT to Commit
- `.env` (contains secrets!)
- `data/` folder contents
- `__pycache__/`
- `venv/`
- `node_modules/`

## Performance Tips

### Chunking
- Larger chunks (1024+): Better context, slower search
- Smaller chunks (512): Faster search, less context
- Edit in `.env`: `CHUNK_SIZE=1024`

### Indexing
- Use `advanced_jobs.py` for better parsing
- Run indexing during off-hours
- Only index changed documents (automatic)

### Queries
- Be specific in questions
- Use domain-specific terms
- Check citations for accuracy

## Keyboard Shortcuts (Frontend)

- `Ctrl/Cmd + K` - Focus search
- `Esc` - Close modals
- `Enter` - Submit query

## Support

### Documentation
- [SETUP.md](SETUP.md) - Full setup guide
- [README.md](README.md) - Project overview
- [UPSERT_FIX_README.md](UPSERT_FIX_README.md) - Technical details

### Issues
- Check existing documentation first
- Open GitHub issue with details
- Include error messages and logs

---

**Last Updated:** 2026-01-09  
**Version:** 1.0.0

