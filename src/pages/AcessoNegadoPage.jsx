import { useLocation, useNavigate } from 'react-router-dom';
import { useProfile } from '../contexts/ProfileContext';
import { getDefaultRoute } from '../router/routeConfig';

export default function AcessoNegadoPage() {
  const { profile } = useProfile();
  const navigate = useNavigate();
  const location = useLocation();
  const defaultRoute = getDefaultRoute(profile);
  const fromPath = location.state?.from || '';

  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-2xl">Sem permissao</h2>
        <p className="mt-1 text-sm text-mid-gray">O perfil atual nao pode acessar esta rota.</p>
      </header>

      {fromPath ? (
        <p className="text-sm text-aluminium">Rota solicitada: <span className="font-semibold">{fromPath}</span></p>
      ) : null}

      <button type="button" className="btn btn-primary" onClick={() => navigate(defaultRoute, { replace: true })}>
        Ir para a pagina inicial do perfil
      </button>
    </section>
  );
}
