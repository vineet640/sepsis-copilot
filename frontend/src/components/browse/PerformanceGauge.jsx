import React from "react";

/** Semi-circular arc gauge for 0–100 (hospital performance). */
export default function PerformanceGauge({ value }) {
  const v = Math.max(0, Math.min(100, Number(value) || 0));
  const w = 200;
  const h = 120;
  const stroke = 12;
  const r = 76;
  const cy = 100;
  const d = `M ${100 - r} ${cy} A ${r} ${r} 0 0 1 ${100 + r} ${cy}`;
  const arcLen = Math.PI * r;

  return (
    <div className="relative mx-auto flex flex-col items-center" style={{ width: w }}>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible" aria-hidden>
        <defs>
          <linearGradient id="gauge-claude-orange" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#b45309" />
            <stop offset="50%" stopColor="#d97757" />
            <stop offset="100%" stopColor="#fdba74" />
          </linearGradient>
        </defs>
        <path
          d={d}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          className="text-muted-foreground/45"
        />
        <path
          d={d}
          fill="none"
          stroke="url(#gauge-claude-orange)"
          strokeWidth={stroke}
          strokeLinecap="round"
          pathLength={arcLen}
          strokeDasharray={arcLen}
          strokeDashoffset={arcLen * (1 - v / 100)}
        />
      </svg>
      <div className="absolute bottom-1 left-1/2 flex -translate-x-1/2 flex-col items-center">
        <span className="app-metric-value text-card-foreground">{Math.round(v)}</span>
        <span className="text-sm text-muted-foreground">/ 100</span>
      </div>
    </div>
  );
}
