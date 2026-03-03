import { Route, Routes } from 'react-router-dom';
import Layout from './Layout';
import SolicitanteChamadosPage from '../pages/SolicitanteChamadosPage';
import NovoChamadoPage from '../pages/NovoChamadoPage';
import ChamadoDetalhesPage from '../pages/ChamadoDetalhesPage';
import ExecutorFilaPage from '../pages/ExecutorFilaPage';
import AutomacaoPainelPage from '../pages/AutomacaoPainelPage';
import CatalogoPage from '../pages/CatalogoPage';
import UsuariosPage from '../pages/UsuariosPage';
import GestaoDashboardPage from '../pages/GestaoDashboardPage';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<div />} />
        <Route path="solicitante/chamados" element={<SolicitanteChamadosPage />} />
        <Route path="solicitante/novo" element={<NovoChamadoPage />} />
        <Route path="solicitante/chamados/:id" element={<ChamadoDetalhesPage />} />

        <Route path="executor/fila" element={<ExecutorFilaPage />} />
        <Route path="executor/chamados/:id" element={<ChamadoDetalhesPage />} />

        <Route path="automacao/painel" element={<AutomacaoPainelPage />} />
        <Route path="automacao/fila" element={<ExecutorFilaPage />} />
        <Route path="automacao/chamados/:id" element={<ChamadoDetalhesPage />} />
        <Route path="automacao/catalogo" element={<CatalogoPage />} />
        <Route path="automacao/usuarios" element={<UsuariosPage />} />

        <Route path="gestao/dashboard" element={<GestaoDashboardPage />} />
      </Route>
      <Route path="*" element={<p className="p-6">Página não encontrada.</p>} />
    </Routes>
  );
}
