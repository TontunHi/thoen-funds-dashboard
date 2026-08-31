/**
 * Configuration for Google Sheets Dashboard
 *
 * You can put your Google Sheets API Key directly in `API_KEY` below,
 * or set `GOOGLE_SHEETS_API_KEY` in `.env.local` / Vercel Environment Variables.
 */

export const SPREADSHEET_ID = "1tEBhzMWF7QkwOEBXamCImWrbcOqthdb2Kb9Wgs6k04I";
export const SHEET_GID = 806124582;
export const API_KEY = process.env.GOOGLE_SHEETS_API_KEY || "";
export const AUTO_REFRESH_SECONDS = 60;
export const APP_TITLE = "ระบบรายงานข้อมูลกองทุนเถิน (Thoen Funds Dashboard)";

export const SHEET_CONFIG = {
  SPREADSHEET_ID,
  SHEET_GID,
  API_KEY,
  AUTO_REFRESH_SECONDS,
  APP_TITLE,
};

