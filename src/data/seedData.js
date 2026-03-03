import {
  AREAS,
  DEMAND_TYPES,
  EVENT_TYPES,
  SERVICE_MACROS,
  SERVICE_SUBCATEGORIES,
  STATUS_OPTIONS,
  calculatePriority,
  calculateSlaHours,
  resolveGroupExecutor,
} from './catalog/requestCatalog';

const executors = [
  'Bruno Silva',
  'Carla Freitas',
  'Diego Ramos',
  'Eduardo Pires',
  'Fernanda Nunes',
  'Gustavo Leal',
  'Helena Moraes',
  'Igor Cardoso',
  'Juliana Prado',
  'Kaio Mendes',
  'Larissa Campos',
];

function normalizeCatalogText(value) {
  return (value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

export const seedUsers = [
  { id: 'usr-ana', name: 'Ana Martins', email: 'ana.martins@hydro.demo', role: 'Solicitante', area: 'Automação e Energia' },
  ...executors.map((name, index) => ({
    id: `usr-exec-${String(index + 1).padStart(2, '0')}`,
    name,
    email: `${name.toLowerCase().replace(/\s+/g, '.')}@hydro.demo`,
    role: 'Executor',
    area: 'Service Desk',
  })),
  { id: 'usr-livia', name: 'Lívia Rocha', email: 'livia.rocha@hydro.demo', role: 'Automação', area: 'CoE Automação' },
  { id: 'usr-marcos', name: 'Marcos Lima', email: 'marcos.lima@hydro.demo', role: 'Gestão', area: 'Gestão Operacional' },
];

const assigneePool = seedUsers.filter((user) => user.role === 'Executor');

function pick(items, index) {
  return items[index % items.length];
}

function isoDateFromIndex(index) {
  const base = new Date('2026-01-02T08:00:00.000Z').getTime();
  const offset = index * 36 * 60 * 60 * 1000;
  return new Date(base + offset).toISOString();
}

function generateRequest(index) {
  const macro = pick(SERVICE_MACROS, index);
  const tipoDemanda = pick(DEMAND_TYPES, index + 1);
  const area = pick(AREAS, index + 2);
  const subcategory = pick(SERVICE_SUBCATEGORIES[macro], index + 3);
  const prioridade = calculatePriority({ tipoDemanda, servicoMacro: macro });
  const sla = calculateSlaHours(prioridade);
  const status = pick(STATUS_OPTIONS, index + 1);
  const dataInclusao = isoDateFromIndex(index);
  const dataAtualizacao = new Date(new Date(dataInclusao).getTime() + ((index % 5) + 1) * 60 * 60 * 1000).toISOString();
  const isFinal = status === 'Concluído' || status === 'Cancelado';
  const responsavel = index % 4 === 0 ? '' : pick(assigneePool, index).id;

  return {
    id: `CHD-${String(index + 1).padStart(4, '0')}`,
    dataInclusao,
    solicitanteId: 'usr-ana',
    titulo: `${tipoDemanda} - ${subcategory}`,
    descricao: `Demanda relacionada a ${subcategory} na área ${area}. Chamado gerado para protótipo funcional PSA.`,
    area,
    servicoMacro: macro,
    servicoSubcategoria: subcategory,
    tipoDemanda,
    gmId: index % 3 === 0 ? '' : `GM-${String(4000 + index).padStart(5, '0')}`,
    grupoExecutor: resolveGroupExecutor(macro),
    executorResponsavelId: responsavel,
    status,
    prioridade,
    slaHoras: sla,
    dataAtualizacao,
    dataFechamento: isFinal ? new Date(new Date(dataAtualizacao).getTime() + 2 * 60 * 60 * 1000).toISOString() : '',
  };
}

export const seedRequests = Array.from({ length: 30 }, (_, index) => generateRequest(index));

function eventDescription(type, request) {
  if (type === EVENT_TYPES.CHAMADO_CRIADO) {
    return `Chamado ${request.id} criado.`;
  }
  if (type === EVENT_TYPES.PRIORIDADE_RECALCULADA) {
    return `Prioridade calculada automaticamente: ${request.prioridade}.`;
  }
  if (type === EVENT_TYPES.SLA_RECALCULADO) {
    return `SLA calculado automaticamente: ${request.slaHoras}h.`;
  }
  return 'Evento automático registrado.';
}

function generateSeedActivities() {
  const activities = [];

  seedRequests.forEach((request, idx) => {
    const createdAt = request.dataInclusao;
    const createdActor = seedUsers.find((user) => user.id === request.solicitanteId);

    [EVENT_TYPES.CHAMADO_CRIADO, EVENT_TYPES.PRIORIDADE_RECALCULADA, EVENT_TYPES.SLA_RECALCULADO].forEach((eventType, eventIndex) => {
      activities.push({
        id: `ACT-${request.id}-${eventIndex + 1}`,
        requestId: request.id,
        kind: 'EVENT',
        eventType,
        description: eventDescription(eventType, request),
        actorId: createdActor.id,
        actorName: createdActor.name,
        actorRole: createdActor.role,
        contentHtml: '',
        attachments: [],
        createdAt: new Date(new Date(createdAt).getTime() + eventIndex * 1000).toISOString(),
      });
    });

    if (idx % 2 === 0) {
      const responder = request.executorResponsavelId
        ? seedUsers.find((user) => user.id === request.executorResponsavelId)
        : seedUsers.find((user) => user.role === 'Executor');

      activities.push({
        id: `ACT-${request.id}-CMT-1`,
        requestId: request.id,
        kind: 'COMMENT',
        eventType: '',
        description: '',
        actorId: responder.id,
        actorName: responder.name,
        actorRole: responder.role,
        contentHtml: `<p>Avaliação inicial do chamado <strong>${request.id}</strong>. Seguimos em tratativa.</p>`,
        attachments: idx % 4 === 0 ? [{ id: `ATT-${request.id}-1`, name: 'evidencia.png', sizeKb: 245, mimeType: 'image/png' }] : [],
        createdAt: new Date(new Date(createdAt).getTime() + 2 * 60 * 60 * 1000).toISOString(),
      });
    }

    if (request.executorResponsavelId) {
      const actor = seedUsers.find((user) => user.id === request.executorResponsavelId);
      activities.push({
        id: `ACT-${request.id}-ASSIGN`,
        requestId: request.id,
        kind: 'EVENT',
        eventType: EVENT_TYPES.ATRIBUIDO_EXECUTOR,
        description: `Responsável definido para ${actor.name}.`,
        actorId: actor.id,
        actorName: actor.name,
        actorRole: actor.role,
        contentHtml: '',
        attachments: [],
        createdAt: new Date(new Date(createdAt).getTime() + 90 * 60 * 1000).toISOString(),
      });
    }
  });

  return activities;
}

export const seedActivities = generateSeedActivities();

export const seedAutomations = [
  { id: 'auto-1', name: 'Reset de senha AD', owner: 'CoE Automação', status: 'Ativo', slaHours: 4 },
  { id: 'auto-2', name: 'Criação de usuário SAP', owner: 'CoE Automação', status: 'Ativo', slaHours: 8 },
  { id: 'auto-3', name: 'Provisionamento VPN', owner: 'Segurança', status: 'Em rollout', slaHours: 12 },
  { id: 'auto-4', name: 'Checklist onboarding', owner: 'RH Tech', status: 'Ativo', slaHours: 24 },
];

export const seedServiceCatalog = SERVICE_MACROS.flatMap((macro) =>
  (SERVICE_SUBCATEGORIES[macro] || []).map((name, index) => ({
    id: `CAT-${macro}-${String(index + 1).padStart(3, '0')}`.replace(/\s+/g, '-').toUpperCase(),
    macro,
    name,
    normalizedName: normalizeCatalogText(name),
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  })),
);
