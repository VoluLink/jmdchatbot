## RAG Seminararbeit – Modulare LlamaIndex-Pipeline

Dieses Projekt demonstriert eine modulare Retrieval-Augmented-Generation (RAG) Pipeline mit **LlamaIndex**, **Chroma** als lokalem VectorStore, einem **FastAPI**-Query-Service und einem modernen **Next.js**-Frontend.

Ziele:

- **ca. 30 MB Textdaten** verarbeiten (lokale Dateien + Web-Quellen)
- **neuen Content per Upload** (Dateien einfach ins Datenverzeichnis legen)
- **automatische Updates** über einen Update-Job (z. B. Gesetzestexte per URL)
- **inkrementelles Indexing** mit persistentem Chroma-Storage
- **modernes Web-Interface** mit Chat, Dokumentenverwaltung und Benutzereinstellungen

---

## Projektstruktur

```text
.
├─ src
│  ├─ ingestion        # Loader für lokale Dateien und URLs
│  ├─ indexing         # LlamaIndex + Chroma, inkrementelle Updates
│  ├─ updater          # Update-Job (scheduled/cron-fähig)
│  ├─ app              # FastAPI-App (Query-Service)
│  └─ config           # Settings, .env-Handling
├─ frontend            # Next.js Web-Interface
│  ├─ src/app          # App Router Pages
│  ├─ src/components   # React-Komponenten
│  └─ src/lib          # Utilities & Hooks
├─ requirements.txt    # Python-Abhängigkeiten
└─ README.md
```

---

## Voraussetzungen

- **Python 3.11**
- **Node.js 18+** (für das Frontend)
- Internetzugang (für Modell-API und optionale Web-Quellen)

Empfohlen: Nutzung in einem **virtuellen Environment**.

---

## Setup

### 1. Repository vorbereiten

Im Projektroot (z. B. `C:\Users\User\Desktop\rag-seminararbeit`):

```bash
cd rag-seminararbeit
```

### 2. Virtuelle Umgebung anlegen

- **Windows (PowerShell)**:

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
```

- **macOS / Linux (Bash)**:

```bash
python3 -m venv .venv
source .venv/bin/activate
```

### 3. Abhängigkeiten installieren

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### 4. Frontend installieren

```bash
cd frontend
npm install
cd ..
```

---

## Konfiguration (.env)

Im Projektroot eine Datei `.env` anlegen, z. B.:

```bash
OPENAI_API_KEY=dein_openai_api_key
OPENAI_MODEL=gpt-4o-mini

# Verzeichnisse (optional, haben Defaults)
DATA_DIR=./data
CHROMA_DB_DIR=./data/chroma
LOCAL_DATA_DIR=./data/sources

# Komma-separierte Liste von URLs (z. B. Gesetzestexte)
SOURCE_URLS=https://example.com/gesetz1,https://example.com/gesetz2
```

Die Werte werden über `src/config/settings.py` mit `pydantic-settings` geladen.

---

## Daten hinzufügen

- **Lokale Dateien**:
  - Textdateien (`.txt`, `.md`) in das Verzeichnis `data/sources` legen
  - Unterordner sind erlaubt, sie werden rekursiv eingelesen

- **Web-Quellen**:
  - URLs in der `.env` unter `SOURCE_URLS` (komma-separiert) pflegen

Beim nächsten Update-Lauf werden neue/aktualisierte Dokumente erkannt und in den Index eingefügt.

---

## Inkrementelles Indexing & Update-Job

Der Update-Job:

- lädt alle Dokumente (lokal + URLs) über `src/ingestion/loader.py`
- berechnet Hashes pro Dokument (Inhalts-Hash)
- vergleicht diese mit den gespeicherten Metadaten (`data/doc_metadata.json`)
- fügt nur **neue oder veränderte** Dokumente über `IndexManager` in den Index ein

### Einmaligen Update-Lauf ausführen

**Option 1: Advanced Parsing (Empfohlen)** 🚀

```bash
python -m src.updater.advanced_jobs
```

Unterstützt: PDF, DOCX, PPTX, HTML, TXT, MD und mehr!

**Option 2: Basic Parsing**

```bash
python -m src.updater.jobs
```

Nur für `.txt` und `.md` Dateien.

Dies kann auch über einen Scheduler (z. B. `cron`, Windows Task Scheduler, Airflow) periodisch gestartet werden.

---

## Web Interface starten

Stelle sicher, dass mindestens ein Update-Lauf stattgefunden hat (oder initial Daten indexiert wurden).

### Option 1: Next.js Frontend (Empfohlen) 🎨

Das moderne Web-Interface bietet eine vollständige Benutzeroberfläche:

**Terminal 1 – Backend starten:**

```bash
uvicorn src.app.main:app --reload
```

**Terminal 2 – Frontend starten:**

```bash
cd frontend
npm run dev
```

Öffne dann [http://localhost:3000](http://localhost:3000) im Browser.

#### Frontend Features

| Seite | Beschreibung |
|-------|--------------|
| **💬 Chat** | Konversationelles RAG-Interface mit Chatverlauf |
| **📄 Dokumente** | Übersicht aller indexierten Dokumente, Upload-Funktion |
| **👥 Benutzer** | Benutzerverwaltung mit Rollen (Admin/User) |
| **⚙️ Einstellungen** | Retrieval-Parameter (top_k), Anzeigeoptionen, Sprache |

#### Endpoints

- **🎨 Frontend**: `http://localhost:3000`
- **📚 API Dokumentation**: `http://localhost:8000/docs` (Swagger UI)
- **💚 Health Check**: `http://localhost:8000/health`

### Option 2: REST API Endpoints

Die FastAPI-Endpoints sind direkt nutzbar:

- `GET /health` – einfacher Healthcheck
- `POST /query` – Frage an den RAG-Index stellen

**Beispiel-Request (`POST /query`):**

```json
{
  "question": "Welche Paragraphen sind für das Thema Datenschutz besonders relevant?",
  "top_k": 5
}
```

**Beispiel-Response (vereinfacht):**

```json
{
  "answer": "Die wichtigsten Paragraphen sind ...",
  "sources": [
    {
      "score": 0.87,
      "source": "local",
      "path": "data/sources/bdsG_teil1.txt",
      "url": null
    }
  ]
}
```

---

## Erweiterbarkeit

- **Neue Datenquellen**:
  - Weitere Loader-Funktionen in `src/ingestion` hinzufügen (z. B. Datenbanken, APIs)
- **Andere VectorStores**:
  - Anderen `VectorStore` in `src/indexing/index_manager.py` verwenden
- **Alternative LLMs**:
  - In `IndexManager` das LLM wechseln (z. B. lokale Modelle über `llama-index-llms-...`)
- **API-Erweiterung**:
  - Weitere Endpoints in `src/app/main.py` hinzufügen (z. B. Admin-Routen, Debug-Infos)
- **Frontend anpassen**:
  - Komponenten in `frontend/src/components` erweitern
  - Neue Seiten in `frontend/src/app` hinzufügen

Die Struktur ist bewusst modular gehalten, damit Komponenten unabhängig erweitert oder ersetzt werden können.

---

## 📚 Dokumentation

Detaillierte Setup- und Konfigurationsanleitungen findest du im [`docs/`](./docs/) Ordner:

- **[Setup-Anleitung](./docs/SETUP.md)** - Detaillierte Einrichtungsschritte
- **[Schnellreferenz](./docs/QUICK_REFERENCE.md)** - Häufig verwendete Befehle
- **[Authentifizierung](./docs/AUTHENTICATION_README.md)** - Two-Factor Authentication (2FA)
- **[SMTP Setup](./docs/SMTP_SETUP.md)** - E-Mail-Server für Password Reset
- **[Dokumentenverwaltung](./docs/DOCUMENT_SOURCES_GUIDE.md)** - Dokumente hochladen und verwalten

Alle verfügbaren Guides: [docs/README.md](./docs/README.md)
