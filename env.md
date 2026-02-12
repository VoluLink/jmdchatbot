# Environment Variables Reference

Production uses two env files:
- /home/projekt/jmdchatbot/.env.prod (frontend/auth + database)
- /home/projekt/jmdchatbot/deploy/backend.env (FastAPI backend)

Do NOT commit real secrets.

-------------------------------------------------------------------------------
Frontend/Auth (.env.prod)
-------------------------------------------------------------------------------
Required:
POSTGRES_USER=rag_user
POSTGRES_PASSWORD=change-me
POSTGRES_DB=rag_auth
DATABASE_URL=postgresql://rag_user:change-me@postgres:5432/rag_auth

JWT_SECRET=REPLACE_WITH_LONG_RANDOM_SECRET
FRONTEND_URL=https://jmdchatbot.kjf-regensburg.de
NEXT_PUBLIC_API_BASE_URL=https://jmdchatbot.kjf-regensburg.de

-------------------------------------------------------------------------------
Backend (deploy/backend.env)
-------------------------------------------------------------------------------
Required:
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-5-mini
INDEX_NAME=rag_seminararbeit

Paths (must be absolute on server):
LOCAL_DATA_DIR=/home/projekt/jmdchatbot/data/sources
CHROMA_DB_DIR=/home/projekt/jmdchatbot/data/chroma

Optional:
CHUNK_SIZE=1024
CHUNK_OVERLAP=200
SOURCE_URLS=[]
CORS_ALLOWED_ORIGINS=http://116.203.166.18:3000,https://jmdchatbot.kjf-regensburg.de
