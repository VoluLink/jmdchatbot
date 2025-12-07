"""
Vercel FastAPI entrypoint.

This exposes the FastAPI `app` defined in `src/app/main.py` so that
Vercel's Python runtime can detect and deploy the backend.
"""

from src.app.main import app  # noqa: F401


