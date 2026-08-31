import test from "node:test";
import assert from "node:assert/strict";
import { computeAnalyticsData } from "../src/lib/analytics-parser.ts";

test("computeAnalyticsData computes valid candlestick and KPI data", () => {
  const mockSheetData = {
    title: "Test Analytics",
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
          { rowIndex: 3, colIndex: 0, formattedValue: "โครงการ 1", rowSpan: 1, colSpan: 1, isCovered: false, style: {} },
          { rowIndex: 3, colIndex: 1, formattedValue: "100,000", rowSpan: 1, colSpan: 1, isCovered: false, style: {} },
          { rowIndex: 3, colIndex: 2, formattedValue: "80,000", rowSpan: 1, colSpan: 1, isCovered: false, style: {} },
          { rowIndex: 3, colIndex: 3, formattedValue: "20,000", rowSpan: 1, colSpan: 1, isCovered: false, style: {} },
          { rowIndex: 3, colIndex: 4, formattedValue: "30,000", rowSpan: 1, colSpan: 1, isCovered: false, style: {} },
          { rowIndex: 3, colIndex: 5, formattedValue: "30,000", rowSpan: 1, colSpan: 1, isCovered: false, style: {} },
        ],
      },
    ],
  };

  const analytics = computeAnalyticsData(mockSheetData as any);

  assert.equal(analytics.kpi.totalBudget, 100000);
  assert.equal(analytics.kpi.totalSpent, 80000);
  assert.equal(analytics.kpi.progressPercent, 80);
  assert.equal(analytics.monthlyCandlestick.length, 12);
  assert.equal(analytics.monthlyTrend.monthlyDisbursement.length, 12);
  assert.equal(analytics.monthlyTrend.cumulativeDisbursement.length, 12);
  assert.ok(analytics.categoryDonut.series.length > 0);
});
