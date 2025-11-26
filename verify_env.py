"""
Verify that the .env file is configured correctly.
"""

import os
from pathlib import Path


def verify_env():
    """Check if .env file exists and has required variables."""
    print("=" * 60)
    print("🔍 Environment Configuration Verification")
    print("=" * 60)
    print()
    
    # Check if .env exists
    env_path = Path(".env")
    if not env_path.exists():
        print("❌ .env file not found in project root!")
        print(f"   Expected location: {env_path.absolute()}")
        return False
    
    print(f"✅ .env file found at: {env_path.absolute()}")
    print()
    
    # Try to load settings
    print("📋 Checking configuration...")
    print()
    
    try:
        from src.config.settings import get_settings
        
        settings = get_settings()
        
        # Check API key
        if not settings.openai_api_key:
            print("❌ OPENAI_API_KEY is not set or is empty!")
            print()
            print("   Your .env file should contain:")
            print("   OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxx")
            return False
        
        key_preview = settings.openai_api_key[:10] + "..." if len(settings.openai_api_key) > 10 else settings.openai_api_key
        print(f"✅ OPENAI_API_KEY is set: {key_preview}")
        print(f"   Length: {len(settings.openai_api_key)} characters")
        print()
        
        # Check model
        print(f"✅ OPENAI_MODEL: {settings.openai_model}")
        print()
        
        # Check directories
        print(f"✅ DATA_DIR: {settings.data_dir}")
        print(f"✅ CHROMA_DB_DIR: {settings.chroma_db_dir}")
        print(f"✅ LOCAL_DATA_DIR: {settings.local_data_dir}")
        print()
        
        # Check if directories exist
        if settings.local_data_dir.exists():
            files = list(settings.local_data_dir.glob("**/*"))
            file_count = len([f for f in files if f.is_file()])
            print(f"📁 Found {file_count} files in {settings.local_data_dir}")
        else:
            print(f"⚠️  Directory {settings.local_data_dir} doesn't exist yet")
            print("   It will be created automatically")
        
        print()
        print("=" * 60)
        print("✅ Configuration looks good!")
        print("=" * 60)
        print()
        print("📝 Next steps:")
        print("   1. Add documents to data/sources/")
        print("   2. Run: python -m src.updater.jobs")
        print("   3. Run: python run_web_interface.py")
        print()
        
        return True
        
    except Exception as e:
        print(f"❌ Error loading configuration: {e}")
        print()
        print("💡 Common issues:")
        print("   1. Make sure .env has: OPENAI_API_KEY=your_key")
        print("   2. No spaces around the = sign")
        print("   3. No quotes around the value")
        print("   4. Key should start with 'sk-'")
        print()
        return False


if __name__ == "__main__":
    try:
        verify_env()
    except KeyboardInterrupt:
        print("\n\n❌ Aborted by user.")
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")

