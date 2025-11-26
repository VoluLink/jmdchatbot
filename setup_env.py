"""
Helper script to set up the .env file.

This script helps you create a .env file with the necessary configuration.
"""

import os
from pathlib import Path


def create_env_file():
    """Create a .env file with user input."""
    env_path = Path(".env")
    
    if env_path.exists():
        response = input("⚠️  .env file already exists. Overwrite? (y/N): ")
        if response.lower() != 'y':
            print("❌ Aborted. Keeping existing .env file.")
            return
    
    print("=" * 60)
    print("🔧 RAG System - Environment Setup")
    print("=" * 60)
    print()
    print("This script will help you create a .env file.")
    print()
    
    # Get OpenAI API Key
    print("📝 OpenAI API Key")
    print("   Get your key from: https://platform.openai.com/account/api-keys")
    api_key = input("   Enter your OpenAI API key: ").strip()
    
    if not api_key:
        print("❌ Error: API key is required!")
        return
    
    # Get OpenAI Model
    print()
    print("🤖 OpenAI Model")
    print("   Recommended: gpt-4o-mini (fast and cheap)")
    print("   Alternatives: gpt-4o, gpt-3.5-turbo")
    model = input("   Enter model name [gpt-4o-mini]: ").strip() or "gpt-4o-mini"
    
    # Optional: Source URLs
    print()
    print("🌐 Web Sources (Optional)")
    print("   Enter comma-separated URLs to index")
    print("   Example: https://example.com/doc1.txt,https://example.com/doc2.pdf")
    source_urls = input("   Enter URLs (or press Enter to skip): ").strip()
    
    # Create .env content
    env_content = f"""# OpenAI API Configuration
OPENAI_API_KEY={api_key}
OPENAI_MODEL={model}

# Data Directories (optional - these are the defaults)
DATA_DIR=./data
CHROMA_DB_DIR=./data/chroma
LOCAL_DATA_DIR=./data/sources

# Web Sources (optional - comma-separated URLs)
SOURCE_URLS={source_urls}
"""
    
    # Write .env file
    try:
        with open(".env", "w", encoding="utf-8") as f:
            f.write(env_content)
        
        print()
        print("=" * 60)
        print("✅ Successfully created .env file!")
        print("=" * 60)
        print()
        print("📁 Next steps:")
        print("   1. Add documents to data/sources/")
        print("   2. Run: python -m src.updater.jobs")
        print("   3. Run: python run_web_interface.py")
        print()
        
    except Exception as e:
        print(f"❌ Error writing .env file: {e}")


def main():
    """Main entry point."""
    try:
        create_env_file()
    except KeyboardInterrupt:
        print("\n\n❌ Aborted by user.")
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")


if __name__ == "__main__":
    main()

