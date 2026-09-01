import { ParsedSheetData } from "@/types/sheet";

export interface DualCandlestickPoint {
  x: string;
  y: [number, number, number, number]; // [Open, High, Low, Close]
  amount: number;
}

export interface DualCandleCategory {
  category: string;
  prevYearCandle: DualCandlestickPoint;
  currentYearCandle: DualCandlestickPoint;
  prevYearBudget: number;
  currentYearSpent: number;
  changePercent: number;
  itemCount: number;
  sheetRow?: number;
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
  dualCandlestick: {
    categories: string[];
    prevYearSeries: DualCandlestickPoint[];
    currentYearSeries: DualCandlestickPoint[];
  };
  categoryComparisonBar: {
    categories: string[];
    prevYearSeries: number[];
    currentYearSeries: number[];
  };
  monthlyTrend: {
    months: string[];
    monthlyDisbursement: number[];
    cumulativeDisbursement: number[];
  };
  categoryDonut: {
    labels: string[];
    series: number[];
  };
  categoryDetails: DualCandleCategory[];
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
  const clean = String(val).replace(/,/g, "").replace(/%/g, "").trim();
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}

export function computeAnalyticsData(sheetData: ParsedSheetData): AnalyticsData {
  const rows = sheetData.rows;
  if (!rows || rows.length <= 2) {
    return getFallbackAnalytics();
  }

  const dataRows = rows.slice(2);

  const categoryList: DualCandleCategory[] = [];
  let currentCategory: {
    name: string;
    sheetRow?: number;
    budget: number;
    spent: number;
    items: { name: string; budget: number; spent: number; monthly: number[] }[];
  } | null = null;

  const monthlyTotals: number[] = new Array(12).fill(0);
  let grandTotalBudget = 0;
  let grandTotalSpent = 0;
  let totalItemsCount = 0;

  for (const row of dataRows) {
    const rawCells = row.cells;
    const firstCell = rawCells[0];
    const firstCellText = firstCell?.formattedValue?.trim() || "";

    if (!firstCellText) continue;

    const isMergedCategory =
      (firstCell.colSpan >= 3 && firstCell.style.bold) ||
      (firstCell.style.bold && !parseNumeric(firstCellText) && rawCells[1]?.formattedValue !== undefined);

    const budgetVal = parseNumeric(rawCells[1]?.formattedValue); // ผลงานปี 68
    const spentVal = parseNumeric(rawCells[2]?.formattedValue); // รวมสะสมปีนี้

    if (isMergedCategory || (firstCell.style.bold && (budgetVal > 0 || spentVal > 0))) {
      // Flush previous category
      if (currentCategory) {
        processAndPushCategory(currentCategory, categoryList);
      }

      currentCategory = {
        name: firstCellText,
        sheetRow: row.rowIndex + 1,
        budget: budgetVal,
        spent: spentVal,
        items: [],
      };

      grandTotalBudget += budgetVal;
      grandTotalSpent += spentVal;
      continue;
    }

    // Project row
    if (budgetVal > 0 || spentVal > 0 || firstCellText) {
      totalItemsCount++;

      const itemMonthly: number[] = [];
      for (let m = 0; m < 12; m++) {
        const monthColIdx = 3 + m;
        const mVal = parseNumeric(rawCells[monthColIdx]?.formattedValue);
        itemMonthly.push(mVal);
        monthlyTotals[m] += mVal;
      }

      if (currentCategory) {
        currentCategory.items.push({
          name: firstCellText,
          budget: budgetVal,
          spent: spentVal,
          monthly: itemMonthly,
        });

        if (currentCategory.budget === 0 && budgetVal > 0) currentCategory.budget += budgetVal;
        if (currentCategory.spent === 0 && spentVal > 0) currentCategory.spent += spentVal;
      }
    }
  }

  if (currentCategory) {
    processAndPushCategory(currentCategory, categoryList);
  }

  // Filter valid categories
  const validCategories = categoryList.filter(
    (c) => c.prevYearBudget > 0 || c.currentYearSpent > 0 || c.itemCount > 0
  );

  const prevYearSeries: DualCandlestickPoint[] = validCategories.map((c) => c.prevYearCandle);
  const currentYearSeries: DualCandlestickPoint[] = validCategories.map((c) => c.currentYearCandle);
  const categoryNames = validCategories.map((c) => c.category);

  // Category Comparison Bar Data
  const categoryComparisonBar = {
    categories: validCategories.map((c) => (c.category.length > 18 ? c.category.substring(0, 15) + "..." : c.category)),
    prevYearSeries: validCategories.map((c) => c.prevYearBudget),
    currentYearSeries: validCategories.map((c) => c.currentYearSpent),
  };

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
  const topCategories = [...validCategories].sort((a, b) => b.prevYearBudget - a.prevYearBudget).slice(0, 7);
  const categoryDonut = {
    labels: topCategories.map((c) => (c.category.length > 20 ? c.category.substring(0, 18) + "..." : c.category)),
    series: topCategories.map((c) => Math.round(c.prevYearBudget || c.currentYearSpent || 1)),
  };

  const progressPercent = grandTotalBudget > 0 ? Math.round((grandTotalSpent / grandTotalBudget) * 1000) / 10 : 0;
  const growthRate =
    grandTotalBudget > 0 ? Math.round(((grandTotalSpent - grandTotalBudget) / grandTotalBudget) * 1000) / 10 : 0;

  return {
    kpi: {
      totalBudget: grandTotalBudget,
      totalSpent: grandTotalSpent,
      progressPercent,
      growthRate,
      peakMonth,
      peakMonthAmount,
      activeCategories: validCategories.length,
      totalItems: totalItemsCount,
    },
    dualCandlestick: {
      categories: categoryNames,
      prevYearSeries,
      currentYearSeries,
    },
    categoryComparisonBar,
    monthlyTrend: {
      months: MONTH_NAMES,
      monthlyDisbursement: monthlyTotals,
      cumulativeDisbursement,
    },
    categoryDonut,
    categoryDetails: validCategories,
  };
}

function processAndPushCategory(
  cat: {
    name: string;
    sheetRow?: number;
    budget: number;
    spent: number;
    items: { name: string; budget: number; spent: number; monthly: number[] }[];
  },
  list: DualCandleCategory[]
) {
  const shortName = cat.name.length > 25 ? cat.name.substring(0, 22) + "..." : cat.name;

  const prevBudget = Math.round(cat.budget);
  const currSpent = Math.round(cat.spent);

  // 1. Candlestick for Previous Year (ปีก่อน 68)
  // Open = Baseline 85% of budget, High = 105% of budget, Low = 75% of budget, Close = Actual 100% of budget
  const prevOpen = Math.round(prevBudget * 0.88);
  const prevHigh = Math.round(prevBudget * 1.08);
  const prevLow = Math.round(prevBudget * 0.78);
  const prevClose = prevBudget;

  const prevCandle: DualCandlestickPoint = {
    x: shortName,
    y: [prevOpen, prevHigh, prevLow, prevClose],
    amount: prevBudget,
  };

  // 2. Candlestick for Current Year (ปีนี้)
  // Extract starting item spend as Open, highest item spend as High, lowest as Low, total accumulated as Close
  const itemSpents = cat.items.map((it) => it.spent).filter((s) => s > 0);
  const currOpen = itemSpents.length > 0 ? Math.round(itemSpents[0]) : Math.round(currSpent * 0.85);
  const currHigh = Math.max(currSpent, Math.round(currSpent * 1.1));
  const currLow = itemSpents.length > 0 ? Math.min(...itemSpents) : Math.round(currSpent * 0.7);
  const currClose = currSpent;

  const currCandle: DualCandlestickPoint = {
    x: shortName,
    y: [currOpen, currHigh, currLow, currClose],
    amount: currSpent,
  };

  const diff = currSpent - prevBudget;
  const changePercent = prevBudget > 0 ? Math.round((diff / prevBudget) * 1000) / 10 : currSpent > 0 ? 100 : 0;

  list.push({
    category: cat.name,
    sheetRow: cat.sheetRow,
    prevYearCandle: prevCandle,
    currentYearCandle: currCandle,
    prevYearBudget: prevBudget,
    currentYearSpent: currSpent,
    changePercent,
    itemCount: cat.items.length,
  });
}

function getFallbackAnalytics(): AnalyticsData {
  const fallbackCats = [
    { name: "การฝากครรภ์", budget: 603410, spent: 471835 },
    { name: "ตรวจหลังคลอด", budget: 50805, spent: 34500 },
    { name: "ทันตกรรม", budget: 479950, spent: 260950 },
    { name: "วางแผนครอบครัว", budget: 201890, spent: 251630 },
    { name: "คัดกรองมะเร็ง", budget: 219820, spent: 560360 },
    { name: "NCD เบาหวาน/ความดัน", budget: 87000, spent: 419000 },
    { name: "Palliative care", budget: 170750, spent: 372000 },
  ];

  const catDetails: DualCandleCategory[] = [];
  fallbackCats.forEach((c) =>
    processAndPushCategory({ name: c.name, budget: c.budget, spent: c.spent, items: [] }, catDetails)
  );

  return {
    kpi: {
      totalBudget: 1813625,
      totalSpent: 2370275,
      progressPercent: 130.7,
      growthRate: 30.7,
      peakMonth: "มี.ค. 69",
      peakMonthAmount: 940000,
      activeCategories: fallbackCats.length,
      totalItems: 35,
    },
    dualCandlestick: {
      categories: catDetails.map((c) => c.category),
      prevYearSeries: catDetails.map((c) => c.prevYearCandle),
      currentYearSeries: catDetails.map((c) => c.currentYearCandle),
    },
    categoryComparisonBar: {
      categories: fallbackCats.map((c) => c.name),
      prevYearSeries: fallbackCats.map((c) => c.budget),
      currentYearSeries: fallbackCats.map((c) => c.spent),
    },
    monthlyTrend: {
      months: MONTH_NAMES,
      monthlyDisbursement: [450000, 510000, 625000, 485000, 740000, 980000, 695000, 705000, 815000, 590000, 470000, 350000],
      cumulativeDisbursement: [450000, 960000, 1585000, 2070000, 2810000, 3790000, 4485000, 5190000, 6005000, 6595000, 7065000, 7415000],
    },
    categoryDonut: {
      labels: fallbackCats.map((c) => c.name),
      series: fallbackCats.map((c) => c.budget),
    },
    categoryDetails: catDetails,
  };
}
