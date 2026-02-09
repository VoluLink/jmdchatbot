# Production Deployment

This repo can be shipped with **2 containers**:
- `app` (Next.js UI + auth API)
- `postgres` (auth DB)

The FastAPI RAG backend runs on the host (systemd) or another machine and is reached via HTTP.

## 1) Prepare environment files

Copy and fill these:

- `deploy/app.env.example` -> `.env.prod`
- `deploy/backend.env.example` -> `deploy/backend.env`

## 2) Start Postgres + App

```bash
# From repo root
cp deploy/app.env.example .env.prod
# edit .env.prod

docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

## 3) Run DB migration

Run once against the Postgres container:

```bash
docker compose -f docker-compose.prod.yml exec postgres psql \
  -U $POSTGRES_USER -d $POSTGRES_DB \
  -f /scripts/001_init_auth.sql
```

Copy the SQL into the container or run locally with `psql`:

```bash
psql "$DATABASE_URL" -f scripts/db/migrations/001_init_auth.sql
```

## 4) Run FastAPI backend (host)

Create the env file:

```bash
cp deploy/backend.env.example deploy/backend.env
# edit deploy/backend.env
```

Register the systemd service (Linux):

```bash
sudo cp deploy/backend.service /etc/systemd/system/rag-backend.service
sudo systemctl daemon-reload
sudo systemctl enable --now rag-backend.service
```

## 5) Reverse proxy + TLS

Use Caddy on the host and point your domain to the server.

```bash
# Install Caddy (per docs)
# then place the file:
sudo cp deploy/caddy/Caddyfile /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

Caddy will route:
- `/` -> Next.js app (port 3000)
- `/query` -> FastAPI backend (port 8000)

## 6) Verify

- Visit https://example.com
- Login / create user
- Ask a question in the chat

## Notes

- If you don't use Caddy, set `NEXT_PUBLIC_API_BASE_URL` to your backend URL.
- Keep Postgres port closed to the public internet.
- Set `JWT_SECRET` and SMTP credentials to real values.
