# Update Deployment Guide (Tar-based, One-line Commands)

This guide updates the production server from a deployment tar while preserving server env/data files.

Current server layout:
- App root: `/home/projekt/jmdchatbot`
- Frontend env: `/home/projekt/jmdchatbot/.env.prod`
- Backend env: `/home/projekt/jmdchatbot/deploy/backend.env`

## Local (PowerShell) - build and upload tar

Run from `G:\rag-seminararbeit`:

```bash
cd G:\rag-seminararbeit
Remove-Item .\jmdchatbot-deploy.tar -ErrorAction SilentlyContinue
tar --exclude='.git' --exclude='.venv' --exclude='frontend/node_modules' --exclude='*.tar' --exclude='.env' --exclude='.env.prod' --exclude='deploy/backend.env' --exclude='data' -cf jmdchatbot-deploy.tar .
tar -tf .\jmdchatbot-deploy.tar > $null
```
## Place .tar in /home/projekt folder
```bash
scp .\jmdchatbot-deploy.tar projekt@116.203.166.18:/home/projekt/jmdchatbot-deploy.tar
# or Use Winscp
```

## Server - extract and sync code

```bash
cd /home/projekt/jmdchatbot
APP=/home/projekt/jmdchatbot; TMP=/tmp/jmd-deploy-$(date +%Y%m%d%H%M%S); TAR=/home/projekt/jmdchatbot-deploy.tar; [ -f "$TAR" ] || TAR=/tmp/jmdchatbot-deploy.tar; mkdir -p "$TMP"; tar -xf "$TAR" -C "$TMP"; echo "USED_TAR=$TAR"
SRC=$(dirname "$(find "$TMP" -maxdepth 5 -type f -name docker-compose.prod.yml 2>/dev/null | head -n1)"); [ -n "$SRC" ] && echo "$SRC" || { echo "docker-compose.prod.yml not found in tar"; exit 1; }
sudo rsync -av --delete --itemize-changes --exclude='.env.prod' --exclude='deploy/backend.env' --exclude='data/' --exclude='.venv/' --exclude='__pycache__/' "$SRC"/ "$APP"/
```

## Server - rebuild/restart services

```bash
cd /home/projekt/jmdchatbot
docker compose -f docker-compose.prod.yml --env-file .env.prod build --no-cache app
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --force-recreate app
if [ ! -x .venv/bin/python ]; then python3 -m venv .venv; fi
. .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
sudo systemctl restart rag-backend.service
```

## Server - verify new code and runtime

```bash
cd /home/projekt/jmdchatbot
grep -n "Nicht indexierte Dateien indexieren" frontend/src/components/DocumentManager.tsx || echo "MARKER_MISSING_DOCMANAGER"
grep -n "INVITE_FRONTEND_URL" frontend/src/app/api/auth/users/route.ts || echo "MARKER_MISSING_INVITE"
grep -n "allow_origins=settings.resolved_cors_origins" src/app/main.py || echo "MARKER_MISSING_CORS"
docker compose -f docker-compose.prod.yml --env-file .env.prod ps
sudo systemctl status rag-backend.service --no-pager
docker compose -f docker-compose.prod.yml --env-file .env.prod exec app printenv NEXT_PUBLIC_API_BASE_URL
curl -I http://127.0.0.1:3000
curl -I http://127.0.0.1:8000/docs
curl -i -X OPTIONS http://127.0.0.1:8000/query -H "Origin: http://116.203.166.18:3000" -H "Access-Control-Request-Method: POST" | grep -i access-control-allow-origin
```

## Cleanup

```bash
rm -rf "$TMP" /tmp/jmdchatbot-deploy.tar /home/projekt/jmdchatbot-deploy.tar
```

## Common errors

- `tar: ... Cannot open`: upload step failed or wrong path; verify `/home/projekt/jmdchatbot-deploy.tar` (or `/tmp/jmdchatbot-deploy.tar`).
- `docker-compose.prod.yml not found in tar`: bad tar content; rebuild tar from repo root.
- `rsync code 23`: run rsync with `sudo` and keep `.venv/` + `__pycache__/` excludes.
- No `Access-Control-Allow-Origin` in preflight: old backend code still deployed or `CORS_ALLOWED_ORIGINS` not set correctly.
