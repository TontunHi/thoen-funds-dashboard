import { CellStyle, ParsedCell, ParsedRow, ParsedSheetData } from "@/types/sheet";
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

export function parseGoogleSheetGrid(sheetObj: GoogleSheetPayload): ParsedSheetData {
  const sheetProperties = sheetObj.properties || {};
  const title = sheetProperties.title || "Sheet";
  const sheetId = sheetProperties.sheetId || 0;
  const gridProperties = sheetProperties.gridProperties || {};
  const maxRows = gridProperties.rowCount || 100;

  const data = sheetObj.data?.[0] || {};
  const rowData = data.rowData || [];
  const merges = sheetObj.merges || [];

  // Determine actual bounds with data
  const actualRowCount = Math.min(maxRows, Math.max(rowData.length, 1));
  let maxColSeen = 0;
  rowData.forEach((r) => {
    if (r.values && r.values.length > maxColSeen) {
      maxColSeen = r.values.length;
    }
  });
  const actualColCount = Math.max(maxColSeen, 1);

  // Initialize matrix of cells
  const matrix: ParsedCell[][] = [];
  for (let r = 0; r < actualRowCount; r++) {
    const rowCells: ParsedCell[] = [];
    const rowValues = rowData[r]?.values || [];
    for (let c = 0; c < actualColCount; c++) {
      const cellData = rowValues[c];
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
        colIndex: c,
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

  // Apply merge ranges
  for (const merge of merges) {
    const startRow = merge.startRowIndex ?? 0;
    const endRow = merge.endRowIndex ?? startRow + 1;
    const startCol = merge.startColumnIndex ?? 0;
    const endCol = merge.endColumnIndex ?? startCol + 1;

    const rowSpan = endRow - startRow;
    const colSpan = endCol - startCol;

    if (matrix[startRow] && matrix[startRow][startCol]) {
      matrix[startRow][startCol].rowSpan = rowSpan;
      matrix[startRow][startCol].colSpan = colSpan;

      // Mark covered cells
      for (let r = startRow; r < endRow; r++) {
        for (let c = startCol; c < endCol; c++) {
          if (r === startRow && c === startCol) continue;
          if (matrix[r] && matrix[r][c]) {
            matrix[r][c].isCovered = true;
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
    columnCount: actualColCount,
    rows: parsedRows,
    lastUpdated: new Date().toISOString(),
  };
}
