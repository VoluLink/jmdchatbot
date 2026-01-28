# AMIKO Frontend

Next.js 14 Frontend für das AMIKO RAG Knowledge Base System.

## Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Öffne [http://localhost:3000](http://localhost:3000) im Browser.

## Voraussetzungen

- Node.js 18+
- Backend läuft auf `http://localhost:8000`

## Backend starten

```bash
# Im Projekt-Root
uvicorn src.app.main:app --reload
```

## Konfiguration

Falls Backend auf anderer URL läuft, erstelle `frontend/.env.local`:

```bash
NEXT_PUBLIC_API_BASE_URL=http://your-backend-url:8000
```

## Weitere Dokumentation

Siehe Haupt-Dokumentation im Projekt-Root: [../README.md](../README.md)
