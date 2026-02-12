# Update Deployment Guide (Tar-based)

This guide updates an already running production server **from a deployment tar archive**.

It matches our current production setup:
- Next.js app + Postgres via `docker-compose.prod.yml`
- FastAPI backend via `rag-backend.service` (systemd)
- Env files stored on server and preserved across updates

## Server paths (current)

- App root: `/home/projekt/jmdchatbot`
- Frontend/Auth env: `/home/projekt/jmdchatbot/.env.prod`
- Backend env: `/home/projekt/jmdchatbot/deploy/backend.env`

## 1) Build deployment tar locally

From your local repo root (`G:\rag-seminararbeit`):

```bash
tar --exclude='.git' --exclude='.venv' --exclude='frontend/node_modules' --exclude='*.tar' --exclude='.env' --exclude='.env.prod' --exclude='deploy/backend.env' --exclude='data' -cf jmdchatbot-deploy.tar .
```

Validate archive integrity before upload:

```bash
# Linux/macOS shell
tar -tf jmdchatbot-deploy.tar > /dev/null

# PowerShell
tar -tf .\jmdchatbot-deploy.tar > $null
```

## 2) Upload tar to server

Recommended:

```bash
scp jmdchatbot-deploy.tar <user>@<server>:/tmp/jmdchatbot-deploy.tar
```

If `<server>` is not resolvable from your local machine, use the server IP.

SFTP also works (same target path):

```bash
put jmdchatbot-deploy.tar /tmp/jmdchatbot-deploy.tar
```

## 3) Prepare deployment on server

```bash
ssh <user>@<server>
APP=/home/projekt/jmdchatbot
TMP=/tmp/jmd-deploy-$(date +%Y%m%d%H%M%S)

mkdir -p "$TMP"
tar -xf /tmp/jmdchatbot-deploy.tar -C "$TMP"
```

Locate extracted release root (must contain `docker-compose.prod.yml`):

```bash
SRC=$(dirname "$(find "$TMP" -maxdepth 4 -type f -name docker-compose.prod.yml 2>/dev/null | head -n1)")
[ -n "$SRC" ] || { echo "docker-compose.prod.yml not found in archive"; exit 1; }
```

## 4) Sync release while preserving env/data

Important: keep server-owned env files and runtime data.

```bash
sudo rsync -a --delete \
  --exclude='.env.prod' \
  --exclude='deploy/backend.env' \
  --exclude='data/' \
  --exclude='.venv/' \
  --exclude='__pycache__/' \
  "$SRC"/ "$APP"/
```

## 5) Redeploy services

```bash
cd "$APP"
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

Ensure backend venv exists, then restart backend:

```bash
if [ ! -x "$APP/.venv/bin/python" ]; then
  python3 -m venv "$APP/.venv"
fi

. "$APP/.venv/bin/activate"
pip install --upgrade pip
pip install -r requirements.txt

sudo systemctl restart rag-backend.service
```

## 6) Verify deployment

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod ps
sudo systemctl status rag-backend.service --no-pager
curl -I http://127.0.0.1:3000
curl -I http://127.0.0.1:8000/docs
```

## 7) Cleanup

```bash
rm -rf "$TMP" /tmp/jmdchatbot-deploy.tar
```

## Troubleshooting

- `tar: ... Cannot open`: tar not uploaded to expected path. Check `/tmp/jmdchatbot-deploy.tar`.
- `open .../docker-compose.prod.yml: no such file`: sync failed or wrong source root. Re-run step 3 (`SRC`) and step 4.
- `status=203/EXEC` for `rag-backend.service`: missing backend venv/python. Re-run step 5 venv block.
- `POSTGRES_* variable is not set` warnings in compose: run compose commands with `--env-file .env.prod`.
- `rsync code 23` with permissions on `.venv`/`__pycache__`: use `sudo rsync` and keep the excludes shown above.

## Rollback

Re-deploy the previous known-good tar with the same steps:

1. Upload previous tar to `/tmp/jmdchatbot-deploy.tar`
2. Repeat steps 3 to 6

This restores code while keeping current `.env.prod`, `deploy/backend.env`, and `data/`.
