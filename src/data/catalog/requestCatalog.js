export const AREAS = [
  'Recebimento de Bauxita',
  'Digestão',
  'Clarificação',
  'Filtro Prensa',
  'Precipitação',
  'Calcinação',
  'Vapor e Utilidades',
  'Águas e Efluentes',
  'Automação e Energia',
  'Porto',
  'Meio Ambiente',
];

export const SERVICE_MACROS = ['PIMS', 'SDCD', 'Redes', 'Elétrica', 'Automação', 'Outros'];

export const SERVICE_SUBCATEGORIES = {
  PIMS: ['Historiador PI', 'Dashboards PI Vision', 'Interface de dados PI', 'Tag management'],
  SDCD: ['Malha de controle', 'Intertravamento', 'Sinótico operação', 'Controle avançado'],
  Redes: ['Switch industrial', 'Link de fibra', 'Firewall OT', 'Acesso remoto'],
  Elétrica: ['Subestação', 'Proteção elétrica', 'Qualidade de energia', 'Relé digital'],
  'Automação': ['CLP', 'IHM', 'Robô de processo', 'Integração MES'],
  Outros: ['Documentação', 'Treinamento', 'Análise técnica', 'Suporte geral'],
};

export const DEMAND_TYPES = ['Nova Solicitação', 'Erro Crítico', 'Mudança'];

export const STATUS_OPTIONS = ['Novo', 'Triagem', 'Em atendimento', 'Aguardando solicitante', 'Concluído', 'Cancelado'];

export const FINAL_STATUS = ['Concluído', 'Cancelado'];

export const EVENT_TYPES = {
  CHAMADO_CRIADO: 'CHAMADO_CRIADO',
  STATUS_ALTERADO: 'STATUS_ALTERADO',
  GM_ATUALIZADA: 'GM_ATUALIZADA',
  ATRIBUIDO_EXECUTOR: 'ATRIBUIDO_EXECUTOR',
  PRIORIDADE_RECALCULADA: 'PRIORIDADE_RECALCULADA',
  SLA_RECALCULADO: 'SLA_RECALCULADO',
};

export function resolveGroupExecutor(serviceMacro) {
  const map = {
    PIMS: 'Automação',
    SDCD: 'Automação',
    Redes: 'Infraestrutura OT',
    'Elétrica': 'Elétrica',
    'Automação': 'Automação',
    Outros: 'Automação',
  };
  return map[serviceMacro] || 'Automação';
}

export function calculatePriority({ tipoDemanda, servicoMacro }) {
  if (tipoDemanda === 'Erro Crítico') {
    return 'Alta';
  }
  if (servicoMacro === 'Elétrica' || servicoMacro === 'SDCD') {
    return 'Alta';
  }
  if (tipoDemanda === 'Mudança') {
    return 'Média';
  }
  return 'Baixa';
}

export function calculateSlaHours(priority) {
  if (priority === 'Alta') {
    return 8;
  }
  if (priority === 'Média') {
    return 24;
  }
  return 72;
}
