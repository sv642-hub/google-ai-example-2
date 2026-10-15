import React, { useState, useEffect, useRef } from 'react';
import {
  Upload,
  HardDrive,
  FileSpreadsheet,
  AlertCircle,
  Play,
  Sparkles,
  Layers,
  ChevronDown,
  BarChart3,
  TrendingUp,
  LayoutDashboard,
  Table,
  Sliders,
  Calculator,
  Download,
  Info
} from 'lucide-react';
import confetti from 'canvas-confetti';
import * as XLSX from 'xlsx';

import { initAuth, googleSignIn, googleSignOut } from './lib/googleAuth';
import { parseExcelFile, parseExcelWorkbook, ParsedDataset } from './lib/excelParser';
import { runLinearRegression, RegressionModelResult } from './lib/regression';
import { runKMeansClustering, ClusteringResult } from './lib/clustering';
import { GoogleDrivePickerModal } from './components/GoogleDrivePickerModal';
import { SimpleScatterPlot, ActualVsPredictedScatter } from './components/RegressionCharts';
import { ClusterVisualization } from './components/ClusterVisualization';
import { generateSampleDataset } from './lib/sampleDatasets';
import { AnalystChatbot } from './components/AnalystChatbot';
import { DashboardView } from './components/DashboardView';

export default function App() {
  // Mode selection: Dashboard, Linear Regression, or Cluster Analysis
  const [analysisMode, setAnalysisMode] = useState<'dashboard' | 'regression' | 'clustering'>('dashboard');
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Google Auth state
  const [user, setUser] = useState<any>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);

  // Dataset State
  const [currentWorkbook, setCurrentWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [dataset, setDataset] = useState<ParsedDataset | null>(null);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [dragActive, setDragActive] = useState(false);
  const [fileLoading, setFileLoading] = useState(false);

  // Regression Selection State
  const [targetVariable, setTargetVariable] = useState<string>('');
  const [predictorVariables, setPredictorVariables] = useState<string[]>([]);
  const [modelResult, setModelResult] = useState<RegressionModelResult | null>(null);
  const [modelError, setModelError] = useState<string | null>(null);

  // Clustering Selection State
  const [clusterK, setClusterK] = useState<number>(3);
  const [clusterFeatures, setClusterFeatures] = useState<string[]>([]);
  const [clusterResult, setClusterResult] = useState<ClusteringResult | null>(null);
  const [clusterError, setClusterError] = useState<string | null>(null);

  // Prediction sandbox state (interactive simulator for regression)
  const [simulatorInputs, setSimulatorInputs] = useState<Record<string, number>>({});
  const [simulatedPrediction, setSimulatedPrediction] = useState<number | null>(null);

  // Active view tab in regression results
  const [regressionTab, setRegressionTab] = useState<'summary' | 'plots' | 'coefficients' | 'residuals'>('summary');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize auth listener
  useEffect(() => {
    initAuth(
      (u, token) => {
        setUser(u);
        setAccessToken(token);
      },
      () => {
        setUser(null);
        setAccessToken(null);
      }
    );
  }, []);

  // When sheet changes in multi-sheet excel file
  const handleSheetChange = (newSheet: string) => {
    if (!currentWorkbook) return;
    try {
      const parsed = parseExcelWorkbook(currentWorkbook, dataset?.fileName || 'dataset.xlsx', newSheet);
      setDataset(parsed);
      setSelectedSheet(newSheet);
      resetModelTargets(parsed);
    } catch (err: any) {
      alert(`Could not load sheet: ${err.message}`);
    }
  };

  // Auto-detect good defaults when dataset loaded
  const resetModelTargets = (data: ParsedDataset) => {
    setModelResult(null);
    setModelError(null);
    setClusterResult(null);
    setClusterError(null);
    setSimulatedPrediction(null);
    setSimulatorInputs({});

    const numericCols = data.columns.filter((c) => c.isNumeric).map((c) => c.name);

    if (numericCols.length === 0) {
      setTargetVariable('');
      setPredictorVariables([]);
      setClusterFeatures([]);
      return;
    }

    // Default target for regression: usually the last numeric column
    const defaultTarget = numericCols[numericCols.length - 1];
    const defaultPredictors = numericCols.filter((c) => c !== defaultTarget);

    setTargetVariable(defaultTarget);
    setPredictorVariables(defaultPredictors);

    // Default features for clustering: all numeric columns
    setClusterFeatures(numericCols);
  };

  // Upload handler
  const handleFileUpload = async (file: File) => {
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      alert('Please upload an Excel spreadsheet (.xlsx, .xls) or CSV file.');
      return;
    }

    setFileLoading(true);
    try {
      const { workbook, parsed } = await parseExcelFile(file);
      setCurrentWorkbook(workbook);
      setDataset(parsed);
      setSelectedSheet(parsed.sheetName);
      resetModelTargets(parsed);
    } catch (err: any) {
      console.error('File parsing error:', err);
      alert(`Error reading file: ${err.message || 'Corrupted or unsupported format'}`);
    } finally {
      setFileLoading(false);
    }
  };

  // Load sample dataset
  const handleLoadSample = (sampleType: 'housing' | 'sales' | 'customer') => {
    const { workbook, fileName } = generateSampleDataset(sampleType);
    const parsed = parseExcelWorkbook(workbook, fileName);
    setCurrentWorkbook(workbook);
    setDataset(parsed);
    setSelectedSheet(parsed.sheetName);
    resetModelTargets(parsed);

    // Auto-switch to clustering mode if customer segmentation is loaded
    if (sampleType === 'customer') {
      setAnalysisMode('clustering');
    }
  };

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // Toggle predictor variable for regression
  const togglePredictor = (colName: string) => {
    if (colName === targetVariable) return;
    setPredictorVariables((prev) =>
      prev.includes(colName) ? prev.filter((c) => c !== colName) : [...prev, colName]
    );
  };

  // Toggle cluster feature
  const toggleClusterFeature = (colName: string) => {
    setClusterFeatures((prev) =>
      prev.includes(colName) ? prev.filter((c) => c !== colName) : [...prev, colName]
    );
  };

  // Run the linear regression
  const handleTrainRegression = () => {
    if (!dataset) return;
    setModelError(null);

    try {
      const result = runLinearRegression(
        dataset.rawRows,
        targetVariable,
        predictorVariables
      );
      setModelResult(result);
      setRegressionTab('summary');

      // Setup initial simulator values using mean values
      const initialSim: Record<string, number> = {};
      result.predictorVariables.forEach((p) => {
        const col = dataset.columns.find((c) => c.name === p);
        initialSim[p] = col?.mean !== undefined ? Number(col.mean.toFixed(2)) : 0;
      });
      setSimulatorInputs(initialSim);
      computeSimulation(initialSim, result);

      confetti({
        particleCount: 45,
        spread: 60,
        origin: { y: 0.8 },
      });
    } catch (err: any) {
      console.error('Regression error:', err);
      setModelError(err.message || 'Failed to fit linear regression model.');
    }
  };

  // Run Cluster Analysis
  const handleRunClustering = (kVal?: number) => {
    if (!dataset) return;
    setClusterError(null);
    const kToUse = kVal ?? clusterK;

    try {
      const result = runKMeansClustering(dataset.rawRows, clusterFeatures, kToUse);
      setClusterResult(result);
      if (kVal) setClusterK(kVal);

      confetti({
        particleCount: 45,
        spread: 60,
        origin: { y: 0.8 },
      });
    } catch (err: any) {
      console.error('Clustering error:', err);
      setClusterError(err.message || 'Failed to execute K-Means clustering.');
    }
  };

  // Live prediction calculation
  const computeSimulation = (inputs: Record<string, number>, model: RegressionModelResult) => {
    let pred = model.intercept;
    model.predictorVariables.forEach((p) => {
      const coef = model.coefficients.find((c) => c.feature === p)?.beta || 0;
      const val = inputs[p] || 0;
      pred += coef * val;
    });
    setSimulatedPrediction(pred);
  };

  const handleSimulatorChange = (feature: string, value: number) => {
    const nextInputs = { ...simulatorInputs, [feature]: value };
    setSimulatorInputs(nextInputs);
    if (modelResult) {
      computeSimulation(nextInputs, modelResult);
    }
  };

  // Export predictions to CSV/Excel
  const handleExportPredictions = () => {
    if (!modelResult || !dataset) return;
    const exportRows = modelResult.actualVsPredicted.map((row) => ({
      Row: row.rowNumber,
      ...row.features,
      [`Actual_${modelResult.targetVariable}`]: row.actual,
      [`Predicted_${modelResult.targetVariable}`]: row.predicted,
      Residual: row.residual,
    }));
    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Regression_Predictions');
    XLSX.writeFile(wb, `${dataset.fileName.replace(/\.[^/.]+$/, '')}_predictions.xlsx`);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Radiant Navy & Ice Blue Stripe on Top */}
      <div className="h-1.5 w-full bg-gradient-to-r from-sky-400 via-blue-700 to-[#061021] shadow-xs" />

      {/* Top Navigation - Dark Navy Blue */}
      <header className="sticky top-0 z-40 bg-[#0A162B] border-b border-[#1A2E54] text-white shadow-lg shadow-[#050C1A]/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#0F2248] via-[#1A3870] to-[#2B5CA8] flex items-center justify-center text-white shadow-lg shadow-blue-950/40 ring-1 ring-blue-400/30">
              {analysisMode === 'dashboard' ? (
                <LayoutDashboard className="w-5 h-5 text-sky-200" />
              ) : analysisMode === 'regression' ? (
                <TrendingUp className="w-5 h-5 text-sky-200" />
              ) : (
                <Layers className="w-5 h-5 text-sky-200" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black text-white tracking-tight">RegressionLab</h1>
                <span className="text-[10px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded-full bg-[#12254A] text-sky-200 border border-blue-500/30 shadow-xs">
                  Navy ML Studio
                </span>
              </div>
              <p className="text-xs text-slate-300 hidden sm:block">
                Excel &amp; Google Drive Linear Regression &amp; K-Means Clustering
              </p>
            </div>
          </div>

          {/* Mode Switcher Tabs - Navy Blue Styling */}
          <div className="flex items-center bg-[#061021] p-1 rounded-xl border border-[#162B50]">
            <button
              onClick={() => setAnalysisMode('dashboard')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                analysisMode === 'dashboard'
                  ? 'bg-[#163363] text-white shadow-xs border border-blue-400/30'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </button>
            <button
              onClick={() => setAnalysisMode('regression')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                analysisMode === 'regression'
                  ? 'bg-[#163363] text-white shadow-xs border border-blue-400/30'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Linear Regression</span>
            </button>
            <button
              onClick={() => setAnalysisMode('clustering')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                analysisMode === 'clustering'
                  ? 'bg-[#163363] text-white shadow-xs border border-blue-400/30'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Cluster Analysis</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            {/* Google Drive Status Button - Navy Styled */}
            {user ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsDriveModalOpen(true)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-blue-800/60 bg-[#0E1F3D] hover:bg-[#152B52] text-slate-100 text-xs font-semibold shadow-xs transition cursor-pointer"
                >
                  <HardDrive className="w-4 h-4 text-sky-400" />
                  <span className="hidden sm:inline">Browse Drive</span>
                  <span className="sm:hidden">Drive</span>
                </button>
                <div className="flex items-center gap-1.5 pl-2 border-l border-blue-900/60">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt={user.displayName} className="w-7 h-7 rounded-full ring-1 ring-sky-400/50" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-[#18366A] text-sky-200 flex items-center justify-center text-xs font-bold ring-1 ring-blue-500/40">
                      {user.displayName ? user.displayName[0] : 'G'}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <button
                onClick={() => setIsDriveModalOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-blue-800/60 bg-[#0E1F3D] hover:bg-[#152B52] text-slate-100 text-xs font-medium shadow-xs transition hover:border-blue-600 cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                </svg>
                <span>Connect Google Drive</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Hidden global file input for drag/drop and upload triggers */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleFileUpload(e.target.files[0]);
            }
          }}
        />

        {analysisMode === 'dashboard' ? (
          <DashboardView
            dataset={dataset}
            regressionModel={modelResult}
            clusterResult={clusterResult}
            onNavigateToRegression={() => setAnalysisMode('regression')}
            onNavigateToClustering={() => setAnalysisMode('clustering')}
            onAutoTrainRegression={handleTrainRegression}
            onAutoRunClustering={() => handleRunClustering(3)}
            onLoadSample={handleLoadSample}
            onOpenDriveModal={() => setIsDriveModalOpen(true)}
            onOpenAiAnalyst={() => setIsChatOpen(true)}
            onTriggerUpload={() => fileInputRef.current?.click()}
            selectedSheet={selectedSheet}
            onSheetChange={handleSheetChange}
          />
        ) : (
          <>
            {/* Context breadcrumb back to dashboard */}
            <div className="flex items-center justify-between pb-1">
              <button
                onClick={() => setAnalysisMode('dashboard')}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600 transition group cursor-pointer"
              >
                <span className="text-slate-400 group-hover:-translate-x-0.5 transition-transform">&larr;</span>
                <span>Return to Executive Dashboard</span>
              </button>
              <div className="text-xs text-slate-500 font-medium">
                {analysisMode === 'regression' ? 'Regression Modeling & Simulator' : 'K-Means Cluster Space'}
              </div>
            </div>

            {/* Step 1: Upload or Connect Google Drive */}
            <section className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden transition-all">
              <div className="h-1 w-full bg-gradient-to-r from-sky-400 via-blue-700 to-[#061021]" />
              <div className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#0F2248] to-[#1E3F78] text-white font-bold flex items-center justify-center text-sm shadow-sm shadow-blue-950/20">
                      1
                    </span>
                <div>
                  <h2 className="text-base font-bold text-slate-800">
                    {dataset ? 'Current Dataset' : 'Upload Excel File or Connect Google Drive'}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {dataset
                      ? `File loaded: ${dataset.fileName} (${dataset.rowCount} rows, ${dataset.columns.length} columns)`
                      : 'Provide a tabular dataset with numeric columns for regression or clustering'}
                  </p>
                </div>
              </div>

              {/* Sample Datasets Buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-slate-400 font-medium">Try sample:</span>
                <button
                  onClick={() => handleLoadSample('housing')}
                  className="px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
                >
                  Housing Prices
                </button>
                <button
                  onClick={() => handleLoadSample('sales')}
                  className="px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
                >
                  Ad Spend & Revenue
                </button>
                <button
                  onClick={() => handleLoadSample('customer')}
                  className="px-2.5 py-1 text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg transition border border-indigo-200/60"
                >
                  Customer Segments
                </button>
              </div>
            </div>

            {/* If no dataset loaded, display upload & drive connection zone */}
            {!dataset ? (
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Drag and Drop Zone */}
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition ${
                    dragActive
                      ? 'border-blue-500 bg-blue-50/50'
                      : 'border-slate-200 hover:border-blue-400 hover:bg-slate-50/50'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileUpload(e.target.files[0]);
                      }
                    }}
                  />
                  <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                    <Upload className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-800">
                    {fileLoading ? 'Reading spreadsheet...' : 'Upload Excel / CSV'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs">
                    Drag and drop your spreadsheet here, or click to browse from your computer
                  </p>
                  <span className="mt-3 text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                    .xlsx, .xls, .csv
                  </span>
                </div>

                {/* Google Drive Folder Connection Card */}
                <div
                  onClick={() => setIsDriveModalOpen(true)}
                  className="border-2 border-dashed border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/30 rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition group"
                >
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                    <HardDrive className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-800">Connect Google Drive Folder</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs">
                    Directly browse your Google Drive folders and select Google Sheets or Excel files
                  </p>
                  <button className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-md">
                    <HardDrive className="w-3.5 h-3.5" />
                    Browse Drive Folders
                  </button>
                </div>
              </div>
            ) : (
              /* Dataset is loaded - Show summary & sheet selector */
              <div className="mt-4 flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      {dataset.fileName}
                      <span className="text-xs font-normal text-slate-500">
                        ({dataset.rowCount} rows)
                      </span>
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                      <span>Sheet:</span>
                      {dataset.sheetNames.length > 1 ? (
                        <select
                          value={selectedSheet}
                          onChange={(e) => handleSheetChange(e.target.value)}
                          className="bg-white border border-slate-300 rounded px-2 py-0.5 text-xs text-slate-700 font-medium focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                        >
                          {dataset.sheetNames.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <strong className="text-slate-700">{dataset.sheetName}</strong>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-center">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 text-xs font-semibold border border-slate-300 hover:bg-white bg-slate-100 rounded-lg text-slate-700 transition"
                  >
                    Replace File
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileUpload(e.target.files[0]);
                      }
                    }}
                  />
                  <button
                    onClick={() => setIsDriveModalOpen(true)}
                    className="px-3 py-1.5 text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition flex items-center gap-1.5"
                  >
                    <HardDrive className="w-3.5 h-3.5" />
                    Load from Drive
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Step 2: CONFIGURATION */}
        {dataset && analysisMode === 'regression' && (
          <section className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6">
            <div className="flex items-center justify-between pb-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-[#0F2248] text-sky-300 font-bold flex items-center justify-center text-sm border border-blue-900">
                  2
                </span>
                <div>
                  <h2 className="text-base font-bold text-slate-800">
                    Configure Linear Regression
                  </h2>
                  <p className="text-xs text-slate-500">
                    Select your Target Variable (Y) to predict, and the Independent Variables (X) as predictors
                  </p>
                </div>
              </div>

              <button
                onClick={handleTrainRegression}
                disabled={!targetVariable || predictorVariables.length === 0}
                className={`px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-sm transition ${
                  !targetVariable || predictorVariables.length === 0
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-[#0F2347] hover:bg-[#183973] text-white hover:shadow-md active:scale-98 cursor-pointer'
                }`}
              >
                <Play className="w-4 h-4 fill-white" />
                Fit Linear Regression
              </button>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Target Variable (Y) Column selection */}
              <div className="md:col-span-5 space-y-3">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-600" />
                  Target Variable (Dependent Y)
                </label>
                <p className="text-xs text-slate-500">
                  The numerical metric your linear model will forecast (e.g., Price, Sales, Salary)
                </p>

                <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                  {dataset.columns.map((col) => {
                    const isSelected = targetVariable === col.name;
                    return (
                      <div
                        key={col.name}
                        onClick={() => {
                          setTargetVariable(col.name);
                          setPredictorVariables((prev) => prev.filter((p) => p !== col.name));
                        }}
                        className={`flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition ${
                          isSelected
                            ? 'bg-indigo-50 border-indigo-300 text-indigo-900 font-semibold shadow-2xs'
                            : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <input
                            type="radio"
                            name="targetCol"
                            checked={isSelected}
                            onChange={() => {}}
                            className="text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="truncate">{col.name}</span>
                        </div>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                            col.isNumeric
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {col.isNumeric ? 'numeric' : 'text'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Predictor Variables (X) Selection */}
              <div className="md:col-span-7 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-600" />
                    Predictor Variables (Independent X)
                  </label>
                  <div className="flex gap-2 text-xs">
                    <button
                      onClick={() =>
                        setPredictorVariables(
                          dataset.columns
                            .filter((c) => c.isNumeric && c.name !== targetVariable)
                            .map((c) => c.name)
                        )
                      }
                      className="text-blue-600 hover:underline font-medium text-[11px]"
                    >
                      Select All Numeric
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      onClick={() => setPredictorVariables([])}
                      className="text-slate-500 hover:underline font-medium text-[11px]"
                    >
                      Clear
                    </button>
                  </div>
                </div>
                <p className="text-xs text-slate-500">
                  Choose one feature for simple regression, or multiple features for multivariable regression
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
                  {dataset.columns.map((col) => {
                    const isTarget = targetVariable === col.name;
                    const isChecked = predictorVariables.includes(col.name);

                    return (
                      <div
                        key={col.name}
                        onClick={() => {
                          if (!isTarget) togglePredictor(col.name);
                        }}
                        className={`flex items-center justify-between p-2.5 rounded-xl border text-xs transition ${
                          isTarget
                            ? 'opacity-40 bg-slate-100 border-slate-200 cursor-not-allowed'
                            : isChecked
                            ? 'bg-blue-50 border-blue-300 text-blue-900 font-semibold cursor-pointer shadow-2xs'
                            : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700 cursor-pointer'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <input
                            type="checkbox"
                            disabled={isTarget}
                            checked={isChecked}
                            onChange={() => {}}
                            className="rounded text-blue-600 focus:ring-blue-500"
                          />
                          <span className="truncate">{col.name}</span>
                        </div>
                        {isTarget ? (
                          <span className="text-[10px] text-slate-400 font-medium">Target (Y)</span>
                        ) : (
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                              col.isNumeric
                                ? 'bg-slate-100 text-slate-600'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {col.isNumeric ? 'numeric' : 'text'}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {modelError && (
              <div className="mt-4 p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-800 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                <div>
                  <strong className="font-bold">Regression Estimation Error:</strong> {modelError}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Step 2: CONFIGURATION FOR CLUSTER ANALYSIS */}
        {dataset && analysisMode === 'clustering' && (
          <section className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-[#0F2248] text-sky-300 font-bold flex items-center justify-center text-sm border border-blue-900">
                  2
                </span>
                <div>
                  <h2 className="text-base font-bold text-slate-800">
                    Configure K-Means Clustering
                  </h2>
                  <p className="text-xs text-slate-500">
                    Choose the number of clusters (k) and select the feature dimensions for grouping
                  </p>
                </div>
              </div>

              <button
                onClick={() => handleRunClustering()}
                disabled={clusterFeatures.length === 0}
                className={`px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-sm transition ${
                  clusterFeatures.length === 0
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-[#0F2347] hover:bg-[#183973] text-white hover:shadow-md active:scale-98 cursor-pointer'
                }`}
              >
                <Play className="w-4 h-4 fill-white" />
                Run Cluster Analysis
              </button>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Cluster Count Selector (k) */}
              <div className="md:col-span-5 space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#0F2347]" />
                      Number of Clusters (k)
                    </label>
                    <span className="text-base font-black text-[#0F2347] font-mono">
                      k = {clusterK}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    How many distinct segments or customer groups to segment your data into.
                  </p>
                </div>

                {/* Range Slider */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <input
                    type="range"
                    min="2"
                    max="8"
                    value={clusterK}
                    onChange={(e) => setClusterK(parseInt(e.target.value, 10))}
                    className="w-full accent-[#0F2347] cursor-pointer"
                  />

                  {/* Quick Select Buttons */}
                  <div className="flex justify-between gap-1">
                    {[2, 3, 4, 5, 6, 7, 8].map((num) => (
                      <button
                        key={num}
                        onClick={() => setClusterK(num)}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition cursor-pointer ${
                          clusterK === num
                            ? 'bg-[#0F2347] border-[#0F2347] text-white shadow-2xs'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-3.5 bg-blue-50/50 rounded-xl border border-blue-100 text-xs text-blue-900 space-y-1">
                  <p className="font-semibold flex items-center gap-1">
                    <Info className="w-3.5 h-3.5 text-blue-600" />
                    Automated Normalization
                  </p>
                  <p className="text-slate-600 text-[11px]">
                    Features are automatically standardized using Z-scores ($μ=0, σ=1$) so differing scales (e.g. Income vs Age) don't distort distance.
                  </p>
                </div>
              </div>

              {/* Clustering Feature Variables Selection */}
              <div className="md:col-span-7 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-600" />
                    Feature Variables for Clustering
                  </label>
                  <div className="flex gap-2 text-xs">
                    <button
                      onClick={() =>
                        setClusterFeatures(
                          dataset.columns.filter((c) => c.isNumeric).map((c) => c.name)
                        )
                      }
                      className="text-blue-600 hover:underline font-medium text-[11px]"
                    >
                      Select All Numeric
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      onClick={() => setClusterFeatures([])}
                      className="text-slate-500 hover:underline font-medium text-[11px]"
                    >
                      Clear
                    </button>
                  </div>
                </div>
                <p className="text-xs text-slate-500">
                  Select numerical columns to use as dimensions for clustering (minimum 1, recommended 2+)
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
                  {dataset.columns.map((col) => {
                    const isChecked = clusterFeatures.includes(col.name);

                    return (
                      <div
                        key={col.name}
                        onClick={() => toggleClusterFeature(col.name)}
                        className={`flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition ${
                          isChecked
                            ? 'bg-indigo-50 border-indigo-300 text-indigo-900 font-semibold shadow-2xs'
                            : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="rounded text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="truncate">{col.name}</span>
                        </div>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                            col.isNumeric
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {col.isNumeric ? 'numeric' : 'text'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {clusterError && (
              <div className="mt-4 p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-800 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                <div>
                  <strong className="font-bold">Clustering Error:</strong> {clusterError}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Step 3: RESULTS FOR CLUSTERING */}
        {dataset && analysisMode === 'clustering' && clusterResult && (
          <ClusterVisualization
            result={clusterResult}
            fileName={dataset.fileName}
            onKChange={(newK) => handleRunClustering(newK)}
          />
        )}

        {/* Step 3: RESULTS FOR LINEAR REGRESSION */}
        {dataset && analysisMode === 'regression' && modelResult && (
          <section className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            {/* Header with stats badges */}
            <div className="p-6 border-b border-slate-100 bg-gradient-to-b from-slate-50/50 to-white">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 font-bold flex items-center justify-center text-sm border border-emerald-100">
                      3
                    </span>
                    <h2 className="text-base font-bold text-slate-900">
                      Regression Model Trained Successfully
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 font-mono break-all">
                    {modelResult.equationString}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleExportPredictions}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold shadow-2xs transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Export Predictions
                  </button>
                </div>
              </div>

              {/* Key Metric KPI Cards - Navy Theme */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
                <div className="p-4 rounded-xl bg-[#0F2248]/10 border border-[#1E3F78]/30">
                  <span className="text-[11px] font-bold text-[#0F2248] uppercase tracking-wider">
                    R-Squared (R²)
                  </span>
                  <div className="text-2xl font-black text-[#0A162B] mt-1">
                    {(modelResult.rSquared * 100).toFixed(1)}%
                  </div>
                  <p className="text-[10px] text-blue-700 mt-0.5">
                    Variance explained by model
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[#0F2248]/10 border border-[#1E3F78]/30">
                  <span className="text-[11px] font-bold text-[#0F2248] uppercase tracking-wider">
                    Adjusted R²
                  </span>
                  <div className="text-2xl font-black text-[#0A162B] mt-1">
                    {(modelResult.adjustedRSquared * 100).toFixed(1)}%
                  </div>
                  <p className="text-[10px] text-blue-700 mt-0.5">
                    Penalized for predictor count
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-100">
                  <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
                    RMSE
                  </span>
                  <div className="text-2xl font-black text-emerald-900 mt-1">
                    {modelResult.rmse < 1000
                      ? modelResult.rmse.toFixed(3)
                      : Number(modelResult.rmse.toFixed(1)).toLocaleString()}
                  </div>
                  <p className="text-[10px] text-emerald-600 mt-0.5">Root Mean Squared Error</p>
                </div>

                <div className="p-4 rounded-xl bg-slate-100 border border-slate-200">
                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Samples (N)
                  </span>
                  <div className="text-2xl font-black text-slate-900 mt-1">
                    {modelResult.sampleCount}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Degrees of freedom: {modelResult.degreesOfFreedom}
                  </p>
                </div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-200 px-6 gap-6 bg-white overflow-x-auto">
              <button
                onClick={() => setRegressionTab('summary')}
                className={`py-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  regressionTab === 'summary'
                    ? 'border-[#0F2248] text-[#0F2248]'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Calculator className="w-3.5 h-3.5" />
                Live Predictor & Equation
              </button>

              <button
                onClick={() => setRegressionTab('plots')}
                className={`py-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  regressionTab === 'plots'
                    ? 'border-[#0F2248] text-[#0F2248]'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                Regression Scatter Plots
              </button>

              <button
                onClick={() => setRegressionTab('coefficients')}
                className={`py-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  regressionTab === 'coefficients'
                    ? 'border-[#0F2248] text-[#0F2248]'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                Coefficients & P-Values
              </button>

              <button
                onClick={() => setRegressionTab('residuals')}
                className={`py-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  regressionTab === 'residuals'
                    ? 'border-[#0F2248] text-[#0F2248]'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Table className="w-3.5 h-3.5" />
                Predictions & Residuals ({modelResult.actualVsPredicted.length})
              </button>
            </div>

            {/* Tab 1: Live Interactive Predictor & Formula */}
            {regressionTab === 'summary' && (
              <div className="p-6 space-y-6">
                {/* Mathematical Equation Display */}
                <div className="p-4 bg-slate-900 text-white rounded-xl shadow-inner font-mono text-sm overflow-x-auto">
                  <div className="text-slate-400 text-xs mb-1 uppercase tracking-wider font-sans font-bold">
                    Estimated OLS Model:
                  </div>
                  <div className="text-blue-300 font-semibold">{modelResult.equationString}</div>
                </div>

                {/* Interactive Simulator / Prediction Sandbox */}
                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-5 h-5 text-blue-600" />
                    <h3 className="text-sm font-bold text-slate-800">
                      Interactive What-If Prediction Simulator
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 mb-6">
                    Tweak the predictor values below to forecast the target variable{' '}
                    <strong className="text-slate-800">{modelResult.targetVariable}</strong> in real time.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {modelResult.predictorVariables.map((feature) => {
                      const col = dataset?.columns.find((c) => c.name === feature);
                      const currentVal = simulatorInputs[feature] ?? 0;
                      return (
                        <div key={feature} className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                          <div className="flex justify-between items-center text-xs mb-1.5">
                            <span className="font-semibold text-slate-800 truncate" title={feature}>
                              {feature}
                            </span>
                            <span className="font-mono text-blue-600 font-bold">{currentVal}</span>
                          </div>
                          <input
                            type="number"
                            step="any"
                            value={currentVal}
                            onChange={(e) =>
                              handleSimulatorChange(feature, parseFloat(e.target.value) || 0)
                            }
                            className="w-full text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 font-mono"
                          />
                          {col?.min !== undefined && col?.max !== undefined && (
                            <div className="text-[10px] text-slate-400 mt-1 flex justify-between">
                              <span>Min: {col.min}</span>
                              <span>Max: {col.max}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Simulator Result Output Card - Navy Theme */}
                  <div className="mt-6 p-5 bg-gradient-to-r from-[#071329] via-[#0E2044] to-[#163366] rounded-xl text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg shadow-blue-950/25 border border-blue-900/50">
                    <div>
                      <span className="text-xs font-semibold text-sky-200 uppercase tracking-wider">
                        Predicted {modelResult.targetVariable}
                      </span>
                      <div className="text-3xl font-black tracking-tight text-white">
                        {simulatedPrediction !== null
                          ? simulatedPrediction < 1000
                            ? simulatedPrediction.toFixed(3)
                            : Number(simulatedPrediction.toFixed(2)).toLocaleString()
                          : '—'}
                      </div>
                    </div>
                    <div className="text-right text-xs text-blue-100 max-w-xs sm:text-right text-center">
                      Calculated instantly using {modelResult.predictorVariables.length} predictor coefficients and intercept ({modelResult.intercept.toFixed(3)}).
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Visual Scatter Plots */}
            {regressionTab === 'plots' && (
              <div className="p-6 space-y-8">
                {modelResult.simpleRegressionPlotData ? (
                  <div>
                    <div className="mb-3">
                      <h3 className="text-sm font-bold text-slate-800">
                        Fitted Regression Line: {modelResult.simpleRegressionPlotData.featureName} vs{' '}
                        {modelResult.targetVariable}
                      </h3>
                      <p className="text-xs text-slate-500">
                        Scatter points represent observed data rows; the solid blue line represents the OLS best fit.
                      </p>
                    </div>
                    <SimpleScatterPlot
                      data={modelResult.simpleRegressionPlotData.points}
                      line={modelResult.simpleRegressionPlotData.line}
                      xLabel={modelResult.simpleRegressionPlotData.featureName}
                      yLabel={modelResult.targetVariable}
                      slope={modelResult.simpleRegressionPlotData.slope}
                      intercept={modelResult.simpleRegressionPlotData.intercept}
                      rSquared={modelResult.rSquared}
                    />
                  </div>
                ) : (
                  <div>
                    <div className="mb-3">
                      <h3 className="text-sm font-bold text-slate-800">
                        Actual vs. Predicted Plot ({modelResult.predictorVariables.length} Predictors)
                      </h3>
                      <p className="text-xs text-slate-500">
                        Evaluates overall multivariable accuracy. Points closer to the dashed green diagonal indicate high prediction precision.
                      </p>
                    </div>
                    <ActualVsPredictedScatter
                      data={modelResult.actualVsPredicted}
                      targetName={modelResult.targetVariable}
                    />
                  </div>
                )}

                {/* Also show Actual vs Predicted if simple regression is used */}
                {modelResult.simpleRegressionPlotData && (
                  <div className="pt-6 border-t border-slate-100">
                    <div className="mb-3">
                      <h3 className="text-sm font-bold text-slate-800">
                        Observed vs Model-Predicted Alignment
                      </h3>
                      <p className="text-xs text-slate-500">
                        A tight grouping along the 45-degree dashed green line confirms good model fit.
                      </p>
                    </div>
                    <ActualVsPredictedScatter
                      data={modelResult.actualVsPredicted}
                      targetName={modelResult.targetVariable}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Tab 3: Detailed Coefficients Table */}
            {regressionTab === 'coefficients' && (
              <div className="p-6">
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-700 uppercase font-semibold border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3">Parameter / Feature</th>
                        <th className="px-4 py-3">Coefficient (β)</th>
                        <th className="px-4 py-3">Standard Error</th>
                        <th className="px-4 py-3">t-Statistic</th>
                        <th className="px-4 py-3">p-Value</th>
                        <th className="px-4 py-3">Significance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {modelResult.coefficients.map((c) => {
                        return (
                          <tr key={c.feature} className="hover:bg-slate-50/50">
                            <td className="px-4 py-3 font-sans font-semibold text-slate-800">
                              {c.feature}
                            </td>
                            <td className="px-4 py-3 font-bold text-blue-700">
                              {c.beta.toFixed(4)}
                            </td>
                            <td className="px-4 py-3 text-slate-600">
                              {c.stdError !== undefined ? c.stdError.toFixed(4) : '—'}
                            </td>
                            <td className="px-4 py-3 text-slate-600">
                              {c.tStat !== undefined ? c.tStat.toFixed(3) : '—'}
                            </td>
                            <td className="px-4 py-3 text-slate-600">
                              {c.pValue !== undefined
                                ? c.pValue < 0.001
                                  ? '< 0.001'
                                  : c.pValue.toFixed(4)
                                : '—'}
                            </td>
                            <td className="px-4 py-3 font-sans">
                              {c.pValue !== undefined && (
                                <span
                                  className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                                    c.pValue < 0.01
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : c.pValue < 0.05
                                      ? 'bg-blue-100 text-blue-800'
                                      : 'bg-slate-100 text-slate-500'
                                  }`}
                                >
                                  {c.pValue < 0.01
                                    ? 'p < 0.01 (High)'
                                    : c.pValue < 0.05
                                    ? 'p < 0.05 (Sig)'
                                    : 'Not Significant'}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 p-4 rounded-xl bg-slate-50 text-xs text-slate-500 flex items-start gap-2">
                  <Info className="w-4 h-4 shrink-0 text-slate-400 mt-0.5" />
                  <p>
                    <strong>Interpretation:</strong> A positive coefficient indicates that as the
                    predictor increases, the target variable increases proportionally. Predictors
                    with <em>p-value &lt; 0.05</em> have statistically significant relationships with{' '}
                    {modelResult.targetVariable}.
                  </p>
                </div>
              </div>
            )}

            {/* Tab 4: Residuals Table */}
            {regressionTab === 'residuals' && (
              <div className="p-6">
                <div className="overflow-x-auto max-h-96 rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 bg-slate-50 text-slate-700 uppercase font-semibold border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3">Row #</th>
                        <th className="px-4 py-3">Actual {modelResult.targetVariable}</th>
                        <th className="px-4 py-3">Predicted {modelResult.targetVariable}</th>
                        <th className="px-4 py-3">Residual (Error)</th>
                        <th className="px-4 py-3">% Error</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {modelResult.actualVsPredicted.map((item) => {
                        const pctError =
                          item.actual !== 0
                            ? (Math.abs(item.residual) / Math.abs(item.actual)) * 100
                            : 0;

                        return (
                          <tr key={item.rowNumber} className="hover:bg-slate-50/50">
                            <td className="px-4 py-2.5 font-sans text-slate-500">{item.rowNumber}</td>
                            <td className="px-4 py-2.5 font-semibold text-slate-800">
                              {item.actual.toFixed(2)}
                            </td>
                            <td className="px-4 py-2.5 font-semibold text-blue-700">
                              {item.predicted.toFixed(2)}
                            </td>
                            <td
                              className={`px-4 py-2.5 font-medium ${
                                item.residual >= 0 ? 'text-emerald-700' : 'text-rose-700'
                              }`}
                            >
                              {item.residual >= 0 ? '+' : ''}
                              {item.residual.toFixed(2)}
                            </td>
                            <td className="px-4 py-2.5 text-slate-500">{pctError.toFixed(1)}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        )}
          </>
        )}
      </main>

      {/* Google Drive Folder / File Picker Modal */}
      <GoogleDrivePickerModal
        isOpen={isDriveModalOpen}
        onClose={() => setIsDriveModalOpen(false)}
        user={user}
        accessToken={accessToken}
        onAuthChange={(token, u) => {
          setAccessToken(token);
          setUser(u);
        }}
        onSelectDataset={(newDataset) => {
          setDataset(newDataset);
          setSelectedSheet(newDataset.sheetName);
          resetModelTargets(newDataset);
        }}
      />

      {/* AI Statistical Consultant Chatbot */}
      <AnalystChatbot
        dataset={dataset}
        regressionModel={modelResult}
        clusterResult={clusterResult}
        activeMode={analysisMode}
        isOpen={isChatOpen}
        onOpenChange={setIsChatOpen}
      />
    </div>
  );
}
