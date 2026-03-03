import { useEffect, useState } from 'react';
import RequestFilters from '../components/RequestFilters';
import RequestTable from '../components/RequestTable';
import { getRequesterRequests } from '../services/mockApi';
import { useProfile } from '../contexts/ProfileContext';

const initialFilters = {
  area: [],
  servicoMacro: [],
  status: [],
  gm: [],
  search: '',
  executorResponsavel: [],
};

export default function SolicitanteChamadosPage() {
  const { currentUser } = useProfile();
  const [requests, setRequests] = useState([]);
  const [filters, setFilters] = useState(initialFilters);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    getRequesterRequests(currentUser.id, filters).then((rows) => {
      if (mounted) {
        setRequests(rows);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
    };
  }, [currentUser.id, filters]);

  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-2xl">Meus chamados</h2>
        <p className="mt-1 text-sm text-aluminium">Acompanhe status, prioridade, SLA e GM dos seus chamados.</p>
      </header>

      <RequestFilters filters={filters} onChange={setFilters} onClear={() => setFilters(initialFilters)} />

      <div className="card p-4">
        {loading ? (
          <p className="text-aluminium">Carregando...</p>
        ) : (
          <RequestTable requests={requests} basePath="/solicitante/chamados" paginated pageSize={8} />
        )}
      </div>
    </section>
  );
}
