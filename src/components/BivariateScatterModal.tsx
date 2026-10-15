import React, { useState } from 'react';
import { X, TrendingUp, Info } from 'lucide-react';
import { computePearsonCorrelation, getCorrelationStrength } from '../lib/dashboardAnalytics';

interface BivariateScatterModalProps {
  isOpen: boolean;
  onClose: () => void;
  var1: string;
  var2: string;
  rows: Record<string, any>[];
}

export const BivariateScatterModal: React.FC<BivariateScatterModalProps> = ({
  isOpen,
  onClose,
  var1,
  var2,
  rows,
}) => {
  const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number; rowIdx: number } | null>(null);

  if (!isOpen || !var1 || !var2) return null;

  // Extract valid points
  const points: { x: number; y: number; rowIdx: number }[] = [];
  rows.forEach((row, idx) => {
    const v1 = row[var1];
    const v2 = row[var2];
    if (v1 !== null && v1 !== undefined && v1 !== '' && v2 !== null && v2 !== undefined && v2 !== '') {
      const n1 = typeof v1 === 'number' ? v1 : Number(String(v1).replace(/[$,%]/g, '').trim());
      const n2 = typeof v2 === 'number' ? v2 : Number(String(v2).replace(/[$,%]/g, '').trim());
      if (!isNaN(n1) && !isNaN(n2)) {
        points.push({ x: n1, y: n2, rowIdx: idx + 1 });
      }
    }
  });

  const xVals = points.map((p) => p.x);
  const yVals = points.map((p) => p.y);

  const r = computePearsonCorrelation(xVals, yVals);
  const rSquared = r * r;
  const strength = getCorrelationStrength(r);

  // Compute Simple OLS Line
  const n = points.length;
  let slope = 0;
  let intercept = 0;

  if (n > 1) {
    const meanX = xVals.reduce((a, b) => a + b, 0) / n;
    const meanY = yVals.reduce((a, b) => a + b, 0) / n;
    let num = 0;
    let den = 0;
    for (let i = 0; i < n; i++) {
      num += (xVals[i] - meanX) * (yVals[i] - meanY);
      den += Math.pow(xVals[i] - meanX, 2);
    }
    if (den !== 0) {
      slope = num / den;
      intercept = meanY - slope * meanX;
    }
  }

  // Plot bounds
  let minX = xVals.length > 0 ? Math.min(...xVals) : 0;
  let maxX = xVals.length > 0 ? Math.max(...xVals) : 1;
  let minY = yVals.length > 0 ? Math.min(...yVals) : 0;
  let maxY = yVals.length > 0 ? Math.max(...yVals) : 1;

  if (minX === maxX) {
    minX -= 1;
    maxX += 1;
  }
  if (minY === maxY) {
    minY -= 1;
    maxY += 1;
  }

  const padX = (maxX - minX) * 0.08;
  const padY = (maxY - minY) * 0.08;
  minX -= padX;
  maxX += padX;
  minY -= padY;
  maxY += padY;

  const width = 580;
  const height = 340;
  const margin = { top: 25, right: 30, bottom: 45, left: 65 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;

  const scaleX = (x: number) => margin.left + ((x - minX) / (maxX - minX)) * plotWidth;
  const scaleY = (y: number) => margin.top + plotHeight - ((y - minY) / (maxY - minY)) * plotHeight;

  // Trendline endpoints
  const lineStart = { x: minX + padX, y: slope * (minX + padX) + intercept };
  const lineEnd = { x: maxX - padX, y: slope * (maxX - padX) + intercept };

  // Generate 5 grid ticks
  const xTicks = Array.from({ length: 5 }, (_, i) => minX + (i / 4) * (maxX - minX));
  const yTicks = Array.from({ length: 5 }, (_, i) => minY + (i / 4) * (maxY - minY));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600">Bivariate Scatter</span>
              <span className="text-slate-300">·</span>
              <span className="text-xs text-slate-500 font-medium">{points.length} paired samples</span>
            </div>
            <h3 className="text-base font-bold text-slate-900 mt-0.5">
              {var1} <span className="text-slate-400 font-normal">vs</span> {var2}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {/* Key Stats Bar */}
          <div className="grid grid-cols-3 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200/70 text-xs">
            <div>
              <span className="text-slate-500 block">Pearson Correlation (r)</span>
              <span className="text-sm font-bold font-mono text-slate-900">
                {r >= 0 ? '+' : ''}
                {r.toFixed(3)}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Coeff. of Determination (R²)</span>
              <span className="text-sm font-bold font-mono text-blue-600">
                {(rSquared * 100).toFixed(1)}%
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Relationship Strength</span>
              <span
                className={`text-xs font-semibold ${
                  Math.abs(r) >= 0.7
                    ? 'text-indigo-700'
                    : Math.abs(r) >= 0.4
                    ? 'text-blue-700'
                    : 'text-slate-600'
                }`}
              >
                {strength}
              </span>
            </div>
          </div>

          {/* SVG Scatter Plot */}
          <div className="relative border border-slate-200/80 rounded-xl bg-white p-2 overflow-hidden flex flex-col items-center">
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="w-full h-auto max-h-80 select-none overflow-visible"
            >
              {/* Background Grid */}
              {xTicks.map((val, idx) => (
                <g key={`xtick-${idx}`}>
                  <line
                    x1={scaleX(val)}
                    y1={margin.top}
                    x2={scaleX(val)}
                    y2={margin.top + plotHeight}
                    stroke="#f1f5f9"
                    strokeWidth="1"
                  />
                  <text
                    x={scaleX(val)}
                    y={height - margin.bottom + 18}
                    fill="#64748b"
                    fontSize="10"
                    fontFamily="monospace"
                    textAnchor="middle"
                  >
                    {val.toFixed(val > 100 ? 0 : 1)}
                  </text>
                </g>
              ))}

              {yTicks.map((val, idx) => (
                <g key={`ytick-${idx}`}>
                  <line
                    x1={margin.left}
                    y1={scaleY(val)}
                    x2={margin.left + plotWidth}
                    y2={scaleY(val)}
                    stroke="#f1f5f9"
                    strokeWidth="1"
                  />
                  <text
                    x={margin.left - 8}
                    y={scaleY(val) + 3}
                    fill="#64748b"
                    fontSize="10"
                    fontFamily="monospace"
                    textAnchor="end"
                  >
                    {val.toFixed(val > 100 ? 0 : 1)}
                  </text>
                </g>
              ))}

              {/* Axes lines */}
              <line
                x1={margin.left}
                y1={margin.top + plotHeight}
                x2={margin.left + plotWidth}
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

              {/* Linear trendline */}
              {n > 1 && (
                <line
                  x1={scaleX(lineStart.x)}
                  y1={scaleY(lineStart.y)}
                  x2={scaleX(lineEnd.x)}
                  y2={scaleY(lineEnd.y)}
                  stroke="#2563eb"
                  strokeWidth="2.5"
                  strokeDasharray="4 3"
                />
              )}

              {/* Scatter Points */}
              {points.map((pt, i) => {
                const cx = scaleX(pt.x);
                const cy = scaleY(pt.y);
                const isHovered = hoveredPoint?.rowIdx === pt.rowIdx;

                return (
                  <circle
                    key={i}
                    cx={cx}
                    cy={cy}
                    r={isHovered ? 6 : 4}
                    fill={isHovered ? '#1d4ed8' : '#3b82f6'}
                    fillOpacity={isHovered ? 1 : 0.65}
                    stroke={isHovered ? '#ffffff' : '#1e40af'}
                    strokeWidth={isHovered ? 2 : 1}
                    className="cursor-pointer transition-all duration-75"
                    onMouseEnter={() => setHoveredPoint(pt)}
                    onMouseLeave={() => setHoveredPoint(null)}
                  />
                );
              })}

              {/* Axis Titles */}
              <text
                x={margin.left + plotWidth / 2}
                y={height - 8}
                fill="#334155"
                fontSize="11"
                fontWeight="600"
                textAnchor="middle"
              >
                {var1} (X)
              </text>
              <text
                transform={`rotate(-90)`}
                x={-(margin.top + plotHeight / 2)}
                y={16}
                fill="#334155"
                fontSize="11"
                fontWeight="600"
                textAnchor="middle"
              >
                {var2} (Y)
              </text>
            </svg>

            {/* Hover Tooltip display */}
            {hoveredPoint && (
              <div className="absolute top-4 right-4 bg-slate-900/90 text-white text-[11px] px-2.5 py-1.5 rounded-lg shadow-lg font-mono">
                <div>Row #{hoveredPoint.rowIdx}</div>
                <div>
                  {var1}: <span className="text-blue-300">{hoveredPoint.x.toFixed(2)}</span>
                </div>
                <div>
                  {var2}: <span className="text-indigo-300">{hoveredPoint.y.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>

          {/* OLS equation caption */}
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span className="font-mono">
              Equation: {var2} ≈ {slope >= 0 ? '+' : ''}
              {slope.toFixed(3)} × {var1} {intercept >= 0 ? '+' : '-'} {Math.abs(intercept).toFixed(2)}
            </span>
            <span>Hover on data dots to inspect row values</span>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition shadow-2xs"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
