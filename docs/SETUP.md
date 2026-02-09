# RAG Seminararbeit - Setup Guide

## 🚀 Quick Start

### Prerequisites

- Python 3.10 or higher
- Node.js 18+ and npm (for frontend)
- OpenAI API key

### 1. Clone & Setup Python Environment

```bash
# Clone the repository
git clone <your-repo-url>
cd rag-seminararbeit

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# For development (optional)
pip install -r requirements-dev.txt
```

### 2. Configure Environment Variables

```bash
# Copy the example environment file
cp env.example .env

# Edit .env and add your OpenAI API key
# OPENAI_API_KEY=sk-your-actual-key-here
```

For production deployment, see `docs/PRODUCTION.md`.

### 3. Initialize Database & Index

```bash
# The system will automatically create necessary directories:
# - data/chroma/        (vector store)
# - data/sources/       (document storage)
# - data/auth.db        (user authentication)
```

### 4. Add Documents

Place your documents in `data/sources/`:
- Supported formats: PDF, DOCX, PPTX, TXT, MD, HTML
- The system will automatically process them

### 5. Index Documents

```bash
# Run the indexing job
python -m src.updater.jobs

# Or use advanced indexing with better parsing
python -m src.updater.advanced_jobs
```

### 6. Start Backend Server

```bash
# Development mode
uvicorn src.app.main:app --reload --port 8000

# Production mode
uvicorn src.app.main:app --host 0.0.0.0 --port 8000
```

### 7. Setup Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
npm start
```

## 📁 Project Structure

```
rag-seminararbeit/
├── api/                    # Vercel deployment entry point
├── data/                   # Data storage
│   ├── chroma/            # Vector store (gitignored)
│   ├── sources/           # Your documents (gitignored)
│   ├── auth.db            # User database (gitignored)
│   ├── doc_metadata.json  # Document metadata (gitignored)
│   └── url_sources.json   # URL sources config (gitignored)
├── frontend/              # Next.js frontend
│   ├── src/
│   │   ├── app/          # Next.js app router
│   │   ├── components/   # React components
│   │   └── contexts/     # React contexts
│   └── package.json
├── scripts/               # Utility scripts
│   ├── extract_pdf.py    # PDF text extraction
│   ├── extract_docx.py   # DOCX text extraction
│   └── test_upsert_fix.py # Test upsert behavior
├── src/                   # Python backend
│   ├── app/              # FastAPI application
│   ├── auth/             # Authentication system
│   ├── config/           # Configuration
│   ├── indexing/         # Vector index management
│   ├── ingestion/        # Document loading
│   └── updater/          # Background jobs
├── requirements.txt       # Python dependencies
├── requirements-dev.txt   # Development dependencies
├── env.example           # Environment variables template
└── README.md             # Main documentation
```

## 🔧 Configuration

### Environment Variables

Edit `.env` file:

```bash
# Required
OPENAI_API_KEY=sk-your-key-here
OPENAI_MODEL=gpt-4o-mini

# Optional (defaults shown)
INDEX_NAME=rag_index
CHUNK_SIZE=1024
CHUNK_OVERLAP=100
```

### Chunking Strategy

The system uses semantic chunking with:
- **Chunk Size**: 1024 tokens (configurable)
- **Chunk Overlap**: 100 tokens (configurable)
- **Parser**: SentenceSplitter (preserves sentence boundaries)

## 📚 Usage

### Adding Documents

**Option 1: File Upload (via UI)**
1. Navigate to `/documents` page
2. Click "Datei hochladen"
3. Select your files
4. Click "Update-Job ausführen" to index

**Option 2: Manual Copy**
1. Copy files to `data/sources/`
2. Run: `python -m src.updater.jobs`

**Option 3: URL Sources**
1. Navigate to `/documents` page
2. Scroll to "URL-Quellen" section
3. Click "URL hinzufügen"
4. Enter URL and name
5. System will automatically check for updates daily
6. Click "Update Index" when changes are detected

### Querying

**Via UI:**
- Navigate to home page
- Type your question
- Get AI-powered answers with citations

**Via API:**
```bash
curl -X POST http://localhost:8000/query \
  -H "Content-Type: application/json" \
  -d '{"query": "Was sind die Voraussetzungen für §25b?"}'
```

## 🔄 Background Jobs

### URL Refresh Job
Automatically checks URL sources for changes:
```bash
python -m src.updater.url_refresh_job
```

### Apply URL Updates
Apply pending updates to index:
```bash
# Apply specific source
python -m src.updater.apply_url_updates --source-id <id>

# Apply all pending updates
python -m src.updater.apply_url_updates --all
```

### File Indexing Job
Index new/changed files:
```bash
python -m src.updater.jobs
```

## 👥 User Management

### Register User
```bash
python -m src.auth.register_user
```

### List Users
```bash
python -m src.auth.list_users
```

### Delete User
```bash
python -m src.auth.delete_user
```

### Verify Login
```bash
python -m src.auth.verify_user
```

## 🧪 Testing

### Test Upsert Fix
```bash
python -m scripts.test_upsert_fix
```

### Run Tests (if using pytest)
```bash
pytest tests/
```

## 🐛 Troubleshooting

### "Module not found" errors
```bash
# Make sure you're in the virtual environment
# and have installed all dependencies
pip install -r requirements.txt
```

### "OpenAI API key not found"
```bash
# Check your .env file exists and has:
OPENAI_API_KEY=sk-your-actual-key-here
```

### "No documents found"
```bash
# Make sure documents are in data/sources/
# and run the indexing job:
python -m src.updater.jobs
```

### Vector store errors
```bash
# Delete and reinitialize the vector store
rm -rf data/chroma/
python -m src.updater.jobs
```

## 📖 Documentation

- [README.md](README.md) - Main documentation
- [AUTH_SETUP_GUIDE.md](AUTH_SETUP_GUIDE.md) - Authentication setup
- [AUTHENTICATION_README.md](AUTHENTICATION_README.md) - Auth system details
- [DOCUMENT_SOURCES_GUIDE.md](DOCUMENT_SOURCES_GUIDE.md) - Document management
- [UPSERT_FIX_README.md](UPSERT_FIX_README.md) - Upsert fix details
- [SETUP_AUTOMATED_CHECKS.md](SETUP_AUTOMATED_CHECKS.md) - Automated checks

## 🚀 Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy!

### Docker (Alternative)

```bash
# Build image
docker build -t rag-seminararbeit .

# Run container
docker run -p 8000:8000 -p 3000:3000 \
  -e OPENAI_API_KEY=your-key \
  rag-seminararbeit
```

## 📝 License

[Your License Here]

## 🤝 Contributing

Contributions welcome! Please read contributing guidelines first.

## 📧 Support

For issues and questions, please open a GitHub issue.

