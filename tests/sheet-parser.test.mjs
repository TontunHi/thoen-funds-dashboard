import test from "node:test";
import assert from "node:assert/strict";
import { parseGoogleSheetGrid } from "../src/lib/sheet-parser.ts";

test("parseGoogleSheetGrid respects rowLimit and colLimit (A-Q = 17, 180 rows)", () => {
  const mockSheet = {
    properties: {
      title: "Test Bounds",
      sheetId: 806124582,
      gridProperties: { rowCount: 300, columnCount: 30 },
    },
    data: [
      {
        rowData: Array.from({ length: 250 }, (_, r) => ({
          values: Array.from({ length: 25 }, (_, c) => ({
            formattedValue: `R${r}C${c}`,
          })),
        })),
      },
    ],
    merges: [
      {
        startRowIndex: 0,
        endRowIndex: 2,
        startColumnIndex: 0,
        endColumnIndex: 20, // Extends past col 17 (Q)
      },
    ],
  };

  const parsed = parseGoogleSheetGrid(mockSheet, 180, 17);

  assert.equal(parsed.rowCount, 180);
  assert.equal(parsed.columnCount, 17);
  assert.equal(parsed.rows.length, 180);
  assert.equal(parsed.rows[0].cells.length, 17);

  // Merged cell should be clamped to colSpan 17
  const anchor = parsed.rows[0].cells[0];
  assert.equal(anchor.rowSpan, 2);
  assert.equal(anchor.colSpan, 17);
});
