import { useEffect, useMemo, useState } from 'react';
import RequestFilters from '../components/RequestFilters';
import RequestTable from '../components/RequestTable';
import { useProfile } from '../contexts/ProfileContext';
import { getExecutors, getQueueRequests } from '../services/mockApi';

const initialFilters = {
  area: [],
  servicoMacro: [],
  status: [],
  gm: [],
  search: '',
  executorResponsavel: [],
};

export default function ExecutorFilaPage() {
  const { profile } = useProfile();
  const [requests, setRequests] = useState([]);
  const [executors, setExecutors] = useState([]);
  const [filters, setFilters] = useState(initialFilters);
  const [loading, setLoading] = useState(true);

  const detailBasePath = useMemo(() => (profile === 'Automação' ? '/automacao/chamados' : '/executor/chamados'), [profile]);

  useEffect(() => {
    getExecutors().then(setExecutors);
  }, []);

  useEffect(() => {
    let mounted = true;
    getQueueRequests(filters).then((rows) => {
      if (mounted) {
        setRequests(rows);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
    };
  }, [filters]);

  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-2xl">Fila de chamados</h2>
        <p className="mt-1 text-sm text-aluminium">Visão operacional para triagem, execução e acompanhamento.</p>
      </header>

      <RequestFilters
        filters={filters}
        onChange={setFilters}
        onClear={() => setFilters(initialFilters)}
        showResponsible
        executors={executors}
      />

      <div className="card p-4">
        {loading ? (
          <p className="text-aluminium">Carregando...</p>
        ) : (
          <RequestTable requests={requests} basePath={detailBasePath} showResponsavel paginated pageSize={8} />
        )}
      </div>
    </section>
  );
}
