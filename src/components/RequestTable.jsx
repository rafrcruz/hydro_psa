import { Link } from 'react-router-dom';

const statusStyle = {
  Novo: 'bg-hydro-light-blue text-white',
  'Em atendimento': 'bg-green text-white',
  Concluido: 'bg-hydro-blue text-white',
};

const priorityStyle = {
  Alta: 'bg-bauxite text-white',
  Media: 'bg-warm text-black',
  Baixa: 'bg-light-gray text-hydro-blue',
};

function formatDate(value) {
  return new Date(value).toLocaleString('pt-BR');
}

export default function RequestTable({ requests, basePath }) {
  if (!requests.length) {
    return <p className="text-sm text-aluminium">Nenhum chamado encontrado.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[0.98rem]">
        <thead>
          <tr className="border-b border-light-gray text-left text-mid-gray">
            <th className="py-2">ID</th>
            <th className="py-2">Titulo</th>
            <th className="py-2">Categoria</th>
            <th className="py-2">Prioridade</th>
            <th className="py-2">Status</th>
            <th className="py-2">Atualizado em</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((request) => (
            <tr key={request.id} className="border-b border-light-gray hover:bg-light-gray/50">
              <td className="py-3 pr-2 font-arial text-sm text-mid-gray">{request.id}</td>
              <td className="py-3 pr-2">
                <Link to={`${basePath}/${request.id}`} className="font-semibold text-hydro-blue hover:underline">
                  {request.title}
                </Link>
              </td>
              <td className="py-3 pr-2">{request.category}</td>
              <td className="py-3 pr-2">
                <span className={`rounded px-2 py-0.5 text-xs ${priorityStyle[request.priority] || ''}`}>
                  {request.priority}
                </span>
              </td>
              <td className="py-3 pr-2">
                <span className={`rounded px-2 py-0.5 text-xs ${statusStyle[request.status] || ''}`}>
                  {request.status}
                </span>
              </td>
              <td className="py-3 pr-2 text-aluminium">{formatDate(request.updatedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

