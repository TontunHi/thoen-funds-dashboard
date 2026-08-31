import { NextResponse } from "next/server";
import { SHEET_CONFIG } from "@/config/sheet.config";
import { parseGoogleSheetGrid, getDemoSheetData } from "@/lib/sheet-parser";
import { SheetApiResponse } from "@/types/sheet";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const spreadsheetId = SHEET_CONFIG.SPREADSHEET_ID;
  const sheetGid = SHEET_CONFIG.SHEET_GID;
  const apiKey = SHEET_CONFIG.API_KEY || process.env.GOOGLE_SHEETS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_SHEETS_API_KEY || "";

  if (!apiKey) {
    // Return demo data with a clear notification that API key needs to be set
    return NextResponse.json<SheetApiResponse>({
      success: true,
      data: getDemoSheetData(),
      isFallback: true,
      error: "ยังไม่ได้ระบุ Google Sheets API Key - กำลังแสดงข้อมูลตัวอย่าง (ตั้งค่าได้ที่ src/config/sheet.config.ts หรือ Environment Variable)",
    });
  }

  try {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?includeGridData=true&key=${apiKey}`;
    const res = await fetch(url, {
      next: { revalidate: 0 },
      headers: {
        "Accept": "application/json",
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      let parsedErr = "";
      try {
        const jsonErr = JSON.parse(errText);
        parsedErr = jsonErr.error?.message || errText;
      } catch {
        parsedErr = errText;
      }

      console.error("Google Sheets API error:", parsedErr);
      return NextResponse.json<SheetApiResponse>({
        success: false,
        data: getDemoSheetData(),
        isFallback: true,
        error: `ไม่สามารถดึงข้อมูลจาก Google Sheets ได้ (${res.status}): ${parsedErr}`,
      }, { status: res.status >= 400 && res.status < 600 ? res.status : 500 });
    }

    const data = await res.json();
    const sheets = data.sheets || [];

    // Find worksheet matching sheetGid
    const targetSheet = sheets.find((s: any) => s.properties?.sheetId === sheetGid);

    if (!targetSheet) {
      return NextResponse.json<SheetApiResponse>({
        success: false,
        data: getDemoSheetData(),
        isFallback: true,
        error: `ไม่พบข้อมูลชีต GID: ${sheetGid} ในสเปรดชีตนี้ (มีชีต ID: ${sheets.map((s: any) => s.properties?.sheetId).join(", ")})`,
      }, { status: 404 });
    }

    const parsedSheet = parseGoogleSheetGrid(targetSheet);
    return NextResponse.json<SheetApiResponse>({
      success: true,
      data: parsedSheet,
      isFallback: false,
    });
  } catch (error: any) {
    console.error("Error fetching Google Sheets:", error);
    return NextResponse.json<SheetApiResponse>({
      success: false,
      data: getDemoSheetData(),
      isFallback: true,
      error: `เกิดข้อผิดพลาดในการเชื่อมต่อ: ${error.message || "Unknown error"}`,
    }, { status: 500 });
  }
}
