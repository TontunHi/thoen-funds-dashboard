import { ParsedSheetData } from "@/types/sheet";

export interface DualCandlestickPoint {
  x: string;
  y: [number, number, number, number];
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

export interface MonthlyItemContribution {
  name: string;
  category: string;
  amount: number;
  sheetRow?: number;
}

export interface MonthlyBreakdown {
  monthIndex: number;
  monthName: string;
  totalAmount: number;
  items: MonthlyItemContribution[];
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
    breakdowns: MonthlyBreakdown[];
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

const IGNORED_CATEGORY_NAMES = [
  "รวมแยกรายเดือน(NHSO-MIS)",
  "รวมจาก STM-DMIS",
  "รวมสะสมตามช่วงเวลา",
  "รวมสะสม",
];

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
  const monthlyBreakdowns: MonthlyBreakdown[] = MONTH_NAMES.map((name, idx) => ({
    monthIndex: idx,
    monthName: name,
    totalAmount: 0,
    items: [],
  }));

  let grandTotalBudget = 0;
  let grandTotalSpent = 0;
  let totalItemsCount = 0;

  for (const row of dataRows) {
    const rawCells = row.cells;
    const firstCell = rawCells[0];
    const firstCellText = firstCell?.formattedValue?.trim() || "";

    if (!firstCellText) continue;

    const hasMergedSpan = rawCells.some((c) => c.colSpan >= 3);
    const budgetVal = parseNumeric(rawCells[1]?.formattedValue);
    const spentVal = parseNumeric(rawCells[2]?.formattedValue);

    const isExplicitCategory =
      hasMergedSpan ||
      (firstCell.style.bold && !parseNumeric(firstCellText) && (budgetVal > 0 || spentVal > 0)) ||
      firstCellText.toUpperCase().includes("COPD") ||
      firstCellText.includes("Palliative care") ||
      firstCellText === "CKD" ||
      firstCellText === "ฟื้้นฟู";

    if (isExplicitCategory && !IGNORED_CATEGORY_NAMES.includes(firstCellText)) {
      if (currentCategory) {
        processAndPushCategory(currentCategory, categoryList);
      }

      let displayCategoryName = firstCellText;
      if (firstCellText.toUpperCase() === "COPD") {
        displayCategoryName = "COPD (โรคปอดอุดกั้นและหอบหืด)";
      }

      currentCategory = {
        name: displayCategoryName,
        sheetRow: row.rowIndex + 1,
        budget: budgetVal,
        spent: spentVal,
        items: [],
      };

      grandTotalBudget += budgetVal;
      grandTotalSpent += spentVal;
      continue;
    }

    // Project Item row
    if (budgetVal > 0 || spentVal > 0 || firstCellText) {
      if (!IGNORED_CATEGORY_NAMES.includes(firstCellText)) {
        totalItemsCount++;

        const itemMonthly: number[] = [];
        for (let m = 0; m < 12; m++) {
          const monthColIdx = 3 + m;
          const mVal = parseNumeric(rawCells[monthColIdx]?.formattedValue);
          itemMonthly.push(mVal);
          monthlyTotals[m] += mVal;

          if (mVal > 0) {
            monthlyBreakdowns[m].items.push({
              name: firstCellText,
              category: currentCategory ? currentCategory.name : "ทั่วไป",
              amount: mVal,
              sheetRow: row.rowIndex + 1,
            });
          }
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
  }

  if (currentCategory) {
    processAndPushCategory(currentCategory, categoryList);
  }

  // Populate total amounts in breakdowns and sort descending
  monthlyBreakdowns.forEach((mb, idx) => {
    mb.totalAmount = monthlyTotals[idx];
    mb.items.sort((a, b) => b.amount - a.amount);
  });

  const validCategories = categoryList.filter(
    (c) => c.prevYearBudget > 0 || c.currentYearSpent > 0 || c.itemCount > 0
  );

  const prevYearSeries: DualCandlestickPoint[] = validCategories.map((c) => c.prevYearCandle);
  const currentYearSeries: DualCandlestickPoint[] = validCategories.map((c) => c.currentYearCandle);
  const categoryNames = validCategories.map((c) => c.category);

  const categoryComparisonBar = {
    categories: validCategories.map((c) => (c.category.length > 22 ? c.category.substring(0, 19) + "..." : c.category)),
    prevYearSeries: validCategories.map((c) => c.prevYearBudget),
    currentYearSeries: validCategories.map((c) => c.currentYearSpent),
  };

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

  const topCategories = [...validCategories].sort((a, b) => b.prevYearBudget - a.prevYearBudget).slice(0, 8);
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
      breakdowns: monthlyBreakdowns,
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

  const prevOpen = Math.round(prevBudget * 0.88);
  const prevHigh = Math.round(prevBudget * 1.08);
  const prevLow = Math.round(prevBudget * 0.78);
  const prevClose = prevBudget;

  const prevCandle: DualCandlestickPoint = {
    x: shortName,
    y: [prevOpen, prevHigh, prevLow, prevClose],
    amount: prevBudget,
  };

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
    { name: "CKD ฟอกไต", budget: 6500000, spent: 7224920 },
    { name: "Palliative care", budget: 170750, spent: 372000 },
    { name: "COPD (โรคปอดอุดกั้นและหอบหืด)", budget: 78084, spent: 0 },
  ];

  const catDetails: DualCandleCategory[] = [];
  fallbackCats.forEach((c) =>
    processAndPushCategory({ name: c.name, budget: c.budget, spent: c.spent, items: [] }, catDetails)
  );

  return {
    kpi: {
      totalBudget: 1891709,
      totalSpent: 2370275,
      progressPercent: 125.3,
      growthRate: 25.3,
      peakMonth: "มี.ค. 69",
      peakMonthAmount: 940000,
      activeCategories: fallbackCats.length,
      totalItems: 36,
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
      breakdowns: MONTH_NAMES.map((name, i) => ({
        monthIndex: i,
        monthName: name,
        totalAmount: 450000,
        items: [],
      })),
    },
    categoryDonut: {
      labels: fallbackCats.map((c) => c.name),
      series: fallbackCats.map((c) => c.budget),
    },
    categoryDetails: catDetails,
  };
}
