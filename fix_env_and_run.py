"""
Fix environment loading and run the indexing job.

This script explicitly loads the .env file and sets environment variables
before running the indexing job.
"""

import os
import sys
from pathlib import Path


def load_env_file():
    """Load .env file and set environment variables."""
    env_path = Path(".env")
    
    if not env_path.exists():
        print("❌ .env file not found!")
        print(f"   Expected location: {env_path.absolute()}")
        return False
    
    print(f"📄 Loading .env from: {env_path.absolute()}")
    print()
    
    # Read .env file
    with open(env_path, "r", encoding="utf-8") as f:
        lines = f.readlines()
    
    # Parse and set environment variables
    loaded_vars = []
    for line in lines:
        line = line.strip()
        
        # Skip comments and empty lines
        if not line or line.startswith("#"):
            continue
        
        # Parse KEY=VALUE
        if "=" in line:
            key, value = line.split("=", 1)
            key = key.strip()
            value = value.strip()
            
            # Remove quotes if present
            if value.startswith('"') and value.endswith('"'):
                value = value[1:-1]
            if value.startswith("'") and value.endswith("'"):
                value = value[1:-1]
            
            # Set environment variable
            os.environ[key] = value
            loaded_vars.append(key)
            
            # Show preview (hide API key)
            if "KEY" in key or "SECRET" in key:
                preview = value[:10] + "..." if len(value) > 10 else value
                print(f"✅ {key} = {preview}")
            else:
                print(f"✅ {key} = {value}")
    
    print()
    print(f"📊 Loaded {len(loaded_vars)} environment variables")
    print()
    
    # Verify critical variables
    if "OPENAI_API_KEY" not in os.environ:
        print("❌ OPENAI_API_KEY not found in .env file!")
        print()
        print("Your .env file should contain:")
        print("OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxx")
        return False
    
    return True


def run_indexing():
    """Run the indexing job."""
    import asyncio
    from src.updater.advanced_jobs import run_advanced_update_job
    
    print("=" * 60)
    print("🚀 Starting Indexing Job")
    print("=" * 60)
    print()
    
    asyncio.run(run_advanced_update_job())


def main():
    """Main entry point."""
    print()
    print("=" * 60)
    print("🔧 Environment Fix & Indexing Script")
    print("=" * 60)
    print()
    
    # Load .env file
    if not load_env_file():
        print("❌ Failed to load .env file")
        sys.exit(1)
    
    # Run indexing
    try:
        run_indexing()
    except KeyboardInterrupt:
        print("\n\n❌ Aborted by user")
    except Exception as e:
        print(f"\n❌ Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()

