import { useEffect, useState } from 'react';
import RequestTable from '../components/RequestTable';
import { getRequesterRequests } from '../services/mockApi';
import { useProfile } from '../contexts/ProfileContext';

export default function SolicitanteChamadosPage() {
  const { currentUser } = useProfile();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    getRequesterRequests(currentUser.id).then((rows) => {
      if (mounted) {
        setRequests(rows);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
    };
  }, [currentUser.id]);

  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-2xl">Meus chamados</h2>
        <p className="mt-1 text-sm text-aluminium">Dados vindos da base mock no navegador.</p>
      </header>
      {loading ? <p className="text-aluminium">Carregando...</p> : <RequestTable requests={requests} basePath="/solicitante/chamados" />}
    </section>
  );
}
