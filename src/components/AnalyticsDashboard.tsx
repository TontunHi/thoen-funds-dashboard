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
  ArrowDownRight,
  CandlestickChart,
  FileSpreadsheet,
  BarChart2,
  GitCompare,
} from "lucide-react";

// Dynamically import react-apexcharts to prevent SSR window reference error
const Chart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-80 flex items-center justify-center bg-slate-50/50 rounded-xl animate-pulse">
      <span className="text-xs text-slate-400">กำลังโหลดกราฟแท่งเทียน...</span>
    </div>
  ),
});

export default function AnalyticsDashboard() {
  const [sheetData, setSheetData] = useState<ParsedSheetData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

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

  const analytics: AnalyticsData | null = useMemo(() => {
    if (!sheetData) return null;
    return computeAnalyticsData(sheetData);
  }, [sheetData]);

  const googleSheetUrl = `https://docs.google.com/spreadsheets/d/${SHEET_CONFIG.SPREADSHEET_ID}/edit#gid=${SHEET_CONFIG.SHEET_GID}`;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("th-TH", {
      style: "decimal",
      maximumFractionDigits: 0,
    }).format(val);
  };

  // 1. Dual Candlestick Series (แท่งเทียนคู่กัน: ปีก่อน 68 vs ปีนี้)
  const dualCandleSeries = useMemo(() => {
    if (!analytics) return [];
    return [
      {
        name: "แท่งที่ 1: ผลงานปีก่อน 68",
        data: analytics.dualCandlestick.prevYearSeries,
      },
      {
        name: "แท่งที่ 2: ยอดสะสมปีนี้",
        data: analytics.dualCandlestick.currentYearSeries,
      },
    ];
  }, [analytics]);

  const dualCandleOptions: ApexCharts.ApexOptions = {
    chart: {
      type: "candlestick",
      height: 460,
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
        speed: 600,
      },
    },
    plotOptions: {
      candlestick: {
        colors: {
          upward: "#10b981", // เขียว: เติบโต
          downward: "#ef4444", // แดง: ต่ำกว่า
        },
        wick: {
          useFillColor: true,
        },
      },
    },
    legend: {
      show: true,
      position: "top",
      horizontalAlign: "right",
      fontSize: "12px",
      fontWeight: 500,
      markers: {
        size: 7,
      },
    },
    xaxis: {
      type: "category",
      labels: {
        rotate: -25,
        rotateAlways: true,
        trim: true,
        maxHeight: 120,
        style: {
          colors: "#334155",
          fontSize: "11px",
          fontWeight: 600,
        },
      },
      axisBorder: {
        color: "#cbd5e1",
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
      shared: true,
      custom: ({ series, seriesIndex, dataPointIndex, w }) => {
        const catName = w.globals.categoryLabels[dataPointIndex];
        const prevO = w.globals.seriesCandleO[0]?.[dataPointIndex] || 0;
        const prevC = w.globals.seriesCandleC[0]?.[dataPointIndex] || 0;
        const currO = w.globals.seriesCandleO[1]?.[dataPointIndex] || 0;
        const currC = w.globals.seriesCandleC[1]?.[dataPointIndex] || 0;

        const diff = currC - prevC;
        const pct = prevC > 0 ? Math.round((diff / prevC) * 1000) / 10 : 0;
        const isGrowth = currC >= prevC;

        return `
          <div style="padding: 14px 16px; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.12); font-family: var(--font-prompt), sans-serif; font-size: 12px; color: #1e293b; min-width: 280px;">
            <div style="font-weight: 700; font-size: 13px; color: #0f172a; margin-bottom: 8px; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px;">
              ${catName}
            </div>
            <div style="margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between; background: ${isGrowth ? "#ecfdf5" : "#fef2f2"}; padding: 6px 10px; border-radius: 6px;">
              <span style="font-weight: 600; color: ${isGrowth ? "#065f46" : "#991b1b"}; font-size: 11px;">
                ${isGrowth ? "▲ ผลงานปีนี้เติบโตกว่าปีก่อน" : "▼ ผลงานปีนี้ยังตามหลังปีก่อน"}
              </span>
              <strong style="color: ${isGrowth ? "#059669" : "#dc2626"}; font-family: monospace; font-size: 12px;">
                ${pct > 0 ? "+" : ""}${pct}%
              </strong>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 11px;">
              <div style="background: #eff6ff; padding: 8px; border-radius: 8px; border: 1px solid #dbeafe;">
                <div style="font-weight: 600; color: #1d4ed8; margin-bottom: 2px;">แท่งซ้าย (ปีก่อน 68)</div>
                <div style="color: #64748b;">ผลงาน: <strong style="color: #1e40af; font-family: monospace;">${formatCurrency(prevC)} ฿</strong></div>
              </div>
              <div style="background: #f0fdf4; padding: 8px; border-radius: 8px; border: 1px solid #dcfce7;">
                <div style="font-weight: 600; color: #15803d; margin-bottom: 2px;">แท่งขวา (สะสมปีนี้)</div>
                <div style="color: #64748b;">ผลงาน: <strong style="color: #166534; font-family: monospace;">${formatCurrency(currC)} ฿</strong></div>
              </div>
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

  // 2. Category Side-by-Side Double Bar Chart
  const categoryBarSeries = useMemo(() => {
    if (!analytics) return [];
    return [
      {
        name: "ผลงานปีก่อน 68 (บาท)",
        data: analytics.categoryComparisonBar.prevYearSeries,
      },
      {
        name: "ยอดสะสมปีนี้ (บาท)",
        data: analytics.categoryComparisonBar.currentYearSeries,
      },
    ];
  }, [analytics]);

  const categoryBarOptions: ApexCharts.ApexOptions = {
    chart: {
      type: "bar",
      height: 380,
      fontFamily: "var(--font-prompt), sans-serif",
      toolbar: { show: false },
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: "55%",
        borderRadius: 4,
      },
    },
    dataLabels: {
      enabled: false,
    },
    stroke: {
      show: true,
      width: 2,
      colors: ["transparent"],
    },
    colors: ["#3b82f6", "#10b981"],
    xaxis: {
      categories: analytics?.categoryComparisonBar.categories || [],
      labels: {
        rotate: -25,
        rotateAlways: true,
        style: { colors: "#475569", fontSize: "11px", fontWeight: 500 },
      },
    },
    yaxis: {
      labels: {
        formatter: (val) => `${formatCurrency(val)} ฿`,
        style: { colors: "#64748b", fontSize: "11px" },
      },
    },
    fill: {
      opacity: 1,
    },
    legend: {
      position: "top",
      horizontalAlign: "right",
      fontSize: "12px",
    },
    tooltip: {
      y: {
        formatter: (val) => `${formatCurrency(val)} บาท`,
      },
    },
    grid: {
      borderColor: "#f1f5f9",
      strokeDashArray: 3,
    },
  };

  // 3. Monthly Trend Options & Series
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
      height: 340,
      type: "line",
      fontFamily: "var(--font-prompt), sans-serif",
      toolbar: { show: false },
    },
    stroke: {
      width: [0, 3],
      curve: "smooth",
    },
    colors: ["#6366f1", "#10b981"],
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
          style: { color: "#6366f1", fontSize: "11px" },
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

  // 4. Category Donut Options & Series
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
              label: "ผลงานปีก่อนรวม",
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
      {/* Top Header Navbar */}
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
                ระบบวิเคราะห์ผลงานแบบแท่งเทียนคู่ (Dual Candlestick Comparison)
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
                <span>ผลงานปีก่อน 2568 (รวมทุกหมวด)</span>
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                  <Wallet className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 text-2xl font-bold text-slate-900 font-mono tracking-tight">
                {formatCurrency(analytics.kpi.totalBudget)} <span className="text-sm font-normal text-slate-500 font-prompt">บาท</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">จาก {analytics.kpi.activeCategories} หมวดหมู่หลัก</p>
            </div>

            {/* Card 2: Total Spent */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-sm transition">
              <div className="flex items-center justify-between text-slate-500 text-xs">
                <span>ยอดเบิกจ่ายสะสมปีนี้</span>
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                  <Activity className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 text-2xl font-bold text-slate-900 font-mono tracking-tight">
                {formatCurrency(analytics.kpi.totalSpent)} <span className="text-sm font-normal text-slate-500 font-prompt">บาท</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="text-slate-500">เทียบปีก่อน:</span>
                <span
                  className={`font-semibold font-mono inline-flex items-center gap-0.5 ${
                    analytics.kpi.growthRate >= 0 ? "text-emerald-700" : "text-amber-700"
                  }`}
                >
                  {analytics.kpi.growthRate >= 0 ? (
                    <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <ArrowDownRight className="w-3.5 h-3.5 text-amber-600" />
                  )}
                  {analytics.kpi.growthRate > 0 ? "+" : ""}
                  {analytics.kpi.growthRate}%
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

        {/* 2. Dual Candlestick Chart Section (แท่งเทียนคู่กัน) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg">
                <GitCompare className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  กราฟแท่งเทียนคู่เปรียบเทียบเคียงข้าง (Dual Candlesticks Comparison)
                </h2>
                <p className="text-xs text-slate-500 flex items-center flex-wrap gap-2 mt-0.5">
                  <span className="font-medium text-blue-700">🕯️ แท่งซ้าย: ผลงานปีก่อน 68</span>
                  <span>•</span>
                  <span className="font-medium text-emerald-700">🕯️ แท่งขวา: ยอดสะสมปีนี้</span>
                  <span>•</span>
                  <span>เปรียบเทียบขนาด ความสูง และการกระจายตัวของทั้งสองปีคู่กันในแต่ละหมวด</span>
                </p>
              </div>
            </div>
          </div>

          <div className="w-full pt-2">
            <Chart
              options={dualCandleOptions}
              series={dualCandleSeries}
              type="candlestick"
              height={460}
            />
          </div>
        </div>

        {/* 3. Double-Bar Comparison Chart (กราฟแท่งเปรียบเทียบเคียงข้าง) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm">
          <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-100">
            <div className="p-2 bg-blue-50 text-blue-700 rounded-lg">
              <BarChart2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                กราฟแท่งคู่เปรียบเทียบรายหมวดหมู่ (Side-by-Side Double Bar Chart)
              </h2>
              <p className="text-xs text-slate-500">
                เปรียบเทียบ ผลงานปีก่อน 68 (แท่งสีน้ำเงิน) กับ ยอดสะสมปีนี้ (แท่งสีเขียว)
              </p>
            </div>
          </div>
          <div className="w-full pt-2">
            <Chart
              options={categoryBarOptions}
              series={categoryBarSeries}
              type="bar"
              height={380}
            />
          </div>
        </div>

        {/* 4. Grid Row: Monthly Spending Trend & Category Allocation */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Trend Chart (2 Cols) */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm">
            <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-100">
              <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  แนวโน้มการเบิกจ่ายรายเดือนและยอดสะสม
                </h2>
                <p className="text-xs text-slate-500">
                  เปรียบเทียบยอดเบิกจ่ายแต่ละเดือน (แท่งสีม่วง) กับยอดสะสมรวม (เส้นสีเขียว)
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

        {/* 5. Category Execution Progress Table */}
        {analytics && analytics.categoryDetails.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  ตารางเปรียบเทียบผลงานรายหมวดหมู่กองทุน (Year-over-Year Summary)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  เปรียบเทียบผลงานปีก่อน 68 กับ ยอดเบิกจ่ายสะสมปีนี้
                </p>
              </div>
            </div>

            <div className="w-full overflow-x-auto">
              <table className="w-full text-xs sm:text-sm text-left">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">ชื่อหมวดหมู่กองทุน</th>
                    <th className="py-3 px-4 text-center">แถวใน Sheet</th>
                    <th className="py-3 px-4 text-center">จำนวนโครงการ</th>
                    <th className="py-3 px-4 text-right">ผลงานปีก่อน 68 (บาท)</th>
                    <th className="py-3 px-4 text-right">สะสมปีนี้ (บาท)</th>
                    <th className="py-3 px-4 text-center">เทียบปีก่อน</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {analytics.categoryDetails.map((cat, idx) => {
                    const isGrowth = cat.currentYearSpent >= cat.prevYearBudget;

                    return (
                      <tr key={idx} className="hover:bg-slate-50/60 transition">
                        <td className="py-3.5 px-4 font-medium text-slate-900">
                          {cat.category}
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono text-slate-500">
                          {cat.sheetRow ? `แถวที่ ${cat.sheetRow}` : "-"}
                        </td>
                        <td className="py-3.5 px-4 text-center text-slate-600 font-mono">
                          {cat.itemCount}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-medium text-slate-800">
                          {formatCurrency(cat.prevYearBudget)} ฿
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-medium text-slate-900">
                          {formatCurrency(cat.currentYearSpent)} ฿
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              isGrowth
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-rose-50 text-rose-700 border border-rose-200"
                            }`}
                          >
                            {isGrowth ? "+" : ""}{cat.changePercent}%
                          </span>
                        </td>
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
