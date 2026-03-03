import { useMemo, useState } from 'react';

const VIEWBOX_WIDTH = 760;
const VIEWBOX_HEIGHT = 236;
const PADDING = { top: 18, right: 44, bottom: 38, left: 40 };

function formatDateRange(startAt, endAt) {
  const start = new Date(startAt);
  const end = new Date(endAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return '-';
  }
  const startLabel = start.toLocaleDateString('pt-BR');
  const endLabel = end.toLocaleDateString('pt-BR');
  return `${startLabel}–${endLabel}`;
}

function pointX(index, total) {
  const width = VIEWBOX_WIDTH - PADDING.left - PADDING.right;
  const step = total > 1 ? width / (total - 1) : 0;
  return PADDING.left + (step * index);
}

function pointY(value, maxValue, top, height) {
  const safeMax = Math.max(1, maxValue);
  return top + ((height * (safeMax - value)) / safeMax);
}

function makeLinePath(data, maxBacklog, chartTop, chartHeight) {
  if (!data.length) {
    return '';
  }
  return data.map((row, index) => {
    const x = pointX(index, data.length);
    const y = pointY(Number(row.backlog || 0), maxBacklog, chartTop, chartHeight);
    return `${index === 0 ? 'M' : 'L'}${x},${y}`;
  }).join(' ');
}

function deriveTrendLabel(data) {
  if (data.length < 3) {
    return 'estável';
  }
  const windowSize = Math.min(4, data.length);
  const recent = data.slice(-windowSize);
  const first = Number(recent[0]?.backlog || 0);
  const last = Number(recent[recent.length - 1]?.backlog || 0);
  const diff = last - first;
  const threshold = Math.max(1, Math.round(first * 0.05));
  if (diff > threshold) {
    return 'subindo';
  }
  if (diff < -threshold) {
    return 'descendo';
  }
  return 'estável';
}

export default function BurndownBacklogChart({
  data = [],
  granularityLabel = '',
  emptyLabel = 'Sem dados para o período/filtros',
  onIntervalClick,
}) {
  const [hoverIndex, setHoverIndex] = useState(null);

  const prepared = useMemo(() => {
    const maxBacklog = Math.max(1, ...data.map((row) => Number(row.backlog || 0)));
    const maxConcluded = Math.max(1, ...data.map((row) => Number(row.concluidos || 0)));
    const sharedMax = Math.max(maxBacklog, maxConcluded);
    const chartHeight = VIEWBOX_HEIGHT - PADDING.top - PADDING.bottom;
    const linePath = makeLinePath(data, sharedMax, PADDING.top, chartHeight);
    const labelEvery = data.length > 14 ? 4 : data.length > 9 ? 3 : data.length > 6 ? 2 : 1;
    const trend = deriveTrendLabel(data);
    const yTicks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => ({
      ratio,
      value: Math.round(sharedMax * (1 - ratio)),
      y: PADDING.top + (chartHeight * ratio),
    }));
    return {
      maxBacklog,
      maxConcluded,
      sharedMax,
      chartHeight,
      linePath,
      labelEvery,
      trend,
      yTicks,
    };
  }, [data]);

  if (!data.length) {
    return <p className="text-sm text-aluminium">{emptyLabel}</p>;
  }

  const width = VIEWBOX_WIDTH - PADDING.left - PADDING.right;
  const barWidth = data.length > 1
    ? Math.max(8, Math.min(24, (width / data.length) * 0.5))
    : 18;
  const tooltipData = hoverIndex !== null ? data[hoverIndex] : null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-3 text-xs text-mid-gray">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#2f80ed]" />
            Backlog
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[#27ae60]" />
            Concluídos por intervalo
          </span>
        </div>
        <p className="text-xs text-aluminium">Tendência do backlog: <strong>{prepared.trend}</strong></p>
      </div>

      <div className="relative overflow-x-auto">
        {tooltipData ? (
          <div
            className="pointer-events-none absolute z-10 rounded-md border border-light-gray bg-white px-3 py-2 text-xs text-mid-gray shadow"
            style={{
              left: `${Math.max(3, Math.min(85, (hoverIndex / Math.max(1, data.length - 1)) * 100))}%`,
              top: 6,
            }}
          >
            <p className="font-semibold">{tooltipData.label}</p>
            <p>{formatDateRange(tooltipData.startAt, tooltipData.endAt)}</p>
            <p>Backlog: {tooltipData.backlog || 0}</p>
            <p>Concluídos: {tooltipData.concluidos || 0}</p>
          </div>
        ) : null}

        <svg viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`} className="min-w-[700px]">
          {prepared.yTicks.map((tick) => {
            return (
              <line
                key={tick.ratio}
                x1={PADDING.left}
                x2={VIEWBOX_WIDTH - PADDING.right}
                y1={tick.y}
                y2={tick.y}
                stroke="#e6e6e6"
                strokeWidth="1"
              />
            );
          })}

          {data.map((row, index) => {
            const x = pointX(index, data.length);
            const concluded = Number(row.concluidos || 0);
            const barTop = pointY(concluded, prepared.sharedMax, PADDING.top, prepared.chartHeight);
            const barHeight = Math.max(1, (PADDING.top + prepared.chartHeight) - barTop);
            return (
              <g key={`bar-${row.key}`}>
                <rect
                  x={x - (barWidth / 2)}
                  y={barTop}
                  width={barWidth}
                  height={barHeight}
                  rx="2"
                  fill="#27ae60"
                />
                <rect
                  x={x - Math.max(barWidth, 16)}
                  y={PADDING.top}
                  width={Math.max(barWidth * 2, 28)}
                  height={prepared.chartHeight}
                  fill="transparent"
                  onMouseEnter={() => setHoverIndex(index)}
                  onFocus={() => setHoverIndex(index)}
                  onMouseLeave={() => setHoverIndex(null)}
                  onBlur={() => setHoverIndex(null)}
                  onClick={() => onIntervalClick?.(row)}
                  style={{ cursor: onIntervalClick ? 'pointer' : 'default' }}
                />
              </g>
            );
          })}

          <path
            d={prepared.linePath}
            fill="none"
            stroke="#2f80ed"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {data.map((row, index) => {
            const x = pointX(index, data.length);
            const y = pointY(Number(row.backlog || 0), prepared.sharedMax, PADDING.top, prepared.chartHeight);
            return (
              <circle key={`dot-${row.key}`} cx={x} cy={y} r="3" fill="#2f80ed">
                <title>{`${row.label} | Backlog: ${row.backlog || 0} | Concluídos: ${row.concluidos || 0}`}</title>
              </circle>
            );
          })}

          {data.map((row, index) => {
            if (index % prepared.labelEvery !== 0 && index !== data.length - 1) {
              return null;
            }
            const x = pointX(index, data.length);
            return (
              <text key={`x-${row.key}`} x={x} y={VIEWBOX_HEIGHT - 10} textAnchor="middle" fontSize="10" fill="#8c8c8c">
                {row.label}
              </text>
            );
          })}

          <text x="8" y={PADDING.top - 4} fontSize="10" fill="#8c8c8c">Qtd.</text>
          {prepared.yTicks.map((tick) => (
            <text key={`tick-${tick.ratio}`} x="8" y={tick.y + 3} fontSize="10" fill="#8c8c8c">
              {tick.value}
            </text>
          ))}
        </svg>
      </div>

      <p className="text-xs text-aluminium">
        Base: backlog em aberto e concluídos por intervalo. Escala única compartilhada. Granularidade: {granularityLabel || '-'}.
      </p>
    </div>
  );
}
