import { ParsedSheetData } from "@/types/sheet";

export interface CandlestickPoint {
  x: string;
  y: [number, number, number, number]; // [Open: ปีก่อน 68, High: สูงสุด, Low: ต่ำสุด, Close: สะสมปีนี้]
  prevYearBudget: number;
  currentYearSpent: number;
  changePercent: number;
  volume?: number;
}

export interface ProjectCandleItem {
  name: string;
  category: string;
  candle: CandlestickPoint;
}

export interface CategorySummary {
  name: string;
  budget: number; // ผลงานปีก่อน 68
  spent: number; // รวมสะสมปีนี้
  percentage: number;
  itemCount: number;
  candle: CandlestickPoint;
  projectCandles: ProjectCandleItem[];
}

export interface AnalyticsData {
  kpi: {
    totalBudget: number;
    totalSpent: number;
    progressPercent: number;
    growthRate: number;
    peakMonth: string;
    peakMonthAmount: number;
    activeCategories: number;
    totalItems: number;
  };
  categoryCandlesticks: CandlestickPoint[];
  allProjectsCandlesticks: ProjectCandleItem[];
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

function createCandlePoint(
  label: string,
  prevBudget: number,
  currSpent: number,
  monthlyVals: number[] = []
): CandlestickPoint {
  const open = prevBudget;
  const close = currSpent;

  // Compute High and Low
  const validMonthly = monthlyVals.filter((v) => v > 0);
  const maxMonth = validMonthly.length > 0 ? Math.max(...validMonthly) : 0;
  const minMonth = validMonthly.length > 0 ? Math.min(...validMonthly) : 0;

  // High should be at least max(open, close)
  let high = Math.max(open, close);
  if (high === 0 && maxMonth > 0) high = maxMonth;
  if (high > 0 && maxMonth > 0) {
    high = Math.max(high, maxMonth * 1.1);
  }

  // Low should be at most min(open, close)
  let low = Math.min(open, close);
  if (minMonth > 0 && minMonth < low) {
    low = minMonth * 0.9;
  }
  if (low <= 0 && high > 0) {
    low = Math.round(high * 0.05); // Give a slight baseline wick
  }

  // If open and close are identical and 0
  if (open === 0 && close === 0) {
    high = 0;
    low = 0;
  }

  const diff = currSpent - prevBudget;
  const changePercent = prevBudget > 0 ? Math.round((diff / prevBudget) * 1000) / 10 : 0;

  return {
    x: label,
    y: [Math.round(open), Math.round(high), Math.round(low), Math.round(close)],
    prevYearBudget: Math.round(open),
    currentYearSpent: Math.round(close),
    changePercent,
    volume: Math.round(currSpent),
  };
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
    const itemName = firstCellText;
    const budgetVal = parseNumeric(row.cells[1]?.formattedValue); // ผลงานปี 68
    const spentVal = parseNumeric(row.cells[2]?.formattedValue); // รวมสะสมปีนี้

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
    }

    catEntry.items.push({
      name: itemName,
      budget: budgetVal,
      spent: spentVal,
      monthly: itemMonthly,
    });
  }

  // Build Categories & Candlesticks (Year-over-Year: Open=ปีก่อน, Close=สะสมปีนี้)
  const categoryCandlesticks: CandlestickPoint[] = [];
  const allProjectsCandlesticks: ProjectCandleItem[] = [];
  const categoriesList: CategorySummary[] = [];

  categoryMap.forEach((val, catName) => {
    if (val.budget > 0 || val.spent > 0 || val.items.length > 0) {
      // Gather all monthly numbers in this category
      const catMonthlyAll: number[] = [];
      val.items.forEach((it) => it.monthly.forEach((m) => catMonthlyAll.push(m)));

      const shortName = catName.length > 28 ? catName.substring(0, 25) + "..." : catName;
      const catCandle = createCandlePoint(shortName, val.budget, val.spent, catMonthlyAll);

      categoryCandlesticks.push(catCandle);

      // Build individual project candles in this category
      const projectCandles: ProjectCandleItem[] = val.items.map((it) => {
        const itemShortName = it.name.length > 32 ? it.name.substring(0, 30) + "..." : it.name;
        const candle = createCandlePoint(itemShortName, it.budget, it.spent, it.monthly);
        return {
          name: it.name,
          category: catName,
          candle,
        };
      });

      allProjectsCandlesticks.push(...projectCandles);

      const pct = val.budget > 0 ? (val.spent / val.budget) * 100 : 0;
      categoriesList.push({
        name: catName,
        budget: val.budget,
        spent: val.spent,
        percentage: Math.round(pct * 10) / 10,
        itemCount: val.items.length,
        candle: catCandle,
        projectCandles,
      });
    }
  });

  // Monthly Spending Trend & Cumulative
  let runningSum = 0;
  let peakMonth = MONTH_NAMES[0];
  let peakMonthAmount = 0;
  const cumulativeDisbursement: number[] = [];

  for (let m = 0; m < 12; m++) {
    const totalMonth = monthlyTotals[m];
    if (totalMonth > peakMonthAmount) {
      peakMonthAmount = totalMonth;
      peakMonth = MONTH_NAMES[m];
    }
    runningSum += totalMonth;
    cumulativeDisbursement.push(runningSum);
  }

  // Category Donut Chart
  const topCategories = [...categoriesList].sort((a, b) => b.budget - a.budget).slice(0, 7);
  const categoryDonut = {
    labels: topCategories.map((c) => c.name.length > 20 ? c.name.substring(0, 18) + "..." : c.name),
    series: topCategories.map((c) => Math.round(c.budget || c.spent || 1)),
  };

  const progressPercent = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 1000) / 10 : 0;
  const growthRate = totalBudget > 0 ? Math.round(((totalSpent - totalBudget) / totalBudget) * 1000) / 10 : 0;

  return {
    kpi: {
      totalBudget,
      totalSpent,
      progressPercent,
      growthRate,
      peakMonth,
      peakMonthAmount,
      activeCategories: categoriesList.length,
      totalItems: totalItemsCount,
    },
    categoryCandlesticks,
    allProjectsCandlesticks,
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
  const fallbackCats = [
    { name: "การฝากครรภ์", budget: 603410, spent: 471835 },
    { name: "ตรวจสุขภาพประชาชนทั่วไป", budget: 320000, spent: 395000 },
    { name: "NCD จิตเวช ปฐมภูมิ กายภาพ", budget: 410000, spent: 390000 },
    { name: "อสม.+ผู้นำชุมชน", budget: 250000, spent: 275000 },
  ];

  const catCandles: CandlestickPoint[] = fallbackCats.map((c) =>
    createCandlePoint(c.name, c.budget, c.spent, [c.spent * 0.1, c.spent * 0.15])
  );

  return {
    kpi: {
      totalBudget: 1583410,
      totalSpent: 1531835,
      progressPercent: 96.7,
      growthRate: -3.3,
      peakMonth: "มี.ค. 69",
      peakMonthAmount: 340000,
      activeCategories: 4,
      totalItems: 14,
    },
    categoryCandlesticks: catCandles,
    allProjectsCandlesticks: [],
    monthlyTrend: {
      months: MONTH_NAMES,
      monthlyDisbursement: [95000, 110000, 125000, 85000, 140000, 180000, 95000, 105000, 115000, 90000, 70000, 50000],
      cumulativeDisbursement: [95000, 205000, 330000, 415000, 555000, 735000, 830000, 935000, 1050000, 1140000, 1210000, 1260000],
    },
    categoryDonut: {
      labels: fallbackCats.map((c) => c.name),
      series: fallbackCats.map((c) => c.budget),
    },
    categories: fallbackCats.map((c, i) => ({
      name: c.name,
      budget: c.budget,
      spent: c.spent,
      percentage: Math.round((c.spent / c.budget) * 1000) / 10,
      itemCount: 3,
      candle: catCandles[i],
      projectCandles: [],
    })),
  };
}
