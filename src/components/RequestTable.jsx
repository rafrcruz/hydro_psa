import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const statusStyle = {
  Novo: 'bg-hydro-light-blue text-white',
  Triagem: 'bg-purple text-white',
  'Em atendimento': 'bg-green text-white',
  'Aguardando solicitante': 'bg-warm text-black',
  'Concluído': 'bg-hydro-blue text-white',
  Cancelado: 'bg-bauxite text-white',
};

const priorityStyle = {
  Alta: 'bg-bauxite text-white',
  'Média': 'bg-warm text-black',
  Baixa: 'bg-light-gray text-hydro-blue',
};

const columns = [
  { key: 'id', label: 'ID' },
  { key: 'titulo', label: 'Título' },
  { key: 'area', label: 'Área' },
  { key: 'servicoMacro', label: 'Serviço' },
  { key: 'tipoDemanda', label: 'Tipo' },
  { key: 'prioridade', label: 'Prioridade' },
  { key: 'status', label: 'Status' },
  { key: 'gmPendente', label: 'GM?' },
  { key: 'dataAtualizacao', label: 'Atualizado em' },
];

function formatDate(value) {
  return new Date(value).toLocaleString('pt-BR');
}

function sortValue(request, key) {
  if (key === 'gmPendente') {
    return request.gmPendente ? 0 : 1;
  }
  if (key === 'dataAtualizacao') {
    return new Date(request.dataAtualizacao).getTime();
  }
  return request[key] || '';
}

function sortRequests(list, key, direction) {
  const multiplier = direction === 'asc' ? 1 : -1;
  return [...list].sort((a, b) => {
    const left = sortValue(a, key);
    const right = sortValue(b, key);
    if (typeof left === 'number' && typeof right === 'number') {
      return (left - right) * multiplier;
    }
    return String(left).localeCompare(String(right), 'pt-BR', { sensitivity: 'base' }) * multiplier;
  });
}

function SortLabel({ label, active, direction }) {
  return (
    <>
      {label}
      <span className="ml-1 text-xs text-aluminium">↕</span>
      {active ? <span className="ml-1">{direction === 'asc' ? '↑' : '↓'}</span> : null}
    </>
  );
}

export default function RequestTable({
  requests,
  basePath,
  showResponsavel = false,
  paginated = false,
  pageSize = 10,
}) {
  const navigate = useNavigate();
  const [sortBy, setSortBy] = useState('dataAtualizacao');
  const [sortDirection, setSortDirection] = useState('desc');
  const [page, setPage] = useState(1);

  const sortedRequests = useMemo(
    () => sortRequests(requests, sortBy, sortDirection),
    [requests, sortBy, sortDirection],
  );

  const totalPages = paginated ? Math.max(1, Math.ceil(sortedRequests.length / pageSize)) : 1;
  const currentPage = Math.min(page, totalPages);

  const visibleRequests = useMemo(() => {
    if (!paginated) {
      return sortedRequests;
    }
    const start = (currentPage - 1) * pageSize;
    return sortedRequests.slice(start, start + pageSize);
  }, [paginated, sortedRequests, currentPage, pageSize]);

  const onSort = (key) => {
    setPage(1);
    if (sortBy === key) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortBy(key);
    setSortDirection(key === 'dataAtualizacao' ? 'desc' : 'asc');
  };

  if (!requests.length) {
    return <p className="text-sm text-aluminium">Nenhum chamado encontrado com os filtros selecionados.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="w-full text-[0.98rem]">
          <thead>
            <tr className="border-b border-light-gray text-left text-mid-gray">
              {columns.map((column) => (
                <th key={column.key} className="py-2">
                  <button type="button" className="font-semibold hover:text-hydro-blue" onClick={() => onSort(column.key)}>
                    <SortLabel label={column.label} active={sortBy === column.key} direction={sortDirection} />
                  </button>
                </th>
              ))}
              {showResponsavel ? (
                <th className="py-2">
                  <button type="button" className="font-semibold hover:text-hydro-blue" onClick={() => onSort('executorResponsavelNome')}>
                    <SortLabel label="Responsável" active={sortBy === 'executorResponsavelNome'} direction={sortDirection} />
                  </button>
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {visibleRequests.map((request) => (
              <tr
                key={request.id}
                className="cursor-pointer border-b border-light-gray hover:bg-light-gray/50"
                onClick={() => navigate(`${basePath}/${request.id}`)}
              >
                <td className="py-3 pr-2 font-arial text-sm text-mid-gray">{request.id}</td>
                <td className="py-3 pr-2 font-semibold text-hydro-blue">{request.titulo}</td>
                <td className="py-3 pr-2">{request.area}</td>
                <td className="py-3 pr-2">{request.servicoMacro}</td>
                <td className="py-3 pr-2">{request.tipoDemanda}</td>
                <td className="py-3 pr-2">
                  <span className={`rounded px-2 py-0.5 text-xs ${priorityStyle[request.prioridade] || ''}`}>
                    {request.prioridade}
                  </span>
                </td>
                <td className="py-3 pr-2">
                  <span className={`rounded px-2 py-0.5 text-xs ${statusStyle[request.status] || ''}`}>
                    {request.status}
                  </span>
                </td>
                <td className="py-3 pr-2">
                  <span className={`rounded px-2 py-0.5 text-xs ${request.gmPendente ? 'bg-bauxite text-white' : 'bg-green text-white'}`}>
                    {request.gmPendente ? 'Não' : 'Sim'}
                  </span>
                </td>
                <td className="py-3 pr-2 text-aluminium">{formatDate(request.dataAtualizacao)}</td>
                {showResponsavel ? <td className="py-3 pr-2">{request.executorResponsavelNome}</td> : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {paginated ? (
        <div className="flex items-center justify-end gap-3 text-sm text-mid-gray">
          <span>Página {currentPage} de {totalPages}</span>
          <button
            type="button"
            className="rounded-md border border-hydro-blue px-3 py-1.5 font-arial font-semibold text-hydro-blue transition-colors hover:bg-light-gray disabled:cursor-not-allowed disabled:border-light-gray disabled:text-aluminium"
            disabled={currentPage <= 1}
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
          >
            Anterior
          </button>
          <button
            type="button"
            className="rounded-md bg-hydro-blue px-3 py-1.5 font-arial font-semibold text-white transition-colors hover:bg-hydro-dark-blue disabled:cursor-not-allowed disabled:bg-light-gray disabled:text-aluminium"
            disabled={currentPage >= totalPages}
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
          >
            Próxima
          </button>
        </div>
      ) : null}
    </div>
  );
}
