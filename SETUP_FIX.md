# 🔧 Fix: Missing OpenAI API Key

## The Problem

You're seeing this error:

```
ValueError: No API key found for OpenAI.
Please set either the OPENAI_API_KEY environment variable or openai.api_key prior to initialization.
```

This means the `.env` file is missing or doesn't have your OpenAI API key configured.

---

## ✅ Solution: Create the .env File

### Option 1: Use the Setup Script (Easiest)

```powershell
python setup_env.py
```

This interactive script will:
1. Ask for your OpenAI API key
2. Ask for the model to use (default: gpt-4o-mini)
3. Optionally ask for web sources
4. Create the `.env` file automatically

### Option 2: Create .env Manually

1. **Create a file named `.env`** in the project root:
   ```
   C:\Users\Maxi Braun\rag-seminararbeit\.env
   ```

2. **Add this content** (replace with your actual API key):

```bash
# OpenAI API Configuration
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
OPENAI_MODEL=gpt-4o-mini

# Data Directories (optional - these are the defaults)
DATA_DIR=./data
CHROMA_DB_DIR=./data/chroma
LOCAL_DATA_DIR=./data/sources

# Web Sources (optional - comma-separated URLs)
SOURCE_URLS=
```

3. **Save the file**

---

## 🔑 Getting Your OpenAI API Key

1. Go to: https://platform.openai.com/account/api-keys
2. Sign in or create an account
3. Click "Create new secret key"
4. Copy the key (starts with `sk-proj-...` or `sk-...`)
5. Paste it into your `.env` file

⚠️ **Important**: Keep your API key secret! Never commit it to Git.

---

## 🧪 Test the Configuration

After creating the `.env` file:

```powershell
# Test by running the indexing job
python -m src.updater.jobs
```

If successful, you should see:
- Documents being loaded
- Embeddings being created
- Index being built

---

## 🚀 Then Start the Web Interface

```powershell
python run_web_interface.py
```

Open: http://127.0.0.1:8000

---

## 💰 Cost Considerations

### Recommended Model: `gpt-4o-mini`
- **Very cheap**: ~$0.15 per 1M input tokens
- **Fast**: Good response times
- **Good quality**: Sufficient for most RAG tasks

### Alternative Models:
- `gpt-4o`: More expensive but higher quality
- `gpt-3.5-turbo`: Older, but still works

For a typical RAG query with 5 sources:
- **Cost**: ~$0.001 - $0.01 per query (depending on document size)
- **30 MB of documents**: Initial indexing ~$0.50 - $2.00 (one-time cost)

---

## 🔒 Security Tips

1. **Never commit `.env` to Git**
   - The `.env` file should be in `.gitignore`
   - Check with: `git status` (should not show .env)

2. **Rotate keys if exposed**
   - If you accidentally commit your key, delete it immediately at:
   - https://platform.openai.com/account/api-keys

3. **Set usage limits**
   - Set monthly spending limits in your OpenAI account
   - Go to: https://platform.openai.com/account/billing/limits

---

## 🆘 Still Having Issues?

### Issue: "RuntimeWarning: 'src.updater.jobs' found in sys.modules"

This warning is harmless and can be ignored. It's a Python module loading quirk.

### Issue: "No such file or directory: .env"

Make sure you're creating the `.env` file in the **project root**:
```
C:\Users\Maxi Braun\rag-seminararbeit\.env
```

Not in a subdirectory!

### Issue: "Invalid API key"

- Check that you copied the entire key (they're long!)
- Make sure there are no extra spaces
- Verify the key is active at: https://platform.openai.com/account/api-keys

---

## ✅ Checklist

- [ ] Created `.env` file in project root
- [ ] Added valid OpenAI API key
- [ ] Set model to `gpt-4o-mini`
- [ ] Added documents to `data/sources/`
- [ ] Ran `python -m src.updater.jobs` successfully
- [ ] Started web interface with `python run_web_interface.py`
- [ ] Opened http://127.0.0.1:8000 in browser

---

**Once the `.env` file is configured, everything should work! 🎉**

