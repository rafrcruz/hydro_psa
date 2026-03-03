import { useMemo, useState } from 'react';

const VIEWBOX_WIDTH = 760;
const VIEWBOX_HEIGHT = 260;
const PADDING = { top: 20, right: 18, bottom: 36, left: 36 };

function getChartBounds() {
  return {
    width: VIEWBOX_WIDTH - PADDING.left - PADDING.right,
    height: VIEWBOX_HEIGHT - PADDING.top - PADDING.bottom,
  };
}

function toPoint(index, total, value, maxValue) {
  const { width, height } = getChartBounds();
  const step = total > 1 ? width / (total - 1) : 0;
  const x = PADDING.left + step * index;
  const safeMax = maxValue > 0 ? maxValue : 1;
  const y = PADDING.top + (height * (safeMax - value)) / safeMax;
  return { x, y };
}

function makePath(values, maxValue) {
  if (!values.length) {
    return '';
  }

  return values
    .map((value, index) => {
      const point = toPoint(index, values.length, value, maxValue);
      return `${index === 0 ? 'M' : 'L'}${point.x},${point.y}`;
    })
    .join(' ');
}

export default function TrendLineChart({
  data = [],
  series = [],
  yLabel = 'Quantidade',
  emptyLabel = 'Sem dados para o período selecionado',
  onPointClick,
}) {
  const [hoverIndex, setHoverIndex] = useState(null);

  const prepared = useMemo(() => {
    const maxValue = Math.max(1, ...data.flatMap((row) => series.map((item) => Number(row[item.key] || 0))));
    const yTicks = [1, 0.66, 0.33, 0].map((ratio) => Math.round(maxValue * ratio));

    return {
      maxValue,
      yTicks,
      linePaths: series.reduce((acc, item) => {
        const values = data.map((row) => Number(row[item.key] || 0));
        acc[item.key] = makePath(values, maxValue);
        return acc;
      }, {}),
    };
  }, [data, series]);

  if (!data.length) {
    return <p className="text-sm text-aluminium">{emptyLabel}</p>;
  }

  const tooltipData = hoverIndex !== null ? data[hoverIndex] : null;
  const { width, height } = getChartBounds();

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 text-xs text-mid-gray">
        <span className="font-semibold">{yLabel}</span>
        {series.map((item) => (
          <span key={item.key} className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
            {item.label}
          </span>
        ))}
      </div>

      <div className="relative overflow-x-auto">
        {tooltipData ? (
          <div
            className="pointer-events-none absolute z-10 rounded-md border border-light-gray bg-white px-3 py-2 text-xs text-mid-gray shadow"
            style={{
              left: `${Math.max(2, Math.min(84, (hoverIndex / Math.max(1, data.length - 1)) * 100))}%`,
              top: 8,
            }}
          >
            <p className="font-semibold">{tooltipData.label}</p>
            {series.map((item) => (
              <p key={item.key}>{item.label}: {tooltipData[item.key] || 0}</p>
            ))}
          </div>
        ) : null}

        <svg viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`} className="min-w-[720px]">
          {[0, 0.33, 0.66, 1].map((ratio) => {
            const y = PADDING.top + height * ratio;
            return (
              <line
                key={ratio}
                x1={PADDING.left}
                x2={VIEWBOX_WIDTH - PADDING.right}
                y1={y}
                y2={y}
                stroke="#e6e6e6"
                strokeWidth="1"
              />
            );
          })}

          {prepared.yTicks.map((tick, index) => {
            const y = PADDING.top + (height * index) / Math.max(1, prepared.yTicks.length - 1);
            return (
              <text key={`tick-${tick}-${index}`} x="6" y={y + 4} fontSize="10" fill="#8c8c8c">
                {tick}
              </text>
            );
          })}

          {series.map((item) => (
            <path
              key={item.key}
              d={prepared.linePaths[item.key]}
              fill="none"
              stroke={item.color}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}

          {data.map((row, index) => {
            const x = toPoint(index, data.length, 0, 1).x;
            const step = data.length > 1 ? width / (data.length - 1) : width;
            return (
              <g key={`x-${row.key}`}>
                <rect
                  x={x - step / 2}
                  y={PADDING.top}
                  width={step}
                  height={height}
                  fill="transparent"
                  onMouseEnter={() => setHoverIndex(index)}
                  onFocus={() => setHoverIndex(index)}
                  onTouchStart={() => setHoverIndex(index)}
                />
                <text x={x} y={VIEWBOX_HEIGHT - 10} textAnchor="middle" fontSize="10" fill="#8c8c8c">
                  {row.label}
                </text>
              </g>
            );
          })}

          {series.map((item) => (
            data.map((row, index) => {
              const point = toPoint(index, data.length, Number(row[item.key] || 0), prepared.maxValue);
              return (
                <circle
                  key={`${item.key}-${row.key}`}
                  cx={point.x}
                  cy={point.y}
                  r="3.2"
                  fill={item.color}
                  onMouseEnter={() => setHoverIndex(index)}
                  onTouchStart={() => setHoverIndex(index)}
                  onClick={() => onPointClick?.({ row, series: item })}
                  style={{ cursor: onPointClick ? 'pointer' : 'default' }}
                >
                  <title>{`${row.label} | ${item.label}: ${row[item.key] || 0}`}</title>
                </circle>
              );
            })
          ))}
        </svg>
      </div>
    </div>
  );
}

