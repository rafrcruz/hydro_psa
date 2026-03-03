import { useEffect, useState } from 'react';
import StatCard from '../components/StatCard';
import { getDashboardMetrics } from '../services/mockApi';

function currentPeriod() {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

function rowsFromMap(map) {
  return Object.entries(map).sort((a, b) => b[1] - a[1]);
}

export default function GestaoDashboardPage() {
  const [period, setPeriod] = useState(currentPeriod);
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    getDashboardMetrics(period).then(setMetrics);
  }, [period]);

  if (!metrics) {
    return <p className="text-aluminium">Carregando...</p>;
  }

  const byArea = rowsFromMap(metrics.byArea);
  const byService = rowsFromMap(metrics.byServiceMacro);
  const byStatus = rowsFromMap(metrics.byStatus);

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl">Dashboard de gestão</h2>
        <label className="text-sm text-mid-gray">
          Período (mês/ano)
          <input type="month" value={period} onChange={(event) => setPeriod(event.target.value)} className="input mt-1" />
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <StatCard title="Total de chamados" value={metrics.totalRequests} />
        <StatCard title="Em aberto" value={metrics.openRequests} />
        <StatCard title="Concluídos" value={metrics.done} />
        <StatCard title="GM pendente" value={metrics.gmPendentes} hint={`${metrics.gmPendentesPercentual}%`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <article className="card p-4">
          <h3 className="mb-2 text-lg">Por status</h3>
          <ul className="space-y-1 text-sm text-mid-gray">
            {byStatus.map(([status, count]) => <li key={status}>{status}: {count}</li>)}
          </ul>
        </article>

        <article className="card p-4">
          <h3 className="mb-2 text-lg">Por área</h3>
          <ul className="space-y-1 text-sm text-mid-gray">
            {byArea.map(([area, count]) => <li key={area}>{area}: {count}</li>)}
          </ul>
        </article>

        <article className="card p-4">
          <h3 className="mb-2 text-lg">Por serviço macro</h3>
          <ul className="space-y-1 text-sm text-mid-gray">
            {byService.map(([service, count]) => <li key={service}>{service}: {count}</li>)}
          </ul>
        </article>
      </div>
    </section>
  );
}
