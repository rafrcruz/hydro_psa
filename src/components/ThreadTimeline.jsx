function formatDate(value) {
  return new Date(value).toLocaleString('pt-BR');
}

function eventBadge(eventType) {
  const map = {
    CHAMADO_CRIADO: 'bg-hydro-blue text-white',
    STATUS_ALTERADO: 'bg-purple text-white',
    GM_ATUALIZADA: 'bg-bauxite text-white',
    ATRIBUIDO_EXECUTOR: 'bg-green text-white',
    PRIORIDADE_RECALCULADA: 'bg-warm text-black',
    SLA_RECALCULADO: 'bg-light-gray text-hydro-blue',
  };
  return map[eventType] || 'bg-light-gray text-hydro-blue';
}

export default function ThreadTimeline({ items = [] }) {
  if (!items.length) {
    return <p className="text-sm text-aluminium">Ainda não há atividades neste chamado.</p>;
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <article key={item.id} className="rounded-lg border border-light-gray bg-white p-3">
          <div className="flex flex-wrap items-center gap-2 text-xs text-aluminium">
            {item.kind === 'EVENT' ? (
              <span className={`rounded px-2 py-1 font-semibold ${eventBadge(item.eventType)}`}>{item.eventType}</span>
            ) : (
              <span className="rounded bg-hydro-blue px-2 py-1 font-semibold text-white">COMENTÁRIO</span>
            )}
            <span>{item.actorName} ({item.actorRole})</span>
            <span>{formatDate(item.createdAt)}</span>
          </div>

          {item.kind === 'EVENT' ? (
            <p className="mt-2 text-sm text-mid-gray">{item.description}</p>
          ) : (
            <div className="prose prose-sm mt-2 max-w-none" dangerouslySetInnerHTML={{ __html: item.contentHtml }} />
          )}

          {item.attachments?.length ? (
            <ul className="mt-2 space-y-1 text-sm text-hydro-blue">
              {item.attachments.map((attachment) => (
                <li key={attachment.id}>
                  {attachment.name} ({attachment.sizeKb} KB)
                </li>
              ))}
            </ul>
          ) : null}
        </article>
      ))}
    </div>
  );
}
