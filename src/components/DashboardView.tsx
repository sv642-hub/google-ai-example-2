import React, { useState, useMemo } from 'react';
import {
  LayoutDashboard,
  TrendingUp,
  Layers,
  Database,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  FileSpreadsheet,
  Download,
  Sparkles,
  Zap,
  ArrowRight,
  Search,
  SlidersHorizontal,
  BarChart3,
  HelpCircle,
  ExternalLink,
  Table,
  Eye,
  Activity,
  HardDrive
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { ParsedDataset } from '../lib/excelParser';
import { RegressionModelResult } from '../lib/regression';
import { ClusteringResult } from '../lib/clustering';
import {
  DetailedFeatureStats,
  CorrelationMatrixData,
  DatasetHealthReport,
  computeColumnDetailedStats,
  computeCorrelationMatrix,
  evaluateDatasetHealth,
  generateDashboardExcelReport,
  getCorrelationStrength,
} from '../lib/dashboardAnalytics';
import { BivariateScatterModal } from './BivariateScatterModal';
import { TopHeroGraphic } from './TopHeroGraphic';

interface DashboardViewProps {
  dataset: ParsedDataset | null;
  regressionModel: RegressionModelResult | null;
  clusterResult: ClusteringResult | null;
  onNavigateToRegression: () => void;
  onNavigateToClustering: () => void;
  onAutoTrainRegression: () => void;
  onAutoRunClustering: () => void;
  onLoadSample: (type: 'housing' | 'sales' | 'customer') => void;
  onOpenDriveModal: () => void;
  onOpenAiAnalyst: () => void;
  onTriggerUpload?: () => void;
  selectedSheet: string;
  onSheetChange: (sheet: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  dataset,
  regressionModel,
  clusterResult,
  onNavigateToRegression,
  onNavigateToClustering,
  onAutoTrainRegression,
  onAutoRunClustering,
  onLoadSample,
  onOpenDriveModal,
  onOpenAiAnalyst,
  onTriggerUpload,
  selectedSheet,
  onSheetChange,
}) => {
  // Active sub-tab inside Dashboard
  const [activeTab, setActiveTab] = useState<
    'overview' | 'correlations' | 'distributions' | 'models' | 'quality'
  >('overview');

  // Filter feature search
  const [searchQuery, setSearchQuery] = useState('');

  // Collinearity highlight toggle
  const [highlightCollinear, setHighlightCollinear] = useState(false);

  // Correlation inspector modal state
  const [selectedPair, setSelectedPair] = useState<{ var1: string; var2: string } | null>(null);

  // Compute all analytics when dataset changes
  const { numericCols, statsList, statsMap, correlationData, healthReport } = useMemo(() => {
    if (!dataset || !dataset.rawRows || dataset.rawRows.length === 0) {
      return {
        numericCols: [],
        statsList: [],
        statsMap: new Map<string, DetailedFeatureStats>(),
        correlationData: { variables: [], matrix: [], topCorrelations: [] },
        healthReport: null,
      };
    }

    const nCols = dataset.columns.filter((c) => c.isNumeric).map((c) => c.name);
    const sList: DetailedFeatureStats[] = [];
    const sMap = new Map<string, DetailedFeatureStats>();

    nCols.forEach((colName) => {
      const stats = computeColumnDetailedStats(dataset.rawRows, colName, 10);
      if (stats) {
        if (regressionModel?.targetVariable === colName) {
          stats.isTarget = true;
        }
        if (regressionModel?.predictorVariables.includes(colName)) {
          stats.isPredictor = true;
        }
        sList.push(stats);
        sMap.set(colName, stats);
      }
    });

    const cData = computeCorrelationMatrix(dataset.rawRows, nCols);
    const hReport = evaluateDatasetHealth(dataset, sMap, cData);

    return {
      numericCols: nCols,
      statsList: sList,
      statsMap: sMap,
      correlationData: cData,
      healthReport: hReport,
    };
  }, [dataset, regressionModel]);

  // Export to Excel report
  const handleExportReport = () => {
    if (!dataset || !correlationData || !statsList.length) return;
    generateDashboardExcelReport(
      dataset,
      statsList,
      correlationData,
      regressionModel,
      clusterResult
    );
  };

  // Filtered statistics for table view
  const filteredStats = useMemo(() => {
    if (!searchQuery.trim()) return statsList;
    const q = searchQuery.toLowerCase();
    return statsList.filter((s) => s.name.toLowerCase().includes(q));
  }, [statsList, searchQuery]);

  // If no dataset loaded, display the executive welcome & quick-start dashboard
  if (!dataset) {
    return (
      <div className="space-y-8 animate-in fade-in duration-200">
        {/* Welcome Hero Banner - Bright & Radiant Design */}
        <div className="relative rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 text-white p-6 sm:p-8 lg:p-10 overflow-hidden shadow-2xl shadow-indigo-500/20 border border-white/20">
          {/* Radiant ambient light highlights */}
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-cyan-300/35 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-fuchsia-400/25 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-64 h-64 bg-amber-300/20 rounded-full blur-2xl pointer-events-none" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
            {/* Left Content Column */}
            <div className="lg:col-span-7 space-y-5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white text-xs font-semibold tracking-wide shadow-xs">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Interactive Analytics & Statistical Modeling</span>
              </div>

              <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-black tracking-tight text-white leading-[1.15] drop-shadow-xs">
                Instant Intelligence on Your Spreadsheets
              </h2>

              <p className="text-sm sm:text-base text-blue-50/95 leading-relaxed max-w-xl font-normal">
                Upload any Excel (<code className="font-mono text-cyan-200 bg-white/10 px-1 py-0.5 rounded">.xlsx</code>, <code className="font-mono text-cyan-200 bg-white/10 px-1 py-0.5 rounded">.xls</code>) or <code className="font-mono text-cyan-200 bg-white/10 px-1 py-0.5 rounded">.csv</code> spreadsheet to immediately unlock automated statistical profiling, Pearson correlation heatmaps, collinearity checks, OLS linear regression, and K-Means segmentation.
              </p>

              {/* Curated Sample Datasets */}
              <div className="pt-2 space-y-2">
                <span className="text-xs text-blue-100 font-semibold uppercase tracking-wider block">
                  Quick-load curated dataset:
                </span>
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    onClick={() => onLoadSample('housing')}
                    className="px-3.5 py-2 text-xs font-bold bg-white text-slate-900 rounded-xl hover:bg-blue-50 transition shadow-md shadow-black/10 flex items-center gap-2 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <span>🏡 Housing Prices (Regression)</span>
                  </button>
                  <button
                    onClick={() => onLoadSample('sales')}
                    className="px-3.5 py-2 text-xs font-bold bg-cyan-400 text-slate-950 rounded-xl hover:bg-cyan-300 transition shadow-md shadow-cyan-500/20 flex items-center gap-2 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <span>📈 Ad Spend & Revenue</span>
                  </button>
                  <button
                    onClick={() => onLoadSample('customer')}
                    className="px-3.5 py-2 text-xs font-bold bg-amber-300 text-slate-950 rounded-xl hover:bg-amber-200 transition shadow-md shadow-amber-500/20 flex items-center gap-2 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <span>👥 Customer Segments</span>
                  </button>
                </div>
              </div>

              {/* Upload & Drive Actions */}
              <div className="pt-1 flex flex-wrap items-center gap-3">
                <span className="text-xs text-blue-100 font-semibold uppercase tracking-wider block">
                  Or import your data:
                </span>
                <div className="flex flex-wrap items-center gap-2.5">
                  {onTriggerUpload && (
                    <button
                      onClick={onTriggerUpload}
                      className="px-3.5 py-2 text-xs font-bold bg-white/20 hover:bg-white/30 text-white rounded-xl transition border border-white/40 shadow-sm backdrop-blur-md flex items-center gap-2 cursor-pointer"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-cyan-200" />
                      <span>Upload Spreadsheet</span>
                    </button>
                  )}
                  <button
                    onClick={onOpenDriveModal}
                    className="px-3.5 py-2 text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl transition shadow-md shadow-emerald-600/30 flex items-center gap-2 cursor-pointer"
                  >
                    <HardDrive className="w-4 h-4" />
                    <span>Browse Google Drive</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Right Graphics Column */}
            <div className="lg:col-span-5 flex justify-center">
              <TopHeroGraphic />
            </div>
          </div>
        </div>

        {/* Feature Highlights Grid with Bright Visual Accents */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm hover:shadow-md transition space-y-3 relative overflow-hidden group">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-500 to-cyan-400 text-white flex items-center justify-center font-bold shadow-lg shadow-blue-500/25 group-hover:scale-105 transition-transform">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Automated Statistical Profiling</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Computes mean, median, IQR, skewness, and density distribution curves for every
              continuous feature with outlier detection using Tukey&apos;s fences.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm hover:shadow-md transition space-y-3 relative overflow-hidden group">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-400 text-white flex items-center justify-center font-bold shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Correlation Heatmap & Collinearity</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Interactive Pearson correlation matrix flagging high collinearity (|r| &ge; 0.85).
              Click any cell to inspect paired scatter plots and OLS trendlines.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm hover:shadow-md transition space-y-3 relative overflow-hidden group">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white flex items-center justify-center font-bold shadow-lg shadow-emerald-500/25 group-hover:scale-105 transition-transform">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">1-Click Regression & Simulator</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Fit multiple linear regression models with LU decomposition, evaluate R&sup2; and
              p-values, and test what-if scenarios in an interactive real-time simulator.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Color helper for correlation heatmap cells
  const getCorrBgColor = (r: number) => {
    if (isNaN(r)) return 'bg-slate-100 text-slate-400';
    if (r === 1) return 'bg-blue-600 text-white font-bold';
    if (r > 0) {
      if (r >= 0.8) return 'bg-blue-500 text-white font-semibold';
      if (r >= 0.6) return 'bg-blue-400 text-white';
      if (r >= 0.4) return 'bg-blue-200 text-blue-900';
      if (r >= 0.2) return 'bg-blue-100 text-blue-800';
      return 'bg-blue-50/60 text-slate-700';
    } else {
      const abs = Math.abs(r);
      if (abs >= 0.8) return 'bg-rose-500 text-white font-semibold';
      if (abs >= 0.6) return 'bg-rose-400 text-white';
      if (abs >= 0.4) return 'bg-rose-200 text-rose-900';
      if (abs >= 0.2) return 'bg-rose-100 text-rose-800';
      return 'bg-rose-50/60 text-slate-700';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top Context & Action Bar with Bright Radiant Accent */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 via-cyan-400 to-indigo-600" />
        <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-500 to-cyan-400 text-white flex items-center justify-center shadow-md shadow-blue-500/25 shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                  Active Dataset
                </span>
                <span className="text-slate-300">·</span>
                <h2 className="text-base font-bold text-slate-900 truncate max-w-xs md:max-w-md">
                  {dataset.fileName}
                </h2>
                {dataset.sheetNames.length > 1 && (
                  <select
                    value={selectedSheet}
                    onChange={(e) => onSheetChange(e.target.value)}
                    className="text-xs font-semibold border border-slate-300 rounded-lg px-2.5 py-1 bg-white text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    {dataset.sheetNames.map((s) => (
                      <option key={s} value={s}>
                        Sheet: {s}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap font-medium">
                <span className="text-slate-700 font-semibold">{dataset.rowCount} observations</span>
                <span>·</span>
                <span>{dataset.columns.length} features ({numericCols.length} numeric)</span>
                <span>·</span>
                <span className="text-emerald-600 font-semibold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Completeness: {healthReport?.completenessPercent.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          {/* Dashboard Quick Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Quick Auto-Train Baseline Regression */}
            {!regressionModel ? (
              <button
                onClick={() => {
                  onAutoTrainRegression();
                  confetti({ particleCount: 35, spread: 50, origin: { y: 0.8 } });
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/25 transition cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
              >
                <Zap className="w-3.5 h-3.5 text-amber-300" />
                <span>Auto-Train Regression</span>
              </button>
            ) : (
              <button
                onClick={onNavigateToRegression}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 text-blue-700 border border-blue-200 text-xs font-bold rounded-xl transition cursor-pointer shadow-xs"
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Regression Model (R² = {regressionModel.rSquared.toFixed(2)})</span>
              </button>
            )}

            {/* Export Full XLSX Report */}
            <button
              onClick={handleExportReport}
              className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl shadow-xs transition cursor-pointer"
              title="Download multi-sheet Excel dashboard report"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Export Report</span>
              <span className="sm:hidden">Export</span>
            </button>

            {/* Upload / Switch Spreadsheet */}
            {onTriggerUpload && (
              <button
                onClick={onTriggerUpload}
                className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl shadow-xs transition cursor-pointer"
                title="Upload another spreadsheet"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden sm:inline">Upload New</span>
              </button>
            )}

            {/* Browse Drive */}
            <button
              onClick={onOpenDriveModal}
              className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-emerald-700 text-xs font-semibold rounded-xl shadow-xs transition cursor-pointer"
              title="Browse Google Drive spreadsheets"
            >
              <HardDrive className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Drive</span>
            </button>

            {/* AI Briefing with Vibrant Violet Gradient */}
            <button
              onClick={onOpenAiAnalyst}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-violet-500/25 transition cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>AI Briefing</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Observations & Sample Quality */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Observations</span>
            <Database className="w-4 h-4 text-blue-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono tracking-tight text-slate-900 tabular-nums">
              {dataset.rowCount.toLocaleString()}
            </span>
            <span className="text-xs text-emerald-600 font-semibold">
              {healthReport ? `${healthReport.completenessPercent.toFixed(0)}% valid` : 'Clean'}
            </span>
          </div>
          <p className="text-[11px] text-slate-500">
            {dataset.columns.length} columns profile ({numericCols.length} continuous)
          </p>
        </div>

        {/* KPI 2: Data Health & Cleanliness Score */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Health & ML Readiness</span>
            {healthReport && healthReport.score >= 80 ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            )}
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className={`text-2xl font-black font-mono tracking-tight tabular-nums ${
                (healthReport?.score ?? 100) >= 80 ? 'text-slate-900' : 'text-amber-600'
              }`}
            >
              {healthReport?.score ?? 100}/100
            </span>
            <span
              className={`text-xs font-semibold ${
                (healthReport?.score ?? 100) >= 80 ? 'text-emerald-700' : 'text-amber-700'
              }`}
            >
              {(healthReport?.score ?? 100) >= 85 ? 'Optimal' : 'Needs Review'}
            </span>
          </div>
          <p className="text-[11px] text-slate-500">
            {healthReport?.issues.length === 0
              ? 'Zero critical anomalies detected'
              : `${healthReport?.issues.length} statistical advisories`}
          </p>
        </div>

        {/* KPI 3: Linear Regression Model Status */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Linear Regression (OLS)</span>
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          {regressionModel ? (
            <>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black font-mono tracking-tight text-blue-600 tabular-nums">
                  {(regressionModel.rSquared * 100).toFixed(1)}%
                </span>
                <span className="text-xs font-semibold text-slate-600">R² Score</span>
              </div>
              <p className="text-[11px] text-slate-500 truncate">
                Target: <span className="font-semibold text-slate-700">{regressionModel.targetVariable}</span> · RMSE {regressionModel.rmse.toFixed(2)}
              </p>
            </>
          ) : (
            <>
              <div className="flex items-baseline gap-2">
                <span className="text-base font-bold text-slate-400">Ready to Train</span>
              </div>
              <button
                onClick={onAutoTrainRegression}
                className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <span>Click to Fit Model</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </>
          )}
        </div>

        {/* KPI 4: Clustering Model Status */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Cluster Segmentation</span>
            <Layers className="w-4 h-4 text-indigo-600" />
          </div>
          {clusterResult ? (
            <>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black font-mono tracking-tight text-indigo-600 tabular-nums">
                  {clusterResult.k} Clusters
                </span>
                <span className="text-xs font-semibold text-slate-600">K-Means</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Inertia: {Math.round(clusterResult.inertia).toLocaleString()} · {clusterResult.features.length} features
              </p>
            </>
          ) : (
            <>
              <div className="flex items-baseline gap-2">
                <span className="text-base font-bold text-slate-400">Not Clustered</span>
              </div>
              <button
                onClick={onAutoRunClustering}
                className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
              >
                <span>Run K-Means (k=3)</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex items-center gap-2 overflow-x-auto pb-px">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition border-b-2 whitespace-nowrap ${
              activeTab === 'overview'
                ? 'border-blue-600 text-blue-600 bg-white shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
            }`}
          >
            Overview & Key Drivers
          </button>
          <button
            onClick={() => setActiveTab('correlations')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition border-b-2 whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'correlations'
                ? 'border-blue-600 text-blue-600 bg-white shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
            }`}
          >
            <span>Correlation Heatmap</span>
            {correlationData.topCorrelations.some((p) => p.isCollinearWarning) && (
              <span className="w-2 h-2 rounded-full bg-amber-500" title="Collinearity warning" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('distributions')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition border-b-2 whitespace-nowrap ${
              activeTab === 'distributions'
                ? 'border-blue-600 text-blue-600 bg-white shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
            }`}
          >
            Feature Distributions ({statsList.length})
          </button>
          <button
            onClick={() => setActiveTab('models')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition border-b-2 whitespace-nowrap ${
              activeTab === 'models'
                ? 'border-blue-600 text-blue-600 bg-white shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
            }`}
          >
            Model Performance Hub
          </button>
          <button
            onClick={() => setActiveTab('quality')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition border-b-2 whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'quality'
                ? 'border-blue-600 text-blue-600 bg-white shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
            }`}
          >
            <span>Data Health & Outliers</span>
            {healthReport && healthReport.issues.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-slate-100 text-[10px] text-slate-600 font-mono">
                {healthReport.issues.length}
              </span>
            )}
          </button>
        </nav>
      </div>

      {/* Sub-Tab 1: Overview & Key Drivers */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Two-Column Grid: Top Drivers + Correlation Highlights */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Regression Drivers / Influencers */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {regressionModel ? 'Key Feature Drivers (OLS Betas)' : 'Regression Driver Potential'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {regressionModel
                      ? `Impact on ${regressionModel.targetVariable} (sorted by standardized magnitude)`
                      : 'Train a regression model to measure feature impact'}
                  </p>
                </div>
                {regressionModel ? (
                  <button
                    onClick={onNavigateToRegression}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <span>View Equation</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                ) : (
                  <button
                    onClick={onAutoTrainRegression}
                    className="px-2.5 py-1 text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition"
                  >
                    Train Model
                  </button>
                )}
              </div>

              {regressionModel ? (
                <div className="space-y-3 pt-1">
                  {regressionModel.coefficients
                    .filter((c) => c.feature !== 'Intercept')
                    .map((coef) => {
                      const isPositive = coef.beta >= 0;
                      const isSig = coef.pValue !== undefined && coef.pValue < 0.05;

                      return (
                        <div key={coef.feature} className="space-y-1 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-800 flex items-center gap-2">
                              <span>{coef.feature}</span>
                              {isSig && (
                                <span className="text-[10px] text-emerald-600 font-mono" title="p < 0.05 statistically significant">
                                  sig*
                                </span>
                              )}
                            </span>
                            <span className="font-mono tabular-nums text-slate-700">
                              β = {coef.beta >= 0 ? '+' : ''}
                              {coef.beta.toFixed(3)}
                              {coef.pValue !== undefined && (
                                <span className="text-slate-400 text-[10px] ml-1.5">
                                  (p: {coef.pValue < 0.001 ? '<0.001' : coef.pValue.toFixed(3)})
                                </span>
                              )}
                            </span>
                          </div>

                          {/* Effect visual bar */}
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden flex">
                            <div
                              className={`h-full rounded-full ${
                                isPositive ? 'bg-blue-500' : 'bg-rose-500'
                              }`}
                              style={{
                                width: `${Math.min(100, Math.max(10, Math.abs(coef.beta) * 30))}%`,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span>
                      Model explains <strong>{(regressionModel.rSquared * 100).toFixed(1)}%</strong> of variance
                    </span>
                    <button
                      onClick={onNavigateToRegression}
                      className="text-blue-600 font-semibold hover:underline"
                    >
                      Run Simulator & Predictions &rarr;
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center space-y-3">
                  <TrendingUp className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    No regression model trained yet. Fit an OLS model to rank which predictors have
                    the largest statistical influence on your chosen target.
                  </p>
                  <button
                    onClick={onAutoTrainRegression}
                    className="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl hover:bg-blue-700 transition shadow-2xs"
                  >
                    Auto-Fit Baseline Model
                  </button>
                </div>
              )}
            </div>

            {/* Top Pairwise Correlations */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Strongest Correlations</h3>
                  <p className="text-xs text-slate-500">Highest Pearson coefficients across features</p>
                </div>
                <button
                  onClick={() => setActiveTab('correlations')}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  <span>Full Heatmap</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>

              <div className="space-y-2.5 pt-1">
                {correlationData.topCorrelations.slice(0, 5).map((pair, idx) => {
                  const isPos = pair.r >= 0;
                  return (
                    <div
                      key={idx}
                      onClick={() => setSelectedPair({ var1: pair.var1, var2: pair.var2 })}
                      className="p-2.5 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/40 transition cursor-pointer flex items-center justify-between group"
                    >
                      <div className="space-y-0.5">
                        <div className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                          <span>{pair.var1}</span>
                          <span className="text-slate-400 font-normal">&harr;</span>
                          <span>{pair.var2}</span>
                        </div>
                        <div className="text-[11px] text-slate-500">{pair.strengthLabel}</div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`font-mono text-xs font-bold px-2 py-0.5 rounded-md ${
                            pair.isCollinearWarning
                              ? 'bg-amber-100 text-amber-900 border border-amber-200'
                              : isPos
                              ? 'bg-blue-50 text-blue-700'
                              : 'bg-rose-50 text-rose-700'
                          }`}
                        >
                          {pair.r >= 0 ? '+' : ''}
                          {pair.r.toFixed(3)}
                        </span>
                        <Eye className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 transition" />
                      </div>
                    </div>
                  );
                })}

                {correlationData.topCorrelations.length === 0 && (
                  <p className="text-xs text-slate-400 py-4 text-center">
                    Requires at least two numeric columns to compute correlations.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Quick Insights Banner */}
          <div className="p-4 bg-slate-900 text-white rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-blue-400">
                <Sparkles className="w-4 h-4" />
                <span>AI Statistical Consultant Ready</span>
              </div>
              <p className="text-xs text-slate-300">
                Ask Gemini to interpret your p-values, test for multicollinearity, explain customer personas, or propose transformations.
              </p>
            </div>
            <button
              onClick={onOpenAiAnalyst}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition shadow-xs whitespace-nowrap self-start sm:self-auto"
            >
              Open AI Analyst
            </button>
          </div>
        </div>
      )}

      {/* Sub-Tab 2: Interactive Correlation Matrix & Heatmap */}
      {activeTab === 'correlations' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Pearson Correlation Heatmap Matrix</h3>
                <p className="text-xs text-slate-500">
                  Measures linear association between -1.00 (strong inverse) and +1.00 (strong direct). Click any cell to inspect scatter.
                </p>
              </div>

              {/* Collinearity Warning Filter */}
              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={highlightCollinear}
                  onChange={(e) => setHighlightCollinear(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="font-semibold">Highlight Collinearity (|r| &ge; 0.85)</span>
              </label>
            </div>

            {/* Matrix Table */}
            {correlationData.variables.length > 0 ? (
              <div className="overflow-x-auto max-w-full">
                <table className="w-full text-center border-collapse text-xs">
                  <thead>
                    <tr>
                      <th className="p-2 text-left font-semibold text-slate-400 sticky left-0 bg-white z-10">
                        Feature
                      </th>
                      {correlationData.variables.map((col) => (
                        <th
                          key={col}
                          className="p-2 font-bold text-slate-700 max-w-[100px] truncate"
                          title={col}
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {correlationData.variables.map((rowVar, i) => (
                      <tr key={rowVar} className="border-t border-slate-100">
                        <td
                          className="p-2 text-left font-bold text-slate-800 sticky left-0 bg-white z-10 max-w-[120px] truncate"
                          title={rowVar}
                        >
                          {rowVar}
                        </td>
                        {correlationData.variables.map((colVar, j) => {
                          const r = correlationData.matrix[i][j];
                          const isWarning = Math.abs(r) >= 0.85 && i !== j;
                          const showHighlight = highlightCollinear && isWarning;

                          return (
                            <td
                              key={colVar}
                              onClick={() => {
                                if (i !== j) {
                                  setSelectedPair({ var1: rowVar, var2: colVar });
                                }
                              }}
                              className={`p-2 font-mono tabular-nums transition cursor-pointer select-none border border-slate-100/60 ${getCorrBgColor(
                                r
                              )} ${
                                showHighlight
                                  ? 'ring-2 ring-amber-500 ring-offset-1 font-extrabold'
                                  : ''
                              } ${i === j ? 'cursor-default' : 'hover:opacity-85'}`}
                              title={`${rowVar} vs ${colVar}: r = ${r.toFixed(3)} (${getCorrelationStrength(r)})`}
                            >
                              {r.toFixed(2)}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-xs text-slate-500">
                No numeric columns available to compute correlation matrix.
              </div>
            )}

            {/* Matrix Legend */}
            <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold">Legend:</span>
                <span className="px-2 py-0.5 rounded bg-rose-500 text-white font-mono">-1.0 Negative</span>
                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono">0.0 Neutral</span>
                <span className="px-2 py-0.5 rounded bg-blue-600 text-white font-mono">+1.0 Positive</span>
              </div>
              <span className="text-[11px] text-slate-400">
                Tip: Click any cell to open paired scatter plot & linear trendline
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Tab 3: Feature Distributions & Descriptive Statistics */}
      {activeTab === 'distributions' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Feature Profiles & Distribution Curves</h3>
                <p className="text-xs text-slate-500">
                  Descriptive summary with density histograms and Tukey outlier checks
                </p>
              </div>

              {/* Search */}
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter feature names..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Dense Statistical Profiles Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/80 text-slate-700 uppercase font-semibold border-b border-slate-200 text-[11px]">
                    <th className="px-4 py-3">Feature Name</th>
                    <th className="px-3 py-3">Density Distribution</th>
                    <th className="px-3 py-3 text-right">Mean</th>
                    <th className="px-3 py-3 text-right">Median</th>
                    <th className="px-3 py-3 text-right">Std Dev</th>
                    <th className="px-3 py-3 text-right">Min</th>
                    <th className="px-3 py-3 text-right">Max</th>
                    <th className="px-3 py-3 text-right">Skewness</th>
                    <th className="px-3 py-3 text-right">Outliers</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStats.map((stats) => {
                    const isHighlySkewed = Math.abs(stats.skewness) > 2.0;

                    return (
                      <tr key={stats.name} className="hover:bg-slate-50/60 transition">
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          <div className="flex items-center gap-1.5">
                            <span>{stats.name}</span>
                            {stats.isTarget && (
                              <span className="text-[10px] text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded font-bold uppercase">
                                Target (Y)
                              </span>
                            )}
                            {stats.isPredictor && (
                              <span className="text-[10px] text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded font-medium">
                                Predictor
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Inline Micro-Histogram Sparkline */}
                        <td className="px-3 py-3 min-w-[120px]">
                          <div className="flex items-end gap-0.5 h-6 w-28 bg-slate-50 p-0.5 rounded border border-slate-200/50">
                            {stats.histogramBins.map((bin, bIdx) => (
                              <div
                                key={bIdx}
                                className="flex-1 bg-blue-500 rounded-2xs hover:bg-blue-600 transition"
                                style={{
                                  height: `${Math.max(10, Math.min(100, bin.percentage * 2.5))}%`,
                                }}
                                title={`Bin: ${bin.binStart.toFixed(1)} - ${bin.binEnd.toFixed(1)} (${bin.count} items, ${bin.percentage.toFixed(0)}%)`}
                              />
                            ))}
                          </div>
                        </td>

                        <td className="px-3 py-3 text-right font-mono tabular-nums text-slate-800">
                          {stats.mean.toFixed(2)}
                        </td>
                        <td className="px-3 py-3 text-right font-mono tabular-nums text-slate-800">
                          {stats.median.toFixed(2)}
                        </td>
                        <td className="px-3 py-3 text-right font-mono tabular-nums text-slate-600">
                          {stats.stdDev.toFixed(2)}
                        </td>
                        <td className="px-3 py-3 text-right font-mono tabular-nums text-slate-500">
                          {stats.min.toFixed(2)}
                        </td>
                        <td className="px-3 py-3 text-right font-mono tabular-nums text-slate-500">
                          {stats.max.toFixed(2)}
                        </td>
                        <td
                          className={`px-3 py-3 text-right font-mono tabular-nums font-semibold ${
                            isHighlySkewed ? 'text-amber-600' : 'text-slate-600'
                          }`}
                          title={isHighlySkewed ? 'High skewness (|skew| > 2)' : 'Normal distribution range'}
                        >
                          {stats.skewness.toFixed(2)}
                        </td>
                        <td className="px-3 py-3 text-right font-mono tabular-nums">
                          {stats.outlierCount > 0 ? (
                            <span className="text-amber-700 font-semibold bg-amber-50 px-1.5 py-0.5 rounded">
                              {stats.outlierCount}
                            </span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Tab 4: Model Performance Hub */}
      {activeTab === 'models' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Linear Regression Scorecard */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  <h3 className="text-sm font-bold text-slate-900">Linear Regression Model</h3>
                </div>
                {regressionModel ? (
                  <button
                    onClick={onNavigateToRegression}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                  >
                    Open Deep Dive &rarr;
                  </button>
                ) : (
                  <button
                    onClick={onAutoTrainRegression}
                    className="px-3 py-1 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    Fit Model
                  </button>
                )}
              </div>

              {regressionModel ? (
                <div className="space-y-4">
                  {/* Metric Chips */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100/60">
                      <span className="text-slate-500 text-[11px] block">R-Squared</span>
                      <span className="text-lg font-bold font-mono text-blue-700 tabular-nums">
                        {regressionModel.rSquared.toFixed(3)}
                      </span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                      <span className="text-slate-500 text-[11px] block">Adjusted R²</span>
                      <span className="text-lg font-bold font-mono text-slate-800 tabular-nums">
                        {regressionModel.adjustedRSquared.toFixed(3)}
                      </span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                      <span className="text-slate-500 text-[11px] block">RMSE Error</span>
                      <span className="text-lg font-bold font-mono text-slate-800 tabular-nums">
                        {regressionModel.rmse.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Model Equation Box */}
                  <div className="p-3.5 bg-slate-900 text-white rounded-xl text-xs space-y-1 font-mono">
                    <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                      Fitted Equation:
                    </span>
                    <p className="text-blue-300 break-all">{regressionModel.equationString}</p>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>
                      Target: <strong>{regressionModel.targetVariable}</strong> · {regressionModel.predictorVariables.length} Predictors
                    </span>
                    <button
                      onClick={onNavigateToRegression}
                      className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold rounded-lg transition"
                    >
                      Run Interactive Simulator
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-10 space-y-3">
                  <p className="text-xs text-slate-500">
                    Fit an Ordinary Least Squares (OLS) model to evaluate how well independent
                    variables explain your target variable.
                  </p>
                  <button
                    onClick={onAutoTrainRegression}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition shadow-2xs"
                  >
                    Auto-Fit Regression Model
                  </button>
                </div>
              )}
            </div>

            {/* Clustering Scorecard */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-sm font-bold text-slate-900">Cluster Analysis (K-Means)</h3>
                </div>
                {clusterResult ? (
                  <button
                    onClick={onNavigateToClustering}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                  >
                    Open Cluster Space &rarr;
                  </button>
                ) : (
                  <button
                    onClick={onAutoRunClustering}
                    className="px-3 py-1 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                  >
                    Run Clustering
                  </button>
                )}
              </div>

              {clusterResult ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100/60">
                      <span className="text-slate-500 text-[11px] block">Clusters (K)</span>
                      <span className="text-lg font-bold font-mono text-indigo-700 tabular-nums">
                        {clusterResult.k}
                      </span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                      <span className="text-slate-500 text-[11px] block">Inertia (WCSS)</span>
                      <span className="text-lg font-bold font-mono text-slate-800 tabular-nums">
                        {Math.round(clusterResult.inertia).toLocaleString()}
                      </span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                      <span className="text-slate-500 text-[11px] block">PCA Variance</span>
                      <span className="text-lg font-bold font-mono text-slate-800 tabular-nums">
                        {(clusterResult.pcaVarianceExplained[0] + clusterResult.pcaVarianceExplained[1]).toFixed(0)}%
                      </span>
                    </div>
                  </div>

                  {/* Cluster Breakdown List */}
                  <div className="space-y-2">
                    {clusterResult.clusters.map((c) => (
                      <div
                        key={c.clusterIndex}
                        className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: c.color }}
                          />
                          <span className="font-semibold text-slate-800">{c.name}</span>
                        </div>
                        <span className="font-mono text-slate-600">
                          {c.size} rows ({c.percentage.toFixed(1)}%)
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      onClick={onNavigateToClustering}
                      className="px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-semibold rounded-lg text-xs transition"
                    >
                      View 2D PCA Cluster Map
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-10 space-y-3">
                  <p className="text-xs text-slate-500">
                    Group multi-dimensional data into distinct behavioral segments using K-Means
                    with 2D Principal Component Analysis (PCA).
                  </p>
                  <button
                    onClick={onAutoRunClustering}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition shadow-2xs"
                  >
                    Run K-Means (k=3)
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sub-Tab 5: Data Health & Anomaly Radar */}
      {activeTab === 'quality' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-6 space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Data Cleanliness & Anomaly Radar</h3>
                <p className="text-xs text-slate-500">
                  Statistical warnings, collinearity alerts, and distribution anomalies
                </p>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-mono">
                Score: {healthReport?.score ?? 100}/100
              </span>
            </div>

            {healthReport && healthReport.issues.length > 0 ? (
              <div className="space-y-3">
                {healthReport.issues.map((issue) => (
                  <div
                    key={issue.id}
                    className={`p-4 rounded-xl border flex items-start gap-3.5 text-xs ${
                      issue.severity === 'high'
                        ? 'bg-rose-50/60 border-rose-200 text-rose-900'
                        : issue.severity === 'medium'
                        ? 'bg-amber-50/60 border-amber-200 text-amber-900'
                        : 'bg-blue-50/60 border-blue-200 text-blue-900'
                    }`}
                  >
                    {issue.severity === 'high' ? (
                      <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    ) : issue.severity === 'medium' ? (
                      <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    ) : (
                      <HelpCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-1 flex-1">
                      <h4 className="font-bold text-slate-900">{issue.title}</h4>
                      <p className="text-slate-600 leading-relaxed">{issue.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                <h4 className="text-sm font-bold text-slate-900">Clean Dataset</h4>
                <p className="text-xs text-slate-500">
                  No missing values, zero-variance columns, or extreme collinearity found.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bivariate Scatter Plot Modal for Correlation Inspector */}
      {selectedPair && (
        <BivariateScatterModal
          isOpen={!!selectedPair}
          onClose={() => setSelectedPair(null)}
          var1={selectedPair.var1}
          var2={selectedPair.var2}
          rows={dataset.rawRows}
        />
      )}
    </div>
  );
};
