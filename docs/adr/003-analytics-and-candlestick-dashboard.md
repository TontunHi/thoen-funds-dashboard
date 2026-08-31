# ADR 003: Analytics Page with Candlestick and Financial Charts using ApexCharts

## Status
Accepted

## Context
Users need high-level analytical insights from the Google Sheet fund dataset beyond the raw spreadsheet table, including:
- Candlestick (OHLC) financial volatility & distribution views (Monthly timeline and Category distribution).
- Monthly spending trends and cumulative progress curves.
- Category allocation breakdown (Donut chart).
- Executive KPI overview cards.

## Decision
1. Create a dedicated `/analytics` route with Top Navigation Tabs in the Header allowing seamless switching between `/` (Table View) and `/analytics` (Analytics View).
2. Integrate **ApexCharts** (`react-apexcharts` and `apexcharts`) with dynamic client-side rendering (`next/dynamic` with `ssr: false`).
3. Compute analytical aggregates dynamically from the live Google Sheet data (via `/api/sheet` or shared parser):
   - Monthly OHLC (Open, High, Low, Close, Volume) for each of the 12 months (ต.ค. 68 - ก.ย. 69).
   - Category-level distribution (Budget, Accumulated, Peak month).
   - Category budget proportion (Donut chart).
   - Monthly velocity & trend bars.
4. Maintain full Light Mode aesthetics matching the executive design palette.

## Consequences
- Clean separation of concerns between raw tabular view and executive chart analytics.
- Interactive visualizations with tooltips, zoom, and toggles without performance penalty.
