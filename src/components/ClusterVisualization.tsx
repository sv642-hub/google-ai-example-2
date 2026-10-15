import React, { useState } from 'react';
import {
  ClusteringResult,
  ClusterSummary,
  CLUSTER_COLORS
} from '../lib/clustering';
import {
  TrendingUp,
  Table,
  Sliders,
  Layers,
  Sparkles,
  Download,
  Info,
  Maximize2
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface ClusterVisualizationProps {
  result: ClusteringResult;
  fileName: string;
  onKChange: (newK: number) => void;
}

export const ClusterVisualization: React.FC<ClusterVisualizationProps> = ({
  result,
  fileName,
  onKChange,
}) => {
  // Mode for scatter: 'pca' or 'feature_pair'
  const [viewMode, setViewMode] = useState<'pca' | 'features'>(
    result.features.length >= 2 ? 'features' : 'pca'
  );
  const [xAxisFeature, setXAxisFeature] = useState<string>(result.features[0] || '');
  const [yAxisFeature, setYAxisFeature] = useState<string>(
    result.features[1] || result.features[0] || ''
  );
  const [selectedClusterFilter, setSelectedClusterFilter] = useState<number | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'scatter' | 'centroids' | 'elbow' | 'table'>('scatter');

  // Export dataset with Cluster column
  const handleExportClusteredData = () => {
    const exportRows = result.points.map((p) => ({
      Row: p.rowNumber,
      Assigned_Cluster: `Cluster ${p.cluster + 1}`,
      Distance_To_Centroid: Number(p.distanceToCentroid.toFixed(3)),
      ...p.originalFeatures,
    }));
    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Clustered_k${result.k}`);
    XLSX.writeFile(wb, `${fileName.replace(/\.[^/.]+$/, '')}_clusters_k${result.k}.xlsx`);
  };

  // Determine scatter coordinates based on viewMode
  const scatterPoints = result.points.map((pt) => {
    if (viewMode === 'pca') {
      return {
        x: pt.pcaX,
        y: pt.pcaY,
        cluster: pt.cluster,
        raw: pt.originalFeatures,
        rowNumber: pt.rowNumber,
      };
    } else {
      return {
        x: pt.originalFeatures[xAxisFeature] ?? 0,
        y: pt.originalFeatures[yAxisFeature] ?? 0,
        cluster: pt.cluster,
        raw: pt.originalFeatures,
        rowNumber: pt.rowNumber,
      };
    }
  });

  // Centroids for plot
  const scatterCentroids = result.clusters.map((c) => {
    if (viewMode === 'pca') {
      // Average PCA coordinates of points in this cluster
      const ptsInC = result.points.filter((p) => p.cluster === c.clusterIndex);
      const avgX = ptsInC.length ? ptsInC.reduce((a, b) => a + b.pcaX, 0) / ptsInC.length : 0;
      const avgY = ptsInC.length ? ptsInC.reduce((a, b) => a + b.pcaY, 0) / ptsInC.length : 0;
      return { x: avgX, y: avgY, cluster: c.clusterIndex, name: c.name };
    } else {
      return {
        x: c.centroidOriginal[xAxisFeature] ?? 0,
        y: c.centroidOriginal[yAxisFeature] ?? 0,
        cluster: c.clusterIndex,
        name: c.name,
      };
    }
  });

  // Calculate bounding box for SVG
  const allX = [...scatterPoints.map((p) => p.x), ...scatterCentroids.map((c) => c.x)];
  const allY = [...scatterPoints.map((p) => p.y), ...scatterCentroids.map((c) => c.y)];

  let minX = allX.length ? Math.min(...allX) : 0;
  let maxX = allX.length ? Math.max(...allX) : 10;
  let minY = allY.length ? Math.min(...allY) : 0;
  let maxY = allY.length ? Math.max(...allY) : 10;

  if (minX === maxX) {
    minX -= 1;
    maxX += 1;
  }
  if (minY === maxY) {
    minY -= 1;
    maxY += 1;
  }

  const padX = (maxX - minX) * 0.08 || 1;
  const padY = (maxY - minY) * 0.08 || 1;
  minX -= padX;
  maxX += padX;
  minY -= padY;
  maxY += padY;

  const width = 680;
  const height = 400;
  const margin = { top: 30, right: 30, bottom: 55, left: 65 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;

  const scaleX = (x: number) => margin.left + ((x - minX) / (maxX - minX)) * plotWidth;
  const scaleY = (y: number) => margin.top + plotHeight - ((y - minY) / (maxY - minY)) * plotHeight;

  const numTicks = 5;
  const xTicks = Array.from({ length: numTicks }, (_, i) => minX + (i * (maxX - minX)) / (numTicks - 1));
  const yTicks = Array.from({ length: numTicks }, (_, i) => minY + (i * (maxY - minY)) / (numTicks - 1));

  const formatTick = (val: number) => {
    if (Math.abs(val) >= 10000 || (Math.abs(val) < 0.01 && val !== 0)) {
      return val.toExponential(1);
    }
    return Number(val.toFixed(2)).toString();
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
      {/* Header & Cluster KPI Badges */}
      <div className="p-6 border-b border-slate-100 bg-gradient-to-b from-slate-50/50 to-white">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 font-bold flex items-center justify-center text-sm border border-emerald-100">
                3
              </span>
              <h2 className="text-base font-bold text-slate-900">
                K-Means Cluster Model ({result.k} Clusters)
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Partitioned {result.points.length} samples across {result.features.length} standardized numeric feature(s)
            </p>
          </div>

          {/* Stepper to change k on the fly */}
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <span className="text-xs font-bold text-slate-600 px-2">k =</span>
              {[2, 3, 4, 5, 6, 7].map((num) => (
                <button
                  key={num}
                  onClick={() => onKChange(num)}
                  className={`w-7 h-7 rounded-lg text-xs font-bold transition ${
                    result.k === num
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>

            <button
              onClick={handleExportClusteredData}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold shadow-2xs transition"
            >
              <Download className="w-3.5 h-3.5" />
              Export Clustered Data
            </button>
          </div>
        </div>

        {/* Cluster Distribution Mini-Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6">
          {result.clusters.map((cluster) => {
            const isFiltered = selectedClusterFilter === cluster.clusterIndex;
            return (
              <div
                key={cluster.clusterIndex}
                onClick={() =>
                  setSelectedClusterFilter(
                    isFiltered ? null : cluster.clusterIndex
                  )
                }
                style={{ borderLeftColor: cluster.color }}
                className={`p-3 rounded-xl border border-slate-200 border-l-4 cursor-pointer transition ${
                  isFiltered ? 'bg-blue-50/80 shadow-xs ring-2 ring-blue-500/20' : 'bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                  <span className="truncate">{cluster.name}</span>
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: cluster.color }}
                  />
                </div>
                <div className="text-lg font-black text-slate-900 mt-1">
                  {cluster.size}{' '}
                  <span className="text-xs font-normal text-slate-500">
                    ({cluster.percentage.toFixed(0)}%)
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 px-6 gap-6 bg-white overflow-x-auto">
        <button
          onClick={() => setActiveTab('scatter')}
          className={`py-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'scatter'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          Interactive Cluster Scatter Plot
        </button>

        <button
          onClick={() => setActiveTab('centroids')}
          className={`py-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'centroids'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          Cluster Profiles & Centroids
        </button>

        <button
          onClick={() => setActiveTab('elbow')}
          className={`py-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'elbow'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          Elbow Optimization Curve
        </button>

        <button
          onClick={() => setActiveTab('table')}
          className={`py-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'table'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Table className="w-3.5 h-3.5" />
          Clustered Data Table ({result.points.length})
        </button>
      </div>

      {/* Tab 1: Interactive Scatter Plot */}
      {activeTab === 'scatter' && (
        <div className="p-6 space-y-4">
          {/* Controls Bar for Plot */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700">Projection Mode:</span>
              <div className="flex bg-white rounded-lg border border-slate-300 p-0.5">
                <button
                  onClick={() => setViewMode('features')}
                  className={`px-3 py-1 rounded-md font-medium transition ${
                    viewMode === 'features'
                      ? 'bg-blue-600 text-white shadow-2xs font-semibold'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Feature Axes (2D)
                </button>
                <button
                  onClick={() => setViewMode('pca')}
                  className={`px-3 py-1 rounded-md font-medium transition ${
                    viewMode === 'pca'
                      ? 'bg-blue-600 text-white shadow-2xs font-semibold'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  PCA 2D Projection
                </button>
              </div>
            </div>

            {viewMode === 'features' ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium text-slate-600">X Axis:</span>
                  <select
                    value={xAxisFeature}
                    onChange={(e) => setXAxisFeature(e.target.value)}
                    className="bg-white border border-slate-300 rounded px-2 py-1 font-semibold text-slate-700"
                  >
                    {result.features.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-medium text-slate-600">Y Axis:</span>
                  <select
                    value={yAxisFeature}
                    onChange={(e) => setYAxisFeature(e.target.value)}
                    className="bg-white border border-slate-300 rounded px-2 py-1 font-semibold text-slate-700"
                  >
                    {result.features.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <div className="text-slate-500 font-mono text-[11px]">
                PC1 ({result.pcaVarianceExplained[0]}%) vs PC2 ({result.pcaVarianceExplained[1]}%)
              </div>
            )}

            {selectedClusterFilter !== null && (
              <button
                onClick={() => setSelectedClusterFilter(null)}
                className="text-blue-600 hover:underline font-semibold"
              >
                Clear Filter (Showing Cluster {selectedClusterFilter + 1} only)
              </button>
            )}
          </div>

          {/* SVG Visualizer */}
          <div className="w-full overflow-x-auto flex justify-center py-2">
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="w-full max-w-3xl h-auto select-none bg-white rounded-xl border border-slate-100 shadow-xs"
            >
              {/* Background Grid */}
              {yTicks.map((y, idx) => (
                <g key={`y-grid-${idx}`}>
                  <line
                    x1={margin.left}
                    y1={scaleY(y)}
                    x2={width - margin.right}
                    y2={scaleY(y)}
                    stroke="#f1f5f9"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                  />
                  <text
                    x={margin.left - 8}
                    y={scaleY(y) + 4}
                    textAnchor="end"
                    className="text-[10px] fill-slate-400 font-mono"
                  >
                    {formatTick(y)}
                  </text>
                </g>
              ))}

              {xTicks.map((x, idx) => (
                <g key={`x-grid-${idx}`}>
                  <line
                    x1={scaleX(x)}
                    y1={margin.top}
                    x2={scaleX(x)}
                    y2={margin.top + plotHeight}
                    stroke="#f1f5f9"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                  />
                  <text
                    x={scaleX(x)}
                    y={margin.top + plotHeight + 16}
                    textAnchor="middle"
                    className="text-[10px] fill-slate-400 font-mono"
                  >
                    {formatTick(x)}
                  </text>
                </g>
              ))}

              {/* Axes */}
              <line
                x1={margin.left}
                y1={margin.top + plotHeight}
                x2={width - margin.right}
                y2={margin.top + plotHeight}
                stroke="#cbd5e1"
                strokeWidth="1.5"
              />
              <line
                x1={margin.left}
                y1={margin.top}
                x2={margin.left}
                y2={margin.top + plotHeight}
                stroke="#cbd5e1"
                strokeWidth="1.5"
              />

              {/* Cluster Points */}
              {scatterPoints.map((pt, i) => {
                if (selectedClusterFilter !== null && pt.cluster !== selectedClusterFilter) {
                  return null;
                }
                const color = CLUSTER_COLORS[pt.cluster % CLUSTER_COLORS.length];
                const cx = scaleX(pt.x);
                const cy = scaleY(pt.y);

                return (
                  <circle
                    key={i}
                    cx={cx}
                    cy={cy}
                    r={5}
                    fill={color}
                    fillOpacity={0.8}
                    stroke="#ffffff"
                    strokeWidth={1.5}
                    onMouseEnter={() => setHoveredPoint(pt)}
                    onMouseLeave={() => setHoveredPoint(null)}
                    className="hover:scale-125 transition-transform cursor-pointer"
                  >
                    <title>{`Row #${pt.rowNumber} | Cluster ${pt.cluster + 1}`}</title>
                  </circle>
                );
              })}

              {/* Cluster Centroids (marked with distinctive stars/diamonds) */}
              {scatterCentroids.map((cent) => {
                if (selectedClusterFilter !== null && cent.cluster !== selectedClusterFilter) {
                  return null;
                }
                const color = CLUSTER_COLORS[cent.cluster % CLUSTER_COLORS.length];
                const cx = scaleX(cent.x);
                const cy = scaleY(cent.y);

                return (
                  <g key={`cent-${cent.cluster}`} className="pointer-events-none">
                    {/* Outer halo */}
                    <circle cx={cx} cy={cy} r={11} fill={color} fillOpacity={0.25} />
                    {/* Diamond Marker */}
                    <polygon
                      points={`${cx},${cy - 8} ${cx + 8},${cy} ${cx},${cy + 8} ${cx - 8},${cy}`}
                      fill={color}
                      stroke="#ffffff"
                      strokeWidth={2}
                    />
                    {/* Centroid Label */}
                    <text
                      x={cx + 10}
                      y={cy - 8}
                      className="text-[10px] font-bold fill-slate-800 drop-shadow-xs"
                    >
                      C{cent.cluster + 1}
                    </text>
                  </g>
                );
              })}

              {/* Axis Titles */}
              <text
                x={margin.left + plotWidth / 2}
                y={height - 12}
                textAnchor="middle"
                className="text-xs font-bold fill-slate-700"
              >
                {viewMode === 'features' ? xAxisFeature : 'Principal Component 1 (PC1)'}
              </text>

              <text
                x={-(margin.top + plotHeight / 2)}
                y={20}
                transform="rotate(-90)"
                textAnchor="middle"
                className="text-xs font-bold fill-slate-700"
              >
                {viewMode === 'features' ? yAxisFeature : 'Principal Component 2 (PC2)'}
              </text>
            </svg>
          </div>

          {/* Hover Inspector tooltip banner */}
          {hoveredPoint && (
            <div className="p-3 bg-slate-900 text-white rounded-xl text-xs flex items-center justify-between gap-4 font-mono animate-in fade-in">
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{
                    backgroundColor: CLUSTER_COLORS[hoveredPoint.cluster % CLUSTER_COLORS.length],
                  }}
                />
                <span className="font-bold">Row #{hoveredPoint.rowNumber}</span>
                <span className="text-slate-400">assigned to</span>
                <span className="text-blue-300 font-bold">Cluster {hoveredPoint.cluster + 1}</span>
              </div>
              <div className="flex items-center gap-3 overflow-x-auto text-[11px] text-slate-300">
                {Object.entries(hoveredPoint.raw)
                  .slice(0, 4)
                  .map(([k, v]: any) => (
                    <span key={k}>
                      {k}: <strong className="text-white">{Number(v).toFixed(2)}</strong>
                    </span>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Centroid Profiles */}
      {activeTab === 'centroids' && (
        <div className="p-6">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-800">
              Cluster Centers (Average Values per Feature)
            </h3>
            <p className="text-xs text-slate-500">
              Each row displays the average characteristic of data points belonging to that cluster.
            </p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Cluster</th>
                  <th className="px-4 py-3">Size & Share</th>
                  {result.features.map((f) => (
                    <th key={f} className="px-4 py-3">
                      Avg. {f}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {result.clusters.map((c) => (
                  <tr key={c.clusterIndex} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-sans font-bold flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: c.color }}
                      />
                      <span className="text-slate-900">{c.name}</span>
                    </td>
                    <td className="px-4 py-3 font-sans text-slate-600">
                      {c.size} rows ({c.percentage.toFixed(1)}%)
                    </td>
                    {result.features.map((f) => {
                      const val = c.centroidOriginal[f];
                      return (
                        <td key={f} className="px-4 py-3 font-bold text-blue-700">
                          {val !== undefined
                            ? Math.abs(val) >= 1000
                              ? Number(val.toFixed(1)).toLocaleString()
                              : val.toFixed(3)
                            : '—'}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Elbow Optimization Method */}
      {activeTab === 'elbow' && (
        <div className="p-6 space-y-6">
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              Elbow Curve: Inertia vs. Number of Clusters (k)
            </h3>
            <p className="text-xs text-slate-500">
              Inertia measures how tightly grouped the points are. Look for the "elbow" point where adding more clusters yields diminishing returns.
            </p>
          </div>

          {/* Elbow SVG Chart */}
          <div className="w-full overflow-x-auto flex justify-center py-2">
            <svg
              viewBox="0 0 540 260"
              className="w-full max-w-xl h-auto select-none bg-white rounded-xl border border-slate-100 p-2"
            >
              {(() => {
                const eWidth = 540;
                const eHeight = 260;
                const eMargin = { top: 25, right: 30, bottom: 45, left: 60 };
                const ePlotW = eWidth - eMargin.left - eMargin.right;
                const ePlotH = eHeight - eMargin.top - eMargin.bottom;

                const minK = result.elbowData[0]?.k || 2;
                const maxK = result.elbowData[result.elbowData.length - 1]?.k || 8;
                const inertias = result.elbowData.map((d) => d.inertia);
                const minI = Math.min(...inertias) * 0.9;
                const maxI = Math.max(...inertias) * 1.1;

                const scaleEK = (kVal: number) =>
                  eMargin.left + ((kVal - minK) / (maxK - minK || 1)) * ePlotW;
                const scaleEI = (iVal: number) =>
                  eMargin.top + ePlotH - ((iVal - minI) / (maxI - minI || 1)) * ePlotH;

                const polyPoints = result.elbowData
                  .map((d) => `${scaleEK(d.k)},${scaleEI(d.inertia)}`)
                  .join(' ');

                return (
                  <>
                    {/* Axes */}
                    <line
                      x1={eMargin.left}
                      y1={eMargin.top + ePlotH}
                      x2={eWidth - eMargin.right}
                      y2={eMargin.top + ePlotH}
                      stroke="#cbd5e1"
                      strokeWidth="1.5"
                    />
                    <line
                      x1={eMargin.left}
                      y1={eMargin.top}
                      x2={eMargin.left}
                      y2={eMargin.top + ePlotH}
                      stroke="#cbd5e1"
                      strokeWidth="1.5"
                    />

                    {/* Polyline */}
                    <polyline
                      points={polyPoints}
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    {/* Data Points */}
                    {result.elbowData.map((d) => {
                      const isCurrent = d.k === result.k;
                      const cx = scaleEK(d.k);
                      const cy = scaleEI(d.inertia);

                      return (
                        <g key={d.k} onClick={() => onKChange(d.k)} className="cursor-pointer">
                          <circle
                            cx={cx}
                            cy={cy}
                            r={isCurrent ? 7 : 4}
                            fill={isCurrent ? '#2563eb' : '#ffffff'}
                            stroke="#2563eb"
                            strokeWidth={2.5}
                          />
                          {isCurrent && (
                            <text
                              x={cx}
                              y={cy - 12}
                              textAnchor="middle"
                              className="text-[10px] font-bold fill-blue-700"
                            >
                              Current (k={d.k})
                            </text>
                          )}
                          <text
                            x={cx}
                            y={eMargin.top + ePlotH + 18}
                            textAnchor="middle"
                            className="text-[11px] font-mono fill-slate-600"
                          >
                            k={d.k}
                          </text>
                        </g>
                      );
                    })}

                    <text
                      x={eMargin.left + ePlotW / 2}
                      y={eHeight - 8}
                      textAnchor="middle"
                      className="text-xs font-semibold fill-slate-700"
                    >
                      Number of Clusters (k)
                    </text>

                    <text
                      x={-(eMargin.top + ePlotH / 2)}
                      y={18}
                      transform="rotate(-90)"
                      textAnchor="middle"
                      className="text-xs font-semibold fill-slate-700"
                    >
                      Inertia (WSS)
                    </text>
                  </>
                );
              })()}
            </svg>
          </div>
        </div>
      )}

      {/* Tab 4: Clustered Data Table */}
      {activeTab === 'table' && (
        <div className="p-6">
          <div className="overflow-x-auto max-h-96 rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-slate-50 text-slate-700 uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Row #</th>
                  <th className="px-4 py-3">Cluster</th>
                  <th className="px-4 py-3">Dist. to Centroid</th>
                  {result.features.map((f) => (
                    <th key={f} className="px-4 py-3">
                      {f}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {result.points.map((p) => {
                  const color = CLUSTER_COLORS[p.cluster % CLUSTER_COLORS.length];
                  return (
                    <tr key={p.rowNumber} className="hover:bg-slate-50/50">
                      <td className="px-4 py-2 font-sans text-slate-500">{p.rowNumber}</td>
                      <td className="px-4 py-2 font-sans">
                        <span
                          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold text-white shadow-2xs"
                          style={{ backgroundColor: color }}
                        >
                          Cluster {p.cluster + 1}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-slate-600">
                        {p.distanceToCentroid.toFixed(3)}
                      </td>
                      {result.features.map((f) => (
                        <td key={f} className="px-4 py-2 text-slate-800 font-semibold">
                          {p.originalFeatures[f] !== undefined
                            ? Number(p.originalFeatures[f]).toLocaleString()
                            : '—'}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
