import test from "node:test";
import assert from "node:assert/strict";
import { parseGoogleSheetGrid } from "../src/lib/sheet-parser.ts";

test("parseGoogleSheetGrid respects exclusion of columns B and C (indices 1, 2)", () => {
  const mockSheet = {
    properties: {
      title: "Test Exclude",
      sheetId: 806124582,
      gridProperties: { rowCount: 10, columnCount: 17 },
    },
    data: [
      {
        rowData: [
          {
            values: [
              { formattedValue: "Col A" },
              { formattedValue: "Col B (Owner)" },
              { formattedValue: "Col C (ติดตาม)" },
              { formattedValue: "Col D (ผลงาน)" },
              { formattedValue: "Col E (รวม)" },
            ],
          },
        ],
      },
    ],
    merges: [
      {
        startRowIndex: 0,
        endRowIndex: 1,
        startColumnIndex: 0,
        endColumnIndex: 5, // A to E (5 columns originally)
      },
    ],
  };

  // Limits: 180 rows, 17 cols (A-Q), excluding B & C ([1, 2])
  const parsed = parseGoogleSheetGrid(mockSheet, 180, 17, [1, 2]);

  assert.equal(parsed.columnCount, 15); // 17 - 2 = 15
  assert.equal(parsed.rows[0].cells[0].formattedValue, "Col A");
  assert.equal(parsed.rows[0].cells[1].formattedValue, "Col D (ผลงาน)");
  assert.equal(parsed.rows[0].cells[2].formattedValue, "Col E (รวม)");

  // Span across A..E should now span 3 kept columns (A, D, E)
  const anchor = parsed.rows[0].cells[0];
  assert.equal(anchor.colSpan, 3);
});
