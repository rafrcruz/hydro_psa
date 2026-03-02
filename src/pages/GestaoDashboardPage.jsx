import { useEffect, useState } from 'react';
import StatCard from '../components/StatCard';
import { getDashboardMetrics } from '../services/mockApi';

export default function GestaoDashboardPage() {
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    getDashboardMetrics().then(setMetrics);
  }, []);

  if (!metrics) {
    return <p className="text-aluminium">Carregando...</p>;
  }

  const statusRows = Object.entries(metrics.byStatus);

  return (
    <section className="space-y-6">
      <h2 className="text-2xl">Dashboard de gestão</h2>
      <div className="grid gap-3 md:grid-cols-3">
        <StatCard title="Total de chamados" value={metrics.totalRequests} />
        <StatCard title="Concluidos" value={metrics.done} />
        <StatCard title="Pendentes" value={metrics.openRequests} />
      </div>
      <article className="card p-4">
        <h3 className="mb-2 text-lg">Distribuição por status</h3>
        <ul className="space-y-1 text-sm text-mid-gray">
          {statusRows.map(([status, count]) => (
            <li key={status}>{status}: {count}</li>
          ))}
        </ul>
      </article>
    </section>
  );
}

