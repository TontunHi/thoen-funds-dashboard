# Specification: Thoen Funds Google Sheet Viewer

## Problem Statement
The user needs a dedicated web dashboard deployed on Vercel to view Google Sheet data (`1tEBhzMWF7QkwOEBXamCImWrbcOqthdb2Kb9Wgs6k04I`, GID `806124582`). The web display must replicate the Google Sheet accurately—including all data values, cell styles, and specifically merged cells—in a clean Light Mode theme. The display must fit the screen without requiring horizontal scrolling and allow direct vertical mouse-wheel scrolling without nested scroll containers.

## Solution
Build a Next.js (App Router) + React + Tailwind CSS web dashboard that:
1. Connects to Google Sheets API v4 using an API Key configured via `sheet.config.ts` or environment variables.
2. Extracts sheet data, formats, and merge spans (`startRowIndex`, `endRowIndex`, `startColumnIndex`, `endColumnIndex`), converting them to standard HTML table cells with `rowSpan` and `colSpan` while skipping covered/hidden cells.
3. Provides a clean Light Mode dashboard UI designed for full-width responsive display without horizontal scrollbars.
4. Enables auto-refresh intervals and manual reload controls with live sync indicators.
5. Deploys seamlessly to Vercel.

## User Stories

1. As a viewer, I want to see Google Sheet data rendered on a fast web page, so that I can inspect the data without logging into Google Docs.
2. As a viewer, I want merged cells in the sheet to render identically on the web, so that hierarchical or grouped headers and data maintain structural fidelity.
3. As a viewer, I want the website to be in Light Mode, so that it matches standard office/document viewing preferences.
4. As a viewer, I want to scroll vertically directly using my mouse wheel without trapped inner scroll layers, so that browsing is intuitive and smooth.
5. As a viewer, I want the table to fit the full width of the screen without needing horizontal scrollbars, so that I can view all columns at a glance.
6. As an administrator, I want to configure the Google Sheets API Key directly in `sheet.config.ts` or `.env.local`, so that setup is straightforward.
7. As a viewer, I want automatic background refresh and a manual refresh button, so that I always see the latest updates from Google Sheets.
8. As a developer, I want clear visual error messaging if the API Key is missing or invalid, so that debugging configuration is quick.

## Implementation Decisions

- **Framework**: Next.js 14+ (App Router) with TypeScript and Tailwind CSS.
- **Data Engine**: Server Route (`/api/sheet`) querying `https://sheets.googleapis.com/v4/spreadsheets/{id}?includeGridData=true&key={key}`.
- **Merge Cell Matrix Transform**: 2D grid matrix mapping where merge anchors declare `rowSpan` and `colSpan`, and non-anchor merged cells are omitted from the render tree.
- **Configuration Hub**: `src/config/sheet.config.ts` exporting `SPREADSHEET_ID`, `SHEET_GID`, and `API_KEY` (with fallback to `process.env.GOOGLE_SHEETS_API_KEY`).
- **Styling**: Tailwind CSS Light Palette (`bg-slate-50`, `text-slate-900`, `border-slate-300`, `shadow-sm`).
- **Seams**: Single data fetching seam at `/api/sheet` route tested via unit/integration tests; table rendering seam tested via matrix transformation parser.

## Testing Decisions
- Test matrix merge logic with unit tests (verifying correct `rowSpan`, `colSpan`, skipped cells, and value preservation).
- Test API route handler error responses (missing API key, invalid sheet ID).
- Test full page rendering and responsiveness.

## Out of Scope
- Editing / writing back to Google Sheets (read-only viewer).
- Dark Mode toggle (user explicitly requested Light Mode only).
- Multi-sheet tab switcher (locked directly to gid: 806124582 as requested).

## Further Notes
The app is optimized for Vercel deployment with zero additional backend dependencies.
