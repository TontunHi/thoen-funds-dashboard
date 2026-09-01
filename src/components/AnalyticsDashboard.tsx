"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
  FileSpreadsheet,
  BarChart2,
  Filter,
  CheckSquare,
  Square,
  HelpCircle,
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
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [showEquationModal, setShowEquationModal] = useState<boolean>(false);
  const isInitializedRef = useRef<boolean>(false);

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

  // Set default selected categories on initial load only once
  useEffect(() => {
    if (analytics && analytics.categoryDetails.length > 0 && !isInitializedRef.current) {
      setSelectedCategories(analytics.categoryDetails.map((c) => c.category));
      isInitializedRef.current = true;
    }
  }, [analytics]);

  const toggleCategory = (catName: string) => {
    setSelectedCategories((prev) =>
      prev.includes(catName) ? prev.filter((c) => c !== catName) : [...prev, catName]
    );
  };

  const selectAllCategories = () => {
    if (analytics) {
      setSelectedCategories(analytics.categoryDetails.map((c) => c.category));
    }
  };

  const clearAllCategories = () => {
    setSelectedCategories([]);
  };

  const googleSheetUrl = `https://docs.google.com/spreadsheets/d/${SHEET_CONFIG.SPREADSHEET_ID}/edit#gid=${SHEET_CONFIG.SHEET_GID}`;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("th-TH", {
      style: "decimal",
      maximumFractionDigits: 0,
    }).format(val);
  };

  // 1. Filtered Side-by-Side Comparison Bar Chart based on Selected Categories
  const filteredCategoryDetails = useMemo(() => {
    if (!analytics) return [];
    return analytics.categoryDetails.filter((c) => selectedCategories.includes(c.category));
  }, [analytics, selectedCategories]);

  const categoryBarSeries = useMemo(() => {
    return [
      {
        name: "ผลงานปีก่อน 68 (Baseline)",
        data: filteredCategoryDetails.map((c) => c.prevYearBudget),
      },
      {
        name: "ยอดสะสมปีนี้ (Actual)",
        data: filteredCategoryDetails.map((c) => c.currentYearSpent),
      },
    ];
  }, [filteredCategoryDetails]);

  const categoryBarOptions: ApexCharts.ApexOptions = {
    chart: {
      type: "bar",
      height: 440,
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
      bar: {
        horizontal: false,
        columnWidth: filteredCategoryDetails.length <= 3 ? "30%" : filteredCategoryDetails.length <= 6 ? "45%" : "55%",
        borderRadius: 6,
        borderRadiusApplication: "end",
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
    fill: {
      opacity: 0.95,
      type: "gradient",
      gradient: {
        shade: "light",
        type: "vertical",
        shadeIntensity: 0.2,
        opacityFrom: 0.95,
        opacityTo: 0.85,
      },
    },
    legend: {
      position: "top",
      horizontalAlign: "right",
      fontSize: "12px",
      fontWeight: 500,
      markers: {
        size: 7,
      },
    },
    xaxis: {
      categories: filteredCategoryDetails.map((c) =>
        c.category.length > 20 ? c.category.substring(0, 18) + "..." : c.category
      ),
      labels: {
        rotate: -25,
        rotateAlways: filteredCategoryDetails.length > 3,
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
      labels: {
        formatter: (val) => `${formatCurrency(val)} ฿`,
        style: {
          colors: "#64748b",
          fontSize: "11px",
        },
      },
    },
    tooltip: {
      shared: true,
      intersect: false,
      custom: ({ series, seriesIndex, dataPointIndex, w }) => {
        const cat = filteredCategoryDetails[dataPointIndex];
        const catName = cat?.category || w.globals.categoryLabels[dataPointIndex];
        const prev = series[0]?.[dataPointIndex] || 0;
        const curr = series[1]?.[dataPointIndex] || 0;
        const diff = curr - prev;
        const pct = prev > 0 ? Math.round((diff / prev) * 1000) / 10 : curr > 0 ? 100 : 0;
        const isGrowth = curr >= prev;

        return `
          <div style="padding: 14px 16px; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.12); font-family: var(--font-prompt), sans-serif; font-size: 12px; color: #1e293b; min-width: 280px;">
            <div style="font-weight: 700; font-size: 13px; color: #0f172a; margin-bottom: 8px; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px;">
              ${catName}
            </div>
            <div style="margin-bottom: 10px; display: flex; align-items: center; justify-content: space-between; background: ${isGrowth ? "#ecfdf5" : "#fef2f2"}; padding: 6px 10px; border-radius: 6px;">
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
                <strong style="color: #1e40af; font-family: monospace; font-size: 13px;">${formatCurrency(prev)} ฿</strong>
              </div>
              <div style="background: #f0fdf4; padding: 8px; border-radius: 8px; border: 1px solid #dcfce7;">
                <div style="font-weight: 600; color: #15803d; margin-bottom: 2px;">แท่งขวา (สะสมปีนี้)</div>
                <strong style="color: ${isGrowth ? "#166534" : "#dc2626"}; font-family: monospace; font-size: 13px;">${formatCurrency(curr)} ฿</strong>
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

  // 2. Monthly Spending Trend Options & Series
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
        borderRadius: 5,
      },
    },
    fill: {
      opacity: [0.9, 1],
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
                ระบบวิเคราะห์ผลงานหมวดหมู่กองทุนเปรียบเทียบปีนี้ vs ปีก่อน (Side-by-Side Comparison)
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

        {/* 2. Main Executive Comparison Bar Chart with Category Filter */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-50 text-blue-700 rounded-lg">
                <BarChart2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  กราฟแท่งเปรียบเทียบผลงานหมวดหมู่: ปีนี้ vs ปีก่อน (Side-by-Side Comparison)
                </h2>
                <p className="text-xs text-slate-500 flex items-center flex-wrap gap-2 mt-0.5">
                  <span className="font-medium text-blue-700">🟦 แท่งสีน้ำเงิน: ผลงานปีก่อน 68</span>
                  <span>•</span>
                  <span className="font-medium text-emerald-700">🟩 แท่งสีเขียว: ยอดสะสมปีนี้</span>
                  <span>•</span>
                  <span>เลือกติ๊กหมวดหมู่ด้านล่างเพื่อเปรียบเทียบเฉพาะรายการที่ต้องการ ({selectedCategories.length}/{analytics?.categoryDetails.length || 0} หมวด)</span>
                </p>
              </div>
            </div>

            {/* Quick Actions (Select All / Clear) */}
            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={selectAllCategories}
                className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg font-medium transition cursor-pointer"
              >
                เลือกทั้งหมด
              </button>
              <button
                type="button"
                onClick={clearAllCategories}
                className="px-3 py-1.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 text-slate-700 border border-slate-200 rounded-lg font-medium transition cursor-pointer"
              >
                ล้างการเลือก
              </button>
            </div>
          </div>

          {/* Interactive Category Selector Pills */}
          {analytics && analytics.categoryDetails.length > 0 && (
            <div className="flex items-center flex-wrap gap-1.5 p-3 bg-slate-50/80 rounded-xl border border-slate-200/70">
              <span className="text-xs font-semibold text-slate-600 mr-1 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-blue-600" />
                เลือกรายการ:
              </span>
              {analytics.categoryDetails.map((cat, idx) => {
                const isSelected = selectedCategories.includes(cat.category);
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => toggleCategory(cat.category)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer select-none ${
                      isSelected
                        ? "bg-blue-600 text-white shadow-2xs border border-blue-600"
                        : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                    }`}
                  >
                    {isSelected ? (
                      <CheckSquare className="w-3.5 h-3.5 text-white" />
                    ) : (
                      <Square className="w-3.5 h-3.5 text-slate-400" />
                    )}
                    <span>{cat.category}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Chart Display */}
          <div className="w-full pt-2">
            {filteredCategoryDetails.length > 0 ? (
              <Chart
                options={categoryBarOptions}
                series={categoryBarSeries}
                type="bar"
                height={440}
              />
            ) : (
              <div className="w-full h-80 flex flex-col items-center justify-center text-slate-500 text-sm bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
                <Filter className="w-8 h-8 text-slate-300 mb-2" />
                <p className="font-medium text-slate-600">ยังไม่ได้เลือกหมวดหมู่ใดเพื่อแสดงกราฟ</p>
                <p className="text-xs text-slate-400 mt-0.5">กรุณาคลิกเลือกหมวดหมู่ที่ต้องการเปรียบเทียบจากรายการด้านบน</p>
                <button
                  type="button"
                  onClick={selectAllCategories}
                  className="mt-3 px-3.5 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition shadow-2xs cursor-pointer"
                >
                  เลือกหมวดหมู่ทั้งหมด
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 3. Grid Row: Monthly Spending Trend & Category Allocation */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Trend Chart (2 Cols) */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-50 text-blue-700 rounded-lg">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    แนวโน้มการเบิกจ่ายรายเดือนและยอดสะสม
                  </h2>
                  <p className="text-xs text-slate-500">
                    ยอดเบิกจ่ายแต่ละเดือน (แท่งสีฟ้า) กับยอดสะสมรวม (เส้นสีเขียว)
                  </p>
                </div>
              </div>

              {/* Info Button for Equation */}
              <button
                type="button"
                onClick={() => setShowEquationModal(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 border border-slate-200 rounded-lg transition cursor-pointer"
                title="ดูที่มาของข้อมูลและสมการคำนวณ"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>ที่มาข้อมูล & สมการ</span>
              </button>
            </div>
            <div className="w-full pt-2">
              <Chart options={trendOptions} series={trendSeries} type="line" height={350} />
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
              <Chart options={donutOptions} series={donutSeries} type="donut" height={350} />
            </div>
          </div>
        </div>

        {/* 4. Category Execution Progress Table (เรียงตาม Sheet และไม่มีบอกเลขแถว) */}
        {analytics && analytics.categoryDetails.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  ตารางเปรียบเทียบผลงานรายหมวดหมู่กองทุน (Year-over-Year Summary)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  เรียงตามลำดับโครงสร้างหมวดหมู่ใน Google Sheet
                </p>
              </div>
            </div>

            <div className="w-full overflow-x-auto">
              <table className="w-full text-xs sm:text-sm text-left">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">ชื่อหมวดหมู่กองทุน</th>
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

      {/* Equation & Data Source Explanation Modal */}
      {showEquationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-blue-600" />
                ที่มาข้อมูลและสมการคำนวณกราฟแนวโน้มรายเดือน
              </h3>
              <button
                type="button"
                onClick={() => setShowEquationModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs sm:text-sm text-slate-700">
              <div>
                <p className="font-semibold text-slate-900">1. ส่วนของข้อมูลที่ดึงมา (Data Source):</p>
                <p className="mt-0.5 text-slate-600">
                  ดึงจาก <strong>คอลัมน์ F ถึง Q</strong> (ข้อมูลรายเดือน 12 เดือน: ต.ค. 68 ถึง ก.ย. 69) ของทุกโครงการย่อยในชีต <code>ติดตามผลงาน</code>
                </p>
              </div>

              <div>
                <p className="font-semibold text-slate-900">2. ยอดเบิกจ่ายประจำเดือน (แท่งสีฟ้า - Monthly Bar):</p>
                <p className="mt-0.5 text-slate-600">
                  ผลรวมของยอดเงินเบิกจ่ายที่เกิดขึ้นจริงในเดือน $m$ ของทุกโครงการย่อย:
                </p>
                <div className="mt-1 p-2.5 bg-slate-50 rounded-lg font-mono text-xs text-blue-700 border border-slate-200">
                  Monthly[m] = Sum( Row[i][Month_m] ) สำหรับทุกโครงการ i
                </div>
              </div>

              <div>
                <p className="font-semibold text-slate-900">3. ยอดสะสม (เส้นสีเขียว - Cumulative Line):</p>
                <p className="mt-0.5 text-slate-600">
                  ผลรวมสะสมต่อเนื่องตั้งแต่เดือนแรก (ต.ค. 68) บวกสะสมไปจนถึงเดือน $m$:
                </p>
                <div className="mt-1 p-2.5 bg-slate-50 rounded-lg font-mono text-xs text-emerald-700 border border-slate-200">
                  Cumulative[m] = Cumulative[m - 1] + Monthly[m]
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowEquationModal(false)}
                className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-medium text-xs transition cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
