"use client";

import type { PriceBar } from "@/lib/types";

export function KLineChart({ data, supportPrice }: { data: PriceBar[]; supportPrice?: number }) {
  const points = data.slice(-70);
  if (!points.length) return <div className="glass rounded-2xl p-6">暫無 K 線資料</div>;

  const width = 980;
  const height = 360;
  const padding = 28;
  const highs = points.map((p) => p.high);
  const lows = points.map((p) => p.low);
  if (Number.isFinite(supportPrice)) {
    highs.push(supportPrice as number);
    lows.push(supportPrice as number);
  }
  const max = Math.max(...highs);
  const min = Math.min(...lows);
  const scaleY = (v: number) => padding + ((max - v) / Math.max(1, max - min)) * (height - padding * 2);
  const candleWidth = Math.max(4, (width - padding * 2) / points.length - 3);

  return (
    <div className="glass overflow-x-auto rounded-2xl p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-bold text-white">K 線圖</h3>
        <p className="text-xs text-slate-400">Yahoo Finance 真實 OHLC 日 K 資料</p>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="min-w-[820px]">
        {[0, 1, 2, 3].map((i) => {
          const y = padding + (i * (height - padding * 2)) / 3;
          return <line key={i} x1={padding} x2={width - padding} y1={y} y2={y} stroke="rgba(148,163,184,.18)" />;
        })}
        {Number.isFinite(supportPrice) ? (
          <g>
            <line
              x1={padding}
              x2={width - padding}
              y1={scaleY(supportPrice as number)}
              y2={scaleY(supportPrice as number)}
              stroke="#38bdf8"
              strokeDasharray="7 6"
              strokeWidth="1.8"
            />
            <text x={width - padding - 4} y={scaleY(supportPrice as number) - 6} textAnchor="end" fill="#7dd3fc" fontSize="13" fontWeight="700">
              支撐 {supportPrice?.toFixed(2)}
            </text>
          </g>
        ) : null}
        {points.map((p, idx) => {
          const x = padding + idx * ((width - padding * 2) / points.length) + candleWidth / 2;
          const up = p.close >= p.open;
          const color = up ? "#22c55e" : "#ef4444";
          const yOpen = scaleY(p.open);
          const yClose = scaleY(p.close);
          return (
            <g key={`${p.date}-${idx}`}>
              <line x1={x} x2={x} y1={scaleY(p.high)} y2={scaleY(p.low)} stroke={color} strokeWidth="1.6" />
              <rect
                x={x - candleWidth / 2}
                y={Math.min(yOpen, yClose)}
                width={candleWidth}
                height={Math.max(2, Math.abs(yClose - yOpen))}
                fill={color}
                rx="1"
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
}
