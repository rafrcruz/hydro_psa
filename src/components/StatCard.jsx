export default function StatCard({
  title,
  value,
  hint,
  onClick,
  compact = false,
}) {
  const clickable = typeof onClick === 'function';

  return (
    <article
      className={`card animate-fade-in ${compact ? 'p-3' : 'p-4'} ${clickable ? 'cursor-pointer transition hover:border-hydro-blue' : ''}`}
      onClick={onClick}
      onKeyDown={(event) => {
        if (!clickable) {
          return;
        }
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick();
        }
      }}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
    >
      <p className="text-xs uppercase tracking-wide text-mid-gray">{title}</p>
      <p className={`${compact ? 'mt-1 text-2xl' : 'mt-2 text-3xl'} font-display text-hydro-blue`}>{value}</p>
      {hint ? <p className={`${compact ? 'mt-1' : 'mt-2'} text-xs text-aluminium`}>{hint}</p> : null}
    </article>
  );
}
