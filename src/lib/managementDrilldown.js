const FILTERS_KEY = 'f';
const DRILLDOWN_KEY = 'd';
const SOURCE_TAB_KEY = 'tab';

function encodePayload(value) {
  return encodeURIComponent(JSON.stringify(value));
}

function decodePayload(value, fallback) {
  if (!value) {
    return fallback;
  }
  try {
    return JSON.parse(decodeURIComponent(value));
  } catch {
    return fallback;
  }
}

export function createManagementListSearch({ filters, drilldown, sourceTab }) {
  const params = new URLSearchParams();
  if (filters) {
    params.set(FILTERS_KEY, encodePayload(filters));
  }
  if (drilldown) {
    params.set(DRILLDOWN_KEY, encodePayload(drilldown));
  }
  if (sourceTab) {
    params.set(SOURCE_TAB_KEY, sourceTab);
  }
  return `?${params.toString()}`;
}

export function parseManagementListSearch(search) {
  const params = new URLSearchParams(search || '');
  return {
    filters: decodePayload(params.get(FILTERS_KEY), null),
    drilldown: decodePayload(params.get(DRILLDOWN_KEY), { type: 'ALL' }),
    sourceTab: params.get(SOURCE_TAB_KEY) || 'geral',
  };
}

export function getDrilldownDescription(drilldown = {}, filters = {}) {
  const { type = 'ALL' } = drilldown;
  if (type === 'ALL') {
    return 'Visão Completa';
  }
  if (type === 'ENTRADAS_PERIODO') {
    return `Entradas no período de ${filters.periodDays || 'N/A'} dias`;
  }
  if (type === 'CONCLUIDOS_PERIODO') {
    return `Concluídos no período de ${filters.periodDays || 'N/A'} dias`;
  }
  if (type === 'BACKLOG_ATUAL') {
    return 'Backlog atual (todos os chamados em aberto)';
  }
  if (type === 'SLA_ATRASADOS_ABERTOS') {
    return 'Atrasados em aberto';
  }
  if (type === 'SLA_DENTRO') {
    return 'Concluídos no período DENTRO do SLA';
  }
  if (type === 'SLA_FORA') {
    return 'Concluídos no período FORA do SLA';
  }
  if (type === 'GM_BACKLOG_PENDENTE') {
    return 'Backlog atual com GM pendente';
  }
  if (type === 'GM_BACKLOG_COM') {
    return 'Backlog atual com GM informada';
  }
  if (type === 'ERRO_CRITICO_ABERTO') {
    return 'Backlog atual do tipo "Erro Crítico"';
  }
  if (type === 'CAPACITY_SEM_RESPONSAVEL') {
    return 'Backlog atual sem responsável atribuído';
  }
  if (type === 'DISTRIBUTION_AREA') {
    return `Entradas no período da(s) área(s): ${drilldown.values?.join(', ')}`;
  }
  if (type === 'DISTRIBUTION_SERVICO') {
    return `Entradas no período do(s) serviço(s): ${drilldown.values?.join(', ')}`;
  }
  if (type === 'SLA_AGING_BUCKET') {
    return `Backlog atual na faixa de idade: ${drilldown.bucketKey}`;
  }
  if (type === 'GM_PENDENTE_SERVICO') {
    return `Backlog com GM pendente do(s) serviço(s): ${drilldown.values?.join(', ')}`;
  }
  if (type === 'CAPACITY_WIP_EXECUTOR') {
    return `Backlog atual atribuído ao(s) executor(es) selecionado(s)`;
  }
  if (type === 'CAPACITY_CONCLUIDOS_EXECUTOR') {
    return `Concluídos no período pelo(s) executor(es) selecionado(s)`;
  }
  return `Recorte: ${type}`;
}

