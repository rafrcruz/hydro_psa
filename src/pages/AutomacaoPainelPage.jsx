import { useEffect, useState } from 'react';
import StatCard from '../components/StatCard';
import RequestTable from '../components/RequestTable';
import { getDashboardMetrics, getRecentRequests } from '../services/mockApi';

export default function AutomacaoPainelPage() {
  const [metrics, setMetrics] = useState(null);
  const [recent, setRecent] = useState([]);

  useEffect(() => {
    Promise.all([getDashboardMetrics(), getRecentRequests(4)]).then(([nextMetrics, nextRecent]) => {
      setMetrics(nextMetrics);
      setRecent(nextRecent);
    });
  }, []);

  if (!metrics) {
    return <p className="text-aluminium">Carregando...</p>;
  }

  return (
    <section className="space-y-6">
      <h2 className="text-2xl">Painel de automação</h2>
      <div className="grid gap-3 md:grid-cols-4">
        <StatCard title="Chamados totais" value={metrics.totalRequests} />
        <StatCard title="Em aberto" value={metrics.openRequests} />
        <StatCard title="Em atendimento" value={metrics.inProgress} />
        <StatCard title="Automacoes ativas" value={metrics.activeAutomations} />
      </div>
      <div className="card p-4">
        <h3 className="mb-2 text-lg">Ultimos chamados</h3>
        <RequestTable requests={recent} basePath="/executor/chamados" />
      </div>
    </section>
  );
}

