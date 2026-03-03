export default function StackedExecutorLoadBars({
  title,
  subtitle,
  rows = [],
  emptyLabel = 'Sem dados para o recorte',
  onRowClick,
  onSegmentClick,
}) {
  const filteredRows = rows.filter((row) => Number(row.count || 0) > 0);
  const maxCount = Math.max(1, ...filteredRows.map((row) => Number(row.count || 0)));

  return (
    <article className="card p-4">
      <h3 className="text-lg">{title}</h3>
      <p className="mt-1 text-xs text-aluminium">{subtitle}</p>

      {filteredRows.length === 0 ? (
        <p className="mt-4 text-sm text-aluminium">{emptyLabel}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {filteredRows.map((row) => {
            const total = Number(row.count || 0);
            const delayed = Math.max(0, Number(row.delayedCount || 0));
            const onTime = Math.max(0, total - delayed);
            const barWidth = `${Math.max(8, (total / maxCount) * 100)}%`;
            const delayedWidth = total > 0 ? `${(delayed / total) * 100}%` : '0%';
            return (
              <li key={row.key} className="rounded-md border border-light-gray bg-white px-3 py-2">
                <button
                  type="button"
                  className="w-full text-left"
                  onClick={() => onRowClick?.(row)}
                  disabled={!onRowClick}
                >
                  <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                    <span className="font-semibold text-mid-gray">{row.label}</span>
                    <span className="text-aluminium">total: {total} | atrasado: {delayed}</span>
                  </div>
                  <div className="h-3 rounded-full bg-light-gray" style={{ width: barWidth }}>
                    <div className="flex h-3 w-full overflow-hidden rounded-full">
                      <button
                        type="button"
                        className="h-3 bg-[#2d8f6f]"
                        style={{ width: `${total > 0 ? (onTime / total) * 100 : 0}%` }}
                        onClick={(event) => {
                          event.stopPropagation();
                          onSegmentClick?.(row, 'ON_TIME');
                        }}
                        aria-label={`Em dia ${row.label}`}
                      />
                      <button
                        type="button"
                        className="h-3 bg-[#d35454]"
                        style={{ width: delayedWidth }}
                        onClick={(event) => {
                          event.stopPropagation();
                          onSegmentClick?.(row, 'DELAYED');
                        }}
                        aria-label={`Atrasado ${row.label}`}
                      />
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-mid-gray">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#2d8f6f]" />
          Em dia
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#d35454]" />
          Atrasado
        </span>
      </div>
    </article>
  );
}
