export default function AgingBucketsBars({
  title,
  subtitle,
  rows = [],
  total = 0,
  emptyLabel = 'Sem backlog no recorte',
  onBucketClick,
}) {
  const maxCount = Math.max(1, ...rows.map((row) => Number(row.count || 0)));

  return (
    <article className="card p-4">
      <h3 className="text-lg">{title}</h3>
      <p className="mt-1 text-xs text-aluminium">{subtitle}</p>

      {total <= 0 || !rows.length ? (
        <p className="mt-4 text-sm text-aluminium">{emptyLabel}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {rows.map((row) => {
            const count = Number(row.count || 0);
            const width = count <= 0 ? '0%' : `${Math.max(6, (count / maxCount) * 100)}%`;
            const percentual = Number(row.percentual || 0).toFixed(1);
            return (
              <li
                key={row.key}
                className="rounded-md border border-light-gray bg-white px-3 py-2"
              >
                <button
                  type="button"
                  className="w-full text-left"
                  onClick={() => onBucketClick?.(row)}
                  disabled={!onBucketClick}
                >
                  <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                    <span className="font-semibold text-mid-gray">{row.label}</span>
                    <span className="text-aluminium">{row.count} ({percentual}%)</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-light-gray">
                    <div className="h-2.5 rounded-full bg-[#4e6b88]" style={{ width }} />
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </article>
  );
}
