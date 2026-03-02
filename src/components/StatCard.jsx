export default function StatCard({ title, value, hint }) {
  return (
    <article className="card animate-fade-in p-4">
      <p className="text-xs uppercase tracking-wide text-mid-gray">{title}</p>
      <p className="mt-2 text-3xl font-display text-hydro-blue">{value}</p>
      {hint ? <p className="mt-2 text-xs text-aluminium">{hint}</p> : null}
    </article>
  );
}
