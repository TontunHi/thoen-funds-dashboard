import test from "node:test";
import assert from "node:assert/strict";
import { computeAnalyticsData } from "../src/lib/analytics-parser.ts";

test("computeAnalyticsData generates Dual Candlesticks series side-by-side", () => {
  const mockSheetData = {
    title: "Test Analytics Dual",
    sheetId: 806124582,
    rowCount: 5,
    columnCount: 15,
    lastUpdated: new Date().toISOString(),
    rows: [
      {
        rowIndex: 0,
        cells: [{ rowIndex: 0, colIndex: 0, formattedValue: "Header 1", rowSpan: 1, colSpan: 15, isCovered: false, style: {} }],
      },
      {
        rowIndex: 1,
        cells: [{ rowIndex: 1, colIndex: 0, formattedValue: "Header 2", rowSpan: 1, colSpan: 15, isCovered: false, style: {} }],
      },
      {
        rowIndex: 2,
        cells: [{ rowIndex: 2, colIndex: 0, formattedValue: "หมวดการฝากครรภ์", rowSpan: 1, colSpan: 15, isCovered: false, style: { bold: true } }],
      },
      {
        rowIndex: 3,
        cells: [
          { rowIndex: 3, colIndex: 0, formattedValue: "โครงการอัลตราซาวด์", rowSpan: 1, colSpan: 1, isCovered: false, style: {} },
          { rowIndex: 3, colIndex: 1, formattedValue: "30,000", rowSpan: 1, colSpan: 1, isCovered: false, style: {} },
          { rowIndex: 3, colIndex: 2, formattedValue: "37,200", rowSpan: 1, colSpan: 1, isCovered: false, style: {} },
          { rowIndex: 3, colIndex: 3, formattedValue: "6,000", rowSpan: 1, colSpan: 1, isCovered: false, style: {} },
          { rowIndex: 3, colIndex: 4, formattedValue: "1,600", rowSpan: 1, colSpan: 1, isCovered: false, style: {} },
          { rowIndex: 3, colIndex: 5, formattedValue: "4,400", rowSpan: 1, colSpan: 1, isCovered: false, style: {} },
        ],
      },
    ],
  };

  const analytics = computeAnalyticsData(mockSheetData as any);

  assert.equal(analytics.dualCandlestick.prevYearSeries.length, 1);
  assert.equal(analytics.dualCandlestick.currentYearSeries.length, 1);

  const prevCandle = analytics.dualCandlestick.prevYearSeries[0];
  const currCandle = analytics.dualCandlestick.currentYearSeries[0];

  assert.equal(prevCandle.y[3], 30000); // Prev Close
  assert.equal(currCandle.y[3], 37200); // Curr Close
});
