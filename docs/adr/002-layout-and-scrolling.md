# ADR 002: Full Screen Light Mode Table Layout Without Layer nesting or Horizontal Scroll

## Status
Accepted

## Context
The user requested:
- Web dashboard in Light Mode
- Immediate display allowing vertical scroll with mouse wheel (no nested layer-in-layer scrolling)
- Full width responsive display without horizontal scrolling bars
- Target deployment on Vercel

## Decision
1. Implement single main scroll container on `window`/`body` allowing natural vertical page wheel scrolling.
2. Render table with `table-auto` / `w-full` with proportional columns, sensible text wrapping, and clean typography matching Google Sheets.
3. Apply Tailwind CSS Light Theme palette with high contrast, legible numbers, and border styles.

## Consequences
- Clean, uncluttered user experience.
- Full viewport coverage without inner nested scroll traps.
