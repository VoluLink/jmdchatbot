# Document Sources Management Guide

## Overview

Your RAG system now supports **two types of content sources** with comprehensive management interfaces:

1. **📁 File Upload** - Upload documents with optional folder organization
2. **🌐 URL Sources** - Automatically fetch and update content from web sources

---

## 📁 File Upload

### Features

- **Drag & Drop**: Drag files directly onto the upload zone
- **Multi-file Upload**: Upload multiple files at once
- **Folder Targeting**: Upload directly to specific folders (e.g., `Beratung/§25a`)
- **Format Support**: PDF, DOCX, PPTX, TXT, MD, HTML, and more
- **Progress Tracking**: See upload status with success/error indicators

### How to Use

1. Navigate to `/documents`
2. Optionally enter a target folder (e.g., `Beratung` or `Beratung/§25a`)
3. Drag files onto the upload zone OR click to browse
4. Click "Hochladen"
5. Run the update job to index: `python -m src.updater.advanced_jobs`

### API Endpoint

```http
POST /api/sources/upload
Content-Type: multipart/form-data

files: File[]
targetFolder: string (optional)
```

---

## 🌐 URL Sources

### Features

- **Automatic Change Detection**: URLs are checked at configured intervals for changes
- **Manual Approval**: Changes are flagged but not auto-indexed - you decide when to update
- **Custom Intervals**: Set check intervals in days (min: 1 day, default: daily)
- **Status Tracking**: See last check time, success/error status, pending updates
- **Enable/Disable**: Toggle sources on/off without deleting
- **Smart Updates**: Only flags actual content changes (hash comparison)

### How to Use

1. Navigate to `/documents` → scroll to **URL-Quellen** section
2. Click **"URL hinzufügen"**
3. Enter:
   - **Name**: Friendly name (e.g., "Gesetze Portal")
   - **URL**: Full URL (e.g., `https://example.com/documents`)
   - **Interval**: How often to check for changes (in days, default: 1 = daily)
4. Save

### URL Refresh Workflow

**Step 1: Check for changes (automated)**
```bash
python -m src.updater.url_refresh_job
```

This detects changes but **does not auto-index**. Sources with changes are flagged as "pending update".

**Step 2: Apply updates (manual approval)**

Via UI:
- Go to `/documents` → URL-Quellen section
- Sources with ⚠️ "Änderungen erkannt" badge
- Click "Update Index" button to approve

Via CLI:
```bash
# Apply specific source
python -m src.updater.apply_url_updates --source-id url_123...

# Apply all pending updates
python -m src.updater.apply_url_updates --all
```

**Automated checking** (recommended):

#### Windows Task Scheduler
```powershell
# Create a scheduled task that runs daily at 2 AM
schtasks /create /tn "RAG URL Check" /tr "python -m src.updater.url_refresh_job" /sc daily /st 02:00
```

#### Linux/Mac (cron)
```bash
# Add to crontab (runs daily at 2 AM)
0 2 * * * cd /path/to/rag-seminararbeit && python -m src.updater.url_refresh_job
```

### API Endpoints

```http
# List all URL sources
GET /api/sources/urls

# Add new URL source
POST /api/sources/urls
{
  "url": "https://example.com/page",
  "name": "Example Source",
  "fetchInterval": 60,
  "enabled": true
}

# Update URL source
PATCH /api/sources/urls
{
  "id": "url_123...",
  "name": "New Name",
  "fetchInterval": 120,
  "enabled": false
}

# Delete URL source
DELETE /api/sources/urls?id=url_123...
```

---

## 🗂️ Folder Management

### Features (Implemented)

- **Right-click Context Menu**: Access all folder/file operations
- **Create Folders**: Organize documents hierarchically
- **Rename**: Change folder/file names
- **Move**: Drag & drop OR use the move dialog
- **Delete**: Remove folders (recursive) or files
- **Nested Paths**: Full support for subfolders (e.g., `Beratung/§25a/Checklisten`)

### How to Use

1. **Create Folder**: Click "Neuer Ordner" or right-click parent → "Unterordner erstellen"
2. **Rename**: Right-click → "Umbenennen"
3. **Move**: 
   - Drag & drop files/folders
   - OR right-click → "Verschieben" → select target
4. **Delete**: Right-click → "Löschen"

### Important Notes

- After moving/renaming files/folders, run the update job to sync the index
- The folder structure is **physical** (real directories in `data/sources`)
- Folders are deleted recursively (all contents removed)

---

## 🔄 Update Jobs

### Local Files (Manual)

After uploading files or changing folder structure:

```bash
python -m src.updater.advanced_jobs
```

**Options:**
- `--force`: Reindex all documents (ignore hashes)
- `--semantic`: Use semantic splitter (slower, better quality)
- `--pdf-only`: Only process PDFs
- `--office-only`: Only process Office documents

### URL Sources (Automated)

```bash
python -m src.updater.url_refresh_job
```

This should run **automatically** via cron/scheduler (see above).

**How it works:**
1. Checks each enabled URL source
2. If `lastFetched` + `fetchInterval` has passed, fetches the URL
3. Compares content hash to detect changes
4. Only updates index if content changed
5. Updates `lastFetched` and `lastError` timestamps

---

## 📊 Data Storage

### Files

- **Location**: `data/sources/` (and subfolders)
- **Index Metadata**: `data/doc_metadata.json` (auto-generated)
- **Vector Store**: `data/chroma/` (ChromaDB)

### URL Sources

- **Configuration**: `data/url_sources.json`
- **Structure**:
```json
[
  {
    "id": "url_1234567890_abc123",
    "url": "https://example.com/page",
    "name": "Example Source",
    "fetchInterval": 60,
    "enabled": true,
    "lastFetched": "2026-01-09T17:45:00Z",
    "lastError": null,
    "createdAt": "2026-01-09T17:00:00Z",
    "updatedAt": "2026-01-09T17:45:00Z"
  }
]
```

---

## 🎯 Best Practices

### File Upload

1. ✅ Organize files into folders **before** indexing
2. ✅ Use descriptive folder names (e.g., `Beratung/§25a`, `Einbürgerung`)
3. ✅ Upload in batches, then run update job once
4. ✅ Check upload results for errors

### URL Sources

1. ✅ Set realistic intervals (60+ minutes for most sites)
2. ✅ Test URLs manually first to ensure they're accessible
3. ✅ Disable sources if they consistently fail
4. ✅ Use cron/scheduler for automatic refresh (don't run manually each time)
5. ✅ Monitor `lastError` field for issues

### Index Management

1. ✅ Run update jobs **after** bulk changes (not after each file)
2. ✅ Use `--force` only when necessary (e.g., after major changes)
3. ✅ Keep `doc_metadata.json` in sync (don't edit manually)
4. ✅ Back up `data/chroma/` regularly

---

## 🔧 Troubleshooting

### File Upload Fails

- **Check**: File format is supported
- **Check**: Target folder exists (create it first)
- **Check**: File doesn't already exist (rename or delete old version)
- **Check**: Permissions on `data/sources/`

### URL Source Fails

- **Check**: URL is publicly accessible
- **Check**: URL returns HTML/text (not binary)
- **Check**: No authentication required
- **Check**: Site doesn't block automated requests
- **Check**: `lastError` field for specific error message

### Index Not Updated

- **Check**: Update job ran successfully
- **Check**: Files are in `data/sources/` (not elsewhere)
- **Check**: Content hash actually changed (URL sources)
- **Check**: ChromaDB not locked by another process

---

## 🚀 Quick Start

### Scenario 1: Upload Local Files

```bash
# 1. Upload files via UI → target folder: "Beratung"
# 2. Run update job
python -m src.updater.advanced_jobs
# 3. Files now indexed and searchable
```

### Scenario 2: Add URL Source

```bash
# 1. Add URL via UI → fetch interval: 60 minutes
# 2. Run initial fetch
python -m src.updater.url_refresh_job
# 3. Set up cron/scheduler for automatic updates
```

### Scenario 3: Organize Existing Files

```bash
# 1. Create folders via UI (e.g., "Gesetze", "Checklisten")
# 2. Drag files into folders
# 3. Run update job to sync index
python -m src.updater.advanced_jobs --force
```

---

## 📝 Summary

- **File Upload**: Drag & drop, multi-file, folder targeting
- **URL Sources**: Automatic fetching, configurable intervals
- **Folder Management**: Full CRUD, drag & drop, right-click menu
- **Update Jobs**: Manual (files) + Automated (URLs)
- **Storage**: `data/sources/` (files) + `data/url_sources.json` (URLs)

**Next Steps:**
1. Upload your first files or add URL sources
2. Set up automated URL refresh (cron/scheduler)
3. Organize documents into folders
4. Test queries in the chat interface

