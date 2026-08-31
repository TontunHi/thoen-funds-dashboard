import test from "node:test";
import assert from "node:assert/strict";
import { parseGoogleSheetGrid, getDemoSheetData } from "../src/lib/sheet-parser.ts";

test("parseGoogleSheetGrid correctly maps merges to rowSpan and colSpan", () => {
  const mockSheet = {
    properties: {
      title: "Test Sheet",
      sheetId: 806124582,
      gridProperties: { rowCount: 3, columnCount: 3 },
    },
    data: [
      {
        rowData: [
          {
            values: [
              { formattedValue: "Merged Header", effectiveFormat: { textFormat: { bold: true } } },
              { formattedValue: "" },
              { formattedValue: "" },
            ],
          },
          {
            values: [
              { formattedValue: "A2" },
              { formattedValue: "B2" },
              { formattedValue: "C2" },
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
        endColumnIndex: 3,
      },
    ],
  };

  const parsed = parseGoogleSheetGrid(mockSheet);

  assert.equal(parsed.title, "Test Sheet");
  assert.equal(parsed.rows.length, 2);

  // Check merged anchor cell
  const anchorCell = parsed.rows[0].cells[0];
  assert.equal(anchorCell.formattedValue, "Merged Header");
  assert.equal(anchorCell.rowSpan, 1);
  assert.equal(anchorCell.colSpan, 3);
  assert.equal(anchorCell.isCovered, false);
  assert.equal(anchorCell.style.bold, true);

  // Check covered cells
  assert.equal(parsed.rows[0].cells[1].isCovered, true);
  assert.equal(parsed.rows[0].cells[2].isCovered, true);

  // Check normal row cells
  assert.equal(parsed.rows[1].cells[0].isCovered, false);
  assert.equal(parsed.rows[1].cells[0].formattedValue, "A2");
});

test("getDemoSheetData provides valid structure with merge cells", () => {
  const demo = getDemoSheetData();
  assert.ok(demo.rows.length > 0);
  assert.equal(demo.sheetId, 806124582);

  // Row 0 should be merged across 6 columns
  const header = demo.rows[0].cells[0];
  assert.equal(header.colSpan, 6);
  assert.equal(header.isCovered, false);
  assert.ok(demo.rows[0].cells[1].isCovered);
});
