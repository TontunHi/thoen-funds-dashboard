"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { ParsedSheetData, SheetApiResponse, ParsedCell } from "@/types/sheet";
import { SHEET_CONFIG } from "@/config/sheet.config";
import {
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Clock,
  FileSpreadsheet,
  Info,
  Search,
} from "lucide-react";

export default function SheetViewer() {
  const [sheetData, setSheetData] = useState<ParsedSheetData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isFallback, setIsFallback] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [secondsUntilRefresh, setSecondsUntilRefresh] = useState<number>(SHEET_CONFIG.AUTO_REFRESH_SECONDS);
  const [searchQuery, setSearchQuery] = useState<string>("");

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

  // Filter rows based on search query (preserving header rows 0-1)
  const filteredRows = useMemo(() => {
    if (!sheetData) return [];
    if (!searchQuery.trim()) return sheetData.rows;

    const q = searchQuery.toLowerCase().trim();
    return sheetData.rows.filter((row, idx) => {
      if (idx === 0 || idx === 1) return true;
      return row.cells.some((c) =>
        c.formattedValue && c.formattedValue.toLowerCase().includes(q)
      );
    });
  }, [sheetData, searchQuery]);

  const googleSheetUrl = `https://docs.google.com/spreadsheets/d/${SHEET_CONFIG.SPREADSHEET_ID}/edit#gid=${SHEET_CONFIG.SHEET_GID}`;

  return (
    <div className="w-full min-h-screen bg-slate-50 text-slate-800 pb-24 font-prompt selection:bg-blue-100 selection:text-blue-900">
      {/* Top Header Navbar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs transition-all">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-4">
          {/* Logo & System Title */}
          <div className="flex items-center space-x-3.5">
            <div className="p-2.5 bg-blue-50 text-blue-700 rounded-xl border border-blue-200/80 shadow-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900">
                  {sheetData?.title || SHEET_CONFIG.APP_TITLE}
                </h1>
                {isFallback ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 shadow-2xs">
                    <AlertTriangle className="w-3 h-3 text-amber-600" />
                    Demo Mode
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Live Synced
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                <span>สเปรดชีต GID: <strong className="font-mono text-slate-700">{SHEET_CONFIG.SHEET_GID}</strong></span>
                <span>•</span>
                <span>อัปเดตอัตโนมัติใน <strong className="font-mono text-blue-600">{secondsUntilRefresh}</strong>s</span>
              </p>
            </div>
          </div>

          {/* Search Box & Action Buttons */}
          <div className="flex items-center flex-wrap gap-2.5 sm:gap-3">
            {/* Quick Search Input */}
            <div className="relative w-48 sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ค้นหาข้อมูลในตาราง..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3.5 py-1.5 text-xs sm:text-sm bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-blue-400 rounded-lg shadow-2xs outline-hidden transition placeholder:text-slate-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              )}
            </div>

            {lastSyncTime && (
              <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200/80 shadow-2xs">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>ล่าสุด: <strong className="text-slate-700 font-mono">{lastSyncTime.toLocaleTimeString("th-TH")}</strong></span>
              </div>
            )}

            <button
              onClick={() => fetchData(true)}
              disabled={isLoading || isRefreshing}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs sm:text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 active:bg-slate-100 border border-slate-300 rounded-lg shadow-2xs hover:shadow-xs transition disabled:opacity-50"
              title="รีเฟรชข้อมูลตอนนี้"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${isRefreshing ? "animate-spin text-blue-600" : ""}`} />
              <span>{isRefreshing ? "กำลังโหลด..." : "รีเฟรช"}</span>
            </button>

            <a
              href={googleSheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs sm:text-sm font-medium text-blue-700 bg-blue-50/80 hover:bg-blue-100 border border-blue-200/70 rounded-lg transition shadow-2xs"
            >
              <span>Google Sheet</span>
              <ExternalLink className="w-3.5 h-3.5 text-blue-500" />
            </a>
          </div>
        </div>
      </header>

      {/* Main Table Content */}
      <main className="w-full px-2 sm:px-4 lg:px-6 pt-4">
        {/* Banner Alert if Fallback or Error */}
        {errorMsg && (
          <div className={`mb-4 p-4 rounded-xl border flex items-start gap-3 text-sm shadow-xs transition-all ${
            isFallback
              ? "bg-amber-50/90 border-amber-200 text-amber-900"
              : "bg-red-50/90 border-red-200 text-red-900"
          }`}>
            <Info className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">{isFallback ? "แจ้งเตือนการตั้งค่า API Key" : "เกิดข้อผิดพลาด"}</p>
              <p className="mt-0.5 text-xs sm:text-sm text-slate-700">{errorMsg}</p>
              {isFallback && (
                <div className="mt-2 text-xs bg-white/90 p-3 rounded-lg border border-amber-200/70 font-mono text-slate-700 space-y-1">
                  <p className="font-prompt font-medium text-slate-900">วิธีเชื่อมต่อ Google Sheet จริงของคุณ:</p>
                  <p>1. เปิดไฟล์ <code className="bg-slate-100 px-1.5 py-0.5 rounded text-blue-700">src/config/sheet.config.ts</code> แล้วใส่ API Key ในช่อง <code className="text-amber-800">API_KEY</code></p>
                  <p>2. หรือตั้งค่า Environment Variable: <code className="text-amber-800">GOOGLE_SHEETS_API_KEY=your_key_here</code></p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Loading Skeleton */}
        {isLoading && !sheetData && (
          <div className="w-full bg-white rounded-2xl border border-slate-200 p-12 shadow-xs text-center">
            <div className="inline-flex p-4 bg-blue-50 text-blue-600 rounded-3xl animate-pulse mb-4 ring-1 ring-blue-500/10">
              <RefreshCw className="w-8 h-8 animate-spin" />
            </div>
            <h3 className="text-base font-semibold text-slate-800">กำลังเชื่อมต่อและโหลดข้อมูลจาก Google Sheet...</h3>
            <p className="text-xs text-slate-500 mt-1.5">ประมวลผลโครงสร้างตารางและ Merge Cell ทั้งหมดให้อัตโนมัติ</p>
          </div>
        )}

        {/* Clean Light Mode Data Table */}
        {sheetData && (
          <div className="w-full bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all">
            <div className="w-full overflow-visible">
              <table className="w-full table-auto border-collapse text-xs sm:text-sm">
                <tbody>
                  {filteredRows.map((row) => {
                    const isHeaderRow = row.rowIndex === 0 || row.rowIndex === 1;
                    const isSectionBanner =
                      !isHeaderRow &&
                      row.cells.some((c) => !c.isCovered && c.colSpan >= 3 && c.style.bold);

                    return (
                      <tr
                        key={`row-${row.rowIndex}`}
                        className={`transition-colors border-b border-slate-200 ${
                          isHeaderRow
                            ? "bg-slate-100 font-semibold text-slate-900 sticky z-20 shadow-2xs"
                            : isSectionBanner
                            ? "bg-blue-50/50 font-semibold"
                            : row.rowIndex % 2 === 1
                            ? "bg-white hover:bg-slate-50"
                            : "bg-slate-50/40 hover:bg-slate-50"
                        }`}
                        style={
                          isHeaderRow
                            ? { top: row.rowIndex === 0 ? "57px" : "93px" }
                            : undefined
                        }
                      >
                        {row.cells.map((cell) => {
                          if (cell.isCovered) return null;
                          return (
                            <RenderTableCell
                              key={`cell-${cell.rowIndex}-${cell.colIndex}`}
                              cell={cell}
                              isHeaderRow={isHeaderRow}
                              isSectionBanner={isSectionBanner}
                            />
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function RenderTableCell({
  cell,
  isHeaderRow,
  isSectionBanner,
}: {
  cell: ParsedCell;
  isHeaderRow: boolean;
  isSectionBanner: boolean;
}) {
  const { formattedValue, rowSpan, colSpan, style } = cell;

  // Determine text alignment
  let alignClass = "text-left";
  if (style.horizontalAlignment === "CENTER") alignClass = "text-center";
  else if (style.horizontalAlignment === "RIGHT") alignClass = "text-right";

  // Determine vertical alignment
  let vAlignClass = "align-middle";
  if (style.verticalAlignment === "TOP") vAlignClass = "align-top";
  else if (style.verticalAlignment === "BOTTOM") vAlignClass = "align-bottom";

  // Check if cell is numeric or currency
  const isNumeric = formattedValue && /^[\d,.-]+(%?)$/.test(formattedValue.trim());
  const isPercent = formattedValue && formattedValue.includes("%");

  // Custom inline styles
  const customStyles: React.CSSProperties = {};
  if (style.backgroundColor && !isHeaderRow && !isSectionBanner) {
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
      className={`sheet-cell px-3.5 py-2.5 border border-slate-200 ${alignClass} ${vAlignClass} ${
        style.bold ? "font-bold text-slate-900" : "font-normal text-slate-700"
      } ${style.italic ? "italic" : ""} ${
        isHeaderRow
          ? "bg-slate-100 text-slate-900 font-semibold tracking-tight border-slate-300"
          : isSectionBanner && colSpan > 1
          ? "border-l-4 border-l-blue-600 text-blue-950 font-bold text-sm sm:text-base py-3"
          : ""
      } ${isNumeric ? "font-mono font-medium tracking-tight text-slate-800" : ""} transition-colors`}
    >
      <div className="leading-relaxed">
        {formattedValue ? (
          isPercent ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              {formattedValue}
            </span>
          ) : (
            formattedValue
          )
        ) : (
          <span className="inline-block min-h-[1.25rem] text-transparent select-none">-</span>
        )}
      </div>
    </td>
  );
}
