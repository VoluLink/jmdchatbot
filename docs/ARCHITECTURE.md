# RAG Seminararbeit - Architecture Summary

## Overview

A production-ready Retrieval-Augmented Generation (RAG) application for German legal/domain-specific question answering. Users can upload documents and URLs, which are indexed into a vector store, and then ask questions that are answered with inline citations from the indexed sources.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 16 (App Router), React 19, Tailwind CSS 4 |
| **Backend API** | Python 3.11+, FastAPI, Uvicorn (ASGI) |
| **Database** | PostgreSQL 16 (production) / SQLite (development) |
| **Vector Store** | ChromaDB (embedded, local persistence) |
| **LLM** | OpenAI `gpt-5-mini` (via LlamaIndex) |
| **Embeddings** | OpenAI `text-embedding-3-large` (1536 dimensions) |
| **RAG Framework** | LlamaIndex |
| **Auth** | JWT (jose) + bcryptjs + TOTP 2FA (otplib) |
| **Deployment** | Docker Compose, Node 20-alpine |
| **Icons** | Lucide React |
| **Email** | Nodemailer |
| **SMS (2FA)** | Twilio (with mock mode) |

---

## Backend (FastAPI)

- **Entry point**: `src/app/main.py`
- **Config**: Pydantic BaseSettings (`src/config/settings.py`), loads from `.env`
- **Key endpoints**:
  - `POST /query` - Main RAG query (question, top_k, temperature, chunk_size)
  - `DELETE /documents` - Delete documents by path/URL/prefix
  - `GET/POST /query/index-job` - Trigger and check indexing jobs
  - `GET /health` - Health check
- **CORS**: Configured for frontend origins, credentials enabled

---

## Frontend (Next.js)

- **App Router** with the following pages:
  - `/` - Chat interface (main page)
  - `/login`, `/register`, `/forgot-password`, `/reset-password`
  - `/documents` - Document management (upload, browse, folders)
  - `/users` - User management (admin only)
  - `/settings` - User settings
- **Key components**: `ChatInterface`, `DocumentManager`, `FileUploader`, `UrlSourcesManager`, `Sidebar`, `TwoFaSetupModal`
- **API routes** handle auth, chat sessions, file uploads, URL sources, and document management

---

## RAG Pipeline

```
User Question
     |
     v
Query Transformation (HyDE / Multi-Query / Combined)
     |
     v
Hybrid Retrieval
  +-- Vector Search (ChromaDB + OpenAI embeddings)
  +-- BM25 Keyword Search (rank-bm25, cached nodes)
     |
     v
Reciprocal Rank Fusion (RRF, k=60)
     |
     v
Cross-Encoder Reranking (BAAI/bge-reranker-base)
     |
     v
Top-K Results --> Citation Query Engine (LlamaIndex)
     |
     v
OpenAI LLM (gpt-5-mini) generates answer with [1][2][3] citations
     |
     v
Response with cited sources only
```

### Document Ingestion
- **Basic Loader**: `.txt`, `.md` files (native Python)
- **Advanced Loader**: PDF, DOCX, PPTX, HTML, TXT, MD, JSON, CSV (via LlamaIndex `SimpleDirectoryReader`)
- **Sources**: Local files (`data/sources/`) and configured URLs

### Chunking
- **Strategy**: `SentenceSplitter` (LlamaIndex) - respects sentence boundaries
- **Chunk size**: 512 tokens (configurable)
- **Overlap**: 50 tokens (configurable)

### Retrieval
- **Hybrid search**: BM25 + vector search combined via Reciprocal Rank Fusion
- **BM25 weight**: 0.5 (configurable), vector gets complementary weight
- **Query transformation**: HyDE by default (generates hypothetical answer for better semantic matching)
- **Reranking**: Cross-encoder model (`BAAI/bge-reranker-base`) scores query-document pairs

### Indexing
- **Incremental**: SHA256 content hashes detect changes, only re-indexes modified documents
- **Metadata**: Tracked in `data/doc_metadata.json`
- **Node cache**: `data/nodes_cache.pkl` for BM25 search
- **Background jobs**: Triggered via API, runs in subprocess (non-blocking)
- **URL refresh**: Checks for content changes, manual approval workflow before re-indexing

---

## Authentication & Security

- **Passwords**: bcryptjs hashing
- **Sessions**: JWT (HS256, 7-day expiry) stored in HTTP-only cookies
- **2FA**: TOTP (Google Authenticator/Authy) + SMS codes (Twilio) + backup codes
- **Roles**: Admin and User (admin can manage users and reset passwords)
- **Frontend-managed**: All auth logic lives in Next.js API routes, FastAPI backend is internal

---

## Database

### PostgreSQL / SQLite
- **Users table**: id, email, name, password_hash, role, timestamps, is_active
- **Chat sessions**: Per-user, messages persisted to database
- **2FA tables**: Pending sessions, phone verification, backup codes

### File-Based Persistence
- `data/chroma/` - ChromaDB vector store
- `data/doc_metadata.json` - Document hash tracking
- `data/nodes_cache.pkl` - BM25 node cache
- `data/url_sources.json` - URL source configuration
- `data/sources/` - Uploaded local documents

---

## Deployment

### Docker Compose
- **PostgreSQL 16** service (port 5432, persistent volume)
- **Frontend** service (Next.js, port 3000, multi-stage build with Node 20-alpine)
- **Production config** (`docker-compose.prod.yml`): health checks, dependency ordering, env interpolation

### Backend
- Run directly: `uvicorn src.app.main:app`
- No separate Docker container (runs on host or same machine)

---

## Key Architectural Decisions

1. **Hybrid retrieval** (BM25 + semantic) for better recall than either approach alone
2. **HyDE query transformation** improves semantic relevance by searching with hypothetical answers
3. **Cross-encoder reranking** as a second-pass quality filter on retrieved results
4. **Incremental indexing** via content hashing avoids redundant embedding API calls
5. **Local vector store** (ChromaDB embedded) eliminates external infrastructure dependencies
6. **Frontend-managed auth** keeps the FastAPI backend simple and internal-only
7. **German-language system prompts** tailored for legal domain question answering
8. **Citation-driven responses** with inline `[1][2][3]` references mapped to source documents
9. **URL source management** with manual approval before re-indexing web content changes
10. **Modular document loaders** - easy to add new file format support

---

## Configuration

All settings are configured via environment variables (`.env` file). See `.env.example` for the full list. Key variables:

| Variable | Default | Description |
|---|---|---|
| `OPENAI_API_KEY` | - | Required. OpenAI API key |
| `OPENAI_MODEL` | `gpt-5-mini` | LLM model for response generation |
| `EMBEDDING_MODEL` | `text-embedding-3-large` | Embedding model |
| `EMBEDDING_DIMENSIONS` | `1536` | Embedding vector dimensions |
| `CHUNK_SIZE` | `512` | Document chunk size in tokens |
| `CHUNK_OVERLAP` | `50` | Overlap between chunks |
| `USE_HYBRID_SEARCH` | `true` | Enable BM25 + vector hybrid search |
| `BM25_WEIGHT` | `0.5` | Weight for BM25 vs. vector search |
| `USE_RERANKER` | `true` | Enable cross-encoder reranking |
| `RERANKER_MODEL` | `BAAI/bge-reranker-base` | Reranker model |
| `USE_QUERY_TRANSFORM` | `true` | Enable query transformation |
| `QUERY_TRANSFORM_STRATEGY` | `hyde` | Strategy: hyde, multi_query, combined |
| `DATABASE_URL` | - | PostgreSQL connection string (prod) |
| `JWT_SECRET` | - | Secret for JWT signing |
