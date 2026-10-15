import React from 'react';
import { TrendingUp, Sparkles, Layers, CheckCircle2 } from 'lucide-react';

export const TopHeroGraphic: React.FC = () => {
  return (
    <div className="relative w-full max-w-lg mx-auto lg:max-w-none flex items-center justify-center select-none">
      {/* Ambient background glow blooms */}
      <div className="absolute -top-6 -right-6 w-56 h-56 bg-cyan-400/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-8 -left-8 w-60 h-60 bg-fuchsia-400/25 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-amber-300/20 rounded-full blur-2xl pointer-events-none" />

      {/* Main Glass Visual Container */}
      <div className="relative w-full bg-white/10 backdrop-blur-xl border border-white/30 rounded-3xl p-5 sm:p-6 shadow-2xl shadow-indigo-950/20 overflow-hidden">
        {/* Subtle grid pattern background */}
        <div
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
            backgroundSize: '16px 16px',
          }}
        />

        {/* Header inside graphic card */}
        <div className="flex items-center justify-between pb-3 border-b border-white/15 relative z-10">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400 animate-pulse" />
            <span className="text-xs font-semibold text-white tracking-wide">
              RegressionLab Live Core
            </span>
          </div>
          <span className="text-[11px] font-medium text-cyan-200 bg-white/10 px-2 py-0.5 rounded-full border border-white/20">
            OLS & Clustering Space
          </span>
        </div>

        {/* Dynamic Vector Plot Graphic */}
        <div className="relative py-2 z-10">
          <svg
            viewBox="0 0 380 200"
            className="w-full h-auto drop-shadow-md"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              {/* Glowing filter */}
              <filter id="glow-bright" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="glow-soft" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              {/* Radiant Line Gradient */}
              <linearGradient id="regLineGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="50%" stopColor="#818cf8" />
                <stop offset="100%" stopColor="#f43f5e" />
              </linearGradient>

              {/* Confidence Band Gradient */}
              <linearGradient id="confBandGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#818cf8" stopOpacity="0.05" />
              </linearGradient>
            </defs>

            {/* Coordinate Grid lines */}
            <g opacity="0.25" stroke="#ffffff" strokeDasharray="3 3" strokeWidth="0.8">
              <line x1="40" y1="30" x2="360" y2="30" />
              <line x1="40" y1="70" x2="360" y2="70" />
              <line x1="40" y1="110" x2="360" y2="110" />
              <line x1="40" y1="150" x2="360" y2="150" />
              <line x1="90" y1="20" x2="90" y2="165" />
              <line x1="160" y1="20" x2="160" y2="165" />
              <line x1="230" y1="20" x2="230" y2="165" />
              <line x1="300" y1="20" x2="300" y2="165" />
            </g>

            {/* Axes */}
            <line x1="35" y1="165" x2="365" y2="165" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
            <line x1="35" y1="165" x2="35" y2="15" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />

            {/* Shaded Confidence Ribbon */}
            <path
              d="M 45 152 Q 130 115 210 82 T 355 24 L 355 42 Q 220 98 135 128 T 45 160 Z"
              fill="url(#confBandGrad)"
            />

            {/* Regression Line */}
            <path
              d="M 45 156 L 355 32"
              stroke="url(#regLineGrad)"
              strokeWidth="3.5"
              strokeLinecap="round"
              filter="url(#glow-bright)"
            />

            {/* Cluster 1 Points (Bright Cyan #38bdf8) */}
            <g filter="url(#glow-bright)">
              <circle cx="60" cy="148" r="4" fill="#38bdf8" />
              <circle cx="75" cy="138" r="3.5" fill="#38bdf8" />
              <circle cx="85" cy="154" r="4" fill="#38bdf8" />
              <circle cx="98" cy="132" r="4.5" fill="#38bdf8" />
              <circle cx="112" cy="122" r="3.5" fill="#38bdf8" />
              <circle cx="125" cy="136" r="4" fill="#38bdf8" />
            </g>

            {/* Cluster 2 Points (Bright Amber / Gold #fbbf24) */}
            <g filter="url(#glow-bright)">
              <circle cx="150" cy="112" r="4" fill="#fbbf24" />
              <circle cx="168" cy="94" r="4.5" fill="#fbbf24" />
              <circle cx="182" cy="108" r="3.5" fill="#fbbf24" />
              <circle cx="195" cy="88" r="4.5" fill="#fbbf24" />
              <circle cx="210" cy="98" r="4" fill="#fbbf24" />
              <circle cx="225" cy="78" r="4" fill="#fbbf24" />
            </g>

            {/* Cluster 3 Points (Bright Emerald #34d399) */}
            <g filter="url(#glow-bright)">
              <circle cx="250" cy="74" r="4" fill="#34d399" />
              <circle cx="265" cy="62" r="4.5" fill="#34d399" />
              <circle cx="280" cy="72" r="3.5" fill="#34d399" />
              <circle cx="295" cy="50" r="4.5" fill="#34d399" />
              <circle cx="312" cy="58" r="4" fill="#34d399" />
              <circle cx="330" cy="40" r="4.5" fill="#34d399" />
              <circle cx="345" cy="36" r="4" fill="#34d399" />
            </g>

            {/* Outlier with bright ring accent (Luminous Pink #f43f5e) */}
            <circle cx="130" cy="65" r="5" fill="#f43f5e" filter="url(#glow-bright)" />
            <circle cx="130" cy="65" r="9" stroke="#f43f5e" strokeWidth="1" strokeDasharray="2 2" opacity="0.8" />

            {/* Glowing Centroid Star / Target Markers */}
            <g stroke="#ffffff" strokeWidth="1.5">
              {/* Centroid 1 */}
              <circle cx="88" cy="138" r="6" fill="#0284c7" stroke="#ffffff" />
              {/* Centroid 2 */}
              <circle cx="185" cy="98" r="6" fill="#d97706" stroke="#ffffff" />
              {/* Centroid 3 */}
              <circle cx="295" cy="58" r="6" fill="#059669" stroke="#ffffff" />
            </g>
          </svg>
        </div>

        {/* Floating Bright Glass Cards Overlay */}
        <div className="grid grid-cols-3 gap-2.5 pt-2 relative z-10">
          {/* Card 1: R-squared */}
          <div className="bg-white/20 backdrop-blur-md rounded-xl p-2.5 border border-white/30 shadow-md flex flex-col justify-between hover:bg-white/25 transition">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-white/80">Fit Score</span>
              <TrendingUp className="w-3.5 h-3.5 text-emerald-300" />
            </div>
            <div className="mt-1">
              <div className="text-base font-extrabold text-white tracking-tight">R² = 0.94</div>
              <div className="text-[10px] text-emerald-200 font-medium">Strong goodness-of-fit</div>
            </div>
          </div>

          {/* Card 2: Significance */}
          <div className="bg-white/20 backdrop-blur-md rounded-xl p-2.5 border border-white/30 shadow-md flex flex-col justify-between hover:bg-white/25 transition">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-white/80">P-Value</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-cyan-300" />
            </div>
            <div className="mt-1">
              <div className="text-base font-extrabold text-white tracking-tight">p &lt; 0.001</div>
              <div className="text-[10px] text-cyan-200 font-medium">99.9% Confidence</div>
            </div>
          </div>

          {/* Card 3: Clusters */}
          <div className="bg-white/20 backdrop-blur-md rounded-xl p-2.5 border border-white/30 shadow-md flex flex-col justify-between hover:bg-white/25 transition">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-white/80">K-Means</span>
              <Layers className="w-3.5 h-3.5 text-amber-300" />
            </div>
            <div className="mt-1">
              <div className="text-base font-extrabold text-white tracking-tight">k = 3 Segments</div>
              <div className="text-[10px] text-amber-200 font-medium">Optimal separation</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
