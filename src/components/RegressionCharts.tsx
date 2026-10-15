import React from 'react';

interface ScatterPlotProps {
  data: { x: number; y: number }[];
  line: { x: number; y: number }[];
  xLabel: string;
  yLabel: string;
  slope: number;
  intercept: number;
  rSquared: number;
}

export const SimpleScatterPlot: React.FC<ScatterPlotProps> = ({
  data,
  line,
  xLabel,
  yLabel,
  slope,
  intercept,
  rSquared,
}) => {
  if (!data || data.length === 0) return null;

  // Compute bounding box
  const allX = [...data.map((d) => d.x), ...line.map((l) => l.x)];
  const allY = [...data.map((d) => d.y), ...line.map((l) => l.y)];

  let minX = Math.min(...allX);
  let maxX = Math.max(...allX);
  let minY = Math.min(...allY);
  let maxY = Math.max(...allY);

  if (minX === maxX) {
    minX -= 1;
    maxX += 1;
  }
  if (minY === maxY) {
    minY -= 1;
    maxY += 1;
  }

  // Add 8% padding
  const padX = (maxX - minX) * 0.08;
  const padY = (maxY - minY) * 0.08;
  minX -= padX;
  maxX += padX;
  minY -= padY;
  maxY += padY;

  const width = 600;
  const height = 360;
  const margin = { top: 30, right: 30, bottom: 50, left: 65 };

  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;

  const scaleX = (x: number) => margin.left + ((x - minX) / (maxX - minX)) * plotWidth;
  const scaleY = (y: number) => margin.top + plotHeight - ((y - minY) / (maxY - minY)) * plotHeight;

  // Grid tick lines (5 ticks)
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
    <div className="w-full overflow-x-auto flex justify-center py-2">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full max-w-2xl h-auto select-none bg-white rounded-xl border border-slate-100 shadow-xs"
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

        {/* Regression Fitted Line */}
        {line.length >= 2 && (
          <line
            x1={scaleX(line[0].x)}
            y1={scaleY(line[0].y)}
            x2={scaleX(line[1].x)}
            y2={scaleY(line[1].y)}
            stroke="#2563eb"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        )}

        {/* Scatter Points */}
        {data.map((pt, i) => (
          <circle
            key={i}
            cx={scaleX(pt.x)}
            cy={scaleY(pt.y)}
            r={data.length > 200 ? 3 : 4}
            className="fill-blue-600/70 stroke-white stroke-[1.5] hover:fill-rose-500 transition-colors"
          >
            <title>{`(${xLabel}: ${pt.x}, ${yLabel}: ${pt.y})`}</title>
          </circle>
        ))}

        {/* Axis Labels */}
        <text
          x={margin.left + plotWidth / 2}
          y={height - 12}
          textAnchor="middle"
          className="text-xs font-semibold fill-slate-700"
        >
          {xLabel} (Predictor X)
        </text>

        <text
          x={-(margin.top + plotHeight / 2)}
          y={20}
          transform="rotate(-90)"
          textAnchor="middle"
          className="text-xs font-semibold fill-slate-700"
        >
          {yLabel} (Target Y)
        </text>

        {/* Legend / Equation Badge */}
        <rect
          x={width - margin.right - 180}
          y={margin.top + 6}
          width="170"
          height="48"
          rx="6"
          fill="#f8fafc"
          stroke="#e2e8f0"
        />
        <text
          x={width - margin.right - 170}
          y={margin.top + 24}
          className="text-[11px] font-mono fill-blue-700 font-medium"
        >
          Ŷ = {slope.toFixed(3)}X + {intercept.toFixed(3)}
        </text>
        <text
          x={width - margin.right - 170}
          y={margin.top + 42}
          className="text-[10px] font-mono fill-slate-500"
        >
          R² = {(rSquared * 100).toFixed(1)}% (n={data.length})
        </text>
      </svg>
    </div>
  );
};

export const ActualVsPredictedScatter: React.FC<{
  data: { actual: number; predicted: number; residual: number }[];
  targetName: string;
}> = ({ data, targetName }) => {
  if (!data || data.length === 0) return null;

  const allVals = [...data.map((d) => d.actual), ...data.map((d) => d.predicted)];
  let minVal = Math.min(...allVals);
  let maxVal = Math.max(...allVals);

  if (minVal === maxVal) {
    minVal -= 1;
    maxVal += 1;
  }

  const pad = (maxVal - minVal) * 0.08;
  minVal -= pad;
  maxVal += pad;

  const width = 600;
  const height = 360;
  const margin = { top: 30, right: 30, bottom: 50, left: 65 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;

  const scale = (val: number) =>
    margin.left + ((val - minVal) / (maxVal - minVal)) * plotWidth;
  const scaleY = (val: number) =>
    margin.top + plotHeight - ((val - minVal) / (maxVal - minVal)) * plotHeight;

  return (
    <div className="w-full overflow-x-auto flex justify-center py-2">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full max-w-2xl h-auto select-none bg-white rounded-xl border border-slate-100 shadow-xs"
      >
        {/* 45-degree Perfect Prediction line (Y = X) */}
        <line
          x1={scale(minVal)}
          y1={scaleY(minVal)}
          x2={scale(maxVal)}
          y2={scaleY(maxVal)}
          stroke="#10b981"
          strokeWidth="2"
          strokeDasharray="6 4"
        />

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

        {/* Data points */}
        {data.map((pt, i) => (
          <circle
            key={i}
            cx={scale(pt.actual)}
            cy={scaleY(pt.predicted)}
            r={data.length > 200 ? 3 : 4}
            className="fill-indigo-600/70 stroke-white stroke-[1.5] hover:fill-amber-500 transition-colors"
          >
            <title>{`Actual: ${pt.actual.toFixed(3)}, Predicted: ${pt.predicted.toFixed(3)}, Residual: ${pt.residual.toFixed(3)}`}</title>
          </circle>
        ))}

        {/* Axis Labels */}
        <text
          x={margin.left + plotWidth / 2}
          y={height - 12}
          textAnchor="middle"
          className="text-xs font-semibold fill-slate-700"
        >
          Actual {targetName}
        </text>

        <text
          x={-(margin.top + plotHeight / 2)}
          y={20}
          transform="rotate(-90)"
          textAnchor="middle"
          className="text-xs font-semibold fill-slate-700"
        >
          Model Predicted {targetName}
        </text>

        {/* Reference label */}
        <text
          x={margin.left + 15}
          y={margin.top + 20}
          className="text-[11px] font-mono fill-emerald-600 font-medium"
        >
          --- 45° Ideal Fit Line (Actual = Predicted)
        </text>
      </svg>
    </div>
  );
};
