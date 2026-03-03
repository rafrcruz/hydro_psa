import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import RichTextComposer from '../components/RichTextComposer';
import ThreadTimeline from '../components/ThreadTimeline';
import { useProfile } from '../contexts/ProfileContext';
import { DEMAND_TYPES, STATUS_OPTIONS } from '../data/catalog/requestCatalog';
import {
  addRequestComment,
  assignRequest,
  getExecutors,
  getRequestById,
  updateRequestDemandType,
  updateRequestGm,
  updateRequestStatus,
} from '../services/mockApi';

function formatDate(value) {
  if (!value) {
    return '-';
  }
  return new Date(value).toLocaleString('pt-BR');
}

function canOperate(profile) {
  return profile === 'Executor' || profile === 'Automação';
}

export default function ChamadoDetalhesPage() {
  const { id } = useParams();
  const { profile, currentUser } = useProfile();
  const [request, setRequest] = useState(null);
  const [executors, setExecutors] = useState([]);
  const [commentHtml, setCommentHtml] = useState('');
  const [commentAttachments, setCommentAttachments] = useState([]);
  const [gmDraft, setGmDraft] = useState('');
  const [loading, setLoading] = useState(true);

  const isOperator = canOperate(profile);

  const loadRequest = async () => {
    setLoading(true);
    const data = await getRequestById(id);
    setRequest(data);
    setGmDraft(data?.gmId || '');
    setLoading(false);
  };

  useEffect(() => {
    let mounted = true;
    getRequestById(id).then((data) => {
      if (!mounted) {
        return;
      }
      setRequest(data);
      setGmDraft(data?.gmId || '');
      setLoading(false);
    });

    return () => {
      mounted = false;
    };
  }, [id]);

  useEffect(() => {
    if (isOperator) {
      getExecutors().then(setExecutors);
    }
  }, [isOperator]);

  const onAddComment = async (event) => {
    event.preventDefault();
    await addRequestComment(id, currentUser, commentHtml, commentAttachments);
    setCommentHtml('');
    setCommentAttachments([]);
    await loadRequest();
  };

  const onCommentAttachment = (event) => {
    setCommentAttachments(Array.from(event.target.files || []));
  };

  const onSaveGm = async () => {
    await updateRequestGm(id, gmDraft, currentUser);
    await loadRequest();
  };

  const onAssignToMe = async () => {
    await assignRequest(id, currentUser.id, currentUser);
    await loadRequest();
  };

  const onAssignOther = async (event) => {
    await assignRequest(id, event.target.value, currentUser);
    await loadRequest();
  };

  const onStatusChange = async (event) => {
    await updateRequestStatus(id, event.target.value, currentUser);
    await loadRequest();
  };

  const onDemandTypeChange = async (event) => {
    await updateRequestDemandType(id, event.target.value, currentUser);
    await loadRequest();
  };

  const gmAlert = useMemo(() => request?.gmPendente, [request?.gmPendente]);

  if (loading) {
    return <p className="text-aluminium">Carregando...</p>;
  }

  if (!request) {
    return (
      <section>
        <p className="text-mid-gray">Chamado não encontrado.</p>
        <Link to="/" className="mt-2 inline-block text-hydro-blue hover:underline">Voltar</Link>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl">{request.titulo}</h2>
          <p className="text-sm text-mid-gray">{request.id} • Inclusão: {formatDate(request.dataInclusao)}</p>
        </div>
        <span className={`rounded px-3 py-1 text-sm font-semibold ${gmAlert ? 'bg-bauxite text-white' : 'bg-green text-white'}`}>
          GM {gmAlert ? 'pendente' : 'informada'}
        </span>
      </header>

      <article className="card grid gap-3 p-4 text-sm text-mid-gray md:grid-cols-2 lg:grid-cols-3">
        <p><strong>Solicitante:</strong> {request.solicitanteNome}</p>
        <p><strong>Área:</strong> {request.area}</p>
        <p><strong>Serviço Macro:</strong> {request.servicoMacro}</p>
        <p><strong>Subcategoria:</strong> {request.servicoSubcategoria}</p>
        <p><strong>Tipo de Demanda:</strong> {request.tipoDemanda}</p>
        <p><strong>Grupo Executor:</strong> {request.grupoExecutor}</p>
        <p><strong>Responsável:</strong> {request.executorResponsavelNome}</p>
        <p><strong>Status:</strong> {request.status}</p>
        <p><strong>Prioridade:</strong> {request.prioridade}</p>
        <p><strong>SLA:</strong> {request.slaHoras}h</p>
        <p><strong>GM ID:</strong> {request.gmId || 'Não informada'}</p>
        <p><strong>Atualização:</strong> {formatDate(request.dataAtualizacao)}</p>
        <p><strong>Fechamento:</strong> {formatDate(request.dataFechamento)}</p>
      </article>

      <article className="card p-4">
        <h3 className="text-lg">Descrição</h3>
        <div className="prose prose-sm mt-2 max-w-none text-mid-gray" dangerouslySetInnerHTML={{ __html: request.descricao }} />
      </article>

      <article className="card space-y-3 p-4">
        <h3 className="text-lg">Ações do chamado</h3>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-sm text-mid-gray">
            GM / ServiceNow
            <div className="mt-1 flex gap-2">
              <input className="input" value={gmDraft} onChange={(event) => setGmDraft(event.target.value)} placeholder="Ex.: GM-01234" />
              <button type="button" className="btn btn-secondary" onClick={onSaveGm}>Salvar GM</button>
            </div>
          </label>

          {isOperator ? (
            <label className="text-sm text-mid-gray">
              Status
              <select className="input mt-1" value={request.status} onChange={onStatusChange}>
                {STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
            </label>
          ) : null}

          {isOperator ? (
            <label className="text-sm text-mid-gray">
              Tipo de Demanda (recalcula prioridade/SLA)
              <select className="input mt-1" value={request.tipoDemanda} onChange={onDemandTypeChange}>
                {DEMAND_TYPES.map((demandType) => <option key={demandType} value={demandType}>{demandType}</option>)}
              </select>
            </label>
          ) : null}

          {isOperator ? (
            <label className="text-sm text-mid-gray">
              Atribuir responsável
              <select className="input mt-1" value={request.executorResponsavelId || ''} onChange={onAssignOther}>
                <option value="">Sem responsável</option>
                {executors.map((executor) => <option key={executor.id} value={executor.id}>{executor.name}</option>)}
              </select>
            </label>
          ) : null}
        </div>

        {isOperator ? (
          <button type="button" onClick={onAssignToMe} className="btn btn-primary w-fit">Assumir para mim</button>
        ) : null}
      </article>

      <article className="card space-y-3 p-4">
        <h3 className="text-lg">Thread / Atividades</h3>

        <form onSubmit={onAddComment} className="space-y-2">
          <RichTextComposer value={commentHtml} onChange={setCommentHtml} placeholder="Adicione um comentário com formatação e links..." />

          <div className="flex flex-wrap items-center gap-3">
            <input type="file" multiple className="input max-w-sm" onChange={onCommentAttachment} />
            <button className="btn btn-primary" type="submit">Publicar comentário</button>
          </div>

          {commentAttachments.length ? (
            <ul className="text-sm text-mid-gray">
              {commentAttachments.map((item) => <li key={`${item.name}-${item.size}`}>{item.name}</li>)}
            </ul>
          ) : null}
        </form>

        <ThreadTimeline items={request.thread} />
      </article>
    </section>
  );
}
