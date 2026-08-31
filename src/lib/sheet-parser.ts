import { CellStyle, ParsedCell, ParsedRow, ParsedSheetData } from "@/types/sheet";
import { MAX_ROWS, MAX_COLS, EXCLUDE_COLS } from "@/config/sheet.config";
export { getDemoSheetData } from "@/fixtures/demo-sheet";

interface GoogleColor {
  red?: number;
  green?: number;
  blue?: number;
  alpha?: number;
}

interface GoogleTextFormat {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  fontSize?: number;
  foregroundColor?: GoogleColor;
  foregroundColorStyle?: { rgbColor?: GoogleColor };
}

interface GoogleCellFormat {
  textFormat?: GoogleTextFormat;
  backgroundColor?: GoogleColor;
  backgroundColorStyle?: { rgbColor?: GoogleColor };
  horizontalAlignment?: "LEFT" | "CENTER" | "RIGHT";
  verticalAlignment?: "TOP" | "MIDDLE" | "BOTTOM";
}

interface GoogleCellData {
  formattedValue?: string | number | boolean;
  effectiveValue?: Record<string, unknown>;
  userEnteredFormat?: GoogleCellFormat;
  effectiveFormat?: GoogleCellFormat;
}

interface GoogleRowData {
  values?: GoogleCellData[];
}

interface GoogleMergeRange {
  startRowIndex?: number;
  endRowIndex?: number;
  startColumnIndex?: number;
  endColumnIndex?: number;
}

export interface GoogleSheetPayload {
  properties?: {
    title?: string;
    sheetId?: number;
    gridProperties?: {
      rowCount?: number;
      columnCount?: number;
    };
  };
  data?: Array<{
    rowData?: GoogleRowData[];
  }>;
  merges?: GoogleMergeRange[];
}

function colorToRgbString(color?: GoogleColor): string | undefined {
  if (!color) return undefined;
  const r = Math.round((color.red ?? 0) * 255);
  const g = Math.round((color.green ?? 0) * 255);
  const b = Math.round((color.blue ?? 0) * 255);
  const a = color.alpha !== undefined ? color.alpha : 1;
  if (a < 1) {
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }
  return `rgb(${r}, ${g}, ${b})`;
}

export function parseGoogleSheetGrid(
  sheetObj: GoogleSheetPayload,
  rowLimit: number = MAX_ROWS,
  colLimit: number = MAX_COLS,
  excludeCols: number[] = EXCLUDE_COLS
): ParsedSheetData {
  const sheetProperties = sheetObj.properties || {};
  const title = sheetProperties.title || "Sheet";
  const sheetId = sheetProperties.sheetId || 0;

  const data = sheetObj.data?.[0] || {};
  const rowData = data.rowData || [];
  const merges = sheetObj.merges || [];

  // Determine actual row count up to limit
  const actualRowCount = Math.min(rowLimit, Math.max(rowData.length, 1));

  // Determine kept original columns (A-Q excluding B & C)
  const originalColIndices = Array.from({ length: colLimit }, (_, i) => i);
  const keptOriginalCols = originalColIndices.filter((c) => !excludeCols.includes(c));
  const totalNewCols = keptOriginalCols.length;

  const oldToNewColMap: Record<number, number> = {};
  keptOriginalCols.forEach((oldIdx, newIdx) => {
    oldToNewColMap[oldIdx] = newIdx;
  });

  // Initialize matrix of cells
  const matrix: ParsedCell[][] = [];
  for (let r = 0; r < actualRowCount; r++) {
    const rowCells: ParsedCell[] = [];
    const rowValues = rowData[r]?.values || [];

    for (let newC = 0; newC < totalNewCols; newC++) {
      const oldC = keptOriginalCols[newC];
      const cellData = rowValues[oldC];
      const effectiveFormat = cellData?.effectiveFormat || {};
      const userEnteredFormat = cellData?.userEnteredFormat || {};
      const textFormat = effectiveFormat.textFormat || userEnteredFormat.textFormat || {};

      const cellStyle: CellStyle = {
        bold: textFormat.bold,
        italic: textFormat.italic,
        underline: textFormat.underline,
        strikethrough: textFormat.strikethrough,
        fontSize: textFormat.fontSize,
        textColor: colorToRgbString(textFormat.foregroundColor || textFormat.foregroundColorStyle?.rgbColor),
        backgroundColor: colorToRgbString(effectiveFormat.backgroundColor || userEnteredFormat.backgroundColor),
        horizontalAlignment: effectiveFormat.horizontalAlignment || userEnteredFormat.horizontalAlignment,
        verticalAlignment: effectiveFormat.verticalAlignment || userEnteredFormat.verticalAlignment,
      };

      const formattedVal = cellData?.formattedValue !== undefined && cellData?.formattedValue !== null
        ? String(cellData.formattedValue)
        : "";

      rowCells.push({
        rowIndex: r,
        colIndex: newC,
        formattedValue: formattedVal,
        rawValue: cellData?.effectiveValue,
        rowSpan: 1,
        colSpan: 1,
        isCovered: false,
        style: cellStyle,
      });
    }
    matrix.push(rowCells);
  }

  // Apply merge ranges with column exclusion adjustments
  for (const merge of merges) {
    const startRow = merge.startRowIndex ?? 0;
    const rawEndRow = merge.endRowIndex ?? startRow + 1;
    const mergeStartCol = merge.startColumnIndex ?? 0;
    const mergeEndCol = merge.endColumnIndex ?? mergeStartCol + 1;

    // If merge row is outside visible rows, skip
    if (startRow >= actualRowCount) {
      continue;
    }

    const endRow = Math.min(rawEndRow, actualRowCount);
    const rowSpan = Math.max(1, endRow - startRow);

    // Find kept columns falling within this merge range
    const colsInRange = keptOriginalCols.filter((c) => c >= mergeStartCol && c < mergeEndCol);
    if (colsInRange.length === 0) {
      continue; // All merged columns are excluded
    }

    const firstKeptOldCol = colsInRange[0];
    const newAnchorCol = oldToNewColMap[firstKeptOldCol];
    const colSpan = colsInRange.length;

    if (matrix[startRow] && matrix[startRow][newAnchorCol]) {
      matrix[startRow][newAnchorCol].rowSpan = rowSpan;
      matrix[startRow][newAnchorCol].colSpan = colSpan;

      // Mark other kept cells in this rectangle as covered
      for (let r = startRow; r < endRow; r++) {
        for (const oldCol of colsInRange) {
          if (r === startRow && oldCol === firstKeptOldCol) continue;
          const newC = oldToNewColMap[oldCol];
          if (matrix[r] && matrix[r][newC]) {
            matrix[r][newC].isCovered = true;
          }
        }
      }
    }
  }

  const parsedRows: ParsedRow[] = matrix.map((row, idx) => ({
    rowIndex: idx,
    cells: row,
  }));

  return {
    title,
    sheetId,
    rowCount: actualRowCount,
    columnCount: totalNewCols,
    rows: parsedRows,
    lastUpdated: new Date().toISOString(),
  };
}
