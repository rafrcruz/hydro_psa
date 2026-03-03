export default function DistributionBarList({
  title,
  subtitle,
  total,
  rows = [],
  emptyLabel = 'Sem dados para o período/filtros',
  getBarColor,
  formatValueLabel,
  onRowClick,
}) {
  if (!rows.length || total === 0) {
    return (
      <article className="card p-4">
        <h3 className="text-lg">{title}</h3>
        <p className="mt-1 text-xs text-aluminium">{subtitle}</p>
        <p className="mt-4 text-sm text-aluminium">{emptyLabel}</p>
      </article>
    );
  }

  const maxCount = Math.max(1, ...rows.map((row) => row.count));

  return (
    <article className="card p-4">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className="text-lg">{title}</h3>
          <p className="mt-1 text-xs text-aluminium">{subtitle}</p>
        </div>
        <p className="text-sm text-mid-gray">Total no periodo: <strong>{total}</strong></p>
      </div>

      <ul className="space-y-2">
        {rows.map((row) => {
          const width = row.count > 0 ? `${Math.max(6, (row.count / maxCount) * 100)}%` : '0%';
          const percentual = row.percentual.toFixed(1);
          const barColor = getBarColor ? getBarColor(row) : '#2f80ed';
          const valueLabel = formatValueLabel
            ? formatValueLabel(row, percentual)
            : `${row.count} (${percentual}%)`;
          return (
            <li
              key={row.key}
              className={`rounded-md border border-light-gray bg-white px-3 py-2 ${onRowClick ? 'cursor-pointer hover:border-hydro-blue' : ''}`}
              title={`${row.label}: ${row.count} chamados (${percentual}%)`}
              onClick={() => onRowClick?.(row)}
            >
              <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                <span className="font-semibold text-mid-gray">{row.label}</span>
                <span className="text-aluminium">{valueLabel}</span>
              </div>
              <div className="h-2.5 rounded-full bg-light-gray">
                <div className="h-2.5 rounded-full" style={{ width, backgroundColor: barColor }} />
              </div>
            </li>
          );
        })}
      </ul>
    </article>
  );
}

