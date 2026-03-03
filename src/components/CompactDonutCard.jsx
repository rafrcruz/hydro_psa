function buildSegments(items, total, palette) {
  if (!items.length || total <= 0) {
    return [];
  }

  let startRatio = 0;
  return items
    .map((item, index) => {
      const value = Number(item.value || 0);
      const ratio = total > 0 ? Math.max(0, value / total) : 0;
      const segment = {
        ...item,
        ratio,
        startRatio,
        color: item.color || palette[index % palette.length],
      };
      startRatio += ratio;
      return segment;
    })
    .filter((segment) => segment.ratio > 0);
}

export default function CompactDonutCard({
  title,
  subtitle,
  contextLabel,
  valueLabel,
  valueHint,
  items = [],
  emptyLabel = 'Sem dados para o recorte',
  onSegmentClick,
}) {
  const total = items.reduce((acc, item) => acc + Number(item.value || 0), 0);
  const palette = ['#2f80ed', '#d35454', '#27ae60', '#768692'];
  const segments = buildSegments(items, total, palette);
  const radius = 58;
  const strokeWidth = 20;
  const circumference = 2 * Math.PI * radius;
  const donutSize = 160;
  const center = donutSize / 2;

  return (
    <article className="card flex flex-col p-4">
      <header>
        <h3 className="text-lg">{title}</h3>
        <p className="mt-1 text-xs text-aluminium">{subtitle}</p>
      </header>

      {total === 0 ? (
        <div className="flex-1 pt-4">
          <p className="text-sm text-aluminium">{emptyLabel}</p>
        </div>
      ) : (
        <div className="mt-4 grid flex-1 grid-cols-1 gap-6 md:grid-cols-2 md:items-center">
          <div className="flex min-w-0 flex-col justify-between">
            <div>
              <p className="text-4xl font-display text-hydro-blue">{valueLabel}</p>
              <p className="text-sm text-aluminium">{valueHint}</p>
            </div>
            <div className="mt-4">
              <ul className="space-y-2 text-mid-gray">
                {items.map((item, index) => (
                  <li key={`legend-${item.key}`} className="flex items-center gap-2">
                    <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: item.color || palette[index % palette.length] }} />
                    <button
                      type="button"
                      className="text-left text-sm hover:text-hydro-blue"
                      onClick={() => onSegmentClick?.(item)}
                      disabled={!onSegmentClick}
                    >
                      {item.label}: <strong>{item.value}</strong> ({item.percent || 0}%)
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="flex flex-col items-center md:justify-self-center">
            <svg width={donutSize} height={donutSize} viewBox={`0 0 ${donutSize} ${donutSize}`} aria-label={title}>
              <g transform={`translate(${center},${center}) rotate(-90)`}>
                <circle cx="0" cy="0" r={radius} fill="none" stroke="#e6e6e6" strokeWidth={strokeWidth} />
                {segments.map((segment) => (
                  <circle
                    key={segment.key}
                    cx="0"
                    cy="0"
                    r={radius}
                    fill="none"
                    stroke={segment.color}
                    strokeWidth={strokeWidth}
                    strokeDasharray={`${segment.ratio * circumference} ${Math.max(0, circumference - (segment.ratio * circumference))}`}
                    strokeDashoffset={-(segment.startRatio * circumference)}
                    strokeLinecap="butt"
                    style={{ cursor: onSegmentClick ? 'pointer' : 'default' }}
                    onClick={() => onSegmentClick?.(segment)}
                  >
                    <title>{`${segment.label}: ${segment.value}`}</title>
                  </circle>
                ))}
              </g>
              <text x={center} y={center + 5} textAnchor="middle" className="fill-mid-gray text-2xl font-semibold">{total}</text>
            </svg>
            <p className="mt-2 text-sm text-aluminium">{contextLabel}</p>
          </div>
        </div>
      )}
    </article>
  );
}
