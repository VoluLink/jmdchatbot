#!/usr/bin/env python3
"""Create .env file with proper encoding."""

env_content = """# OpenAI API Key (erforderlich für LLM-Funktionen)
OPENAI_API_KEY=sk-your-openai-api-key-here

# OpenAI Modell (optional, Default: gpt-4o-mini)
OPENAI_MODEL=gpt-4o-mini

# ChromaDB Index Name (optional, Default: rag_seminararbeit)
INDEX_NAME=rag_seminararbeit

# Chunking-Parameter (optional)
CHUNK_SIZE=1024
CHUNK_OVERLAP=200

# URLs für automatische Updates (optional, als JSON-Liste)
# Beispiel: SOURCE_URLS=["https://example.com/api/laws","https://another.com/docs"]
SOURCE_URLS=[]

# Lokales Datenverzeichnis (optional, Default: data/sources)
LOCAL_DATA_DIR=data/sources

# ChromaDB Verzeichnis (optional, Default: data/chroma)
CHROMA_DB_DIR=data/chroma
"""

with open('.env', 'w', encoding='utf-8') as f:
    f.write(env_content)

print("Created .env file with proper UTF-8 encoding")
