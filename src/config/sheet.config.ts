/**
 * Configuration for Google Sheets Dashboard
 *
 * You can put your Google Sheets API Key directly in `API_KEY` below,
 * or set `GOOGLE_SHEETS_API_KEY` in `.env.local` / Vercel Environment Variables.
 */

export const SHEET_CONFIG = {
  // Spreadsheet ID from the URL: https://docs.google.com/spreadsheets/d/1tEBhzMWF7QkwOEBXamCImWrbcOqthdb2Kb9Wgs6k04I/edit?gid=806124582#gid=806124582
  SPREADSHEET_ID: "1tEBhzMWF7QkwOEBXamCImWrbcOqthdb2Kb9Wgs6k04I",

  // Specific sheet GID to display (gid: 806124582)
  SHEET_GID: 806124582,

  // Direct API Key (You can paste your Google Cloud Sheets API Key here directly)
  // Or leave it empty to fallback to process.env.GOOGLE_SHEETS_API_KEY
  API_KEY: process.env.GOOGLE_SHEETS_API_KEY || "",

  // Auto-refresh interval in seconds (e.g. 60 seconds)
  AUTO_REFRESH_SECONDS: 60,

  // Application title
  APP_TITLE: "ระบบรายงานข้อมูลกองทุนเถิน (Thoen Funds Dashboard)",
};
