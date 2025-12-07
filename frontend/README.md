# RAG Assistant Frontend

This is a Next.js application for the RAG Assistant.

## Prerequisites

- Node.js (v18+)
- Backend running on `http://localhost:8000`

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

## Development

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

## Backend Connection

The frontend connects to the backend at `http://localhost:8000`.
Ensure the backend is running:

```bash
# In the project root
uvicorn src.app.main:app --reload
```

If your backend runs on a different host/port (e.g. in Docker or a remote VM),
set `NEXT_PUBLIC_API_BASE_URL` in `frontend/.env.local`:

```
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
```

## Deploy to Vercel

1. In `frontend/.env.local` (and later in Vercel → Project Settings → Environment Variables) set `NEXT_PUBLIC_API_BASE_URL` to your public backend URL, e.g. `https://your-backend.example.com`.
2. Push the repo or connect Vercel to this `frontend/` folder. When creating the project, set **Root Directory** to `frontend`.
3. Build settings (Vercel auto-detects Next.js):
   - Framework: Next.js
   - Build Command: `npm run build`
   - Install Command: `npm install`
   - Output Directory: `.next`
   - Node.js Version: 18
4. Deploy. After the first deploy, add your Vercel domain (e.g. `https://yourapp.vercel.app`) to the backend CORS allowlist.
5. Test the live site; the chat requests should reach `${NEXT_PUBLIC_API_BASE_URL}/query`.
