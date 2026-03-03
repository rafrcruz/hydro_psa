import { useMemo, useState } from 'react';

const SERVICE_ORDER = ['PIMS', 'SDCD', 'Redes', 'ElÃ©trica', 'AutomaÃ§Ã£o', 'Outros'];
const PALETTE = {
  PIMS: '#2f80ed',
  SDCD: '#27ae60',
  Redes: '#4e6b88',
  'ElÃ©trica': '#f2994a',
  'AutomaÃ§Ã£o': '#7b61ff',
  Outros: '#768692',
};

function normalizeRows(rows = []) {
  const accumulator = SERVICE_ORDER.reduce((acc, item) => ({ ...acc, [item]: 0 }), {});
  rows.forEach((row) => {
    const label = SERVICE_ORDER.includes(row.label) ? row.label : 'Outros';
    accumulator[label] += Number(row.count || 0);
  });
  return SERVICE_ORDER.map((label) => ({ label, value: accumulator[label] }));
}

function buildSegments(rows, total) {
  let offset = 0;
  return rows
    .filter((item) => item.value > 0)
    .map((item) => {
      const percent = total > 0 ? (item.value / total) * 100 : 0;
      const segment = {
        key: item.label,
        label: item.label,
        value: item.value,
        percent,
        color: PALETTE[item.label],
        start: offset,
      };
      offset += percent;
      return segment;
    });
}

export default function ServiceMacroDonut({
  rows = [],
  total = 0,
  baseLabel = '',
  emptyLabel = 'Sem dados para o recorte',
  onSliceClick,
}) {
  const [hoveredKey, setHoveredKey] = useState('');

  const prepared = useMemo(() => {
    const normalized = normalizeRows(rows);
    const safeTotal = total || normalized.reduce((acc, item) => acc + item.value, 0);
    const segments = buildSegments(normalized, safeTotal);
    return {
      total: safeTotal,
      segments,
    };
  }, [rows, total]);

  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const hovered = prepared.segments.find((item) => item.key === hoveredKey) || null;

  return (
    <article className="card p-4">
      <h3 className="text-lg">Distribuição por Serviço Macro</h3>
      <p className="mt-1 text-xs text-aluminium">Base: {baseLabel}</p>

      {prepared.total <= 0 ? (
        <p className="mt-4 text-sm text-aluminium">{emptyLabel}</p>
      ) : (
        <>
          <div className="mt-3 flex items-center gap-4">
            <svg width="136" height="136" viewBox="0 0 136 136" aria-label="DistribuiÃ§Ã£o por serviÃ§o macro">
              <g transform="translate(68,68) rotate(-90)">
                <circle cx="0" cy="0" r={radius} fill="none" stroke="#e6e6e6" strokeWidth="18" />
                {prepared.segments.map((segment) => {
                  const dash = (segment.percent / 100) * circumference;
                  return (
                    <circle
                      key={segment.key}
                      cx="0"
                      cy="0"
                      r={radius}
                      fill="none"
                      stroke={segment.color}
                      strokeWidth={hoveredKey === segment.key ? '20' : '18'}
                      strokeDasharray={`${dash} ${circumference - dash}`}
                      strokeDashoffset={`${(-segment.start / 100) * circumference}`}
                      strokeLinecap="butt"
                      onMouseEnter={() => setHoveredKey(segment.key)}
                      onMouseLeave={() => setHoveredKey('')}
                      onClick={() => onSliceClick?.(segment)}
                      style={{ cursor: onSliceClick ? 'pointer' : 'default' }}
                    >
                      <title>{`${segment.label}: ${segment.value} (${segment.percent.toFixed(1)}%)`}</title>
                    </circle>
                  );
                })}
              </g>
              <text x="68" y="64" textAnchor="middle" className="fill-mid-gray text-[10px]">Total</text>
              <text x="68" y="80" textAnchor="middle" className="fill-hydro-blue text-[14px] font-bold">{prepared.total}</text>
            </svg>

            <ul className="space-y-1 text-xs text-mid-gray">
              {prepared.segments.map((segment) => (
                <li key={`legend-${segment.key}`} className="flex items-center gap-2">
                  <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: segment.color }} />
                  <button
                    type="button"
                    className="text-left hover:text-hydro-blue"
                    onClick={() => onSliceClick?.(segment)}
                    disabled={!onSliceClick}
                  >
                    {segment.label}: <strong>{segment.value}</strong> ({segment.percent.toFixed(1)}%)
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <p className="mt-3 text-xs text-aluminium">
            {hovered ? `${hovered.label}: ${hovered.value} (${hovered.percent.toFixed(1)}%)` : 'Passe o mouse nas fatias para detalhes.'}
          </p>
        </>
      )}
    </article>
  );
}

