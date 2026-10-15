import * as XLSX from 'xlsx';

export interface ColumnProfile {
  name: string;
  totalCount: number;
  validNumericCount: number;
  nullCount: number;
  isNumeric: boolean;
  min?: number;
  max?: number;
  mean?: number;
  stdDev?: number;
  sampleValues: (string | number)[];
}

export interface ParsedDataset {
  fileName: string;
  sheetName: string;
  sheetNames: string[];
  rawRows: Record<string, any>[];
  headers: string[];
  columns: ColumnProfile[];
  rowCount: number;
}

export function parseExcelWorkbook(
  workbook: XLSX.WorkBook,
  fileName: string,
  preferredSheet?: string
): ParsedDataset {
  const sheetNames = workbook.SheetNames;
  if (!sheetNames || sheetNames.length === 0) {
    throw new Error('Workbook contains no sheets.');
  }

  const selectedSheetName = preferredSheet && sheetNames.includes(preferredSheet)
    ? preferredSheet
    : sheetNames[0];

  const worksheet = workbook.Sheets[selectedSheetName];
  // Parse with raw = false or raw = true; raw numbers are preserved
  const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, {
    defval: null,
    raw: true,
  });

  if (!jsonData || jsonData.length === 0) {
    throw new Error(`Sheet "${selectedSheetName}" contains no data rows.`);
  }

  // Extract all unique headers across rows
  const headersSet = new Set<string>();
  jsonData.forEach((row) => {
    Object.keys(row).forEach((k) => {
      const trimmed = k.trim();
      if (trimmed) headersSet.add(trimmed);
    });
  });

  const headers = Array.from(headersSet);
  if (headers.length === 0) {
    throw new Error('Could not identify table headers in the spreadsheet.');
  }

  // Profile columns
  const columns: ColumnProfile[] = headers.map((colName) => {
    let validNumericCount = 0;
    let nullCount = 0;
    const numericValues: number[] = [];
    const sampleValues: (string | number)[] = [];

    jsonData.forEach((row) => {
      const val = row[colName];
      if (val === null || val === undefined || val === '') {
        nullCount++;
      } else {
        if (sampleValues.length < 5) {
          sampleValues.push(val);
        }
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
          validNumericCount++;
          numericValues.push(num);
        }
      }
    });

    const isNumeric = validNumericCount > 0 && validNumericCount >= (jsonData.length - nullCount) * 0.7;

    let min: number | undefined;
    let max: number | undefined;
    let mean: number | undefined;
    let stdDev: number | undefined;

    if (numericValues.length > 0) {
      min = Math.min(...numericValues);
      max = Math.max(...numericValues);
      const sum = numericValues.reduce((a, b) => a + b, 0);
      mean = sum / numericValues.length;
      const variance =
        numericValues.reduce((acc, val) => acc + Math.pow(val - mean!, 2), 0) /
        (numericValues.length > 1 ? numericValues.length - 1 : 1);
      stdDev = Math.sqrt(variance);
    }

    return {
      name: colName,
      totalCount: jsonData.length,
      validNumericCount,
      nullCount,
      isNumeric,
      min,
      max,
      mean,
      stdDev,
      sampleValues,
    };
  });

  return {
    fileName,
    sheetName: selectedSheetName,
    sheetNames,
    rawRows: jsonData,
    headers,
    columns,
    rowCount: jsonData.length,
  };
}

export async function parseExcelFile(file: File): Promise<{ workbook: XLSX.WorkBook; parsed: ParsedDataset }> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const parsed = parseExcelWorkbook(workbook, file.name);
  return { workbook, parsed };
}
