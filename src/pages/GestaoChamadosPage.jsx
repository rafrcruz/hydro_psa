import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getManagementRequests } from '../services/mockApi';
import { parseManagementListSearch, createManagementListSearch, getDrilldownDescription } from '../lib/managementDrilldown';
import RequestTable from '../components/RequestTable';

function DrilldownHeader({ drilldown, total, onClear, filters }) {
  const description = getDrilldownDescription(drilldown, filters);

  return (
    <div className="card mb-4 p-4">
      <h3 className="text-lg font-semibold">{description}</h3>
      <p className="text-sm text-mid-gray">
        {total} chamados encontrados para este recorte.
      </p>
      <button type="button" className="btn btn-secondary btn-compact mt-2" onClick={onClear}>
        Limpar filtro de drill-down
      </button>
    </div>
  );
}

export default function GestaoChamadosPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const [requests, setRequests] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const searchContext = useMemo(() => parseManagementListSearch(location.search), [location.search]);

  useEffect(() => {
    setLoading(true);
    getManagementRequests(searchContext.filters, searchContext.drilldown)
      .then(({ items, total: totalCount }) => {
        setRequests(items);
        setTotal(totalCount);
      })
      .catch((err) => {
        setError('Falha ao carregar chamados.');
        console.error(err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [searchContext]);
  
  const clearDrilldown = () => {
    const nextSearch = createManagementListSearch({
      ...searchContext,
      drilldown: { type: 'ALL' },
    });
    navigate(`${location.pathname}${nextSearch}`);
  };

  const dashboardSearch = useMemo(() => {
    return createManagementListSearch({
      filters: searchContext.filters,
      sourceTab: searchContext.sourceTab,
    });
  }, [searchContext]);

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl">Lista Gerencial</h2>
          <p className="mt-1 text-sm text-aluminium">Visão detalhada para análise e drill-down do dashboard.</p>
        </div>
        <Link to={`/gestao/dashboard${dashboardSearch}`} className="btn btn-primary">
          Voltar ao Dashboard
        </Link>
      </header>

      {searchContext.drilldown?.type !== 'ALL' && (
        <DrilldownHeader drilldown={searchContext.drilldown} total={total} onClear={clearDrilldown} filters={searchContext.filters} />
      )}

      {loading ? (
        <p>Carregando...</p>
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : (
        <article className="card p-4">
          <RequestTable requests={requests} basePath="/gestao/chamados" showResponsavel showSla />
          {total === 0 && <p className="p-4 text-center text-sm text-mid-gray">Nenhum chamado encontrado para os filtros aplicados.</p>}
        </article>
      )}
    </section>
  );
}
