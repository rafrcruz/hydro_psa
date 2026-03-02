import { profiles } from '../constants/profiles';

export const routeConfig = {
  [profiles.SOLICITANTE]: [
    { path: '/solicitante/chamados', title: 'Meus chamados' },
    { path: '/solicitante/novo', title: 'Novo chamado' },
    { path: '/solicitante/chamados/:id', title: 'Detalhes do chamado' },
  ],
  [profiles.EXECUTOR]: [
    { path: '/executor/fila', title: 'Fila de atendimento' },
    { path: '/executor/chamados/:id', title: 'Detalhes do chamado' },
  ],
  [profiles.AUTOMACAO]: [
    { path: '/automacao/painel', title: 'Painel de automação' },
    { path: '/automacao/catalogo', title: 'Catálogo de automações' },
    { path: '/automacao/usuarios', title: 'Usuários' },
  ],
  [profiles.GESTAO]: [
    { path: '/gestao/dashboard', title: 'Dashboard de gestão' },
  ],
};
