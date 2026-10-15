// Linear Regression implementation via Ordinary Least Squares (OLS)
// Supports Simple Linear Regression (1 predictor) and Multiple Linear Regression (N predictors)
// Solves (X^T * X) * beta = X^T * Y using LU decomposition with partial pivoting

export interface RegressionModelResult {
  targetVariable: string;
  predictorVariables: string[];
  coefficients: {
    feature: string; // "Intercept" or feature name
    beta: number;
    stdError?: number;
    tStat?: number;
    pValue?: number;
  }[];
  intercept: number;
  rSquared: number;
  adjustedRSquared: number;
  rmse: number;
  mae: number;
  fStatistic?: number;
  fPValue?: number;
  sampleCount: number;
  degreesOfFreedom: number;
  equationString: string;
  actualVsPredicted: {
    actual: number;
    predicted: number;
    residual: number;
    rowNumber: number;
    // Feature values for easy inspector
    features: Record<string, number>;
  }[];
  // If simple linear regression (1 feature), provide scatter points and regression line endpoints
  simpleRegressionPlotData?: {
    featureName: string;
    points: { x: number; y: number }[];
    line: { x: number; y: number }[];
    slope: number;
    intercept: number;
  };
}

export function runLinearRegression(
  data: Record<string, any>[],
  targetCol: string,
  predictorCols: string[]
): RegressionModelResult {
  if (!targetCol) {
    throw new Error('Please select a target variable (Y).');
  }
  if (!predictorCols || predictorCols.length === 0) {
    throw new Error('Please select at least one predictor feature (X).');
  }
  if (predictorCols.includes(targetCol)) {
    throw new Error('Target variable cannot also be in predictor variables.');
  }

  // Filter clean rows with valid numbers for all selected columns
  const cleanRows: { y: number; x: number[]; raw: Record<string, number>; rowIdx: number }[] = [];

  data.forEach((row, idx) => {
    const rawY = row[targetCol];
    const yVal = parseNumeric(rawY);
    if (yVal === null) return;

    const xVals: number[] = [];
    const featureMap: Record<string, number> = {};
    let allValid = true;

    for (const col of predictorCols) {
      const rawX = row[col];
      const xVal = parseNumeric(rawX);
      if (xVal === null) {
        allValid = false;
        break;
      }
      xVals.push(xVal);
      featureMap[col] = xVal;
    }

    if (allValid) {
      cleanRows.push({
        y: yVal,
        x: xVals,
        raw: featureMap,
        rowIdx: idx + 1,
      });
    }
  });

  const n = cleanRows.length;
  const p = predictorCols.length; // number of predictors

  if (n <= p + 1) {
    throw new Error(
      `Insufficient valid rows (${n}) for ${p} predictor(s). At least ${p + 2} clean numeric rows are required.`
    );
  }

  // Construct Design Matrix X (n x (p + 1)) with intercept column of 1s
  // and vector Y (n x 1)
  const X: number[][] = [];
  const Y: number[] = [];

  for (let i = 0; i < n; i++) {
    X.push([1, ...cleanRows[i].x]);
    Y.push(cleanRows[i].y);
  }

  // Compute X^T * X  ((p + 1) x (p + 1))
  const numParams = p + 1;
  const XtX: number[][] = Array.from({ length: numParams }, () => Array(numParams).fill(0));
  const XtY: number[] = Array(numParams).fill(0);

  for (let i = 0; i < n; i++) {
    const xi = X[i];
    const yi = Y[i];
    for (let j = 0; j < numParams; j++) {
      XtY[j] += xi[j] * yi;
      for (let k = 0; k < numParams; k++) {
        XtX[j][k] += xi[j] * xi[k];
      }
    }
  }

  // Solve (XtX) * beta = XtY using Matrix Inversion / Gaussian Elimination
  const invXtX = invertMatrix(XtX);
  if (!invXtX) {
    throw new Error(
      'Matrix is singular or multi-collinear. Some selected predictor variables may be perfectly correlated or constant.'
    );
  }

  // beta = inv(XtX) * XtY
  const beta: number[] = Array(numParams).fill(0);
  for (let j = 0; j < numParams; j++) {
    for (let k = 0; k < numParams; k++) {
      beta[j] += invXtX[j][k] * XtY[k];
    }
  }

  const intercept = beta[0];

  // Predictions and Residuals
  let sumY = 0;
  for (let i = 0; i < n; i++) {
    sumY += Y[i];
  }
  const meanY = sumY / n;

  let ssTot = 0;
  let ssRes = 0;
  let absErrorSum = 0;

  const actualVsPredicted = cleanRows.map((item, i) => {
    const actual = item.y;
    let pred = intercept;
    for (let j = 0; j < p; j++) {
      pred += beta[j + 1] * item.x[j];
    }
    const residual = actual - pred;

    ssTot += Math.pow(actual - meanY, 2);
    ssRes += Math.pow(residual, 2);
    absErrorSum += Math.abs(residual);

    return {
      actual,
      predicted: pred,
      residual,
      rowNumber: item.rowIdx,
      features: item.raw,
    };
  });

  const rSquared = ssTot === 0 ? 1 : Math.max(0, 1 - ssRes / ssTot);
  const dfRes = n - p - 1;
  const adjustedRSquared =
    dfRes > 0 && ssTot > 0
      ? 1 - (ssRes / dfRes) / (ssTot / (n - 1))
      : rSquared;

  const mse = ssRes / (dfRes > 0 ? dfRes : 1);
  const rmse = Math.sqrt(ssRes / n);
  const mae = absErrorSum / n;

  // F-statistic
  let fStatistic: number | undefined;
  let fPValue: number | undefined;
  if (p > 0 && dfRes > 0 && ssTot > ssRes) {
    const ssModel = ssTot - ssRes;
    const msModel = ssModel / p;
    const msRes = ssRes / dfRes;
    if (msRes > 0) {
      fStatistic = msModel / msRes;
      fPValue = approximateFPValue(fStatistic, p, dfRes);
    }
  }

  // Standard errors and t-stats for coefficients
  const coefficients: RegressionModelResult['coefficients'] = [];
  const paramNames = ['Intercept', ...predictorCols];

  for (let j = 0; j < numParams; j++) {
    const varBeta = invXtX[j][j] * mse;
    const stdError = varBeta > 0 ? Math.sqrt(varBeta) : 0;
    const tStat = stdError > 0 ? beta[j] / stdError : undefined;
    const pValue = tStat !== undefined ? approximateTPValue(tStat, dfRes) : undefined;

    coefficients.push({
      feature: paramNames[j],
      beta: beta[j],
      stdError: isNaN(stdError) ? undefined : stdError,
      tStat: tStat !== undefined && !isNaN(tStat) ? tStat : undefined,
      pValue: pValue !== undefined && !isNaN(pValue) ? pValue : undefined,
    });
  }

  // Construct clean equation string
  let equationString = `${targetCol} = ${formatNum(intercept)}`;
  predictorCols.forEach((col, idx) => {
    const b = beta[idx + 1];
    const sign = b >= 0 ? '+' : '-';
    equationString += ` ${sign} ${formatNum(Math.abs(b))} × [${col}]`;
  });

  // Simple regression plot data if 1 predictor
  let simpleRegressionPlotData: RegressionModelResult['simpleRegressionPlotData'];
  if (p === 1) {
    const featureName = predictorCols[0];
    const points = cleanRows.map((r) => ({ x: r.x[0], y: r.y }));
    const xs = points.map((pt) => pt.x);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const padding = (maxX - minX) * 0.05 || 1;

    const lineStart = { x: minX - padding, y: intercept + beta[1] * (minX - padding) };
    const lineEnd = { x: maxX + padding, y: intercept + beta[1] * (maxX + padding) };

    simpleRegressionPlotData = {
      featureName,
      points,
      line: [lineStart, lineEnd],
      slope: beta[1],
      intercept,
    };
  }

  return {
    targetVariable: targetCol,
    predictorVariables: predictorCols,
    coefficients,
    intercept,
    rSquared,
    adjustedRSquared: Math.max(0, adjustedRSquared),
    rmse,
    mae,
    fStatistic,
    fPValue,
    sampleCount: n,
    degreesOfFreedom: dfRes,
    equationString,
    actualVsPredicted,
    simpleRegressionPlotData,
  };
}

function parseNumeric(val: any): number | null {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number') {
    return isNaN(val) || !isFinite(val) ? null : val;
  }
  if (typeof val === 'string') {
    const cleaned = val.replace(/[$,% ]/g, '').trim();
    if (cleaned === '') return null;
    const num = Number(cleaned);
    return isNaN(num) || !isFinite(num) ? null : num;
  }
  return null;
}

function formatNum(n: number): string {
  if (Math.abs(n) < 0.0001 && n !== 0) {
    return n.toExponential(4);
  }
  return Number(n.toFixed(4)).toString();
}

// Invert matrix using Gauss-Jordan Elimination with partial pivoting
function invertMatrix(M: number[][]): number[][] | null {
  const n = M.length;
  // Augment with identity
  const A: number[][] = M.map((row, i) => {
    const r = [...row];
    for (let j = 0; j < n; j++) {
      r.push(i === j ? 1 : 0);
    }
    return r;
  });

  for (let i = 0; i < n; i++) {
    // Find pivot
    let maxRow = i;
    let maxVal = Math.abs(A[i][i]);
    for (let r = i + 1; r < n; r++) {
      if (Math.abs(A[r][i]) > maxVal) {
        maxVal = Math.abs(A[r][i]);
        maxRow = r;
      }
    }

    if (maxVal < 1e-12) {
      return null; // Singular matrix
    }

    // Swap rows
    if (maxRow !== i) {
      const temp = A[i];
      A[i] = A[maxRow];
      A[maxRow] = temp;
    }

    // Divide pivot row
    const pivot = A[i][i];
    for (let j = 0; j < 2 * n; j++) {
      A[i][j] /= pivot;
    }

    // Eliminate other rows
    for (let r = 0; r < n; r++) {
      if (r !== i) {
        const factor = A[r][i];
        if (Math.abs(factor) > 1e-15) {
          for (let c = 0; c < 2 * n; c++) {
            A[r][c] -= factor * A[i][c];
          }
        }
      }
    }
  }

  // Extract right half
  const inv: number[][] = [];
  for (let i = 0; i < n; i++) {
    inv.push(A[i].slice(n, 2 * n));
  }
  return inv;
}

// Two-tailed t-distribution p-value approximation
function approximateTPValue(t: number, df: number): number {
  if (df <= 0) return 1.0;
  const absT = Math.abs(t);
  // Approximation using normal distribution for larger df, or transformation
  if (df >= 30) {
    return 2 * (1 - normalCdf(absT));
  }
  const x = df / (df + absT * absT);
  // Incomplete beta approximation
  const p = incompleteBeta(df / 2, 0.5, x);
  return Math.max(0, Math.min(1, p));
}

// F-distribution p-value approximation
function approximateFPValue(f: number, df1: number, df2: number): number {
  if (f <= 0 || df1 <= 0 || df2 <= 0) return 1.0;
  const x = df2 / (df2 + df1 * f);
  const p = incompleteBeta(df2 / 2, df1 / 2, x);
  return Math.max(0, Math.min(1, p));
}

function normalCdf(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp((-x * x) / 2);
  const prob =
    d *
    t *
    (0.3193815 +
      t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - prob : prob;
}

// Regularized incomplete beta function approximation
function incompleteBeta(a: number, b: number, x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;

  // Continued fraction representation
  const maxIterations = 50;
  const epsilon = 1e-10;

  const lbeta = logGamma(a) + logGamma(b) - logGamma(a + b);
  const front = Math.exp(Math.log(x) * a + Math.log(1 - x) * b - lbeta) / a;

  let f = 1;
  let c = 1;
  let d = 0;

  for (let m = 1; m <= maxIterations; m++) {
    // Even step
    let m2 = 2 * m;
    let dVal = (m * (b - m) * x) / ((a + m2 - 1) * (a + m2));
    d = 1 + dVal * d;
    if (Math.abs(d) < epsilon) d = epsilon;
    c = 1 + dVal / c;
    if (Math.abs(c) < epsilon) c = epsilon;
    d = 1 / d;
    f *= c * d;

    // Odd step
    let num = -((a + m) * (a + b + m) * x) / ((a + m2) * (a + m2 + 1));
    d = 1 + num * d;
    if (Math.abs(d) < epsilon) d = epsilon;
    c = 1 + num / c;
    if (Math.abs(c) < epsilon) c = epsilon;
    d = 1 / d;
    f *= c * d;

    if (Math.abs(c * d - 1) < epsilon) break;
  }

  return front * f;
}

function logGamma(x: number): number {
  const p = [
    676.5203681218851, -1259.1392167224028, 771.32342877765313,
    -176.61502916214059, 12.507343278686905, -0.138571095836524,
    9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  if (x < 0.5) {
    return Math.log(Math.PI / Math.sin(Math.PI * x)) - logGamma(1 - x);
  }
  x -= 1;
  let a = 0.99999999999980993;
  for (let i = 0; i < p.length; i++) {
    a += p[i] / (x + i + 1);
  }
  const t = x + p.length - 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}
