import test from "node:test";
import assert from "node:assert/strict";
import { computeAnalyticsData } from "../src/lib/analytics-parser.ts";

test("computeAnalyticsData generates Year-over-Year candlestick comparison", () => {
  const mockSheetData = {
    title: "Test Analytics YoY",
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
          { rowIndex: 3, colIndex: 1, formattedValue: "30,000", rowSpan: 1, colSpan: 1, isCovered: false, style: {} }, // ปีก่อน
          { rowIndex: 3, colIndex: 2, formattedValue: "37,200", rowSpan: 1, colSpan: 1, isCovered: false, style: {} }, // ปีนี้ (โตขึ้น)
          { rowIndex: 3, colIndex: 3, formattedValue: "6,000", rowSpan: 1, colSpan: 1, isCovered: false, style: {} },
          { rowIndex: 3, colIndex: 4, formattedValue: "1,600", rowSpan: 1, colSpan: 1, isCovered: false, style: {} },
          { rowIndex: 3, colIndex: 5, formattedValue: "4,400", rowSpan: 1, colSpan: 1, isCovered: false, style: {} },
        ],
      },
    ],
  };

  const analytics = computeAnalyticsData(mockSheetData as any);

  assert.equal(analytics.kpi.totalBudget, 30000);
  assert.equal(analytics.kpi.totalSpent, 37200);
  assert.equal(analytics.categoryCandlesticks.length, 1);

  // Check candlestick point values
  const candle = analytics.categoryCandlesticks[0];
  assert.equal(candle.prevYearBudget, 30000); // Open
  assert.equal(candle.currentYearSpent, 37200); // Close
  assert.equal(candle.y[0], 30000); // Open
  assert.equal(candle.y[3], 37200); // Close
  assert.ok(candle.y[1] >= 37200); // High >= Close
  assert.ok(candle.y[2] <= 30000); // Low <= Open
  assert.equal(candle.changePercent, 24); // +24% growth
});
