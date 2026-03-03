import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import MultiSelectDropdown from '../components/MultiSelectDropdown';
import DistributionBarList from '../components/DistributionBarList';
import BurndownBacklogChart from '../components/BurndownBacklogChart';
import CompactDonutCard from '../components/CompactDonutCard';
import ParetoAreaChart from '../components/ParetoAreaChart';
import ServiceMacroDonut from '../components/ServiceMacroDonut';
import AgingBucketsBars from '../components/AgingBucketsBars';
import StackedExecutorLoadBars from '../components/StackedExecutorLoadBars';
import StatCard from '../components/StatCard';
import { AREAS, DEMAND_TYPES, SERVICE_MACROS, STATUS_OPTIONS } from '../data/catalog/requestCatalog';
import { createManagementListSearch, parseManagementListSearch } from '../lib/managementDrilldown';
import { getManagementDashboardMetrics } from '../services/mockApi';

const defaultFilters = {
  periodDays: 90,
  area: [],
  servicoMacro: [],
  tipoDemanda: [],
  status: [],
  gm: 'ALL',
};

const tabs = [
  { id: 'geral', label: 'Visão Geral' },
  { id: 'distribuicoes', label: 'Distribuições' },
  { id: 'sla-gm', label: 'SLA & GM' },
  { id: 'capacidade', label: 'Capacidade' },
];

const periodOptions = [
  { value: 7, label: 'Últimos 7 dias' },
  { value: 30, label: 'Últimos 30 dias' },
  { value: 90, label: 'Últimos 90 dias' },
];

const gmOptions = [
  { value: 'ALL', label: 'Todos' },
  { value: 'WITH', label: 'Com GM' },
  { value: 'PENDING', label: 'GM Pendente' },
];

function isValidTab(tab) {
  return tabs.some((item) => item.id === tab);
}

function cloneFilters(filters) {
  return {
    periodDays: Number(filters.periodDays || defaultFilters.periodDays),
    area: [...(filters.area || [])],
    servicoMacro: [...(filters.servicoMacro || [])],
    tipoDemanda: [...(filters.tipoDemanda || [])],
    status: [...(filters.status || [])],
    gm: filters.gm || defaultFilters.gm,
  };
}

function sorted(values = []) {
  return [...values].sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));
}

function areFiltersEqual(left, right) {
  return (
    Number(left.periodDays) === Number(right.periodDays)
    && left.gm === right.gm
    && JSON.stringify(sorted(left.area)) === JSON.stringify(sorted(right.area))
    && JSON.stringify(sorted(left.servicoMacro)) === JSON.stringify(sorted(right.servicoMacro))
    && JSON.stringify(sorted(left.tipoDemanda)) === JSON.stringify(sorted(right.tipoDemanda))
    && JSON.stringify(sorted(left.status)) === JSON.stringify(sorted(right.status))
  );
}

function hasActiveFilters(filters) {
  return !areFiltersEqual(filters, defaultFilters);
}

function getPeriodLabel(days) {
  return periodOptions.find((item) => item.value === days)?.label || `${days} dias`;
}

function getGmLabel(value) {
  return gmOptions.find((item) => item.value === value)?.label || value;
}

function summarizeList(values, emptyLabel, nounPlural) {
  if (!values.length) {
    return emptyLabel;
  }
  if (values.length <= 2) {
    return values.join(', ');
  }
  return `${values.length} ${nounPlural}`;
}

function getActiveFilterChips(filters) {
  const chips = [
    {
      key: 'period',
      label: `Período: ${getPeriodLabel(filters.periodDays)}`,
      filterKey: 'periodDays',
      removable: filters.periodDays !== defaultFilters.periodDays,
    },
  ];

  filters.area.forEach((value) => chips.push({
    key: `area-${value}`,
    label: `Área: ${value}`,
    filterKey: 'area',
    value,
    removable: true,
  }));

  filters.servicoMacro.forEach((value) => chips.push({
    key: `macro-${value}`,
    label: `Serviço: ${value}`,
    filterKey: 'servicoMacro',
    value,
    removable: true,
  }));

  filters.tipoDemanda.forEach((value) => chips.push({
    key: `tipo-${value}`,
    label: `Tipo: ${value}`,
    filterKey: 'tipoDemanda',
    value,
    removable: true,
  }));

  filters.status.forEach((value) => chips.push({
    key: `status-${value}`,
    label: `Status: ${value}`,
    filterKey: 'status',
    value,
    removable: true,
  }));

  if (filters.gm !== 'ALL') {
    chips.push({
      key: 'gm',
      label: `GM: ${getGmLabel(filters.gm)}`,
      filterKey: 'gm',
      removable: true,
    });
  }

  return chips;
}

function formatRecorteResumo(filters) {
  const period = getPeriodLabel(filters.periodDays);
  const area = summarizeList(filters.area, 'Todas as áreas', 'áreas');
  const service = summarizeList(filters.servicoMacro, 'Todos os serviços', 'serviços');
  const type = summarizeList(filters.tipoDemanda, 'Todos', 'tipos');
  const status = summarizeList(filters.status, 'Todos', 'status');
  const gm = getGmLabel(filters.gm);
  return `Recorte: ${period} · ${area} · ${service} · Tipo: ${type} · Status: ${status} · GM: ${gm}`;
}

function LoadingSkeleton() {
  return (
    <section className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="card h-24 animate-pulse bg-light-gray" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card h-72 animate-pulse bg-light-gray lg:col-span-2" />
        <div className="card h-56 animate-pulse bg-light-gray" />
        <div className="card h-56 animate-pulse bg-light-gray" />
        <div className="card h-64 animate-pulse bg-light-gray lg:col-span-2" />
      </div>
    </section>
  );
}

function SectionTitle({ title, subtitle }) {
  return (
    <div>
      <h3 className="text-xl">{title}</h3>
      <p className="text-sm text-aluminium">{subtitle}</p>
    </div>
  );
}

export default function GestaoDashboardPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const initialContext = useMemo(() => parseManagementListSearch(location.search), [location.search]);
  const initialFilters = useMemo(() => cloneFilters(initialContext.filters || defaultFilters), [initialContext.filters]);

  const [activeTab, setActiveTab] = useState(isValidTab(initialContext.sourceTab) ? initialContext.sourceTab : 'geral');
  const [filters, setFilters] = useState(initialFilters);
  const [draftFilters, setDraftFilters] = useState(initialFilters);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadNonce, setReloadNonce] = useState(0);

  useEffect(() => {
    let mounted = true;

    getManagementDashboardMetrics(filters)
      .then((nextMetrics) => {
        if (mounted) {
          setMetrics(nextMetrics);
          setLoading(false);
        }
      })
      .catch(() => {
        if (mounted) {
          setError('Não foi possível carregar o dashboard agora.');
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [filters, reloadNonce]);

  const activeFilterChips = useMemo(() => getActiveFilterChips(filters), [filters]);
  const recorteResumo = useMemo(() => formatRecorteResumo(filters), [filters]);
  const burndownSeries = useMemo(() => {
    if (!metrics?.trends?.backlog?.length) {
      return [];
    }
    const closedByKey = (metrics.trends.entriesVsClosed || []).reduce((acc, item) => {
      acc[item.key] = Number(item.concluidos || 0);
      return acc;
    }, {});

    const merged = metrics.trends.backlog.map((point) => ({
      key: point.key,
      label: point.label,
      startAt: point.startAt,
      endAt: point.endAt,
      backlog: Number(point.backlog || 0),
      concluidos: Number(closedByKey[point.key] || 0),
    }));

    if (!merged.length) {
      return [];
    }

    const lastIndex = merged.length - 1;
    merged[lastIndex] = {
      ...merged[lastIndex],
      backlog: Number(metrics.cards.backlogAtual || 0),
    };
    return merged.some((item) => item.backlog > 0 || item.concluidos > 0) ? merged : [];
  }, [metrics]);
  const visibleChips = useMemo(() => (filtersExpanded ? activeFilterChips : activeFilterChips.slice(0, 5)), [activeFilterChips, filtersExpanded]);
  const hiddenChipCount = Math.max(0, activeFilterChips.length - visibleChips.length);
  const hasDraftChanges = useMemo(() => !areFiltersEqual(filters, draftFilters), [filters, draftFilters]);
  const formatCountKpi = (value) => (typeof value === 'number' && Number.isFinite(value) ? value : 'Indisponível');
  const formatPercentKpi = (value) => (typeof value === 'number' && Number.isFinite(value) ? `${value}%` : 'Indisponível');
  const distributionBaseLabel = 'entradas no período';
  const selectedAreaLabel = filters.area.length === 1 ? `Área selecionada: ${filters.area[0]}` : '';

  const setAndLoad = (nextFilters) => {
    const normalized = cloneFilters(nextFilters);
    setError('');
    setLoading(true);
    setFilters(normalized);
    setDraftFilters(normalized);
  };

  const updateDraftFilter = (key, value) => {
    setDraftFilters((prev) => ({ ...prev, [key]: value }));
  };

  const applyDraftFilters = () => {
    if (!hasDraftChanges) {
      setFiltersExpanded(false);
      return;
    }
    setError('');
    setLoading(true);
    setFilters(cloneFilters(draftFilters));
    setFiltersExpanded(false);
  };

  const clearFilters = () => {
    setAndLoad(defaultFilters);
    setFiltersExpanded(false);
  };

  const toggleFiltersPanel = () => {
    if (!filtersExpanded) {
      setDraftFilters(cloneFilters(filters));
      setFiltersExpanded(true);
      return;
    }
    setFiltersExpanded(false);
  };

  const removeFilterChip = (chip) => {
    const next = cloneFilters(filters);
    if (chip.filterKey === 'periodDays') {
      next.periodDays = defaultFilters.periodDays;
    }
    if (chip.filterKey === 'area') {
      next.area = next.area.filter((item) => item !== chip.value);
    }
    if (chip.filterKey === 'servicoMacro') {
      next.servicoMacro = next.servicoMacro.filter((item) => item !== chip.value);
    }
    if (chip.filterKey === 'tipoDemanda') {
      next.tipoDemanda = next.tipoDemanda.filter((item) => item !== chip.value);
    }
    if (chip.filterKey === 'status') {
      next.status = next.status.filter((item) => item !== chip.value);
    }
    if (chip.filterKey === 'gm') {
      next.gm = defaultFilters.gm;
    }
    setAndLoad(next);
  };

  const goToDrilldown = (drilldown) => {
    const search = createManagementListSearch({ filters, drilldown, sourceTab: activeTab });
    navigate(`/gestao/chamados${search}`);
  };

  const goToDetail = (requestId) => {
    navigate(`/gestao/chamados/${requestId}${createManagementListSearch({ filters, sourceTab: activeTab })}`);
  };

  const dashboardSelfSearch = createManagementListSearch({ filters, sourceTab: activeTab });

  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl">Dashboard Gerencial</h2>
          <p className="mt-1 text-sm text-aluminium">Painel executivo com visão consolidada e drill-down para Lista Gerencial.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-secondary" onClick={() => window.print()}>Imprimir visão</button>
          <Link
            to={`/gestao/chamados${createManagementListSearch({ filters, drilldown: { type: 'ALL' }, sourceTab: activeTab })}`}
            className="btn btn-secondary"
          >
            Abrir Lista Gerencial
          </Link>
        </div>
      </header>

      <section className="card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-[260px] flex-1">
            <p className="text-xs uppercase tracking-wide text-mid-gray">Resumo do recorte</p>
            <p className="mt-1 text-sm text-mid-gray">{recorteResumo}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-secondary btn-compact" onClick={toggleFiltersPanel}>
              {filtersExpanded ? 'Ocultar filtros' : 'Editar filtros'}
            </button>
            {hasActiveFilters(filters) ? (
              <button type="button" className="btn btn-secondary btn-compact" onClick={clearFilters}>Limpar filtros</button>
            ) : null}
          </div>
        </div>

        <div className="mt-3 border-t border-light-gray pt-3">
          <p className="text-xs uppercase tracking-wide text-mid-gray">Filtros ativos</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {visibleChips.map((chip) => (
              <span key={chip.key} className="inline-flex max-w-full items-center gap-2 rounded-full border border-light-gray bg-light-gray px-3 py-1 text-xs text-mid-gray">
                <span className="truncate">{chip.label}</span>
                {chip.removable ? (
                  <button
                    type="button"
                    className="text-aluminium hover:text-hydro-blue"
                    onClick={() => removeFilterChip(chip)}
                    aria-label={`Remover filtro ${chip.label}`}
                  >
                    x
                  </button>
                ) : null}
              </span>
            ))}
            {hiddenChipCount > 0 ? (
              <span className="rounded-full border border-light-gray bg-white px-3 py-1 text-xs text-aluminium">
                +{hiddenChipCount} filtros
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-xs text-aluminium">Os filtros globais continuam aplicados em todas as abas.</p>
        </div>

        {filtersExpanded ? (
          <div className="mt-4 grid gap-3 border-t border-light-gray pt-4 md:grid-cols-2 lg:grid-cols-3">
            <label className="text-sm text-mid-gray">
              Período
              <select
                value={draftFilters.periodDays}
                onChange={(event) => updateDraftFilter('periodDays', Number(event.target.value))}
                className="input mt-1"
              >
                {periodOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>

            <label className="text-sm text-mid-gray">
              Área
              <MultiSelectDropdown
                label="Área"
                options={AREAS.map((area) => ({ value: area, label: area }))}
                selectedValues={draftFilters.area}
                onChange={(values) => updateDraftFilter('area', values)}
                allLabel="Todas"
              />
            </label>

            <label className="text-sm text-mid-gray">
              Serviço Macro
              <MultiSelectDropdown
                label="Serviço Macro"
                options={SERVICE_MACROS.map((service) => ({ value: service, label: service }))}
                selectedValues={draftFilters.servicoMacro}
                onChange={(values) => updateDraftFilter('servicoMacro', values)}
                allLabel="Todos"
              />
            </label>

            <label className="text-sm text-mid-gray">
              Tipo de Demanda
              <MultiSelectDropdown
                label="Tipo de Demanda"
                options={DEMAND_TYPES.map((type) => ({ value: type, label: type }))}
                selectedValues={draftFilters.tipoDemanda}
                onChange={(values) => updateDraftFilter('tipoDemanda', values)}
                allLabel="Todos"
              />
            </label>

            <label className="text-sm text-mid-gray">
              Status
              <MultiSelectDropdown
                label="Status"
                options={STATUS_OPTIONS.map((status) => ({ value: status, label: status }))}
                selectedValues={draftFilters.status}
                onChange={(values) => updateDraftFilter('status', values)}
                allLabel="Todos"
              />
            </label>

            <label className="text-sm text-mid-gray">
              GM
              <select value={draftFilters.gm} onChange={(event) => updateDraftFilter('gm', event.target.value)} className="input mt-1">
                {gmOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>

            <div className="flex flex-wrap items-center gap-2 md:col-span-2 lg:col-span-3">
              <button type="button" className="btn btn-primary" onClick={applyDraftFilters} disabled={!hasDraftChanges}>
                Aplicar
              </button>
              <button type="button" className="btn btn-secondary" onClick={clearFilters}>
                Limpar filtros
              </button>
            </div>
          </div>
        ) : null}
      </section>

      <section className="card p-2">
        <div className="flex flex-wrap gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`rounded-md px-3 py-2 text-sm ${activeTab === tab.id ? 'bg-hydro-blue text-white' : 'text-mid-gray hover:bg-light-gray'}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      {loading ? <LoadingSkeleton /> : null}

      {!loading && error ? (
        <section className="card p-4">
          <h3 className="text-lg">Erro ao carregar</h3>
          <p className="mt-2 text-sm text-aluminium">{error}</p>
          <button
            type="button"
            className="btn btn-secondary mt-3"
            onClick={() => {
              setError('');
              setLoading(true);
              setReloadNonce((prev) => prev + 1);
            }}
          >
            Tentar novamente
          </button>
        </section>
      ) : null}

      {!loading && !error && metrics ? (
        <>
          {activeTab === 'geral' ? (
            <section className="space-y-4">
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
                <StatCard compact title="Entradas no período" value={formatCountKpi(metrics.cards?.entradasNoPeriodo)} hint="no período" onClick={() => goToDrilldown({ type: 'ENTRADAS_PERIODO' })} />
                <StatCard compact title="Concluídos no período" value={formatCountKpi(metrics.cards?.concluidosNoPeriodo)} hint="no período" onClick={() => goToDrilldown({ type: 'CONCLUIDOS_PERIODO' })} />
                <StatCard compact title="Backlog atual" value={formatCountKpi(metrics.cards?.backlogAtual)} hint="agora" onClick={() => goToDrilldown({ type: 'BACKLOG_ATUAL' })} />
                <StatCard compact title="Atrasados em aberto" value={formatCountKpi(metrics.slaHealth?.delayedOpenCount)} hint="agora" onClick={() => goToDrilldown({ type: 'SLA_ATRASADOS_ABERTOS' })} />
                <StatCard compact title="% SLA cumprido" value={formatPercentKpi(metrics.slaHealth?.concludedWithinSlaPercent)} hint="no período" onClick={() => goToDrilldown({ type: 'SLA_DENTRO' })} />
                <StatCard compact title="GM pendente" value={formatCountKpi(metrics.gmGovernance?.pendingCount)} hint={typeof metrics.gmGovernance?.pendingPercentOfBacklog === 'number' ? `${metrics.gmGovernance.pendingPercentOfBacklog}% do backlog` : 'indisponível'} onClick={() => goToDrilldown({ type: 'GM_BACKLOG_PENDENTE' })} />
                <StatCard compact title="Erro crítico em aberto" value={formatCountKpi(metrics.cards?.errosCriticosAbertos)} hint="agora" onClick={() => goToDrilldown({ type: 'ERRO_CRITICO_ABERTO' })} />
                <StatCard compact title="Sem responsável" value={formatCountKpi(metrics.teamCapacity?.unassignedBacklogCount)} hint="em aberto agora" onClick={() => goToDrilldown({ type: 'CAPACITY_SEM_RESPONSAVEL' })} />
              </div>

              {metrics.trace.totalComFiltrosGlobais === 0 ? (
                <article className="card p-4">
                  <h3 className="text-lg">Sem dados para o período e filtros atuais</h3>
                  <p className="mt-2 text-sm text-aluminium">Ajuste o recorte ou limpe os filtros para visualizar indicadores.</p>
                </article>
              ) : null}

              <div className="grid gap-4 lg:grid-cols-2">
                <article className="card p-4 lg:col-span-2">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-lg">Evolução do backlog (burndown)</h3>
                      <p className="mt-1 text-xs text-aluminium">Backlog em aberto e concluídos por intervalo</p>
                    </div>
                    <p className="text-xs text-aluminium">Slot A · visão executiva compacta</p>
                  </div>
                  {metrics.trace.totalComFiltrosGlobais === 0 ? (
                    <p className="text-sm text-aluminium">Sem dados para o período/filtros.</p>
                  ) : (
                    <BurndownBacklogChart
                      data={burndownSeries}
                      granularityLabel={metrics.trends.granularityLabel}
                      emptyLabel="Sem dados para o período/filtros."
                      onIntervalClick={(row) => goToDrilldown({ type: 'TREND_ENTRADAS', startAt: row.startAt, endAt: row.endAt })}
                    />
                  )}
                </article>

                <CompactDonutCard
                  title="SLA (concluídos no período)"
                  subtitle="Dentro vs fora do SLA"
                  valueLabel={formatPercentKpi(metrics.slaHealth?.concludedWithinSlaPercent)}
                  valueHint="percentual dentro do SLA"
                  contextLabel="Base: concluídos no período"
                  emptyLabel="Sem concluídos no período."
                  items={[
                    {
                      key: 'WITHIN_SLA',
                      label: 'Dentro do SLA',
                      value: Number(metrics.slaHealth?.concludedWithinSlaCount || 0),
                      percent: Number(metrics.slaHealth?.concludedWithinSlaPercent || 0),
                      color: '#27ae60',
                    },
                    {
                      key: 'OUTSIDE_SLA',
                      label: 'Fora do SLA',
                      value: Number(metrics.slaHealth?.concludedOutsideSlaCount || 0),
                      percent: Math.max(0, 100 - Number(metrics.slaHealth?.concludedWithinSlaPercent || 0)),
                      color: '#d35454',
                    },
                  ]}
                  onSegmentClick={(segment) => goToDrilldown({ type: segment.key === 'WITHIN_SLA' ? 'SLA_DENTRO' : 'SLA_FORA' })}
                />

                <CompactDonutCard
                  title="GM (backlog atual)"
                  subtitle="Com GM vs GM pendente"
                  valueLabel={`${formatCountKpi(metrics.gmGovernance?.pendingCount)}${typeof metrics.gmGovernance?.pendingPercentOfBacklog === 'number' ? ` (${metrics.gmGovernance.pendingPercentOfBacklog}%)` : ''}`}
                  valueHint="GM pendente no backlog"
                  contextLabel="Base: backlog atual"
                  emptyLabel="Sem backlog no recorte."
                  items={[
                    {
                      key: 'WITH_GM',
                      label: 'Com GM',
                      value: Number(metrics.gmGovernance?.withGmCount || 0),
                      percent: Number(metrics.gmGovernance?.withGmPercentOfBacklog || 0),
                      color: '#2f80ed',
                    },
                    {
                      key: 'PENDING_GM',
                      label: 'GM pendente',
                      value: Number(metrics.gmGovernance?.pendingCount || 0),
                      percent: Number(metrics.gmGovernance?.pendingPercentOfBacklog || 0),
                      color: '#a6403a',
                    },
                  ]}
                  onSegmentClick={(segment) => goToDrilldown({ type: segment.key === 'WITH_GM' ? 'GM_BACKLOG_COM' : 'GM_BACKLOG_PENDENTE' })}
                />

                <article className="card p-4 lg:col-span-2">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-lg">Atenção: Top atrasos</h3>
                      <p className="mt-1 text-xs text-aluminium">Top 5 por maior estouro de SLA (em aberto)</p>
                    </div>
                    <button type="button" className="btn btn-secondary btn-compact" onClick={() => goToDrilldown({ type: 'SLA_ATRASADOS_ABERTOS' })}>
                      Ver lista completa
                    </button>
                  </div>
                  {metrics.slaHealth?.topDelays?.length ? (
                    <div className="max-h-72 overflow-auto">
                      <table className="min-w-full text-sm">
                        <thead className="text-left text-xs uppercase tracking-wide text-aluminium">
                          <tr>
                            <th className="py-2 pr-3">ID</th>
                            <th className="py-2 pr-3">Título</th>
                            <th className="py-2 pr-3">Área</th>
                            <th className="py-2 pr-3">Serviço</th>
                            <th className="py-2 pr-3">Status</th>
                            <th className="py-2 pr-3">Responsável</th>
                            <th className="py-2 pr-3">Idade</th>
                            <th className="py-2 pr-3">Estouro SLA</th>
                            <th className="py-2 pr-1">GM</th>
                          </tr>
                        </thead>
                        <tbody>
                          {metrics.slaHealth.topDelays.slice(0, 5).map((row) => (
                            <tr key={row.id} className="border-t border-light-gray text-mid-gray">
                              <td className="py-2 pr-3 font-semibold text-hydro-blue">
                                <button type="button" className="hover:underline" onClick={() => goToDetail(row.id)}>{row.id}</button>
                              </td>
                              <td className="py-2 pr-3">{row.titulo}</td>
                              <td className="py-2 pr-3">{row.area}</td>
                              <td className="py-2 pr-3">{row.servicoMacro}</td>
                              <td className="py-2 pr-3">{row.status}</td>
                              <td className="py-2 pr-3">{row.responsavel || 'Sem responsável'}</td>
                              <td className="py-2 pr-3">{row.idadeLabel || '-'}</td>
                              <td className="py-2 pr-3 text-bauxite">{row.excedeuSlaLabel || '-'}</td>
                              <td className="py-2 pr-1">{row.gm ? 'Com GM' : 'GM pendente'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm text-aluminium">Sem itens para o recorte atual.</p>
                  )}
                </article>
              </div>
            </section>
          ) : null}

          {activeTab === 'distribuicoes' ? (
            <section className="grid gap-4 lg:grid-cols-3">
              <ParetoAreaChart
                rows={metrics.distributions.byArea.rows}
                total={metrics.distributions.byArea.total}
                baseLabel={distributionBaseLabel}
                selectedAreaLabel={selectedAreaLabel}
                emptyLabel="Sem dados para o recorte."
                onBarClick={(row) => goToDrilldown({ type: 'DISTRIBUTION_AREA', values: row.values || [row.label] })}
              />
              <ServiceMacroDonut
                rows={metrics.distributions.byServiceMacro.rows}
                total={metrics.distributions.byServiceMacro.total}
                baseLabel={distributionBaseLabel}
                emptyLabel="Sem dados para o recorte."
                onSliceClick={(segment) => goToDrilldown({ type: 'DISTRIBUTION_SERVICO', values: [segment.key] })}
              />
            </section>
          ) : null}

          {activeTab === 'sla-gm' ? (
            <section className="grid gap-4 lg:grid-cols-2">
              <section className="space-y-3 lg:col-span-2">
                <SectionTitle title="SLA & GM" subtitle="Saúde dos concluídos no período e governança do backlog atual." />
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <StatCard title="% Concluídos dentro do SLA" value={`${metrics.slaHealth.concludedWithinSlaPercent}%`} hint="no período" onClick={() => goToDrilldown({ type: 'SLA_DENTRO' })} />
                  <StatCard title="Concluídos fora do SLA" value={metrics.slaHealth.concludedOutsideSlaCount} hint="no período" onClick={() => goToDrilldown({ type: 'SLA_FORA' })} />
                  <StatCard title="Atrasados em aberto" value={metrics.slaHealth.delayedOpenCount} hint="agora" onClick={() => goToDrilldown({ type: 'SLA_ATRASADOS_ABERTOS' })} />
                  <StatCard title="GM pendente" value={metrics.gmGovernance.pendingCount} hint={`${metrics.gmGovernance.pendingPercentOfBacklog}% do backlog`} onClick={() => goToDrilldown({ type: 'GM_BACKLOG_PENDENTE' })} />
                </div>
              </section>

              <CompactDonutCard
                title="SLA (concluídos no período)"
                subtitle="Dentro vs fora do SLA"
                valueLabel={`${metrics.slaHealth.concludedWithinSlaPercent}%`}
                valueHint="percentual dentro do SLA"
                contextLabel="Base: concluídos no período"
                emptyLabel="Sem concluídos no período."
                items={[
                  {
                    key: 'WITHIN_SLA',
                    label: 'Dentro do SLA',
                    value: Number(metrics.slaHealth.concludedWithinSlaCount || 0),
                    percent: Number(metrics.slaHealth.concludedWithinSlaPercent || 0),
                    color: '#27ae60',
                  },
                  {
                    key: 'OUTSIDE_SLA',
                    label: 'Fora do SLA',
                    value: Number(metrics.slaHealth.concludedOutsideSlaCount || 0),
                    percent: Math.max(0, 100 - Number(metrics.slaHealth.concludedWithinSlaPercent || 0)),
                    color: '#d35454',
                  },
                ]}
                onSegmentClick={(segment) => goToDrilldown({ type: segment.key === 'WITHIN_SLA' ? 'SLA_DENTRO' : 'SLA_FORA' })}
              />

              <AgingBucketsBars
                title="Aging dos abertos"
                subtitle="Faixas de idade do backlog atual"
                rows={metrics.slaHealth.openAgingBuckets.rows}
                total={metrics.slaHealth.openAgingBuckets.total}
                emptyLabel="Sem backlog no recorte."
                onBucketClick={(bucket) => goToDrilldown({ type: 'SLA_AGING_BUCKET', bucketKey: bucket.key })}
              />

              <CompactDonutCard
                title="GM (backlog atual)"
                subtitle="Com GM vs GM pendente"
                valueLabel={`${metrics.gmGovernance.pendingCount} (${metrics.gmGovernance.pendingPercentOfBacklog}%)`}
                valueHint="GM pendente no backlog"
                contextLabel="Base: backlog atual"
                emptyLabel="Sem backlog no recorte."
                items={[
                  {
                    key: 'WITH_GM',
                    label: 'Com GM',
                    value: Number(metrics.gmGovernance.withGmCount || 0),
                    percent: Number(metrics.gmGovernance.withGmPercentOfBacklog || 0),
                    color: '#2f80ed',
                  },
                  {
                    key: 'PENDING_GM',
                    label: 'GM pendente',
                    value: Number(metrics.gmGovernance.pendingCount || 0),
                    percent: Number(metrics.gmGovernance.pendingPercentOfBacklog || 0),
                    color: '#a6403a',
                  },
                ]}
                onSegmentClick={(segment) => goToDrilldown({ type: segment.key === 'WITH_GM' ? 'GM_BACKLOG_COM' : 'GM_BACKLOG_PENDENTE' })}
              />

              <DistributionBarList
                title="GM pendente por Serviço Macro"
                subtitle="Ranking no backlog atual"
                total={metrics.gmGovernance.pendingCount}
                rows={metrics.gmGovernance.pendingByServiceRanking}
                emptyLabel="Sem backlog no recorte."
                getBarColor={() => '#a6403a'}
                formatValueLabel={(row) => `${row.count} | ${row.pendingPercentOfServiceBacklog}% do backlog do serviço`}
                onRowClick={(row) => goToDrilldown({ type: 'GM_PENDENTE_SERVICO', values: row.values || [row.label] })}
              />
            </section>
          ) : null}

          {activeTab === 'capacidade' ? (
            <section className="grid gap-4 lg:grid-cols-2">
              <section className="space-y-3 lg:col-span-2">
                <SectionTitle title="Capacidade do Time" subtitle="Carga de trabalho em aberto e produtividade por executor." />
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  <StatCard title="Sem responsável" value={metrics.teamCapacity.unassignedBacklogCount} hint="backlog atual" onClick={() => goToDrilldown({ type: 'CAPACITY_SEM_RESPONSAVEL' })} />
                  <StatCard title="% sem responsável" value={`${metrics.teamCapacity.unassignedBacklogPercent}%`} hint="sobre backlog total" onClick={() => goToDrilldown({ type: 'CAPACITY_SEM_RESPONSAVEL' })} />
                  <StatCard title="Em aberto atribuídos" value={metrics.teamCapacity.wipAssignedTotal} hint="carga atual" onClick={() => goToDrilldown({ type: 'CAPACITY_WIP_ASSIGNED' })} />
                </div>
              </section>

              <StackedExecutorLoadBars
                title="Em aberto atribuídos por executor"
                subtitle="Base: backlog atribuído | ordenado por maior carga"
                rows={metrics.teamCapacity.wipByExecutor.rows}
                emptyLabel="Sem dados para o recorte."
                onRowClick={(row) => goToDrilldown({ type: 'CAPACITY_WIP_EXECUTOR', executorIds: row.values || [row.key] })}
                onSegmentClick={(row, segment) => goToDrilldown({
                  type: 'CAPACITY_WIP_EXECUTOR_DELAY',
                  executorIds: row.values || [row.key],
                  delayed: segment === 'DELAYED',
                })}
              />
              <StackedExecutorLoadBars
                title="Concluídos por executor (período)"
                subtitle="Base: concluídos no período | ordenado por volume"
                rows={metrics.teamCapacity.completedByExecutor.rows}
                emptyLabel="Sem dados para o recorte."
                onRowClick={(row) => goToDrilldown({ type: 'CAPACITY_CONCLUIDOS_EXECUTOR', executorIds: row.values || [row.key] })}
                onSegmentClick={(row, segment) => goToDrilldown({
                  type: 'CAPACITY_CONCLUIDOS_EXECUTOR_SLA',
                  executorIds: row.values || [row.key],
                  delayed: segment === 'DELAYED',
                })}
              />

              <article className="card p-4 lg:col-span-2">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-lg">Sem responsável (prioridade de gestão)</h4>
                  <button type="button" className="btn btn-secondary btn-compact" onClick={() => goToDrilldown({ type: 'CAPACITY_SEM_RESPONSAVEL' })}>Ver lista completa</button>
                </div>

                {metrics.teamCapacity.unassignedOpenList.length ? (
                  <div className="max-h-72 overflow-auto">
                    <table className="min-w-full text-sm">
                      <thead className="text-left text-xs uppercase tracking-wide text-aluminium">
                        <tr>
                          <th className="py-2 pr-3">ID</th><th className="py-2 pr-3">Título</th><th className="py-2 pr-3">Área</th><th className="py-2 pr-3">Serviço</th><th className="py-2 pr-3">Status</th><th className="py-2 pr-3">Idade (dias)</th><th className="py-2 pr-1">GM</th>
                        </tr>
                      </thead>
                      <tbody>
                        {metrics.teamCapacity.unassignedOpenList.slice(0, 10).map((row) => (
                          <tr key={row.id} className="border-t border-light-gray text-mid-gray">
                            <td className="py-2 pr-3 font-semibold text-hydro-blue"><button type="button" className="hover:underline" onClick={() => goToDetail(row.id)}>{row.id}</button></td>
                            <td className="py-2 pr-3">{row.titulo}</td><td className="py-2 pr-3">{row.area}</td><td className="py-2 pr-3">{row.servicoMacro}</td><td className="py-2 pr-3">{row.status}</td><td className="py-2 pr-3">{row.idadeDias}</td><td className="py-2 pr-1">{row.gm ? 'Sim' : 'Não'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-aluminium">Nenhum chamado sem responsável no recorte.</p>
                )}
              </article>
            </section>
          ) : null}

          <div className="pt-1 text-sm">
            <Link to={`/gestao/chamados${createManagementListSearch({ filters, drilldown: { type: 'ALL' }, sourceTab: activeTab })}`} className="text-hydro-blue hover:underline">Ver Lista Gerencial completa</Link>
            <span className="mx-2 text-aluminium">|</span>
            <Link to={`/gestao/dashboard${dashboardSelfSearch}`} className="text-hydro-blue hover:underline">Atualizar visão atual</Link>
          </div>
        </>
      ) : null}
    </section>
  );
}
