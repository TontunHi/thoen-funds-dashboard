import { CellStyle, ParsedCell, ParsedRow, ParsedSheetData } from "@/types/sheet";

function colorToRgbString(color?: { red?: number; green?: number; blue?: number; alpha?: number }): string | undefined {
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

export function parseGoogleSheetGrid(sheetObj: any): ParsedSheetData {
  const sheetProperties = sheetObj.properties || {};
  const title = sheetProperties.title || "Sheet";
  const sheetId = sheetProperties.sheetId || 0;
  const gridProperties = sheetProperties.gridProperties || {};
  const maxRows = gridProperties.rowCount || 100;
  const maxCols = gridProperties.columnCount || 26;

  const data = sheetObj.data?.[0] || {};
  const rowData = data.rowData || [];
  const merges = sheetObj.merges || [];

  // Determine actual bounds with data
  const actualRowCount = Math.min(maxRows, Math.max(rowData.length, 1));
  let maxColSeen = 0;
  rowData.forEach((r: any) => {
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

export function getDemoSheetData(): ParsedSheetData {
  return {
    title: "รายงานข้อมูลกองทุนเถิน (Demo Mode - รอตั้งค่า API Key)",
    sheetId: 806124582,
    rowCount: 8,
    columnCount: 6,
    lastUpdated: new Date().toISOString(),
    rows: [
      {
        rowIndex: 0,
        cells: [
          {
            rowIndex: 0,
            colIndex: 0,
            formattedValue: "รายงานสรุปข้อมูลกองทุนพัฒนาท้องถิ่น อำเภอเถิน ประจำปีงบประมาณ 2567",
            rowSpan: 1,
            colSpan: 6,
            isCovered: false,
            style: {
              bold: true,
              fontSize: 16,
              horizontalAlignment: "CENTER",
              backgroundColor: "rgb(238, 242, 255)",
              textColor: "rgb(30, 58, 138)",
            },
          },
          { rowIndex: 0, colIndex: 1, formattedValue: "", rowSpan: 1, colSpan: 1, isCovered: true, style: {} },
          { rowIndex: 0, colIndex: 2, formattedValue: "", rowSpan: 1, colSpan: 1, isCovered: true, style: {} },
          { rowIndex: 0, colIndex: 3, formattedValue: "", rowSpan: 1, colSpan: 1, isCovered: true, style: {} },
          { rowIndex: 0, colIndex: 4, formattedValue: "", rowSpan: 1, colSpan: 1, isCovered: true, style: {} },
          { rowIndex: 0, colIndex: 5, formattedValue: "", rowSpan: 1, colSpan: 1, isCovered: true, style: {} },
        ],
      },
      {
        rowIndex: 1,
        cells: [
          {
            rowIndex: 1,
            colIndex: 0,
            formattedValue: "ลำดับ",
            rowSpan: 2,
            colSpan: 1,
            isCovered: false,
            style: { bold: true, horizontalAlignment: "CENTER", backgroundColor: "rgb(241, 245, 249)" },
          },
          {
            rowIndex: 1,
            colIndex: 1,
            formattedValue: "ชื่อโครงการ / รายการ",
            rowSpan: 2,
            colSpan: 1,
            isCovered: false,
            style: { bold: true, horizontalAlignment: "CENTER", backgroundColor: "rgb(241, 245, 249)" },
          },
          {
            rowIndex: 1,
            colIndex: 2,
            formattedValue: "งบประมาณจัดสรร (บาท)",
            rowSpan: 1,
            colSpan: 2,
            isCovered: false,
            style: { bold: true, horizontalAlignment: "CENTER", backgroundColor: "rgb(241, 245, 249)" },
          },
          { rowIndex: 1, colIndex: 3, formattedValue: "", rowSpan: 1, colSpan: 1, isCovered: true, style: {} },
          {
            rowIndex: 1,
            colIndex: 4,
            formattedValue: "ผลการดำเนินงาน",
            rowSpan: 2,
            colSpan: 1,
            isCovered: false,
            style: { bold: true, horizontalAlignment: "CENTER", backgroundColor: "rgb(241, 245, 249)" },
          },
          {
            rowIndex: 1,
            colIndex: 5,
            formattedValue: "สถานะ",
            rowSpan: 2,
            colSpan: 1,
            isCovered: false,
            style: { bold: true, horizontalAlignment: "CENTER", backgroundColor: "rgb(241, 245, 249)" },
          },
        ],
      },
      {
        rowIndex: 2,
        cells: [
          { rowIndex: 2, colIndex: 0, formattedValue: "", rowSpan: 1, colSpan: 1, isCovered: true, style: {} },
          { rowIndex: 2, colIndex: 1, formattedValue: "", rowSpan: 1, colSpan: 1, isCovered: true, style: {} },
          {
            rowIndex: 2,
            colIndex: 2,
            formattedValue: "งบอนุมัติ",
            rowSpan: 1,
            colSpan: 1,
            isCovered: false,
            style: { bold: true, horizontalAlignment: "CENTER", backgroundColor: "rgb(248, 250, 252)" },
          },
          {
            rowIndex: 2,
            colIndex: 3,
            formattedValue: "เบิกจ่ายแล้ว",
            rowSpan: 1,
            colSpan: 1,
            isCovered: false,
            style: { bold: true, horizontalAlignment: "CENTER", backgroundColor: "rgb(248, 250, 252)" },
          },
          { rowIndex: 2, colIndex: 4, formattedValue: "", rowSpan: 1, colSpan: 1, isCovered: true, style: {} },
          { rowIndex: 2, colIndex: 5, formattedValue: "", rowSpan: 1, colSpan: 1, isCovered: true, style: {} },
        ],
      },
      {
        rowIndex: 3,
        cells: [
          { rowIndex: 3, colIndex: 0, formattedValue: "1", rowSpan: 1, colSpan: 1, isCovered: false, style: { horizontalAlignment: "CENTER" } },
          { rowIndex: 3, colIndex: 1, formattedValue: "โครงการปรับปรุงแหล่งน้ำเพื่อการเกษตร ตำบลล้อมแรด", rowSpan: 1, colSpan: 1, isCovered: false, style: { horizontalAlignment: "LEFT" } },
          { rowIndex: 3, colIndex: 2, formattedValue: "450,000.00", rowSpan: 1, colSpan: 1, isCovered: false, style: { horizontalAlignment: "RIGHT" } },
          { rowIndex: 3, colIndex: 3, formattedValue: "450,000.00", rowSpan: 1, colSpan: 1, isCovered: false, style: { horizontalAlignment: "RIGHT" } },
          { rowIndex: 3, colIndex: 4, formattedValue: "100%", rowSpan: 1, colSpan: 1, isCovered: false, style: { horizontalAlignment: "CENTER" } },
          { rowIndex: 3, colIndex: 5, formattedValue: "เสร็จสิ้น", rowSpan: 1, colSpan: 1, isCovered: false, style: { horizontalAlignment: "CENTER", textColor: "rgb(22, 101, 52)", bold: true } },
        ],
      },
      {
        rowIndex: 4,
        cells: [
          { rowIndex: 4, colIndex: 0, formattedValue: "2", rowSpan: 1, colSpan: 1, isCovered: false, style: { horizontalAlignment: "CENTER" } },
          { rowIndex: 4, colIndex: 1, formattedValue: "โครงการส่งเสริมอาชีพกลุ่มทอผ้าพื้นเมือง ตำบลแม่วะ", rowSpan: 1, colSpan: 1, isCovered: false, style: { horizontalAlignment: "LEFT" } },
          { rowIndex: 4, colIndex: 2, formattedValue: "280,000.00", rowSpan: 1, colSpan: 1, isCovered: false, style: { horizontalAlignment: "RIGHT" } },
          { rowIndex: 4, colIndex: 3, formattedValue: "210,000.00", rowSpan: 1, colSpan: 1, isCovered: false, style: { horizontalAlignment: "RIGHT" } },
          { rowIndex: 4, colIndex: 4, formattedValue: "75%", rowSpan: 1, colSpan: 1, isCovered: false, style: { horizontalAlignment: "CENTER" } },
          { rowIndex: 4, colIndex: 5, formattedValue: "กำลังดำเนินการ", rowSpan: 1, colSpan: 1, isCovered: false, style: { horizontalAlignment: "CENTER", textColor: "rgb(180, 83, 9)", bold: true } },
        ],
      },
      {
        rowIndex: 5,
        cells: [
          { rowIndex: 5, colIndex: 0, formattedValue: "3", rowSpan: 1, colSpan: 1, isCovered: false, style: { horizontalAlignment: "CENTER" } },
          { rowIndex: 5, colIndex: 1, formattedValue: "โครงการจัดซื้ออุปกรณ์แพทย์ประจำโรงพยาบาลส่งเสริมสุขภาพตำบล", rowSpan: 1, colSpan: 1, isCovered: false, style: { horizontalAlignment: "LEFT" } },
          { rowIndex: 5, colIndex: 2, formattedValue: "600,000.00", rowSpan: 1, colSpan: 1, isCovered: false, style: { horizontalAlignment: "RIGHT" } },
          { rowIndex: 5, colIndex: 3, formattedValue: "600,000.00", rowSpan: 1, colSpan: 1, isCovered: false, style: { horizontalAlignment: "RIGHT" } },
          { rowIndex: 5, colIndex: 4, formattedValue: "100%", rowSpan: 1, colSpan: 1, isCovered: false, style: { horizontalAlignment: "CENTER" } },
          { rowIndex: 5, colIndex: 5, formattedValue: "เสร็จสิ้น", rowSpan: 1, colSpan: 1, isCovered: false, style: { horizontalAlignment: "CENTER", textColor: "rgb(22, 101, 52)", bold: true } },
        ],
      },
      {
        rowIndex: 6,
        cells: [
          {
            rowIndex: 6,
            colIndex: 0,
            formattedValue: "รวมงบประมาณทั้งสิ้น",
            rowSpan: 1,
            colSpan: 2,
            isCovered: false,
            style: { bold: true, horizontalAlignment: "CENTER", backgroundColor: "rgb(241, 245, 249)" },
          },
          { rowIndex: 6, colIndex: 1, formattedValue: "", rowSpan: 1, colSpan: 1, isCovered: true, style: {} },
          { rowIndex: 6, colIndex: 2, formattedValue: "1,330,000.00", rowSpan: 1, colSpan: 1, isCovered: false, style: { bold: true, horizontalAlignment: "RIGHT", backgroundColor: "rgb(241, 245, 249)" } },
          { rowIndex: 6, colIndex: 3, formattedValue: "1,260,000.00", rowSpan: 1, colSpan: 1, isCovered: false, style: { bold: true, horizontalAlignment: "RIGHT", backgroundColor: "rgb(241, 245, 249)" } },
          { rowIndex: 6, colIndex: 4, formattedValue: "94.7%", rowSpan: 1, colSpan: 1, isCovered: false, style: { bold: true, horizontalAlignment: "CENTER", backgroundColor: "rgb(241, 245, 249)" } },
          { rowIndex: 6, colIndex: 5, formattedValue: "ภาพรวมดีเยี่ยม", rowSpan: 1, colSpan: 1, isCovered: false, style: { bold: true, horizontalAlignment: "CENTER", backgroundColor: "rgb(241, 245, 249)", textColor: "rgb(22, 101, 52)" } },
        ],
      },
    ],
  };
}
