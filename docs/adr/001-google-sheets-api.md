# ADR 001: Google Sheets API v4 with Direct Config & Server-Side Proxy

## Status
Accepted

## Context
The application needs to render Google Sheets data identically to the original sheet, including cell values, merged cells (`merges`), background colors, text formatting, and alignments.

## Decision
1. Use Google Sheets API v4 endpoint (`https://sheets.googleapis.com/v4/spreadsheets/{spreadsheetId}?includeGridData=true&key={apiKey}`).
2. Provide direct configuration in `src/config/sheet.config.ts` as requested by the user, with fallback to environment variables (`GOOGLE_SHEETS_API_KEY`).
3. Fetch data via a Next.js Server Route (`/api/sheet`) to prevent direct exposure of the API key on client networks and handle grid parsing cleanly.

## Consequences
- Accurate parsing of `merges` (startRowIndex, endRowIndex, startColumnIndex, endColumnIndex) transformed into standard HTML `rowSpan` and `colSpan`.
- Clean error messaging and setup guidance if API Key is missing or quota is exceeded.
