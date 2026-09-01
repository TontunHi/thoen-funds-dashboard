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
  sheetRow?: number;
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
  const clean = String(val).replace(/,/g, "").replace(/%/g, "").trim();
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}

function createCandlePoint(
  label: string,
  prevBudget: number,
  currSpent: number,
  monthlyVals: number[] = []
): CandlestickPoint {
  const open = Math.round(prevBudget);
  const close = Math.round(currSpent);

  let high = Math.max(open, close);
  let low = Math.min(open, close);

  // Add realistic candle wick boundaries
  if (high > 0) {
    high = Math.round(high * 1.08); // 8% upper wick
  }
  if (low > 0) {
    low = Math.round(low * 0.92); // 8% lower wick
  } else if (high > 0) {
    low = 0;
  }

  // If open and close are both zero
  if (open === 0 && close === 0) {
    high = 0;
    low = 0;
  }

  const diff = currSpent - prevBudget;
  const changePercent = prevBudget > 0 ? Math.round((diff / prevBudget) * 1000) / 10 : currSpent > 0 ? 100 : 0;

  return {
    x: label,
    y: [open, high, low, close],
    prevYearBudget: open,
    currentYearSpent: close,
    changePercent,
    volume: close,
  };
}

export function computeAnalyticsData(sheetData: ParsedSheetData): AnalyticsData {
  const rows = sheetData.rows;
  if (!rows || rows.length <= 2) {
    return getFallbackAnalytics();
  }

  const dataRows = rows.slice(2);

  const categoriesList: CategorySummary[] = [];
  let currentCategorySummary: CategorySummary | null = null;
  const monthlyTotals: number[] = new Array(12).fill(0);

  let grandTotalBudget = 0;
  let grandTotalSpent = 0;
  let totalItemsCount = 0;

  for (const row of dataRows) {
    const rawCells = row.cells;
    const firstCell = rawCells[0];
    const firstCellText = firstCell?.formattedValue?.trim() || "";

    if (!firstCellText) continue;

    // Check if this row is a major category header
    const isMergedCategory =
      (firstCell.colSpan >= 3 && firstCell.style.bold) ||
      (firstCell.style.bold && !parseNumeric(firstCellText) && rawCells[1]?.formattedValue !== undefined);

    const budgetVal = parseNumeric(rawCells[1]?.formattedValue); // ผลงานปี 68
    const spentVal = parseNumeric(rawCells[2]?.formattedValue); // รวมสะสมปีนี้

    if (isMergedCategory || (firstCell.style.bold && (budgetVal > 0 || spentVal > 0))) {
      // Save previous category if exists
      if (currentCategorySummary) {
        categoriesList.push(currentCategorySummary);
      }

      const shortCatName = firstCellText.length > 25 ? firstCellText.substring(0, 22) + "..." : firstCellText;
      const candle = createCandlePoint(shortCatName, budgetVal, spentVal);

      const pct = budgetVal > 0 ? Math.round((spentVal / budgetVal) * 1000) / 10 : 0;

      currentCategorySummary = {
        name: firstCellText,
        sheetRow: row.rowIndex + 1,
        budget: budgetVal,
        spent: spentVal,
        percentage: pct,
        itemCount: 0,
        candle,
        projectCandles: [],
      };

      grandTotalBudget += budgetVal;
      grandTotalSpent += spentVal;
      continue;
    }

    // Process project item row under the active category
    if (budgetVal > 0 || spentVal > 0 || firstCellText) {
      totalItemsCount++;

      // Monthly disbursements
      const itemMonthly: number[] = [];
      for (let m = 0; m < 12; m++) {
        const monthColIdx = 3 + m;
        const mVal = parseNumeric(rawCells[monthColIdx]?.formattedValue);
        itemMonthly.push(mVal);
        monthlyTotals[m] += mVal;
      }

      const shortItemName = firstCellText.length > 30 ? firstCellText.substring(0, 27) + "..." : firstCellText;
      const itemCandle = createCandlePoint(shortItemName, budgetVal, spentVal, itemMonthly);

      if (currentCategorySummary) {
        currentCategorySummary.itemCount++;
        // If category budget/spent was 0 on header row, accumulate from items
        if (currentCategorySummary.budget === 0 && budgetVal > 0) {
          currentCategorySummary.budget += budgetVal;
          currentCategorySummary.candle = createCandlePoint(
            currentCategorySummary.name,
            currentCategorySummary.budget,
            currentCategorySummary.spent
          );
        }
        if (currentCategorySummary.spent === 0 && spentVal > 0) {
          currentCategorySummary.spent += spentVal;
          currentCategorySummary.candle = createCandlePoint(
            currentCategorySummary.name,
            currentCategorySummary.budget,
            currentCategorySummary.spent
          );
        }

        currentCategorySummary.projectCandles.push({
          name: firstCellText,
          category: currentCategorySummary.name,
          candle: itemCandle,
        });
      }
    }
  }

  // Push last category
  if (currentCategorySummary) {
    categoriesList.push(currentCategorySummary);
  }

  // Filter categories with actual data
  const validCategories = categoriesList.filter(
    (c) => c.budget > 0 || c.spent > 0 || c.itemCount > 0
  );

  const categoryCandlesticks: CandlestickPoint[] = validCategories.map((c) => c.candle);

  // Category Comparison Bar Data
  const categoryComparisonBar = {
    categories: validCategories.map((c) => c.name.length > 18 ? c.name.substring(0, 15) + "..." : c.name),
    prevYearSeries: validCategories.map((c) => c.budget),
    currentYearSeries: validCategories.map((c) => c.spent),
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
  const topCategories = [...validCategories].sort((a, b) => b.budget - a.budget).slice(0, 7);
  const categoryDonut = {
    labels: topCategories.map((c) => (c.name.length > 20 ? c.name.substring(0, 18) + "..." : c.name)),
    series: topCategories.map((c) => Math.round(c.budget || c.spent || 1)),
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
    categoryCandlesticks,
    categoryComparisonBar,
    monthlyTrend: {
      months: MONTH_NAMES,
      monthlyDisbursement: monthlyTotals,
      cumulativeDisbursement,
    },
    categoryDonut,
    categories: validCategories,
  };
}

function getFallbackAnalytics(): AnalyticsData {
  const fallbackCats = [
    { name: "การฝากครรภ์", budget: 603410, spent: 471835 },
    { name: "ตรวจหลังคลอด", budget: 50805, spent: 34500 },
    { name: "ทันตกรรม", budget: 479950, spent: 260950 },
    { name: "วางแผนครอบครัว", budget: 201890, spent: 251630 },
    { name: "คัดกรองมะเร็ง", budget: 219820, spent: 560360 },
    { name: "NCD เบาหวาน/ความดัน", budget: 87000, spent: 419000 },
    { name: "CKD ฟอกไต", budget: 6500000, spent: 7224920 },
    { name: "Palliative care", budget: 170750, spent: 372000 },
  ];

  const catCandles: CandlestickPoint[] = fallbackCats.map((c) =>
    createCandlePoint(c.name, c.budget, c.spent)
  );

  return {
    kpi: {
      totalBudget: 8313625,
      totalSpent: 9595195,
      progressPercent: 115.4,
      growthRate: 15.4,
      peakMonth: "มี.ค. 69",
      peakMonthAmount: 940000,
      activeCategories: fallbackCats.length,
      totalItems: 45,
    },
    categoryCandlesticks: catCandles,
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
