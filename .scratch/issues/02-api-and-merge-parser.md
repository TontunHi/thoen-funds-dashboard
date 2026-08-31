# 02: Google Sheets API v4 Fetcher & Merged Cell Matrix Parser

**What to build:**
Implement the server-side Google Sheets API v4 fetcher and the 2D grid matrix parser that transforms sheet rows, formats, cell background colors, text styling, and merge spans (`merges[]`) into structured HTML-ready table cells with calculated `rowSpan` and `colSpan`, automatically pruning non-anchor merged cells.

**Blocked by:** 01: Project Setup and Configuration Module

**Status:** completed

- [x] Implement Google Sheets API v4 fetcher in `/api/sheet` route
- [x] Implement matrix merge processor converting `startRowIndex`, `endRowIndex`, `startColumnIndex`, `endColumnIndex` to `rowSpan` / `colSpan`
- [x] Parse cell formatting (bold, italic, text color, background color, text alignment)
- [x] Implement mock/fallback dataset or friendly setup wizard if API key is not configured
