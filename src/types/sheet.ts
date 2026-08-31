export interface CellStyle {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  fontSize?: number;
  textColor?: string;
  backgroundColor?: string;
  horizontalAlignment?: "LEFT" | "CENTER" | "RIGHT";
  verticalAlignment?: "TOP" | "MIDDLE" | "BOTTOM";
  borderTop?: boolean;
  borderBottom?: boolean;
  borderLeft?: boolean;
  borderRight?: boolean;
}

export interface ParsedCell {
  rowIndex: number;
  colIndex: number;
  formattedValue: string;
  rawValue?: any;
  rowSpan: number;
  colSpan: number;
  isCovered: boolean; // True if this cell is obscured by a merge from another cell
  style: CellStyle;
}

export interface ParsedRow {
  rowIndex: number;
  cells: ParsedCell[];
}

export interface ParsedSheetData {
  title: string;
  sheetId: number;
  rowCount: number;
  columnCount: number;
  rows: ParsedRow[];
  lastUpdated: string;
}

export interface SheetApiResponse {
  success: boolean;
  data?: ParsedSheetData;
  error?: string;
  isFallback?: boolean;
}
