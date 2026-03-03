import { useEffect, useState } from 'react';
import StatCard from '../components/StatCard';
import RequestTable from '../components/RequestTable';
import { getDashboardMetrics, getRecentRequests } from '../services/mockApi';

function rowsFromMap(map) {
  return Object.entries(map).sort((a, b) => b[1] - a[1]);
}

function currentPeriod() {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

export default function AutomacaoPainelPage() {
  const [period, setPeriod] = useState(currentPeriod);
  const [metrics, setMetrics] = useState(null);
  const [recent, setRecent] = useState([]);

  useEffect(() => {
    Promise.all([getDashboardMetrics(period), getRecentRequests(6)]).then(([nextMetrics, nextRecent]) => {
      setMetrics(nextMetrics);
      setRecent(nextRecent);
    });
  }, [period]);

  if (!metrics) {
    return <p className="text-aluminium">Carregando...</p>;
  }

  const byArea = rowsFromMap(metrics.byArea);
  const byService = rowsFromMap(metrics.byServiceMacro);

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl">Painel de automação</h2>
        <label className="text-sm text-mid-gray">
          Período (mês/ano)
          <input type="month" value={period} onChange={(event) => setPeriod(event.target.value)} className="input mt-1" />
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-5">
        <StatCard title="Chamados totais" value={metrics.totalRequests} />
        <StatCard title="Em aberto" value={metrics.openRequests} />
        <StatCard title="Concluídos" value={metrics.done} />
        <StatCard title="GM pendente" value={metrics.gmPendentes} hint={`${metrics.gmPendentesPercentual}% do total`} />
        <StatCard title="Status mapeados" value={Object.keys(metrics.byStatus).length} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <article className="card p-4">
          <h3 className="mb-2 text-lg">Chamados por área</h3>
          <ul className="space-y-1 text-sm text-mid-gray">
            {byArea.map(([label, count]) => <li key={label}>{label}: {count}</li>)}
          </ul>
        </article>

        <article className="card p-4">
          <h3 className="mb-2 text-lg">Chamados por serviço macro</h3>
          <ul className="space-y-1 text-sm text-mid-gray">
            {byService.map(([label, count]) => <li key={label}>{label}: {count}</li>)}
          </ul>
        </article>
      </div>

      <article className="card p-4">
        <h3 className="mb-2 text-lg">Últimos chamados</h3>
        <RequestTable requests={recent} basePath="/automacao/chamados" showResponsavel />
      </article>
    </section>
  );
}

