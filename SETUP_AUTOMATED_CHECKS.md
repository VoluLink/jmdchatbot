# Automatische URL-Prüfung einrichten

## Übersicht

Die URL-Quellen werden **automatisch täglich** auf Änderungen geprüft. Dies geschieht im Hintergrund, ohne dass Sie etwas tun müssen. Wenn Änderungen erkannt werden, erscheint ein **⚠️ "Änderungen erkannt"** Badge in der UI, und Sie können die Änderungen manuell bestätigen.

## 🔧 Einrichtung (einmalig)

### Windows (Task Scheduler)

**Option 1: PowerShell (Empfohlen)**
```powershell
# Täglich um 2:00 Uhr
schtasks /create /tn "RAG URL Check" /tr "cd /d G:\rag-seminararbeit && python -m src.updater.url_refresh_job" /sc daily /st 02:00

# Oder mehrmals täglich (z.B. alle 12 Stunden)
schtasks /create /tn "RAG URL Check" /tr "cd /d G:\rag-seminararbeit && python -m src.updater.url_refresh_job" /sc daily /mo 12 /st 02:00
```

**Option 2: Task Scheduler GUI**
1. Öffne **Task Scheduler** (Aufgabenplanung)
2. Klicke **"Einfache Aufgabe erstellen"**
3. Name: `RAG URL Check`
4. Trigger: **Täglich um 2:00 Uhr**
5. Aktion: **Programm starten**
   - Programm: `python`
   - Argumente: `-m src.updater.url_refresh_job`
   - Starten in: `G:\rag-seminararbeit`
6. Fertigstellen

---

### Linux / macOS (Cron)

```bash
# Crontab bearbeiten
crontab -e

# Folgende Zeile hinzufügen (täglich um 2:00 Uhr)
0 2 * * * cd /path/to/rag-seminararbeit && python -m src.updater.url_refresh_job

# Oder mehrmals täglich (z.B. alle 12 Stunden um 2:00 und 14:00)
0 2,14 * * * cd /path/to/rag-seminararbeit && python -m src.updater.url_refresh_job
```

---

## 🔄 Workflow

### 1. Automatische Prüfung (Hintergrund)
```
⏰ Täglich um 2:00 Uhr
├─ Job läuft automatisch
├─ Prüft alle aktiven URL-Quellen
├─ Vergleicht Inhalts-Hash
└─ Markiert geänderte Quellen
```

### 2. Sie sehen die Änderungen (UI)
```
🌐 Gesetze Portal
   ⚠️ Änderungen erkannt  ← Badge erscheint
   
   [🔄 Update Index]  ← Klicken zum Bestätigen
```

### 3. Sie bestätigen (Manuell)
```
Klick auf "Update Index"
├─ Neue Inhalte werden indexiert
├─ Badge verschwindet
└─ RAG nutzt aktualisierte Inhalte
```

---

## ⚙️ Konfiguration

### Prüfintervall pro Quelle ändern

In der UI: `/documents` → URL-Quellen → Quelle bearbeiten

```
Aktualisierungsintervall (Tage): 
┌─────┐
│  1  │  = Täglich (Standard)
│  7  │  = Wöchentlich
│ 30  │  = Monatlich
└─────┘
```

### Job-Frequenz ändern

**Windows:** Task Scheduler öffnen → Aufgabe bearbeiten → Trigger ändern

**Linux/Mac:** `crontab -e` und Zeiten anpassen

```bash
# Beispiele:
0 2 * * *        # Täglich um 2:00
0 */6 * * *      # Alle 6 Stunden
0 2,14 * * *     # 2:00 und 14:00 täglich
0 2 * * 0        # Sonntags um 2:00
```

---

## 🧪 Testen

### Manueller Test (vor Automatisierung)

```bash
# Im Backend-Verzeichnis
python -m src.updater.url_refresh_job
```

**Erwartete Ausgabe:**
```
🔄 Starting URL Refresh Job
⏰ Time: 2026-01-09T...

📥 Fetching: Gesetze Portal
⚠️  Changes detected: Gesetze Portal (pending manual update)

✅ URL Refresh Job Complete
   Checked: 3
   Changes detected: 1
   Unchanged: 2

⚠️  1 source(s) have pending updates.
   Review and approve updates in the UI.
```

---

## 📋 Troubleshooting

### Job läuft nicht automatisch

**Windows:**
```powershell
# Prüfen ob Task existiert
schtasks /query /tn "RAG URL Check"

# Task neu erstellen
schtasks /delete /tn "RAG URL Check" /f
schtasks /create /tn "RAG URL Check" ...
```

**Linux/Mac:**
```bash
# Crontab anzeigen
crontab -l

# Cron-Logs prüfen
grep CRON /var/log/syslog
```

### Python nicht gefunden

**Lösung:** Vollständigen Python-Pfad verwenden

```powershell
# Windows - Python-Pfad finden
where python

# Task mit vollständigem Pfad
"C:\Python311\python.exe" -m src.updater.url_refresh_job
```

```bash
# Linux/Mac - Python-Pfad finden
which python3

# Crontab mit vollständigem Pfad
0 2 * * * cd /path/to/rag && /usr/bin/python3 -m src.updater.url_refresh_job
```

---

## 📊 Logs

### Logs aktivieren (optional)

**Windows:**
```powershell
schtasks /create /tn "RAG URL Check" /tr "cd /d G:\rag-seminararbeit && python -m src.updater.url_refresh_job >> logs\url_check.log 2>&1" /sc daily /st 02:00
```

**Linux/Mac:**
```bash
0 2 * * * cd /path/to/rag && python -m src.updater.url_refresh_job >> logs/url_check.log 2>&1
```

---

## ✅ Zusammenfassung

1. **Einmalig:** Scheduled Task einrichten (täglich um 2:00 Uhr)
2. **Automatisch:** Job prüft URLs und markiert Änderungen
3. **Manuell:** Sie bestätigen Änderungen in der UI per "Update Index"
4. **Fertig:** RAG nutzt aktualisierte Inhalte

**Wichtig:** Sie müssen nichts tun außer Änderungen zu bestätigen, wenn Sie möchten! 🎯

