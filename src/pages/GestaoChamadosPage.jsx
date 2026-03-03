import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { parseManagementListSearch, createManagementListSearch } from '../lib/managementDrilldown';
import { getManagementRequests } from '../services/mockApi';
import { AREAS, DEMAND_TYPES, SERVICE_MACROS, STATUS_OPTIONS } from '../data/catalog/requestCatalog';

const defaultFilters = {
  periodDays: 90,
  area: [],
  servicoMacro: [],
  tipoDemanda: [],
  status: [],
  gm: 'ALL',
};

const drilldownLabels = {
  ALL: 'Todos os chamados no recorte global',
  ENTRADAS_PERIODO: 'Entradas no período',
  CONCLUIDOS_PERIODO: 'Concluídos no período',
  BACKLOG_ATUAL: 'Backlog atual',
  GM_PENDENTE: 'GM Pendente',
  ERRO_CRITICO_ABERTO: 'Erro Crítico em aberto',
  TREND_ENTRADAS: 'Tendência: Entradas',
  TREND_CONCLUIDOS: 'Tendência: Concluídos',
  TREND_BACKLOG: 'Tendência: Backlog',
  DISTRIBUTION_AREA: 'Distribuição por Área',
  DISTRIBUTION_SERVICO: 'Distribuição por Serviço Macro',
  SLA_DENTRO: 'Concluídos dentro do SLA',
  SLA_FORA: 'Concluídos fora do SLA',
  SLA_ATRASADOS_ABERTOS: 'Atrasados em aberto',
  GM_BACKLOG_PENDENTE: 'GM Pendente no backlog',
  GM_BACKLOG_COM: 'Com GM no backlog',
  GM_PENDENTE_SERVICO: 'GM Pendente por Serviço Macro',
  GM_MUDANCAS_PERIODO: 'Mudanças no período',
  GM_MUDANCAS_PERIODO_SEM_GM: 'Mudanças no período sem GM',
  SLA_AGING_BUCKET: 'Aging do backlog em aberto',
  CAPACITY_WIP_ASSIGNED: 'Em aberto atribuídos',
  CAPACITY_WIP_EXECUTOR: 'Em aberto atribuídos por executor',
  CAPACITY_WIP_EXECUTOR_DELAY: 'Em aberto por executor (em dia/atrasado)',
  CAPACITY_CONCLUIDOS_EXECUTOR: 'Concluídos por executor',
  CAPACITY_SEM_RESPONSAVEL: 'Chamados sem responsável',
  REQUEST_IDS: 'Seleção de chamados',
};

function sanitizeFilters(raw = {}) {
  const warnings = [];
  const validPeriods = [7, 30, 90];
  const periodDays = validPeriods.includes(Number(raw.periodDays)) ? Number(raw.periodDays) : defaultFilters.periodDays;
  if (raw.periodDays && periodDays !== Number(raw.periodDays)) {
    warnings.push('Período inválido foi normalizado.');
  }

  const sanitizeArray = (values, allowed, label) => {
    const original = Array.isArray(values) ? values : [];
    const cleaned = original.filter((item) => allowed.includes(item));
    if (cleaned.length !== original.length) {
      warnings.push(`${label} inválido(s) removido(s).`);
    }
    return cleaned;
  };

  const gm = ['ALL', 'WITH', 'PENDING'].includes(raw.gm) ? raw.gm : 'ALL';
  if (raw.gm && gm !== raw.gm) {
    warnings.push('Filtro de GM inválido foi removido.');
  }

  return {
    filters: {
      periodDays,
      area: sanitizeArray(raw.area, AREAS, 'Área'),
      servicoMacro: sanitizeArray(raw.servicoMacro, SERVICE_MACROS, 'Serviço macro'),
      tipoDemanda: sanitizeArray(raw.tipoDemanda, DEMAND_TYPES, 'Tipo de demanda'),
      status: sanitizeArray(raw.status, STATUS_OPTIONS, 'Status'),
      gm,
    },
    warnings,
  };
}

function sanitizeDrilldown(raw = {}) {
  const type = raw?.type || 'ALL';
  if (!drilldownLabels[type]) {
    return { drilldown: { type: 'ALL' }, warning: 'Drill-down inválido foi removido.' };
  }
  return { drilldown: raw, warning: '' };
}

function formatDate(value) {
  if (!value) {
    return '-';
  }
  return new Date(value).toLocaleString('pt-BR');
}

function sortItems(items, sortBy, direction) {
  const factor = direction === 'asc' ? 1 : -1;
  return [...items].sort((a, b) => {
    if (sortBy === 'idadeDias') {
      return (a.idadeDias - b.idadeDias) * factor;
    }
    const left = new Date(a.atualizadoEm).getTime();
    const right = new Date(b.atualizadoEm).getTime();
    return (left - right) * factor;
  });
}

function buildFilterChips(filters, drilldown) {
  const chips = [{ key: 'period', label: `Período: últimos ${filters.periodDays} dias` }];

  if (filters.area?.length) {
    chips.push({ key: 'area', label: `Área: ${filters.area.join(', ')}` });
  }
  if (filters.servicoMacro?.length) {
    chips.push({ key: 'servico', label: `Serviço Macro: ${filters.servicoMacro.join(', ')}` });
  }
  if (filters.tipoDemanda?.length) {
    chips.push({ key: 'tipo', label: `Tipo de Demanda: ${filters.tipoDemanda.join(', ')}` });
  }
  if (filters.status?.length) {
    chips.push({ key: 'status', label: `Status: ${filters.status.join(', ')}` });
  }
  if (filters.gm && filters.gm !== 'ALL') {
    const gmLabel = filters.gm === 'WITH' ? 'Com GM' : 'GM Pendente';
    chips.push({ key: 'gm', label: `GM: ${gmLabel}` });
  }
  let drilldownDetail = '';
  if (drilldown.type === 'DISTRIBUTION_AREA' && drilldown.values?.length) {
    drilldownDetail = ` (${drilldown.values.join(', ')})`;
  }
  if ((drilldown.type === 'DISTRIBUTION_SERVICO' || drilldown.type === 'GM_PENDENTE_SERVICO') && drilldown.values?.length) {
    drilldownDetail = ` (${drilldown.values.join(', ')})`;
  }
  if ((drilldown.type === 'CAPACITY_WIP_EXECUTOR' || drilldown.type === 'CAPACITY_WIP_EXECUTOR_DELAY' || drilldown.type === 'CAPACITY_CONCLUIDOS_EXECUTOR') && drilldown.executorIds?.length) {
    drilldownDetail = ` (${drilldown.executorIds.join(', ')})`;
  }
  if (drilldown.type === 'CAPACITY_WIP_EXECUTOR_DELAY') {
    drilldownDetail += drilldown.delayed ? ' [Atrasado]' : ' [Em dia]';
  }
  if (drilldown.type === 'SLA_AGING_BUCKET' && drilldown.bucketKey) {
    const labels = {
      D0_2: '0-2 dias',
      D3_7: '3-7 dias',
      D8_14: '8-14 dias',
      D15_PLUS: '>14 dias',
    };
    drilldownDetail = ` (${labels[drilldown.bucketKey] || drilldown.bucketKey})`;
  }
  chips.push({ key: 'drilldown', label: `Você está vendo: ${drilldownLabels[drilldown.type] || drilldown.type}${drilldownDetail}` });

  return chips;
}

function isDelayedOpen(item) {
  const finalStatus = ['Concluído', 'Cancelado'];
  if (finalStatus.includes(item.status)) {
    return false;
  }
  if (!item.slaHoras) {
    return false;
  }
  return item.idadeHoras > Number(item.slaHoras);
}

function LoadingRows() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-10 animate-pulse rounded bg-light-gray" />)}
    </div>
  );
}

export default function GestaoChamadosPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadNonce, setReloadNonce] = useState(0);
  const [data, setData] = useState({ total: 0, items: [] });
  const [searchText, setSearchText] = useState('');
  const [sortBy, setSortBy] = useState('atualizadoEm');
  const [sortDirection, setSortDirection] = useState('desc');

  const parsed = useMemo(() => parseManagementListSearch(location.search), [location.search]);
  const sanitizedFilters = useMemo(() => sanitizeFilters(parsed.filters || defaultFilters), [parsed.filters]);
  const sanitizedDrilldown = useMemo(() => sanitizeDrilldown(parsed.drilldown || { type: 'ALL' }), [parsed.drilldown]);
  const appliedFilters = sanitizedFilters.filters;
  const drilldown = sanitizedDrilldown.drilldown;
  const sanitizationWarning = useMemo(() => {
    const warnings = [...sanitizedFilters.warnings];
    if (sanitizedDrilldown.warning) {
      warnings.push(sanitizedDrilldown.warning);
    }
    return warnings.join(' ');
  }, [sanitizedDrilldown.warning, sanitizedFilters.warnings]);

  useEffect(() => {
    let mounted = true;
    getManagementRequests(appliedFilters, drilldown)
      .then((result) => {
        if (!mounted) {
          return;
        }
        setData(result);
        setLoading(false);
      })
      .catch(() => {
        if (!mounted) {
          return;
        }
        setError('Não foi possível carregar os chamados agora.');
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [appliedFilters, drilldown, reloadNonce]);

  const visibleItems = useMemo(() => {
    const query = (searchText || '').trim().toLowerCase();
    const filtered = query
      ? data.items.filter((item) => `${item.id} ${item.titulo}`.toLowerCase().includes(query))
      : data.items;
    return sortItems(filtered, sortBy, sortDirection);
  }, [data.items, searchText, sortBy, sortDirection]);

  const chips = useMemo(() => buildFilterChips(appliedFilters, drilldown), [appliedFilters, drilldown]);
  const dashboardSearch = createManagementListSearch({ filters: appliedFilters, sourceTab: parsed.sourceTab });

  const clearDrilldown = () => {
    setError('');
    setLoading(true);
    navigate(`/gestao/chamados${createManagementListSearch({ filters: appliedFilters, drilldown: { type: 'ALL' }, sourceTab: parsed.sourceTab })}`);
  };

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl">Lista Gerencial de Chamados</h2>
          <p className="mt-1 text-sm text-aluminium">Visão somente leitura para acompanhamento executivo.</p>
        </div>
        <Link to={`/gestao/dashboard${dashboardSearch}`} className="btn btn-secondary">Voltar ao Dashboard</Link>
      </header>

      <section className="card p-4">
        <p className="text-xs uppercase tracking-wide text-mid-gray">Contexto aplicado</p>
        {sanitizationWarning ? (
          <p className="mt-2 text-xs text-bauxite">{sanitizationWarning}</p>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-2">
          {chips.map((chip) => (
            <span key={chip.key} className="rounded-full border border-light-gray bg-light-gray px-3 py-1 text-xs text-mid-gray">{chip.label}</span>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button type="button" className="btn btn-secondary" onClick={clearDrilldown}>Limpar filtros do drill-down</button>
        </div>
      </section>

      <section className="card space-y-3 p-4">
        <div className="grid gap-3 md:grid-cols-3">
          <label className="text-sm text-mid-gray md:col-span-2">
            Buscar (ID/Título)
            <input className="input mt-1" value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="Ex.: CHD-0001" />
          </label>

          <label className="text-sm text-mid-gray">
            Ordenar por
            <select
              className="input mt-1"
              value={`${sortBy}:${sortDirection}`}
              onChange={(event) => {
                const [nextSortBy, nextDirection] = event.target.value.split(':');
                setSortBy(nextSortBy);
                setSortDirection(nextDirection);
              }}
            >
              <option value="atualizadoEm:desc">Atualizado em (mais recente)</option>
              <option value="atualizadoEm:asc">Atualizado em (mais antigo)</option>
              <option value="idadeDias:desc">Idade (maior)</option>
              <option value="idadeDias:asc">Idade (menor)</option>
            </select>
          </label>
        </div>

        {loading ? <LoadingRows /> : null}

        {!loading && error ? (
          <div className="rounded-md border border-light-gray bg-light-gray p-4">
            <p className="text-sm text-mid-gray">{error}</p>
            <button type="button" className="btn btn-secondary mt-3" onClick={() => { setError(''); setLoading(true); setReloadNonce((prev) => prev + 1); }}>
              Tentar novamente
            </button>
          </div>
        ) : null}

        {!loading && !error && visibleItems.length ? (
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-aluminium">
                <tr>
                  <th className="py-2 pr-3">ID</th>
                  <th className="py-2 pr-3">Título</th>
                  <th className="py-2 pr-3">Área</th>
                  <th className="py-2 pr-3">Serviço</th>
                  <th className="py-2 pr-3">Tipo</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Responsável</th>
                  <th className="py-2 pr-3">GM</th>
                  <th className="py-2 pr-3">Prioridade</th>
                  <th className="py-2 pr-3">SLA</th>
                  <th className="py-2 pr-3">Idade</th>
                  <th className="py-2 pr-1">Atualizado em</th>
                </tr>
              </thead>
              <tbody>
                {visibleItems.map((item) => (
                  <tr key={item.id} className="border-t border-light-gray text-mid-gray">
                    <td className="py-2 pr-3 font-semibold text-hydro-blue">
                      <Link className="hover:underline" to={`/gestao/chamados/${item.id}${location.search}`}>{item.id}</Link>
                    </td>
                    <td className="max-w-[360px] truncate py-2 pr-3" title={item.titulo}>{item.titulo}</td>
                    <td className="py-2 pr-3">{item.area}</td>
                    <td className="py-2 pr-3">{item.servicoMacro}</td>
                    <td className="py-2 pr-3">
                      <span className={`rounded px-2 py-0.5 text-xs ${item.tipoDemanda === 'Erro Crítico' ? 'bg-bauxite text-white' : 'bg-light-gray text-mid-gray'}`}>
                        {item.tipoDemanda}
                      </span>
                    </td>
                    <td className="py-2 pr-3">{item.status}</td>
                    <td className="py-2 pr-3">{item.executorResponsavelNome}</td>
                    <td className="py-2 pr-3">
                      <span className={`rounded px-2 py-0.5 text-xs ${item.gmPendente ? 'bg-bauxite text-white' : 'bg-green text-white'}`}>
                        {item.gmPendente ? 'GM Pendente' : 'Com GM'}
                      </span>
                    </td>
                    <td className="py-2 pr-3">{item.prioridade}</td>
                    <td className="py-2 pr-3">{item.slaHoras ? `${item.slaHoras}h` : '-'}</td>
                    <td className="py-2 pr-3">
                      <span className={isDelayedOpen(item) ? 'font-semibold text-bauxite' : ''}>{item.idadeDias}d</span>
                    </td>
                    <td className="py-2 pr-1">{formatDate(item.dataAtualizacao)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {!loading && !error && !visibleItems.length ? (
          <div className="rounded-md border border-light-gray bg-light-gray p-4">
            <p className="text-sm text-mid-gray">Nenhum chamado encontrado para os filtros atuais.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link className="btn btn-secondary" to={`/gestao/dashboard${dashboardSearch}`}>Voltar ao Dashboard</Link>
              <button type="button" className="btn btn-secondary" onClick={clearDrilldown}>Limpar filtros do drill-down</button>
            </div>
          </div>
        ) : null}

        {!loading && !error ? (
          <p className="text-xs text-mid-gray">Total do drill-down: {data.total} | exibidos após busca: {visibleItems.length}</p>
        ) : null}
      </section>
    </section>
  );
}

