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

## 5) Reverse proxy + TLS (nginx)

Install nginx and copy the site config:

```bash
sudo apt install nginx -y
sudo cp deploy/nginx/jmdchatbot.conf /etc/nginx/sites-available/jmdchatbot
sudo ln -sf /etc/nginx/sites-available/jmdchatbot /etc/nginx/sites-enabled/jmdchatbot
sudo rm -f /etc/nginx/sites-enabled/default

# Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

nginx will route:
- `/query`, `/health`, `/documents` -> FastAPI backend (port 8000)
- Everything else -> Next.js app (port 3000)

SSL is handled via Let's Encrypt certificates at `/etc/letsencrypt/live/jmdchatbot.kjf-regensburg.de/`.

## 6) Verify

- Visit https://jmdchatbot.kjf-regensburg.de
- Login / create user
- Ask a question in the chat

## Notes

- Keep Postgres port closed to the public internet.
- Set `JWT_SECRET` to a real value.
- Renew SSL certificates: `sudo certbot renew --nginx`
