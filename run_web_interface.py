"""
Startup script for the RAG Web Interface.

This script starts the combined FastAPI + Gradio application.
"""

import os
import subprocess
import sys
from pathlib import Path


def load_env_file():
    """Load .env file and set environment variables."""
    env_path = Path(".env")
    
    if not env_path.exists():
        print("⚠️  Warning: .env file not found")
        return
    
    # Read and parse .env file
    with open(env_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            
            key, value = line.split("=", 1)
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            os.environ[key] = value


def main():
    """Start the web interface."""
    print("🚀 Starting RAG Seminararbeit Web Interface...")
    print("=" * 60)
    print("📍 Web UI will be available at: http://127.0.0.1:8000")
    print("📚 API Documentation at: http://127.0.0.1:8000/docs")
    print("💚 Health Check at: http://127.0.0.1:8000/health")
    print("=" * 60)
    print()
    
    # Load environment variables from .env
    load_env_file()
    
    print("Press Ctrl+C to stop the server\n")

    try:
        subprocess.run(
            [sys.executable, "-m", "uvicorn", "src.app.main:app", "--reload"],
            check=True,
        )
    except KeyboardInterrupt:
        print("\n\n👋 Shutting down gracefully...")
    except subprocess.CalledProcessError as e:
        print(f"\n❌ Error starting server: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()

