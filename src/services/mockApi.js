import { db, ensureSeedData } from '../data/mockDb';
import {
  AREAS,
  DEMAND_TYPES,
  EVENT_TYPES,
  FINAL_STATUS,
  SERVICE_MACROS,
  SERVICE_SUBCATEGORIES,
  STATUS_OPTIONS,
  calculatePriority,
  calculateSlaHours,
  resolveGroupExecutor,
} from '../data/catalog/requestCatalog';

const SIMULATED_DELAY_MS = 180;

function delay(ms = SIMULATED_DELAY_MS) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseRequestSeq(requestId) {
  const value = Number((requestId || '').replace('CHD-', ''));
  return Number.isFinite(value) ? value : 0;
}

function makeActivityId() {
  return `ACT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function normalizeText(value) {
  return (value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function includesText(request, query) {
  if (!query) {
    return true;
  }
  const text = normalizeText(query);
  const searchable = [request.id, request.titulo, request.descricao].map(normalizeText).join(' ');
  return searchable.includes(text);
}

function matchesMulti(value, selectedList) {
  if (!selectedList || !selectedList.length) {
    return true;
  }
  return selectedList.includes(value);
}

function matchesFilters(request, filters = {}) {
  if (!matchesMulti(request.area, filters.area)) {
    return false;
  }
  if (!matchesMulti(request.servicoMacro, filters.servicoMacro)) {
    return false;
  }
  if (!matchesMulti(request.status, filters.status)) {
    return false;
  }
  const gmValue = request.gmId ? 'Sim' : 'Não';
  if (!matchesMulti(gmValue, filters.gm)) {
    return false;
  }
  if (!includesText(request, filters.search)) {
    return false;
  }
  const responsibleValue = request.executorResponsavelId || 'SEM_RESPONSAVEL';
  if (!matchesMulti(responsibleValue, filters.executorResponsavel)) {
    return false;
  }
  return true;
}

function sortByRecent(a, b) {
  return new Date(b.dataAtualizacao).getTime() - new Date(a.dataAtualizacao).getTime();
}

function serializeAttachment(rawAttachment) {
  if (!rawAttachment) {
    return null;
  }

  if (rawAttachment.name) {
    const sizeKb = rawAttachment.size ? Math.max(1, Math.round(rawAttachment.size / 1024)) : rawAttachment.sizeKb || 1;
    return {
      id: `ATT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: rawAttachment.name,
      sizeKb,
      mimeType: rawAttachment.type || rawAttachment.mimeType || 'application/octet-stream',
    };
  }

  return null;
}

function buildEventDescription(eventType, payload = {}) {
  if (eventType === EVENT_TYPES.CHAMADO_CRIADO) {
    return `Chamado ${payload.requestId} criado.`;
  }
  if (eventType === EVENT_TYPES.STATUS_ALTERADO) {
    return `Status alterado de ${payload.from} para ${payload.to}.`;
  }
  if (eventType === EVENT_TYPES.GM_ATUALIZADA) {
    if (!payload.to) {
      return 'GM removida do chamado.';
    }
    if (!payload.from) {
      return `GM informada: ${payload.to}.`;
    }
    return `GM alterada de ${payload.from} para ${payload.to}.`;
  }
  if (eventType === EVENT_TYPES.ATRIBUIDO_EXECUTOR) {
    return `Responsável definido para ${payload.toName || 'não atribuído'}.`;
  }
  if (eventType === EVENT_TYPES.PRIORIDADE_RECALCULADA) {
    return `Prioridade recalculada para ${payload.to}.`;
  }
  if (eventType === EVENT_TYPES.SLA_RECALCULADO) {
    return `SLA recalculado para ${payload.to}h.`;
  }
  return 'Evento automático registrado.';
}

async function addEventActivity(requestId, eventType, actor, payload = {}, createdAt = new Date().toISOString()) {
  const description = buildEventDescription(eventType, payload);
  await db.activities.add({
    id: makeActivityId(),
    requestId,
    kind: 'EVENT',
    eventType,
    description,
    actorId: actor?.id || '',
    actorName: actor?.name || 'Sistema',
    actorRole: actor?.role || 'Sistema',
    contentHtml: '',
    attachments: [],
    createdAt,
  });
}

function computePriorityAndSla(requestData) {
  const prioridade = calculatePriority({
    tipoDemanda: requestData.tipoDemanda,
    servicoMacro: requestData.servicoMacro,
  });
  const slaHoras = calculateSlaHours(prioridade);
  return { prioridade, slaHoras };
}

function mapRequestListItem(request, usersById) {
  const solicitante = usersById[request.solicitanteId];
  const executor = request.executorResponsavelId ? usersById[request.executorResponsavelId] : null;

  return {
    ...request,
    solicitanteNome: solicitante?.name || 'Desconhecido',
    executorResponsavelNome: executor?.name || 'Sem responsável',
    gmPendente: !request.gmId,
  };
}

async function getUsersIndex() {
  const users = await db.users.toArray();
  return users.reduce((acc, user) => {
    acc[user.id] = user;
    return acc;
  }, {});
}

async function nextRequestId() {
  const all = await db.requests.toArray();
  const maxSeq = all.reduce((acc, request) => Math.max(acc, parseRequestSeq(request.id)), 0);
  return `CHD-${String(maxSeq + 1).padStart(4, '0')}`;
}

export async function bootstrapMockApi() {
  await ensureSeedData();
}

export function getRequestFormOptions() {
  return {
    areas: AREAS,
    serviceMacros: SERVICE_MACROS,
    serviceSubcategories: SERVICE_SUBCATEGORIES,
    demandTypes: DEMAND_TYPES,
    statusOptions: STATUS_OPTIONS,
  };
}

export async function getExecutors() {
  await delay();
  return db.users.where('role').equals('Executor').sortBy('name');
}

export async function getRequesterRequests(requesterId, filters = {}) {
  await delay();
  const usersById = await getUsersIndex();
  const requests = await db.requests.where('solicitanteId').equals(requesterId).toArray();
  return requests
    .filter((request) => matchesFilters(request, filters))
    .sort(sortByRecent)
    .map((request) => mapRequestListItem(request, usersById));
}

export async function getQueueRequests(filters = {}) {
  await delay();
  const usersById = await getUsersIndex();
  const requests = await db.requests.toArray();
  return requests
    .filter((request) => matchesFilters(request, filters))
    .sort(sortByRecent)
    .map((request) => mapRequestListItem(request, usersById));
}

export async function getRecentRequests(limit = 5) {
  const all = await getQueueRequests();
  return all.slice(0, limit);
}

export async function createRequest(payload, requesterUser) {
  const now = new Date().toISOString();
  const id = await nextRequestId();

  const requestBase = {
    id,
    dataInclusao: now,
    solicitanteId: requesterUser.id,
    titulo: payload.titulo,
    descricao: payload.descricao,
    area: payload.area,
    servicoMacro: payload.servicoMacro,
    servicoSubcategoria: payload.servicoSubcategoria,
    tipoDemanda: payload.tipoDemanda,
    gmId: payload.gmId?.trim() || '',
    grupoExecutor: resolveGroupExecutor(payload.servicoMacro),
    executorResponsavelId: '',
    status: 'Novo',
    dataAtualizacao: now,
    dataFechamento: '',
  };

  const { prioridade, slaHoras } = computePriorityAndSla(requestBase);
  const request = { ...requestBase, prioridade, slaHoras };

  await delay();
  await db.transaction('rw', db.requests, db.activities, async () => {
    await db.requests.add(request);

    await addEventActivity(id, EVENT_TYPES.CHAMADO_CRIADO, requesterUser, { requestId: id }, now);
    await addEventActivity(id, EVENT_TYPES.PRIORIDADE_RECALCULADA, requesterUser, { to: prioridade }, new Date(new Date(now).getTime() + 1000).toISOString());
    await addEventActivity(id, EVENT_TYPES.SLA_RECALCULADO, requesterUser, { to: slaHoras }, new Date(new Date(now).getTime() + 2000).toISOString());
    if (request.gmId) {
      await addEventActivity(id, EVENT_TYPES.GM_ATUALIZADA, requesterUser, { from: '', to: request.gmId }, new Date(new Date(now).getTime() + 2300).toISOString());
    }

    if (payload.attachments?.length) {
      const attachments = payload.attachments.map(serializeAttachment).filter(Boolean);
      await db.activities.add({
        id: makeActivityId(),
        requestId: id,
        kind: 'COMMENT',
        eventType: '',
        description: '',
        actorId: requesterUser.id,
        actorName: requesterUser.name,
        actorRole: requesterUser.role,
        contentHtml: '<p>Anexos adicionados na abertura do chamado.</p>',
        attachments,
        createdAt: new Date(new Date(now).getTime() + 2500).toISOString(),
      });
    }
  });

  return request;
}

export async function getRequestById(requestId) {
  await delay();

  const request = await db.requests.get(requestId);
  if (!request) {
    return null;
  }

  const usersById = await getUsersIndex();
  const activities = await db.activities.where('requestId').equals(request.id).sortBy('createdAt');

  return {
    ...mapRequestListItem(request, usersById),
    solicitante: usersById[request.solicitanteId] || null,
    executorResponsavel: request.executorResponsavelId ? usersById[request.executorResponsavelId] : null,
    gmPendente: !request.gmId,
    thread: activities,
  };
}

export async function assignRequest(requestId, executorId, actorUser) {
  await delay();

  const request = await db.requests.get(requestId);
  if (!request) {
    throw new Error('Chamado não encontrado');
  }

  const now = new Date().toISOString();
  const toUser = executorId ? await db.users.get(executorId) : null;

  await db.transaction('rw', db.requests, db.activities, async () => {
    await db.requests.update(requestId, {
      executorResponsavelId: executorId || '',
      dataAtualizacao: now,
      status: request.status === 'Novo' ? 'Triagem' : request.status,
    });

    await addEventActivity(requestId, EVENT_TYPES.ATRIBUIDO_EXECUTOR, actorUser, { toName: toUser?.name || 'Sem responsável' }, now);
    if (request.status === 'Novo') {
      await addEventActivity(
        requestId,
        EVENT_TYPES.STATUS_ALTERADO,
        actorUser,
        { from: 'Novo', to: 'Triagem' },
        new Date(new Date(now).getTime() + 1000).toISOString(),
      );
    }
  });

  return getRequestById(requestId);
}

export async function updateRequestStatus(requestId, nextStatus, actorUser) {
  await delay();

  const request = await db.requests.get(requestId);
  if (!request) {
    throw new Error('Chamado não encontrado');
  }

  const now = new Date().toISOString();
  const updates = {
    status: nextStatus,
    dataAtualizacao: now,
    dataFechamento: FINAL_STATUS.includes(nextStatus) ? now : '',
  };

  await db.transaction('rw', db.requests, db.activities, async () => {
    await db.requests.update(requestId, updates);
    await addEventActivity(requestId, EVENT_TYPES.STATUS_ALTERADO, actorUser, { from: request.status, to: nextStatus }, now);
  });

  return getRequestById(requestId);
}

export async function updateRequestGm(requestId, gmId, actorUser) {
  await delay();

  const request = await db.requests.get(requestId);
  if (!request) {
    throw new Error('Chamado não encontrado');
  }

  const now = new Date().toISOString();
  const nextGm = (gmId || '').trim();

  await db.transaction('rw', db.requests, db.activities, async () => {
    await db.requests.update(requestId, {
      gmId: nextGm,
      dataAtualizacao: now,
    });

    await addEventActivity(requestId, EVENT_TYPES.GM_ATUALIZADA, actorUser, { from: request.gmId, to: nextGm }, now);
  });

  return getRequestById(requestId);
}

export async function updateRequestDemandType(requestId, tipoDemanda, actorUser) {
  await delay();
  const request = await db.requests.get(requestId);
  if (!request) {
    throw new Error('Chamado não encontrado');
  }

  const now = new Date().toISOString();
  const nextBase = { ...request, tipoDemanda };
  const recalculated = computePriorityAndSla(nextBase);

  await db.transaction('rw', db.requests, db.activities, async () => {
    await db.requests.update(requestId, {
      tipoDemanda,
      prioridade: recalculated.prioridade,
      slaHoras: recalculated.slaHoras,
      dataAtualizacao: now,
    });

    await addEventActivity(requestId, EVENT_TYPES.PRIORIDADE_RECALCULADA, actorUser, { to: recalculated.prioridade }, now);
    await addEventActivity(requestId, EVENT_TYPES.SLA_RECALCULADO, actorUser, { to: recalculated.slaHoras }, new Date(new Date(now).getTime() + 1000).toISOString());
  });

  return getRequestById(requestId);
}

export async function addRequestComment(requestId, actorUser, contentHtml, attachments = []) {
  await delay();

  const request = await db.requests.get(requestId);
  if (!request) {
    throw new Error('Chamado não encontrado');
  }

  const now = new Date().toISOString();
  const cleanContent = (contentHtml || '').trim();

  if (!cleanContent && !attachments.length) {
    throw new Error('Comentário vazio');
  }

  const normalizedAttachments = attachments.map(serializeAttachment).filter(Boolean);

  await db.transaction('rw', db.activities, db.requests, async () => {
    await db.activities.add({
      id: makeActivityId(),
      requestId,
      kind: 'COMMENT',
      eventType: '',
      description: '',
      actorId: actorUser.id,
      actorName: actorUser.name,
      actorRole: actorUser.role,
      contentHtml: cleanContent,
      attachments: normalizedAttachments,
      createdAt: now,
    });

    await db.requests.update(requestId, { dataAtualizacao: now });
  });

  return getRequestById(requestId);
}

export async function getUsers() {
  await delay();
  return db.users.toArray();
}

function parseMonthYear(value) {
  if (!value) {
    return null;
  }
  const [year, month] = value.split('-').map(Number);
  if (!year || !month) {
    return null;
  }
  return { year, month };
}

function matchesPeriod(request, period) {
  const parsed = parseMonthYear(period);
  if (!parsed) {
    return true;
  }
  const date = new Date(request.dataInclusao);
  return date.getUTCFullYear() === parsed.year && date.getUTCMonth() + 1 === parsed.month;
}

function countBy(list, field) {
  return list.reduce((acc, item) => {
    acc[item[field]] = (acc[item[field]] || 0) + 1;
    return acc;
  }, {});
}

export async function getDashboardMetrics(period = '') {
  await delay();
  const requests = (await db.requests.toArray()).filter((item) => matchesPeriod(item, period));

  const byStatus = countBy(requests, 'status');
  const byArea = countBy(requests, 'area');
  const byServiceMacro = countBy(requests, 'servicoMacro');

  const gmPendentes = requests.filter((item) => !item.gmId).length;

  return {
    totalRequests: requests.length,
    openRequests: requests.filter((item) => !FINAL_STATUS.includes(item.status)).length,
    done: requests.filter((item) => item.status === 'Concluído').length,
    gmPendentes,
    gmPendentesPercentual: requests.length ? Math.round((gmPendentes / requests.length) * 100) : 0,
    byStatus,
    byArea,
    byServiceMacro,
  };
}

export async function getAutomations() {
  await delay();
  return db.automations.toArray();
}
