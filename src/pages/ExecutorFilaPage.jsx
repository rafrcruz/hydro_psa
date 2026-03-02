import { useEffect, useState } from 'react';
import RequestTable from '../components/RequestTable';
import { getQueueRequests } from '../services/mockApi';

export default function ExecutorFilaPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    getQueueRequests().then((rows) => {
      if (mounted) {
        setRequests(rows);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-2xl">Fila de atendimento</h2>
        <p className="mt-1 text-sm text-aluminium">Chamados abertos para o service desk.</p>
      </header>
      {loading ? <p className="text-aluminium">Carregando...</p> : <RequestTable requests={requests} basePath="/executor/chamados" />}
    </section>
  );
}
