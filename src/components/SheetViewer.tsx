"use client";

import React, { useState, useEffect, useCallback } from "react";
import { ParsedSheetData, SheetApiResponse, ParsedCell } from "@/types/sheet";
import { SHEET_CONFIG } from "@/config/sheet.config";
import {
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Table,
  Layers,
  FileSpreadsheet,
  Info,
} from "lucide-react";

export default function SheetViewer() {
  const [sheetData, setSheetData] = useState<ParsedSheetData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isFallback, setIsFallback] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [secondsUntilRefresh, setSecondsUntilRefresh] = useState<number>(SHEET_CONFIG.AUTO_REFRESH_SECONDS);

  const fetchData = useCallback(async (manual = false) => {
    if (manual) {
      setIsRefreshing(true);
    }
    try {
      const res = await fetch("/api/sheet", { cache: "no-store" });
      const json: SheetApiResponse = await res.json();

      if (json.data) {
        setSheetData(json.data);
        setIsFallback(Boolean(json.isFallback));
        setErrorMsg(json.error || null);
        setLastSyncTime(new Date());
      } else if (json.error) {
        setErrorMsg(json.error);
      }
    } catch (err: any) {
      console.error("Fetch error:", err);
      setErrorMsg(`เชื่อมต่อผิดพลาด: ${err.message || "Failed to fetch"}`);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      setSecondsUntilRefresh(SHEET_CONFIG.AUTO_REFRESH_SECONDS);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh countdown and trigger
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsUntilRefresh((prev) => {
        if (prev <= 1) {
          fetchData();
          return SHEET_CONFIG.AUTO_REFRESH_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [fetchData]);

  const googleSheetUrl = `https://docs.google.com/spreadsheets/d/${SHEET_CONFIG.SPREADSHEET_ID}/edit#gid=${SHEET_CONFIG.SHEET_GID}`;

  return (
    <div className="w-full min-h-screen bg-slate-50 text-slate-800 pb-16">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm transition-all">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-4">
          {/* Logo & Title */}
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200/60 shadow-sm">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
                  {sheetData?.title || SHEET_CONFIG.APP_TITLE}
                </h1>
                {isFallback ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                    <AlertTriangle className="w-3 h-3" />
                    Demo Mode
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3" />
                    Live Synced
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                <span>สเปรดชีต GID: <strong className="font-mono">{SHEET_CONFIG.SHEET_GID}</strong></span>
                <span>•</span>
                <span>รีเฟรชอัตโนมัติใน {secondsUntilRefresh} วิ</span>
              </p>
            </div>
          </div>

          {/* Action buttons & Stats */}
          <div className="flex items-center flex-wrap gap-2 sm:gap-3">
            {lastSyncTime && (
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 bg-slate-100/80 px-3 py-1.5 rounded-lg border border-slate-200/60">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>อัปเดตล่าสุด: {lastSyncTime.toLocaleTimeString("th-TH")}</span>
              </div>
            )}

            <button
              onClick={() => fetchData(true)}
              disabled={isLoading || isRefreshing}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs sm:text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 active:bg-slate-100 border border-slate-300 rounded-lg shadow-sm hover:shadow transition disabled:opacity-50"
              title="รีเฟรชข้อมูลตอนนี้"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${isRefreshing ? "animate-spin text-blue-600" : ""}`} />
              <span>{isRefreshing ? "กำลังโหลด..." : "รีเฟรชข้อมูล"}</span>
            </button>

            <a
              href={googleSheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs sm:text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition"
            >
              <span>เปิด Google Sheet</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="w-full px-2 sm:px-4 lg:px-6 pt-4">
        {/* Banner Alert if Fallback or Error */}
        {errorMsg && (
          <div className={`mb-4 p-4 rounded-xl border flex items-start gap-3 text-sm shadow-sm transition-all ${
            isFallback
              ? "bg-amber-50/90 border-amber-200 text-amber-900"
              : "bg-red-50/90 border-red-200 text-red-900"
          }`}>
            <Info className="w-5 h-5 flex-shrink-0 text-amber-600 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">{isFallback ? "แจ้งเตือนการตั้งค่า API Key" : "เกิดข้อผิดพลาด"}</p>
              <p className="mt-0.5 text-xs sm:text-sm text-slate-700">{errorMsg}</p>
              {isFallback && (
                <div className="mt-2 text-xs bg-white/80 p-2.5 rounded-lg border border-amber-200/70 font-mono text-slate-700 space-y-1">
                  <p className="font-sans font-medium text-slate-900">วิธีเชื่อมต่อ Google Sheet จริงของคุณ:</p>
                  <p>1. เปิดไฟล์ <code className="bg-slate-100 px-1 py-0.5 rounded text-blue-700">src/config/sheet.config.ts</code> แล้วใส่ API Key ในช่อง <code className="text-amber-800">API_KEY</code></p>
                  <p>2. หรือตั้งค่า Environment Variable: <code className="text-amber-800">GOOGLE_SHEETS_API_KEY=your_key_here</code></p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Loading Skeleton */}
        {isLoading && !sheetData && (
          <div className="w-full bg-white rounded-xl border border-slate-200 p-8 shadow-sm text-center">
            <div className="inline-flex p-3 bg-blue-50 text-blue-600 rounded-2xl animate-pulse mb-4">
              <RefreshCw className="w-8 h-8 animate-spin" />
            </div>
            <h3 className="text-base font-semibold text-slate-800">กำลังเชื่อมต่อและโหลดข้อมูลจาก Google Sheet...</h3>
            <p className="text-xs text-slate-500 mt-1">โปรดรอสักครู่ ระบบกำลังประมวลผลโครงสร้างตารางและ Merge Cell</p>
          </div>
        )}

        {/* Data Table */}
        {sheetData && (
          <div className="w-full bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden transition-all">
            {/* Sheet Subheader Info */}
            <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-600 gap-2">
              <div className="flex items-center flex-wrap gap-3">
                <span className="flex items-center gap-1 font-medium text-slate-700">
                  <Table className="w-3.5 h-3.5 text-blue-600" />
                  <span>ช่วงข้อมูล: <strong>คอลัมน์ A, D - Q</strong> (เว้น B, C) รวม {sheetData.columnCount} คอลัมน์</span>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 font-medium text-slate-700">
                  <Layers className="w-3.5 h-3.5 text-blue-600" />
                  <span>จำนวนแถวที่แสดง: <strong>{sheetData.rowCount}</strong> แถว</span>
                </span>
              </div>
              <div className="text-slate-500 italic">
                * เลื่อนลูกกลิ้งเมาส์ (Mouse Wheel) ขึ้น-ลงเพื่อดูข้อมูลได้ทั้งหน้าจอโดยไม่มีแถบเลื่อนซ้อน
              </div>
            </div>

            {/* Table Matrix Container - Full Width Direct Table */}
            <div className="w-full">
              <table className="w-full table-auto border-collapse border-spacing-0 text-sm">
                <tbody>
                  {sheetData.rows.map((row) => (
                    <tr
                      key={`row-${row.rowIndex}`}
                      className="hover:bg-blue-50/20 transition-colors border-b border-slate-200 last:border-b-0"
                    >
                      {row.cells.map((cell) => {
                        // Omit covered cells (cells engulfed by a merge span)
                        if (cell.isCovered) return null;

                        return <RenderTableCell key={`cell-${cell.rowIndex}-${cell.colIndex}`} cell={cell} />;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function RenderTableCell({ cell }: { cell: ParsedCell }) {
  const { formattedValue, rowSpan, colSpan, style } = cell;

  // Compute text alignment
  let alignClass = "text-left";
  if (style.horizontalAlignment === "CENTER") alignClass = "text-center";
  else if (style.horizontalAlignment === "RIGHT") alignClass = "text-right";

  // Compute vertical alignment
  let vAlignClass = "align-middle";
  if (style.verticalAlignment === "TOP") vAlignClass = "align-top";
  else if (style.verticalAlignment === "BOTTOM") vAlignClass = "align-bottom";

  // Custom inline style overrides from Sheet
  const customStyles: React.CSSProperties = {};
  if (style.backgroundColor) {
    customStyles.backgroundColor = style.backgroundColor;
  }
  if (style.textColor) {
    customStyles.color = style.textColor;
  }
  if (style.fontSize) {
    customStyles.fontSize = `${Math.max(12, style.fontSize)}px`;
  }

  return (
    <td
      rowSpan={rowSpan > 1 ? rowSpan : undefined}
      colSpan={colSpan > 1 ? colSpan : undefined}
      style={customStyles}
      className={`sheet-cell px-3.5 py-2.5 border border-slate-300 ${alignClass} ${vAlignClass} ${
        style.bold ? "font-bold" : "font-normal"
      } ${style.italic ? "italic" : ""} ${
        style.underline ? "underline" : ""
      } ${style.strikethrough ? "line-through" : ""} transition-colors`}
    >
      <div className="leading-snug">
        {formattedValue ? (
          formattedValue
        ) : (
          <span className="inline-block min-h-[1.25rem] text-transparent select-none">-</span>
        )}
      </div>
    </td>
  );
}
