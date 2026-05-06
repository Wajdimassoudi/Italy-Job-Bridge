# Italy Job Bridge Bot

## CSV Format (targets.csv)
Your CSV file must have exactly these column headers:

```csv
email,company_name
hr@example-company.it,Example Company Name
jobs@azienda-agricola.it,Azienda Agricola Rossi
```

## How to use:
1. **Upload CV**: Click the "Upload CV PDF" button and select your PDF resume.
2. **Upload Targets**: Click "Select targets.csv" and pick your companies list.
3. **Launch**: Click the "Upload Targets" button to process the file.
4. **Start**: Click the green **"START BOT ENGINE"** button. The bot will start sending emails with a random delay (60-120 seconds) to look natural.
5. **Stop**: Click the red **"STOP SESSIONS"** button if you want to abort.

## Requirements:
- You must have `GEMINI_API_KEY`, `GMAIL_USER`, and `GMAIL_APP_PASSWORD` set in your environment variables.
