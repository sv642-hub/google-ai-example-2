import * as XLSX from 'xlsx';
import { ColumnProfile, ParsedDataset } from './excelParser';
import { RegressionModelResult } from './regression';
import { ClusteringResult } from './clustering';

export interface HistogramBin {
  binStart: number;
  binEnd: number;
  count: number;
  percentage: number;
}

export interface DetailedFeatureStats {
  name: string;
  count: number;
  nullCount: number;
  mean: number;
  median: number;
  min: number;
  max: number;
  stdDev: number;
  variance: number;
  skewness: number;
  q1: number;
  q3: number;
  iqr: number;
  outlierCount: number;
  outlierIndices: number[];
  histogramBins: HistogramBin[];
  isTarget?: boolean;
  isPredictor?: boolean;
}

export interface CorrelationPair {
  var1: string;
  var2: string;
  r: number;
  sampleCount: number;
  strengthLabel: string;
  isCollinearWarning: boolean;
}

export interface CorrelationMatrixData {
  variables: string[];
  matrix: number[][];
  topCorrelations: CorrelationPair[];
}

export interface HealthIssue {
  id: string;
  type: 'collinearity' | 'outlier' | 'skewness' | 'missing' | 'zero_variance' | 'high_cardinality';
  severity: 'low' | 'medium' | 'high';
  title: string;
  message: string;
  affectedColumns: string[];
  actionLabel?: string;
}

export interface DatasetHealthReport {
  score: number; // 0 - 100
  totalCells: number;
  validCells: number;
  completenessPercent: number;
  numericColumnCount: number;
  categoricalColumnCount: number;
  totalOutliers: number;
  issues: HealthIssue[];
}

// Compute percentile on sorted number array
function percentile(sortedArr: number[], p: number): number {
  if (sortedArr.length === 0) return 0;
  if (sortedArr.length === 1) return sortedArr[0];
  const index = (p / 100) * (sortedArr.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;
  return sortedArr[lower] * (1 - weight) + sortedArr[upper] * weight;
}

// Compute comprehensive statistics for a single numeric column
export function computeColumnDetailedStats(
  rows: Record<string, any>[],
  columnName: string,
  binCount = 10
): DetailedFeatureStats | null {
  const values: number[] = [];
  let nullCount = 0;

  rows.forEach((row) => {
    const val = row[columnName];
    if (val === null || val === undefined || val === '') {
      nullCount++;
    } else {
      let num: number | null = null;
      if (typeof val === 'number' && !isNaN(val)) {
        num = val;
      } else if (typeof val === 'string') {
        const cleaned = val.replace(/[$,%]/g, '').trim();
        if (cleaned !== '' && !isNaN(Number(cleaned))) {
          num = Number(cleaned);
        }
      }
      if (num !== null) {
        values.push(num);
      } else {
        nullCount++;
      }
    }
  });

  const n = values.length;
  if (n === 0) return null;

  const sum = values.reduce((acc, v) => acc + v, 0);
  const mean = sum / n;

  // Sorted values for percentiles and median
  const sorted = [...values].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const median = percentile(sorted, 50);
  const q1 = percentile(sorted, 25);
  const q3 = percentile(sorted, 75);
  const iqr = Math.max(0, q3 - q1);

  // Variance & Standard Deviation
  const varianceSum = values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0);
  const variance = n > 1 ? varianceSum / (n - 1) : 0;
  const stdDev = Math.sqrt(variance);

  // Skewness: Fisher-Pearson standardized moment coefficient
  let skewness = 0;
  if (n > 2 && stdDev > 0) {
    const m3 = values.reduce((acc, v) => acc + Math.pow((v - mean) / stdDev, 3), 0);
    skewness = (n / ((n - 1) * (n - 2))) * m3;
  }

  // Outliers using Tukey's Fence: [Q1 - 1.5*IQR, Q3 + 1.5*IQR]
  const lowerFence = q1 - 1.5 * iqr;
  const upperFence = q3 + 1.5 * iqr;
  const outlierIndices: number[] = [];

  rows.forEach((row, idx) => {
    const rawVal = row[columnName];
    if (rawVal !== null && rawVal !== undefined) {
      const num = Number(String(rawVal).replace(/[$,%]/g, '').trim());
      if (!isNaN(num) && (num < lowerFence || num > upperFence)) {
        outlierIndices.push(idx);
      }
    }
  });

  // Histogram Bins
  const histogramBins: HistogramBin[] = [];
  const range = max - min;
  const step = range === 0 ? 1 : range / binCount;

  for (let i = 0; i < binCount; i++) {
    const bStart = min + i * step;
    const bEnd = i === binCount - 1 ? max : min + (i + 1) * step;
    histogramBins.push({
      binStart: bStart,
      binEnd: bEnd,
      count: 0,
      percentage: 0,
    });
  }

  values.forEach((val) => {
    let placed = false;
    for (let i = 0; i < histogramBins.length; i++) {
      const b = histogramBins[i];
      if (i === histogramBins.length - 1) {
        if (val >= b.binStart && val <= b.binEnd) {
          b.count++;
          placed = true;
          break;
        }
      } else {
        if (val >= b.binStart && val < b.binEnd) {
          b.count++;
          placed = true;
          break;
        }
      }
    }
    if (!placed && histogramBins.length > 0) {
      histogramBins[histogramBins.length - 1].count++;
    }
  });

  histogramBins.forEach((b) => {
    b.percentage = n > 0 ? (b.count / n) * 100 : 0;
  });

  return {
    name: columnName,
    count: n,
    nullCount,
    mean,
    median,
    min,
    max,
    stdDev,
    variance,
    skewness: isNaN(skewness) ? 0 : skewness,
    q1,
    q3,
    iqr,
    outlierCount: outlierIndices.length,
    outlierIndices,
    histogramBins,
  };
}

// Compute Pearson correlation between two numeric lists
export function computePearsonCorrelation(x: number[], y: number[]): number {
  const n = x.length;
  if (n < 2) return 0;

  const meanX = x.reduce((a, b) => a + b, 0) / n;
  const meanY = y.reduce((a, b) => a + b, 0) / n;

  let num = 0;
  let denX = 0;
  let denY = 0;

  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }

  const den = Math.sqrt(denX * denY);
  if (den === 0) return 0;
  const r = num / den;
  return Math.max(-1, Math.min(1, r));
}

// Get qualitative label for correlation
export function getCorrelationStrength(r: number): string {
  const abs = Math.abs(r);
  const dir = r >= 0 ? 'Positive' : 'Negative';
  if (abs >= 0.85) return `Very Strong ${dir}`;
  if (abs >= 0.65) return `Strong ${dir}`;
  if (abs >= 0.4) return `Moderate ${dir}`;
  if (abs >= 0.2) return `Weak ${dir}`;
  return 'Negligible / Uncorrelated';
}

// Build complete Pearson Correlation Matrix for all numeric columns
export function computeCorrelationMatrix(
  rows: Record<string, any>[],
  numericColumns: string[]
): CorrelationMatrixData {
  const vars = numericColumns;
  const p = vars.length;
  const matrix: number[][] = Array.from({ length: p }, () => Array(p).fill(0));
  const pairs: CorrelationPair[] = [];

  // Pre-extract numeric arrays with pairwise clean matching
  for (let i = 0; i < p; i++) {
    matrix[i][i] = 1.0;
    for (let j = i + 1; j < p; j++) {
      const colA = vars[i];
      const colB = vars[j];

      const xVals: number[] = [];
      const yVals: number[] = [];

      rows.forEach((row) => {
        const vA = row[colA];
        const vB = row[colB];
        if (
          vA !== null &&
          vA !== undefined &&
          vA !== '' &&
          vB !== null &&
          vB !== undefined &&
          vB !== ''
        ) {
          const nA = typeof vA === 'number' ? vA : Number(String(vA).replace(/[$,%]/g, '').trim());
          const nB = typeof vB === 'number' ? vB : Number(String(vB).replace(/[$,%]/g, '').trim());
          if (!isNaN(nA) && !isNaN(nB)) {
            xVals.push(nA);
            yVals.push(nB);
          }
        }
      });

      const r = computePearsonCorrelation(xVals, yVals);
      matrix[i][j] = r;
      matrix[j][i] = r;

      pairs.push({
        var1: colA,
        var2: colB,
        r,
        sampleCount: xVals.length,
        strengthLabel: getCorrelationStrength(r),
        isCollinearWarning: Math.abs(r) >= 0.85,
      });
    }
  }

  // Sort pairs by absolute correlation descending
  const topCorrelations = [...pairs].sort((a, b) => Math.abs(b.r) - Math.abs(a.r));

  return {
    variables: vars,
    matrix,
    topCorrelations,
  };
}

// Compute dataset health report and detect anomalies/issues
export function evaluateDatasetHealth(
  dataset: ParsedDataset,
  statsMap: Map<string, DetailedFeatureStats>,
  correlationData: CorrelationMatrixData
): DatasetHealthReport {
  const totalRows = dataset.rowCount;
  const totalCols = dataset.columns.length;
  const totalCells = totalRows * totalCols;
  let nullCells = 0;
  let totalOutliers = 0;
  const issues: HealthIssue[] = [];

  dataset.columns.forEach((col) => {
    nullCells += col.nullCount;
  });

  const validCells = totalCells - nullCells;
  const completenessPercent = totalCells > 0 ? (validCells / totalCells) * 100 : 100;

  let baseScore = 100;

  // 1. Missing values penalty
  const missingPercent = totalCells > 0 ? (nullCells / totalCells) * 100 : 0;
  if (missingPercent > 15) {
    baseScore -= 20;
    issues.push({
      id: 'high_missing',
      type: 'missing',
      severity: 'high',
      title: 'High Missing Data Rate',
      message: `${missingPercent.toFixed(1)}% of all data cells contain null or empty values, which may distort model fitting.`,
      affectedColumns: dataset.columns.filter((c) => c.nullCount > totalRows * 0.1).map((c) => c.name),
    });
  } else if (missingPercent > 2) {
    baseScore -= 8;
    issues.push({
      id: 'moderate_missing',
      type: 'missing',
      severity: 'medium',
      title: 'Sparse Missing Values Detected',
      message: `${nullCells} missing entries found. OLS regression automatically omits rows with null inputs.`,
      affectedColumns: dataset.columns.filter((c) => c.nullCount > 0).map((c) => c.name),
    });
  }

  // 2. Multicollinearity warnings
  const collinearPairs = correlationData.topCorrelations.filter((p) => p.isCollinearWarning);
  if (collinearPairs.length > 0) {
    baseScore -= Math.min(15, collinearPairs.length * 5);
    const affectedVars = Array.from(new Set(collinearPairs.flatMap((p) => [p.var1, p.var2])));
    issues.push({
      id: 'multicollinearity',
      type: 'collinearity',
      severity: 'medium',
      title: 'High Feature Collinearity Detected',
      message: `${collinearPairs.length} feature pair(s) have Pearson |r| >= 0.85 (e.g. ${collinearPairs[0].var1} & ${collinearPairs[0].var2} with r = ${collinearPairs[0].r.toFixed(2)}). High collinearity inflates standard errors in linear regression.`,
      affectedColumns: affectedVars,
    });
  }

  // 3. Outliers & Skewness
  const skewedCols: string[] = [];
  const outlierCols: string[] = [];

  statsMap.forEach((stats, colName) => {
    totalOutliers += stats.outlierCount;
    if (Math.abs(stats.skewness) > 2.0) {
      skewedCols.push(`${colName} (skew = ${stats.skewness.toFixed(2)})`);
    }
    if (stats.outlierCount > totalRows * 0.08) {
      outlierCols.push(colName);
    }
    if (stats.variance === 0) {
      baseScore -= 10;
      issues.push({
        id: `zero_variance_${colName}`,
        type: 'zero_variance',
        severity: 'high',
        title: `Zero Variance in Column "${colName}"`,
        message: `Column "${colName}" has identical values across all rows. It provides zero statistical variance and cannot be used as an OLS predictor.`,
        affectedColumns: [colName],
      });
    }
  });

  if (skewedCols.length > 0) {
    baseScore -= 6;
    issues.push({
      id: 'high_skewness',
      type: 'skewness',
      severity: 'low',
      title: 'Substantial Distribution Skewness',
      message: `Features with extreme skewness: ${skewedCols.slice(0, 3).join(', ')}. Logarithmic transformation may improve linear fit.`,
      affectedColumns: skewedCols,
    });
  }

  if (outlierCols.length > 0) {
    baseScore -= 6;
    issues.push({
      id: 'heavy_outliers',
      type: 'outlier',
      severity: 'low',
      title: 'Elevated Outlier Density',
      message: `Columns ${outlierCols.join(', ')} contain more than 8% statistical outliers beyond Tukey fences (1.5x IQR).`,
      affectedColumns: outlierCols,
    });
  }

  const numericColumnCount = dataset.columns.filter((c) => c.isNumeric).length;
  const categoricalColumnCount = dataset.columns.length - numericColumnCount;

  const finalScore = Math.max(10, Math.min(100, Math.round(baseScore)));

  return {
    score: finalScore,
    totalCells,
    validCells,
    completenessPercent,
    numericColumnCount,
    categoricalColumnCount,
    totalOutliers,
    issues,
  };
}

// Generate full Excel export workbook
export function generateDashboardExcelReport(
  dataset: ParsedDataset,
  statsList: DetailedFeatureStats[],
  correlationData: CorrelationMatrixData,
  regressionModel: RegressionModelResult | null,
  clusterResult: ClusteringResult | null
) {
  const wb = XLSX.utils.book_new();

  // 1. Executive Summary Sheet
  const summaryRows = [
    { Metric: 'File Name', Value: dataset.fileName },
    { Metric: 'Selected Sheet', Value: dataset.sheetName },
    { Metric: 'Total Row Count (Observations)', Value: dataset.rowCount },
    { Metric: 'Total Features (Columns)', Value: dataset.columns.length },
    { Metric: 'Numeric Features', Value: statsList.length },
    { Metric: 'Categorical Features', Value: dataset.columns.length - statsList.length },
    { Metric: 'Regression Model Status', Value: regressionModel ? `Fitted (R² = ${regressionModel.rSquared.toFixed(3)})` : 'Not Fitted' },
    { Metric: 'Cluster Model Status', Value: clusterResult ? `Computed (${clusterResult.k} Clusters)` : 'Not Computed' },
    { Metric: 'Report Generated At', Value: new Date().toISOString() },
  ];
  const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Executive_Overview');

  // 2. Descriptive Statistics Sheet
  const statsRows = statsList.map((s) => ({
    Feature: s.name,
    Observations: s.count,
    Missing_Count: s.nullCount,
    Mean: Number(s.mean.toFixed(3)),
    Median: Number(s.median.toFixed(3)),
    Std_Dev: Number(s.stdDev.toFixed(3)),
    Variance: Number(s.variance.toFixed(3)),
    Min: Number(s.min.toFixed(3)),
    Q1_25th: Number(s.q1.toFixed(3)),
    Q3_75th: Number(s.q3.toFixed(3)),
    Max: Number(s.max.toFixed(3)),
    IQR: Number(s.iqr.toFixed(3)),
    Skewness: Number(s.skewness.toFixed(3)),
    Outlier_Count: s.outlierCount,
  }));
  const wsStats = XLSX.utils.json_to_sheet(statsRows);
  XLSX.utils.book_append_sheet(wb, wsStats, 'Descriptive_Stats');

  // 3. Correlation Matrix Sheet
  const corrRows: Record<string, any>[] = [];
  correlationData.variables.forEach((v1, i) => {
    const rowObj: Record<string, any> = { Variable: v1 };
    correlationData.variables.forEach((v2, j) => {
      rowObj[v2] = Number(correlationData.matrix[i][j].toFixed(3));
    });
    corrRows.push(rowObj);
  });
  const wsCorr = XLSX.utils.json_to_sheet(corrRows);
  XLSX.utils.book_append_sheet(wb, wsCorr, 'Correlation_Matrix');

  // 4. Regression Details Sheet if available
  if (regressionModel) {
    const regRows = [
      { Parameter: 'Target Variable (Y)', Value: regressionModel.targetVariable },
      { Parameter: 'Predictor Count', Value: regressionModel.predictorVariables.length },
      { Parameter: 'R-Squared', Value: Number(regressionModel.rSquared.toFixed(4)) },
      { Parameter: 'Adjusted R-Squared', Value: Number(regressionModel.adjustedRSquared.toFixed(4)) },
      { Parameter: 'RMSE (Root Mean Sq Error)', Value: Number(regressionModel.rmse.toFixed(4)) },
      { Parameter: 'MAE (Mean Absolute Error)', Value: Number(regressionModel.mae.toFixed(4)) },
      { Parameter: 'F-Statistic', Value: regressionModel.fStatistic ? Number(regressionModel.fStatistic.toFixed(3)) : 'N/A' },
      { Parameter: 'Regression Equation', Value: regressionModel.equationString },
    ];
    const wsReg = XLSX.utils.json_to_sheet(regRows);
    XLSX.utils.book_append_sheet(wb, wsReg, 'Regression_Metrics');

    const coefRows = regressionModel.coefficients.map((c) => ({
      Feature: c.feature,
      Beta_Coefficient: Number(c.beta.toFixed(4)),
      Std_Error: c.stdError ? Number(c.stdError.toFixed(4)) : 'N/A',
      T_Statistic: c.tStat ? Number(c.tStat.toFixed(4)) : 'N/A',
      P_Value: c.pValue !== undefined ? (c.pValue < 0.0001 ? '<0.0001' : Number(c.pValue.toFixed(4))) : 'N/A',
      Significant_at_5pct: c.pValue !== undefined ? (c.pValue < 0.05 ? 'Yes' : 'No') : 'N/A',
    }));
    const wsCoef = XLSX.utils.json_to_sheet(coefRows);
    XLSX.utils.book_append_sheet(wb, wsCoef, 'Regression_Coefficients');
  }

  // 5. Clustering Details Sheet if available
  if (clusterResult) {
    const clusterRows = clusterResult.clusters.map((c) => ({
      Cluster: c.name,
      Record_Count: c.size,
      Percentage: `${c.percentage.toFixed(1)}%`,
      ...Object.fromEntries(
        Object.entries(c.centroidOriginal).map(([k, v]) => [`Mean_${k}`, Number(v.toFixed(2))])
      ),
    }));
    const wsClust = XLSX.utils.json_to_sheet(clusterRows);
    XLSX.utils.book_append_sheet(wb, wsClust, 'Cluster_Centroids');
  }

  const exportName = `${dataset.fileName.replace(/\.[^/.]+$/, '')}_analytics_dashboard_report.xlsx`;
  XLSX.writeFile(wb, exportName);
}
