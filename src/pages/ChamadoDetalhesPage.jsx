import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useProfile } from '../contexts/ProfileContext';
import {
  addRequestComment,
  assignRequest,
  getRequestById,
  updateRequestStatus,
} from '../services/mockApi';

function formatDate(value) {
  return new Date(value).toLocaleString('pt-BR');
}

export default function ChamadoDetalhesPage() {
  const { id } = useParams();
  const { profile, currentUser } = useProfile();
  const [request, setRequest] = useState(null);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);

  const refreshRequest = async () => {
    const data = await getRequestById(id);
    setRequest(data);
    setLoading(false);
  };

  useEffect(() => {
    let active = true;

    getRequestById(id).then((data) => {
      if (!active) {
        return;
      }
      setRequest(data);
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [id]);

  const onAddComment = async (event) => {
    event.preventDefault();
    if (!comment.trim()) {
      return;
    }

    await addRequestComment(id, currentUser, comment.trim());
    setComment('');
    await refreshRequest();
  };

  const onAssignToMe = async () => {
    await assignRequest(id, currentUser.id);
    await refreshRequest();
  };

  const onFinish = async () => {
    await updateRequestStatus(id, 'Concluido');
    await refreshRequest();
  };

  if (loading) {
    return <p className="text-aluminium">Carregando...</p>;
  }

  if (!request) {
    return (
      <section>
        <p className="text-mid-gray">Chamado não encontrado.</p>
        <Link to="/" className="mt-2 inline-block text-hydro-blue hover:underline">
          Voltar
        </Link>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-2xl">{request.title}</h2>
        <p className="font-arial text-xs text-mid-gray">{request.id}</p>
      </header>

      <div className="grid gap-2 rounded-lg border border-light-gray p-4 text-sm text-mid-gray md:grid-cols-2">
        <p><strong>Categoria:</strong> {request.category}</p>
        <p><strong>Prioridade:</strong> {request.priority}</p>
        <p><strong>Status:</strong> {request.status}</p>
        <p><strong>Solicitante:</strong> {request.requesterName}</p>
        <p><strong>Executor:</strong> {request.assigneeName}</p>
        <p><strong>Atualizado:</strong> {formatDate(request.updatedAt)}</p>
      </div>

      <article className="card p-4">
        <h3 className="text-lg">Descrição</h3>
        <p className="mt-2 text-sm text-mid-gray">{request.description}</p>
      </article>

      {profile === 'Executor' ? (
        <div className="flex gap-3">
          <button onClick={onAssignToMe} className="btn btn-primary">
            Assumir chamado
          </button>
          <button onClick={onFinish} className="btn btn-secondary">
            Marcar como concluído
          </button>
        </div>
      ) : null}

      <section className="card p-4">
        <h3 className="text-lg">Comentários</h3>
        <div className="mt-3 space-y-3">
          {request.comments.length ? (
            request.comments.map((item) => (
              <article key={item.id} className="rounded border border-light-gray bg-light-gray/50 p-3 text-sm">
                <p className="font-semibold text-hydro-blue">{item.authorName}</p>
                <p className="text-mid-gray">{item.message}</p>
                <p className="mt-1 text-xs text-aluminium">{formatDate(item.createdAt)}</p>
              </article>
            ))
          ) : (
            <p className="text-sm text-aluminium">Sem comentários ainda.</p>
          )}
        </div>
        <form onSubmit={onAddComment} className="mt-3 flex flex-col gap-2">
          <textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="Adicionar comentário"
            className="input min-h-24 text-sm"
          />
          <button className="btn btn-primary w-fit">Publicar comentário</button>
        </form>
      </section>
    </section>
  );
}

