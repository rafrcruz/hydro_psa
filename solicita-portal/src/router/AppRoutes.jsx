import { Routes, Route, useParams } from 'react-router-dom';
import Layout from './Layout';
import { profiles } from '../contexts/ProfileContext';

// Placeholder Page
const Placeholder = ({ title }) => {
    const params = useParams();
    const id = params.id ? ` (ID: ${params.id})` : '';
    return (
        <div>
            <h1 className="text-2xl font-bold">{title}{id}</h1>
        </div>
    );
};

export const routeConfig = {
    [profiles.SOLICITANTE]: [
      { path: '/solicitante/chamados', title: 'Meus Chamados' },
      { path: '/solicitante/novo', title: 'Novo Chamado' },
      { path: '/solicitante/chamados/:id', title: 'Detalhes do Chamado' },
    ],
    [profiles.EXECUTOR]: [
      { path: '/executor/fila', title: 'Fila de Atendimento' },
      { path: '/executor/chamados/:id', title: 'Detalhes do Chamado' },
    ],
    [profiles.AUTOMACAO]: [
      { path: '/automacao/painel', title: 'Painel de Automações' },
      { path: '/automacao/catalogo', title: 'Catálogo de Automações' },
      { path: '/automacao/usuarios', title: 'Gerenciamento de Usuários' },
    ],
    [profiles.GESTAO]: [
      { path: '/gestao/dashboard', title: 'Dashboard de Gestão' },
    ],
};
  
const allRoutes = Object.values(routeConfig).flat();

const AppRoutes = () => {
    return (
        <Routes>
            <Route element={<Layout />}>
                {allRoutes.map(({ path, title }) => (
                    <Route
                        key={path}
                        path={path}
                        element={<Placeholder title={title} />}
                    />
                ))}
            </Route>
            <Route path="*" element={<div>Página não encontrada</div>} />
        </Routes>
    );
};
  
export default AppRoutes;
