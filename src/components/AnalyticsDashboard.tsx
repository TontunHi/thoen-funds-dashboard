"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ParsedSheetData, SheetApiResponse } from "@/types/sheet";
import { SHEET_CONFIG } from "@/config/sheet.config";
import { computeAnalyticsData, AnalyticsData } from "@/lib/analytics-parser";
import {
  RefreshCw,
  ExternalLink,
  Table,
  TrendingUp,
  PieChart,
  BarChart3,
  Calendar,
  Wallet,
  Activity,
  Layers,
  ArrowUpRight,
  CandlestickChart,
  Sliders,
  CheckCircle2,
  FileSpreadsheet,
} from "lucide-react";

// Dynamically import react-apexcharts to prevent SSR window reference error
const Chart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-80 flex items-center justify-center bg-slate-50/50 rounded-xl animate-pulse">
      <span className="text-xs text-slate-400">กำลังโหลดกราฟ...</span>
    </div>
  ),
});

export default function AnalyticsDashboard() {
  const [sheetData, setSheetData] = useState<ParsedSheetData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [candlestickMode, setCandlestickMode] = useState<"monthly" | "category">("monthly");

  const fetchData = useCallback(async (manual = false) => {
    if (manual) setIsRefreshing(true);
    try {
      const res = await fetch("/api/sheet", { cache: "no-store" });
      const json: SheetApiResponse = await res.json();
      if (json.data) {
        setSheetData(json.data);
      }
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Compute analytics data
  const analytics: AnalyticsData | null = useMemo(() => {
    if (!sheetData) return null;
    return computeAnalyticsData(sheetData);
  }, [sheetData]);

  const googleSheetUrl = `https://docs.google.com/spreadsheets/d/${SHEET_CONFIG.SPREADSHEET_ID}/edit#gid=${SHEET_CONFIG.SHEET_GID}`;

  // Formatting helpers
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("th-TH", {
      style: "decimal",
      maximumFractionDigits: 0,
    }).format(val);
  };

  // 1. Candlestick Chart Options & Series
  const candlestickSeries = useMemo(() => {
    if (!analytics) return [];
    const dataPoints =
      candlestickMode === "monthly"
        ? analytics.monthlyCandlestick
        : analytics.categoryCandlestick;

    return [
      {
        name: candlestickMode === "monthly" ? "ช่วงการเบิกจ่ายรายเดือน" : "ช่วงงบประมาณรายหมวดหมู่",
        data: dataPoints,
      },
    ];
  }, [analytics, candlestickMode]);

  const candlestickOptions: ApexCharts.ApexOptions = {
    chart: {
      type: "candlestick",
      height: 380,
      fontFamily: "var(--font-prompt), sans-serif",
      toolbar: {
        show: true,
        tools: {
          download: true,
          selection: false,
          zoom: true,
          zoomin: true,
          zoomout: true,
          pan: true,
          reset: true,
        },
      },
      animations: {
        enabled: true,
        easing: "easeinout",
        speed: 800,
      },
    },
    title: {
      text:
        candlestickMode === "monthly"
          ? "กราฟแท่งเทียนการเงิน: ช่วงการเบิกจ่ายงบประมาณรายเดือน (ต.ค. 68 - ก.ย. 69)"
          : "กราฟแท่งเทียน: การกระจายตัวของงบประมาณและผลงานตามหมวดหมู่กองทุน",
      align: "left",
      style: {
        fontSize: "14px",
        fontWeight: "600",
        color: "#0f172a",
      },
    },
    plotOptions: {
      candlestick: {
        colors: {
          upward: "#10b981", // Green for positive/growth
          downward: "#ef4444", // Red
        },
        wick: {
          useFillColor: true,
        },
      },
    },
    xaxis: {
      type: "category",
      labels: {
        style: {
          colors: "#64748b",
          fontSize: "11px",
        },
      },
      axisBorder: {
        color: "#e2e8f0",
      },
    },
    yaxis: {
      tooltip: {
        enabled: true,
      },
      labels: {
        style: {
          colors: "#64748b",
          fontSize: "11px",
        },
        formatter: (val) => `${formatCurrency(val)} ฿`,
      },
    },
    tooltip: {
      custom: ({ seriesIndex, dataPointIndex, w }) => {
        const o = w.globals.seriesCandleO[seriesIndex][dataPointIndex];
        const h = w.globals.seriesCandleH[seriesIndex][dataPointIndex];
        const l = w.globals.seriesCandleL[seriesIndex][dataPointIndex];
        const c = w.globals.seriesCandleC[seriesIndex][dataPointIndex];
        const categoryName = w.globals.categoryLabels[dataPointIndex];

        return `
          <div style="padding: 12px 14px; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.08); font-family: sans-serif; font-size: 12px; color: #1e293b;">
            <div style="font-weight: 700; color: #0f172a; margin-bottom: 6px; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px;">
              ${categoryName}
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 11px;">
              <div>เริ่มต้น (Open): <strong style="color: #3b82f6;">${formatCurrency(o)} ฿</strong></div>
              <div>สูงสุด (High): <strong style="color: #10b981;">${formatCurrency(h)} ฿</strong></div>
              <div>ต่ำสุด (Low): <strong style="color: #ef4444;">${formatCurrency(l)} ฿</strong></div>
              <div>สิ้นสุด (Close): <strong style="color: #6366f1;">${formatCurrency(c)} ฿</strong></div>
            </div>
          </div>
        `;
      },
    },
    grid: {
      borderColor: "#f1f5f9",
      strokeDashArray: 3,
    },
  };

  // 2. Monthly Trend (Mixed Bar & Area) Options & Series
  const trendSeries = useMemo(() => {
    if (!analytics) return [];
    return [
      {
        name: "ยอดเบิกจ่ายประจำเดือน",
        type: "column",
        data: analytics.monthlyTrend.monthlyDisbursement,
      },
      {
        name: "ยอดเบิกจ่ายสะสม (Cumulative)",
        type: "line",
        data: analytics.monthlyTrend.cumulativeDisbursement,
      },
    ];
  }, [analytics]);

  const trendOptions: ApexCharts.ApexOptions = {
    chart: {
      height: 350,
      type: "line",
      fontFamily: "var(--font-prompt), sans-serif",
      toolbar: { show: false },
    },
    stroke: {
      width: [0, 3],
      curve: "smooth",
    },
    colors: ["#3b82f6", "#10b981"],
    plotOptions: {
      bar: {
        columnWidth: "45%",
        borderRadius: 4,
      },
    },
    fill: {
      opacity: [0.85, 1],
    },
    labels: analytics?.monthlyTrend.months || [],
    markers: {
      size: [0, 4],
    },
    xaxis: {
      labels: {
        style: { colors: "#64748b", fontSize: "11px" },
      },
    },
    yaxis: [
      {
        title: {
          text: "ยอดเบิกจ่ายประจำเดือน (บาท)",
          style: { color: "#3b82f6", fontSize: "11px" },
        },
        labels: {
          formatter: (val) => `${formatCurrency(val)}`,
          style: { colors: "#64748b", fontSize: "11px" },
        },
      },
      {
        opposite: true,
        title: {
          text: "ยอดสะสม (บาท)",
          style: { color: "#10b981", fontSize: "11px" },
        },
        labels: {
          formatter: (val) => `${formatCurrency(val)}`,
          style: { colors: "#64748b", fontSize: "11px" },
        },
      },
    ],
    tooltip: {
      shared: true,
      intersect: false,
      y: {
        formatter: (y) => (typeof y !== "undefined" ? `${formatCurrency(y)} บาท` : y),
      },
    },
    grid: {
      borderColor: "#f1f5f9",
      strokeDashArray: 3,
    },
  };

  // 3. Category Donut Options & Series
  const donutSeries = analytics?.categoryDonut.series || [];
  const donutOptions: ApexCharts.ApexOptions = {
    chart: {
      type: "donut",
      fontFamily: "var(--font-prompt), sans-serif",
    },
    labels: analytics?.categoryDonut.labels || [],
    colors: ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#64748b"],
    legend: {
      position: "bottom",
      fontSize: "11px",
      labels: { colors: "#475569" },
    },
    plotOptions: {
      pie: {
        donut: {
          size: "65%",
          labels: {
            show: true,
            total: {
              show: true,
              label: "งบประมาณรวม",
              formatter: () => `${formatCurrency(analytics?.kpi.totalBudget || 0)} ฿`,
            },
          },
        },
      },
    },
    tooltip: {
      y: {
        formatter: (val) => `${formatCurrency(val)} บาท`,
      },
    },
  };

  return (
    <div className="w-full min-h-screen bg-slate-50 text-slate-800 pb-24 font-prompt selection:bg-blue-100 selection:text-blue-900">
      {/* Top Header Navbar with Navigation Tabs */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs transition-all">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-4">
          {/* Logo & Title */}
          <div className="flex items-center space-x-3.5">
            <div className="p-2.5 bg-blue-50 text-blue-700 rounded-xl border border-blue-200/80 shadow-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900">
                  {sheetData?.title || SHEET_CONFIG.APP_TITLE}
                </h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Live Analytics
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                ระบบวิเคราะห์ผลการดำเนินงานและแนวโน้มการใช้งบประมาณรายเดือน
              </p>
            </div>
          </div>

          {/* Navigation Tabs (Table View vs Analytics View) & Actions */}
          <div className="flex items-center flex-wrap gap-2.5 sm:gap-3">
            {/* View Switcher Tabs */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80 shadow-2xs">
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-white/60 rounded-lg transition"
              >
                <Table className="w-3.5 h-3.5 text-slate-500" />
                <span>ตารางข้อมูล</span>
              </Link>
              <Link
                href="/analytics"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-white shadow-2xs rounded-lg transition"
              >
                <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
                <span>วิเคราะห์ข้อมูล</span>
              </Link>
            </div>

            <button
              onClick={() => fetchData(true)}
              disabled={isLoading || isRefreshing}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs sm:text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 active:bg-slate-100 border border-slate-300 rounded-lg shadow-2xs transition disabled:opacity-50"
              title="รีเฟรชข้อมูล"
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

      {/* Main Analytics Content */}
      <main className="w-full px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* 1. Executive KPI Cards */}
        {analytics && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Total Budget */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-sm transition">
              <div className="flex items-center justify-between text-slate-500 text-xs">
                <span>งบประมาณปี 2568</span>
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                  <Wallet className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 text-2xl font-bold text-slate-900 font-mono tracking-tight">
                {formatCurrency(analytics.kpi.totalBudget)} <span className="text-sm font-normal text-slate-500 font-prompt">บาท</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">จาก {analytics.kpi.totalItems} รายการโครงการ</p>
            </div>

            {/* Card 2: Total Spent */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-sm transition">
              <div className="flex items-center justify-between text-slate-500 text-xs">
                <span>ยอดเบิกจ่ายสะสมรวม</span>
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                  <Activity className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 text-2xl font-bold text-slate-900 font-mono tracking-tight">
                {formatCurrency(analytics.kpi.totalSpent)} <span className="text-sm font-normal text-slate-500 font-prompt">บาท</span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full"
                    style={{ width: `${Math.min(100, analytics.kpi.progressPercent)}%` }}
                  ></div>
                </div>
                <span className="text-xs font-semibold text-emerald-700 font-mono">
                  {analytics.kpi.progressPercent}%
                </span>
              </div>
            </div>

            {/* Card 3: Peak Month */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-sm transition">
              <div className="flex items-center justify-between text-slate-500 text-xs">
                <span>เดือนที่เบิกจ่ายสูงสุด</span>
                <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                  <Calendar className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 text-2xl font-bold text-slate-900 tracking-tight">
                {analytics.kpi.peakMonth}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                ยอดรวม: <strong className="font-mono text-slate-800">{formatCurrency(analytics.kpi.peakMonthAmount)} ฿</strong>
              </p>
            </div>

            {/* Card 4: Categories */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-sm transition">
              <div className="flex items-center justify-between text-slate-500 text-xs">
                <span>หมวดหมู่กองทุนทั้งหมด</span>
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                  <Layers className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 text-2xl font-bold text-slate-900 tracking-tight font-mono">
                {analytics.kpi.activeCategories} <span className="text-sm font-normal text-slate-500 font-prompt">หมวดหมู่</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">ติดตามผลงานแบบเรียลไทม์</p>
            </div>
          </div>
        )}

        {/* 2. Candlestick Chart Section (แท่งเทียน) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg">
                <CandlestickChart className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  กราฟแท่งเทียนการเงิน (Financial Candlestick Analysis)
                </h2>
                <p className="text-xs text-slate-500">
                  วิเคราะห์ช่วงการกระจายตัวของงบประมาณและยอดเบิกจ่าย (Open-High-Low-Close)
                </p>
              </div>
            </div>

            {/* View Switcher Toggle */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/70 text-xs">
              <button
                onClick={() => setCandlestickMode("monthly")}
                className={`px-3 py-1.5 rounded-lg font-medium transition ${
                  candlestickMode === "monthly"
                    ? "bg-white text-slate-900 shadow-2xs font-semibold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                📅 ไทม์ไลน์ 12 เดือน (Monthly OHLC)
              </button>
              <button
                onClick={() => setCandlestickMode("category")}
                className={`px-3 py-1.5 rounded-lg font-medium transition ${
                  candlestickMode === "category"
                    ? "bg-white text-slate-900 shadow-2xs font-semibold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                🏷️ รายหมวดหมู่กองทุน (By Category)
              </button>
            </div>
          </div>

          <div className="w-full pt-2">
            <Chart
              options={candlestickOptions}
              series={candlestickSeries}
              type="candlestick"
              height={380}
            />
          </div>
        </div>

        {/* 3. Grid Row: Monthly Spending Trend & Category Allocation */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Trend Chart (2 Cols) */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm">
            <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-100">
              <div className="p-2 bg-blue-50 text-blue-700 rounded-lg">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  แนวโน้มการเบิกจ่ายรายเดือนและยอดสะสม
                </h2>
                <p className="text-xs text-slate-500">
                  เปรียบเทียบยอดเบิกจ่ายแต่ละเดือน (แท่งสีฟ้า) กับยอดสะสมรวม (เส้นสีเขียว)
                </p>
              </div>
            </div>
            <div className="w-full pt-2">
              <Chart options={trendOptions} series={trendSeries} type="line" height={340} />
            </div>
          </div>

          {/* Donut Chart (1 Col) */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm">
            <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-100">
              <div className="p-2 bg-purple-50 text-purple-700 rounded-lg">
                <PieChart className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  สัดส่วนงบประมาณตามหมวดหมู่
                </h2>
                <p className="text-xs text-slate-500">การจัดสรรงบประมาณปี 2568</p>
              </div>
            </div>
            <div className="w-full pt-2">
              <Chart options={donutOptions} series={donutSeries} type="donut" height={340} />
            </div>
          </div>
        </div>

        {/* 4. Category Execution Progress Table */}
        {analytics && analytics.categories.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  สรุปผลการดำเนินงานรายหมวดหมู่กองทุน
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  ความก้าวหน้าและการเบิกจ่ายเทียบกับงบประมาณจัดสรร
                </p>
              </div>
            </div>

            <div className="w-full overflow-x-auto">
              <table className="w-full text-xs sm:text-sm text-left">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">ชื่อหมวดหมู่กองทุน</th>
                    <th className="py-3 px-4 text-center">จำนวนโครงการ</th>
                    <th className="py-3 px-4 text-right">งบประมาณจัดสรร (บาท)</th>
                    <th className="py-3 px-4 text-right">เบิกจ่ายแล้ว (บาท)</th>
                    <th className="py-3 px-4 text-center">ความก้าวหน้า</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {analytics.categories.map((cat, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/60 transition">
                      <td className="py-3.5 px-4 font-medium text-slate-900">
                        {cat.name}
                      </td>
                      <td className="py-3.5 px-4 text-center text-slate-600 font-mono">
                        {cat.itemCount}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-medium text-slate-800">
                        {formatCurrency(cat.budget)} ฿
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-medium text-emerald-700">
                        {formatCurrency(cat.spent)} ฿
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            cat.percentage >= 80
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : cat.percentage >= 50
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-blue-50 text-blue-700 border border-blue-200"
                          }`}
                        >
                          {cat.percentage}%
                        </span>
                      </td>
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
