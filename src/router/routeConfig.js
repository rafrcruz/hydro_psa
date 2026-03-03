import { profiles } from '../constants/profiles';

export const routeConfig = {
  [profiles.SOLICITANTE]: [
    { path: '/solicitante/chamados', title: 'Meus chamados' },
    { path: '/solicitante/novo', title: 'Novo chamado' },
    { path: '/solicitante/chamados/:id', title: 'Detalhes do chamado', menu: false },
  ],
  [profiles.EXECUTOR]: [
    { path: '/executor/fila', title: 'Fila de atendimento' },
    { path: '/executor/chamados/:id', title: 'Detalhes do chamado', menu: false },
  ],
  [profiles.AUTOMACAO]: [
    { path: '/automacao/painel', title: 'Painel operacional' },
    { path: '/solicitante/chamados', title: 'Meus chamados' },
    { path: '/solicitante/novo', title: 'Novo chamado' },
    { path: '/automacao/fila', title: 'Fila de chamados' },
    { path: '/gestao/dashboard', title: 'Dashboard gerencial' },
    { path: '/solicitante/chamados/:id', title: 'Detalhes do chamado', menu: false },
    { path: '/executor/fila', title: 'Fila de atendimento', menu: false },
    { path: '/executor/chamados/:id', title: 'Detalhes do chamado', menu: false },
    { path: '/automacao/chamados/:id', title: 'Detalhes do chamado', menu: false },
    { path: '/automacao/catalogo', title: 'Catálogo de solicitações' },
    { path: '/automacao/usuarios', title: 'Usuários/Equipes' },
  ],
  [profiles.GESTAO]: [
    { path: '/gestao/dashboard', title: 'Dashboard de gestão' },
  ],
};

export function getDefaultRoute(profile) {
  return routeConfig[profile]?.[0]?.path || '/';
}
