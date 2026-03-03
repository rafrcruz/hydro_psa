import { useMemo, useState } from 'react';

const VIEWBOX_WIDTH = 820;
const VIEWBOX_HEIGHT = 250;
const PADDING = { top: 24, right: 48, bottom: 48, left: 42 };

function computeParetoRows(rows = [], total = 0) {
  const ordered = [...rows]
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'pt-BR', { sensitivity: 'base' }));
  let cumulative = 0;
  return ordered.map((row) => {
    const percent = total > 0 ? (row.count / total) * 100 : 0;
    cumulative += percent;
    return {
      ...row,
      percent,
      cumulativePercent: Math.min(100, cumulative),
    };
  });
}

function linePath(rows, chartWidth, chartHeight) {
  if (!rows.length) {
    return '';
  }
  const step = chartWidth / rows.length;
  const baselineY = PADDING.top + chartHeight;
  const firstX = PADDING.left + (step / 2);
  const firstY = PADDING.top + (chartHeight * (100 - rows[0].cumulativePercent)) / 100;
  let path = `M${PADDING.left},${baselineY} H${firstX} V${firstY}`;

  for (let index = 1; index < rows.length; index += 1) {
    const x = PADDING.left + (step * index) + (step / 2);
    const y = PADDING.top + (chartHeight * (100 - rows[index].cumulativePercent)) / 100;
    path += ` H${x} V${y}`;
  }

  return path;
}

export default function ParetoAreaChart({
  rows = [],
  total = 0,
  baseLabel = '',
  emptyLabel = 'Sem dados para o recorte',
  selectedAreaLabel = '',
  onBarClick,
}) {
  const [hoverIndex, setHoverIndex] = useState(null);

  const prepared = useMemo(() => {
    const pareto = computeParetoRows(rows, total);
    const chartWidth = VIEWBOX_WIDTH - PADDING.left - PADDING.right;
    const chartHeight = VIEWBOX_HEIGHT - PADDING.top - PADDING.bottom;
    const maxCount = Math.max(1, ...pareto.map((row) => row.count));
    return {
      pareto,
      chartWidth,
      chartHeight,
      maxCount,
      path: linePath(pareto, chartWidth, chartHeight),
    };
  }, [rows, total]);

  if (!prepared.pareto.length || total === 0) {
    return (
      <article className="card p-4 lg:col-span-2">
        <h3 className="text-lg">Pareto por Área</h3>
        <p className="mt-1 text-xs text-aluminium">Base: {baseLabel}</p>
        <p className="mt-4 text-sm text-aluminium">{emptyLabel}</p>
      </article>
    );
  }

  const tooltip = hoverIndex !== null ? prepared.pareto[hoverIndex] : null;
  const step = prepared.chartWidth / prepared.pareto.length;
  const barWidth = Math.max(20, Math.min(60, step * 0.62));

  return (
    <article className="card p-4 lg:col-span-2">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-lg">Pareto por Área</h3>
          <p className="mt-1 text-xs text-aluminium">Base: {baseLabel} | Total: {total}</p>
        </div>
        {selectedAreaLabel ? <p className="text-xs text-mid-gray">{selectedAreaLabel}</p> : null}
      </div>

      <div className="relative overflow-x-auto">
        {tooltip ? (
          <div
            className="pointer-events-none absolute z-10 rounded-md border border-light-gray bg-white px-3 py-2 text-xs text-mid-gray shadow"
            style={{
              left: `${Math.max(3, Math.min(84, ((hoverIndex + 0.5) / prepared.pareto.length) * 100))}%`,
              top: 8,
            }}
          >
            <p className="font-semibold">{tooltip.label}</p>
            <p>Volume: {tooltip.count}</p>
            <p>Percentual: {tooltip.percent.toFixed(1)}%</p>
            <p>Acumulado: {tooltip.cumulativePercent.toFixed(1)}%</p>
          </div>
        ) : null}

        <svg viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`} className="min-w-[760px]">
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = PADDING.top + (prepared.chartHeight * ratio);
            return (
              <line
                key={`grid-${ratio}`}
                x1={PADDING.left}
                x2={VIEWBOX_WIDTH - PADDING.right}
                y1={y}
                y2={y}
                stroke="#e6e6e6"
                strokeWidth="1"
              />
            );
          })}

          {prepared.pareto.map((row, index) => {
            const x = PADDING.left + (step * index) + (step / 2);
            const barHeight = (prepared.chartHeight * row.count) / prepared.maxCount;
            const y = PADDING.top + prepared.chartHeight - barHeight;
            return (
              <g key={row.key}>
                <rect
                  x={x - (barWidth / 2)}
                  y={y}
                  width={barWidth}
                  height={Math.max(1, barHeight)}
                  rx="3"
                  fill="#4e6b88"
                />
                <rect
                  x={x - (step / 2)}
                  y={PADDING.top}
                  width={step}
                  height={prepared.chartHeight}
                  fill="transparent"
                  onMouseEnter={() => setHoverIndex(index)}
                  onMouseLeave={() => setHoverIndex(null)}
                  onFocus={() => setHoverIndex(index)}
                  onBlur={() => setHoverIndex(null)}
                  onClick={() => onBarClick?.(row)}
                  style={{ cursor: onBarClick ? 'pointer' : 'default' }}
                />
                <text x={x} y={VIEWBOX_HEIGHT - 10} textAnchor="middle" fontSize="10" fill="#8c8c8c">
                  {row.label.length > 11 ? `${row.label.slice(0, 10)}...` : row.label}
                </text>
              </g>
            );
          })}

          <path
            d={prepared.path}
            fill="none"
            stroke="#d35454"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {prepared.pareto.map((row, index) => {
            const x = PADDING.left + (step * index) + (step / 2);
            const y = PADDING.top + (prepared.chartHeight * (100 - row.cumulativePercent)) / 100;
            return <circle key={`dot-${row.key}`} cx={x} cy={y} r="2.8" fill="#d35454" />;
          })}

          <text x="8" y={PADDING.top + 2} fontSize="10" fill="#8c8c8c">Volume</text>
          <text x={VIEWBOX_WIDTH - 35} y={PADDING.top + 2} fontSize="10" fill="#8c8c8c">% acum.</text>
          <text x={VIEWBOX_WIDTH - 37} y={PADDING.top + prepared.chartHeight + 4} fontSize="10" fill="#8c8c8c">0%</text>
          <text x={VIEWBOX_WIDTH - 40} y={PADDING.top + 12} fontSize="10" fill="#8c8c8c">100%</text>
        </svg>
      </div>
    </article>
  );
}
