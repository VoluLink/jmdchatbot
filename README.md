## RAG Seminararbeit – Modulare LlamaIndex-Pipeline

Dieses Projekt demonstriert eine modulare Retrieval-Augmented-Generation (RAG) Pipeline mit **LlamaIndex**, **Chroma** als lokalem VectorStore und einem **FastAPI**-Query-Service.

Ziele:

- **ca. 30 MB Textdaten** verarbeiten (lokale Dateien + Web-Quellen)
- **neuen Content per Upload** (Dateien einfach ins Datenverzeichnis legen)
- **automatische Updates** über einen Update-Job (z. B. Gesetzestexte per URL)
- **inkrementelles Indexing** mit persistentem Chroma-Storage
- später **als API/Service** nutzbar

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
├─ tests               # Platz für Tests
├─ requirements.txt    # Python-Abhängigkeiten
└─ README.md
```

---

## Voraussetzungen

- **Python 3.11**
- Internetzugang (für Modell-API und optionale Web-Quellen)

Empfohlen: Nutzung in einem **virtuellen Environment**.

---

## Setup

### 1. Repository vorbereiten

Im Projektroot (z. B. `C:\Users\User\Desktop\rag-seminararbeit`):

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

---

## Konfiguration (.env)

Im Projektroot eine Datei `.env` anlegen, z. B.:

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

```bash
python -m src.updater.jobs
```

Dies kann auch über einen Scheduler (z. B. `cron`, Windows Task Scheduler, Airflow) periodisch gestartet werden.

---

## FastAPI-Query-Service starten

Stelle sicher, dass mindestens ein Update-Lauf stattgefunden hat (oder initial Daten indexiert wurden).

```bash
uvicorn src.app.main:app --reload
```

Standardmäßig läuft die API unter `http://127.0.0.1:8000`.

### Wichtige Endpoints

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
  - Weitere Loader-Funktionen in `src/ingestion` hinzufügen (z. B. Datenbanken, APIs)
- **Andere VectorStores**:
  - Anderen `VectorStore` in `src/indexing/index_manager.py` verwenden
- **Alternative LLMs**:
  - In `IndexManager` das LLM wechseln (z. B. lokale Modelle über `llama-index-llms-...`)
- **API-Erweiterung**:
  - Weitere Endpoints in `src/app/main.py` hinzufügen (z. B. Admin-Routen, Debug-Infos)

Die Struktur ist bewusst modular gehalten, damit Komponenten unabhängig erweitert oder ersetzt werden können.

