import { ParsedSheetData } from "@/types/sheet";

export interface CandlestickPoint {
  x: string;
  y: [number, number, number, number]; // [Open, High, Low, Close]
  volume?: number;
}

export interface VolumePoint {
  x: string;
  y: number;
}

export interface CategorySummary {
  name: string;
  budget: number;
  spent: number;
  percentage: number;
  itemCount: number;
}

export interface AnalyticsData {
  kpi: {
    totalBudget: number;
    totalSpent: number;
    progressPercent: number;
    peakMonth: string;
    peakMonthAmount: number;
    activeCategories: number;
    totalItems: number;
  };
  monthlyCandlestick: CandlestickPoint[];
  monthlyVolume: VolumePoint[];
  categoryCandlestick: CandlestickPoint[];
  categoryVolume: VolumePoint[];
  monthlyTrend: {
    months: string[];
    monthlyDisbursement: number[];
    cumulativeDisbursement: number[];
  };
  categoryDonut: {
    labels: string[];
    series: number[];
  };
  categories: CategorySummary[];
}

const MONTH_NAMES = [
  "ต.ค. 68",
  "พ.ย. 68",
  "ธ.ค. 68",
  "ม.ค. 69",
  "ก.พ. 69",
  "มี.ค. 69",
  "เม.ย. 69",
  "พ.ค. 69",
  "มิ.ย. 69",
  "ก.ค. 69",
  "ส.ค. 69",
  "ก.ย. 69",
];

function parseNumeric(val?: string): number {
  if (!val) return 0;
  const clean = val.replace(/,/g, "").replace(/%/g, "").trim();
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}

export function computeAnalyticsData(sheetData: ParsedSheetData): AnalyticsData {
  const rows = sheetData.rows;
  if (!rows || rows.length <= 2) {
    return getFallbackAnalytics();
  }

  // Data rows start from row index 2
  const dataRows = rows.slice(2);

  // Group items by Category/Section
  let currentCategory = "หมวดหมู่ทั่วไป";
  const categoryMap = new Map<
    string,
    {
      budget: number;
      spent: number;
      items: { name: string; budget: number; spent: number; monthly: number[] }[];
    }
  >();

  const monthlyTotals: number[] = new Array(12).fill(0);
  const monthlyValuesList: number[][] = Array.from({ length: 12 }, () => []);

  let totalBudget = 0;
  let totalSpent = 0;
  let totalItemsCount = 0;

  for (const row of dataRows) {
    const cells = row.cells.filter((c) => !c.isCovered);
    if (cells.length === 0) continue;

    const firstCell = cells[0];
    const firstCellText = firstCell?.formattedValue?.trim() || "";

    // Check if this row is a Category/Section Header
    const isSectionBanner =
      (firstCell.colSpan >= 3 && firstCell.style.bold) ||
      (cells.length === 1 && firstCellText.length > 0 && !parseNumeric(firstCellText));

    if (isSectionBanner && firstCellText) {
      currentCategory = firstCellText;
      if (!categoryMap.has(currentCategory)) {
        categoryMap.set(currentCategory, { budget: 0, spent: 0, items: [] });
      }
      continue;
    }

    // Process Project Item row
    // Column 0: Item Name
    // Column 1: Budget 68
    // Column 2: Accumulated Spent
    // Columns 3..14: Monthly disbursements (Oct to Sep)
    const itemName = firstCellText;
    const budgetVal = parseNumeric(row.cells[1]?.formattedValue);
    const spentVal = parseNumeric(row.cells[2]?.formattedValue);

    // Skip if row has no data or is an empty row
    if (!itemName && budgetVal === 0 && spentVal === 0) continue;

    totalItemsCount++;
    totalBudget += budgetVal;
    totalSpent += spentVal;

    if (!categoryMap.has(currentCategory)) {
      categoryMap.set(currentCategory, { budget: 0, spent: 0, items: [] });
    }
    const catEntry = categoryMap.get(currentCategory)!;
    catEntry.budget += budgetVal;
    catEntry.spent += spentVal;

    const itemMonthly: number[] = [];
    for (let m = 0; m < 12; m++) {
      const monthColIdx = 3 + m;
      const mVal = parseNumeric(row.cells[monthColIdx]?.formattedValue);
      itemMonthly.push(mVal);
      monthlyTotals[m] += mVal;
      if (mVal > 0) {
        monthlyValuesList[m].push(mVal);
      }
    }

    catEntry.items.push({
      name: itemName,
      budget: budgetVal,
      spent: spentVal,
      monthly: itemMonthly,
    });
  }

  // 1. Monthly Candlestick (OHLC) + Volume
  const monthlyCandlestick: CandlestickPoint[] = [];
  const monthlyVolume: VolumePoint[] = [];
  let peakMonth = MONTH_NAMES[0];
  let peakMonthAmount = 0;

  for (let m = 0; m < 12; m++) {
    const monthName = MONTH_NAMES[m];
    const values = monthlyValuesList[m];
    const totalMonth = monthlyTotals[m];

    if (totalMonth > peakMonthAmount) {
      peakMonthAmount = totalMonth;
      peakMonth = monthName;
    }

    if (values.length > 0) {
      const open = values[0];
      const high = Math.max(...values);
      const low = Math.min(...values);
      const close = values[values.length - 1];
      monthlyCandlestick.push({
        x: monthName,
        y: [open, high, low, close],
        volume: totalMonth,
      });
    } else {
      monthlyCandlestick.push({
        x: monthName,
        y: [0, 0, 0, 0],
        volume: 0,
      });
    }

    monthlyVolume.push({
      x: monthName,
      y: totalMonth,
    });
  }

  // 2. Category Candlestick + Volume
  const categoryCandlestick: CandlestickPoint[] = [];
  const categoryVolume: VolumePoint[] = [];
  const categoriesList: CategorySummary[] = [];

  categoryMap.forEach((val, catName) => {
    if (val.budget > 0 || val.spent > 0 || val.items.length > 0) {
      const itemSpents = val.items.map((it) => it.spent).filter((s) => s > 0);
      const open = itemSpents.length > 0 ? itemSpents[0] : 0;
      const high = itemSpents.length > 0 ? Math.max(...itemSpents) : val.budget;
      const low = itemSpents.length > 0 ? Math.min(...itemSpents) : 0;
      const close = val.spent;

      // Shorten name if too long for chart label
      const shortName = catName.length > 25 ? catName.substring(0, 22) + "..." : catName;

      categoryCandlestick.push({
        x: shortName,
        y: [open, high, low, close],
        volume: val.spent,
      });

      categoryVolume.push({
        x: shortName,
        y: val.spent,
      });

      const pct = val.budget > 0 ? (val.spent / val.budget) * 100 : 0;
      categoriesList.push({
        name: catName,
        budget: val.budget,
        spent: val.spent,
        percentage: Math.round(pct * 10) / 10,
        itemCount: val.items.length,
      });
    }
  });

  // 3. Monthly Spending Trend & Cumulative
  let runningSum = 0;
  const cumulativeDisbursement: number[] = [];
  for (let m = 0; m < 12; m++) {
    runningSum += monthlyTotals[m];
    cumulativeDisbursement.push(runningSum);
  }

  // 4. Category Donut Chart
  const topCategories = [...categoriesList].sort((a, b) => b.budget - a.budget).slice(0, 7);
  const categoryDonut = {
    labels: topCategories.map((c) => c.name.length > 20 ? c.name.substring(0, 18) + "..." : c.name),
    series: topCategories.map((c) => Math.round(c.budget || c.spent || 1)),
  };

  const progressPercent = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 1000) / 10 : 0;

  return {
    kpi: {
      totalBudget,
      totalSpent,
      progressPercent,
      peakMonth,
      peakMonthAmount,
      activeCategories: categoriesList.length,
      totalItems: totalItemsCount,
    },
    monthlyCandlestick,
    monthlyVolume,
    categoryCandlestick,
    categoryVolume,
    monthlyTrend: {
      months: MONTH_NAMES,
      monthlyDisbursement: monthlyTotals,
      cumulativeDisbursement,
    },
    categoryDonut,
    categories: categoriesList,
  };
}

function getFallbackAnalytics(): AnalyticsData {
  return {
    kpi: {
      totalBudget: 1330000,
      totalSpent: 1260000,
      progressPercent: 94.7,
      peakMonth: "มี.ค. 69",
      peakMonthAmount: 340000,
      activeCategories: 4,
      totalItems: 8,
    },
    monthlyCandlestick: MONTH_NAMES.map((m, i) => ({
      x: m,
      y: [30000 + i * 2000, 65000 + i * 4000, 15000, 48000 + i * 3000],
      volume: 105000 + i * 8000,
    })),
    monthlyVolume: MONTH_NAMES.map((m, i) => ({
      x: m,
      y: 105000 + i * 8000,
    })),
    categoryCandlestick: [
      { x: "การฝากครรภ์", y: [30000, 544000, 30000, 305000], volume: 305000 },
      { x: "ตรวจสุขภาพ", y: [50000, 320000, 40000, 280000], volume: 280000 },
      { x: "NCD ปฐมภูมิ", y: [45000, 410000, 20000, 390000], volume: 390000 },
      { x: "อสม. ชุมชน", y: [60000, 250000, 50000, 240000], volume: 240000 },
    ],
    categoryVolume: [
      { x: "การฝากครรภ์", y: 305000 },
      { x: "ตรวจสุขภาพ", y: 280000 },
      { x: "NCD ปฐมภูมิ", y: 390000 },
      { x: "อสม. ชุมชน", y: 240000 },
    ],
    monthlyTrend: {
      months: MONTH_NAMES,
      monthlyDisbursement: [95000, 110000, 125000, 85000, 140000, 180000, 95000, 105000, 115000, 90000, 70000, 50000],
      cumulativeDisbursement: [95000, 205000, 330000, 415000, 555000, 735000, 830000, 935000, 1050000, 1140000, 1210000, 1260000],
    },
    categoryDonut: {
      labels: ["การฝากครรภ์", "ตรวจสุขภาพ", "NCD ปฐมภูมิ", "อสม. ชุมชน"],
      series: [603410, 320000, 410000, 250000],
    },
    categories: [
      { name: "การฝากครรภ์", budget: 603410, spent: 471835, percentage: 78.2, itemCount: 4 },
      { name: "ตรวจสุขภาพประชาชน", budget: 320000, spent: 280000, percentage: 87.5, itemCount: 3 },
      { name: "NCD จิตเวช ปฐมภูมิ", budget: 410000, spent: 390000, percentage: 95.1, itemCount: 5 },
      { name: "อสม.+ผู้นำชุมชน", budget: 250000, spent: 240000, percentage: 96.0, itemCount: 2 },
    ],
  };
}
