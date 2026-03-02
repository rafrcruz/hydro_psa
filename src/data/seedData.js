export const seedUsers = [
  { id: 'usr-ana', name: 'Ana Martins', email: 'ana.martins@hydro.demo', role: 'Solicitante', area: 'Operacoes' },
  { id: 'usr-carlos', name: 'Carlos Souza', email: 'carlos.souza@hydro.demo', role: 'Executor', area: 'Service Desk' },
  { id: 'usr-livia', name: 'Livia Rocha', email: 'livia.rocha@hydro.demo', role: 'Automacao', area: 'CoE Automacao' },
  { id: 'usr-marcos', name: 'Marcos Lima', email: 'marcos.lima@hydro.demo', role: 'Gestao', area: 'Gestao Operacional' },
];

export const seedAutomations = [
  { id: 'auto-1', name: 'Reset de senha AD', owner: 'CoE Automacao', status: 'Ativo', slaHours: 4 },
  { id: 'auto-2', name: 'Criacao de usuario SAP', owner: 'CoE Automacao', status: 'Ativo', slaHours: 8 },
  { id: 'auto-3', name: 'Provisionamento VPN', owner: 'Seguranca', status: 'Em rollout', slaHours: 12 },
  { id: 'auto-4', name: 'Checklist onboarding', owner: 'RH Tech', status: 'Ativo', slaHours: 24 },
];

export const seedRequests = [
  {
    id: 'REQ-1001',
    title: 'Reset de senha no SAP',
    description: 'Usuario bloqueado apos 3 tentativas. Necessario reset urgente.',
    category: 'Acesso',
    priority: 'Alta',
    status: 'Novo',
    requesterId: 'usr-ana',
    assigneeId: '',
    createdAt: '2026-03-01T10:30:00.000Z',
    updatedAt: '2026-03-01T10:30:00.000Z',
  },
  {
    id: 'REQ-1002',
    title: 'Criar acesso para novo analista',
    description: 'Novo colaborador precisa de acesso ao Power BI e SharePoint.',
    category: 'Onboarding',
    priority: 'Media',
    status: 'Em atendimento',
    requesterId: 'usr-ana',
    assigneeId: 'usr-carlos',
    createdAt: '2026-03-01T13:15:00.000Z',
    updatedAt: '2026-03-01T14:00:00.000Z',
  },
  {
    id: 'REQ-1003',
    title: 'Automatizar relatorio de conformidade',
    description: 'Hoje o relatorio e manual e consome 4 horas por semana.',
    category: 'Automacao',
    priority: 'Media',
    status: 'Novo',
    requesterId: 'usr-ana',
    assigneeId: '',
    createdAt: '2026-03-02T08:45:00.000Z',
    updatedAt: '2026-03-02T08:45:00.000Z',
  },
];

export const seedComments = [
  {
    id: 'CMT-1001',
    requestId: 'REQ-1002',
    authorId: 'usr-carlos',
    authorName: 'Carlos Souza',
    message: 'Validando permissoes necessarias com o time de seguranca.',
    createdAt: '2026-03-01T14:10:00.000Z',
  },
];
