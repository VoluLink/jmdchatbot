# SMTP Setup Anleitung

Diese Anleitung hilft dir, Gmail SMTP für Password-Reset-E-Mails einzurichten.

## Schritt 1: Gmail App-Passwort erstellen

### Voraussetzung: 2-Faktor-Authentifizierung aktivieren

1. Gehe zu https://myaccount.google.com/security
2. Stelle sicher, dass **"Bestätigung in zwei Schritten"** aktiviert ist
   - Falls nicht: Klicke auf "Bestätigung in zwei Schritten" → "Jetzt starten"
   - Folge den Anweisungen zur Aktivierung

### App-Passwort generieren

1. Gehe zu: https://myaccount.google.com/apppasswords
   - Oder: Google Account → Sicherheit → App-Passwörter
2. Wähle aus:
   - **App auswählen:** Mail
   - **Gerät auswählen:** Anderes (Benutzerdefinierter Name)
   - Gib einen Namen ein: `RAG-Seminararbeit` oder `AMIKO`
3. Klicke **"Generieren"**
4. **Kopiere das 16-stellige Passwort** (Format: `abcd efgh ijkl mnop`)
   - ⚠️ **Wichtig:** Dieses Passwort wird nur einmal angezeigt!

## Schritt 2: .env Datei konfigurieren

Öffne die `.env` Datei im Projektroot und trage deine Daten ein:

```bash
# SMTP Server Settings
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587

# SMTP Authentication
SMTP_USERNAME=deine-email@gmail.com
SMTP_PASSWORD=abcdefghijklmnop  # Das 16-stellige App-Passwort (ohne Leerzeichen!)

# Email "From" Settings
SMTP_FROM_EMAIL=deine-email@gmail.com
SMTP_FROM_NAME=RAG Assistant

# Password Reset Settings
PASSWORD_RESET_EXPIRY_MINUTES=60
FRONTEND_URL=http://localhost:3000
```

### Wichtige Hinweise:

- ✅ Verwende das **App-Passwort**, nicht dein normales Gmail-Passwort
- ✅ Entferne alle **Leerzeichen** aus dem App-Passwort
- ✅ `SMTP_USERNAME` und `SMTP_FROM_EMAIL` sind normalerweise identisch
- ✅ `FRONTEND_URL` ist die URL deines Frontends (für Links in E-Mails)

## Schritt 3: Testen

### Option A: Test über die Anwendung

1. Starte das Frontend:
   ```bash
   cd frontend
   npm run dev
   ```

2. Gehe zu: http://localhost:3000/login

3. Klicke auf **"Passwort vergessen?"**

4. Gib eine gültige E-Mail-Adresse ein und klicke **"Reset-Link senden"**

5. Überprüfe dein E-Mail-Postfach (auch Spam-Ordner!)

### Option B: Test über die API

```bash
curl -X POST http://localhost:3000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

## Troubleshooting

### Fehler: "E-Mail konnte nicht gesendet werden"

**Mögliche Ursachen:**

1. **App-Passwort falsch:**
   - Stelle sicher, dass du das App-Passwort verwendest (nicht dein normales Passwort)
   - Entferne alle Leerzeichen aus dem Passwort

2. **2-Faktor-Authentifizierung nicht aktiviert:**
   - App-Passwörter funktionieren nur mit 2FA
   - Aktiviere 2FA unter https://myaccount.google.com/security

3. **"Weniger sichere Apps" blockiert:**
   - Moderne Gmail-Accounts sollten App-Passwörter verwenden
   - Die alte "Weniger sichere Apps"-Option ist nicht mehr verfügbar

4. **SMTP-Server nicht erreichbar:**
   ```bash
   # Test SMTP-Verbindung
   telnet smtp.gmail.com 587
   ```

### Fehler: "SMTP configuration missing"

- Stelle sicher, dass `SMTP_USERNAME` und `SMTP_PASSWORD` in der `.env` gesetzt sind
- Starte den Server neu nach Änderungen an `.env`

### E-Mail kommt nicht an

1. **Spam-Ordner prüfen**
   - Gmail markiert manchmal Self-Service-E-Mails als Spam

2. **E-Mail-Adresse korrekt?**
   - Prüfe, ob die E-Mail-Adresse im System registriert ist

3. **Logs prüfen:**
   - Backend-Logs zeigen, ob E-Mail gesendet wurde
   - Konsole: `Password reset email sent to <email>`

## Alternative: Outlook/Office 365

Falls du Outlook statt Gmail verwenden möchtest:

```bash
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USERNAME=deine-email@outlook.com
SMTP_PASSWORD=dein-outlook-passwort
SMTP_FROM_EMAIL=deine-email@outlook.com
```

**Hinweis:** Outlook erlaubt normales Passwort (kein App-Passwort nötig)

## Sicherheitshinweise

⚠️ **Wichtig:**

- **Nie** das `.env` File in Git committen!
- `.env` steht bereits in `.gitignore`
- Verwende separate Accounts für Test/Produktion
- Rotiere App-Passwörter regelmäßig

## Gmail-Limits

Gmail hat folgende Limits für versendete E-Mails:

- **Kostenlos:** ~500 E-Mails pro Tag
- **Google Workspace:** ~2000 E-Mails pro Tag

Für dein System sollte das mehr als ausreichend sein.

## Produktions-Setup

Für Produktion empfehle ich:

1. **Transaktionale E-Mail-Services:**
   - SendGrid (100 E-Mails/Tag kostenlos)
   - Mailgun (100 E-Mails/Tag kostenlos)
   - AWS SES (~0.10€ pro 1000 E-Mails)

2. **Vorteile:**
   - Bessere Zustellraten
   - Tracking & Analytics
   - Höhere Limits
   - Professioneller

3. **Konfiguration ähnlich:**
   ```bash
   SMTP_HOST=smtp.sendgrid.net
   SMTP_PORT=587
   SMTP_USERNAME=apikey
   SMTP_PASSWORD=dein-sendgrid-api-key
   ```

## Hilfe benötigt?

Wenn du Probleme hast:

1. Prüfe die Logs im Terminal
2. Teste die SMTP-Verbindung mit `telnet`
3. Stelle sicher, dass alle `.env` Werte korrekt sind
4. Kontaktiere mich für weitere Hilfe!
