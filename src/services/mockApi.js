import { db, ensureSeedData } from '../data/mockDb';
import {
  AREAS,
  DEMAND_TYPES,
  EVENT_TYPES,
  FINAL_STATUS,
  SERVICE_MACROS,
  STATUS_OPTIONS,
  calculatePriority,
  calculateSlaHours,
  resolveGroupExecutor,
} from '../data/catalog/requestCatalog';

const SIMULATED_DELAY_MS = 180;

function delay(ms = SIMULATED_DELAY_MS) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function ensureDbReady() {
  await ensureSeedData();
}

function parseRequestSeq(requestId) {
  const value = Number((requestId || '').replace('CHD-', ''));
  return Number.isFinite(value) ? value : 0;
}

function makeActivityId() {
  return `ACT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function makeNotificationId() {
  return `NTF-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

const AUTOMATION_USER_ID = 'usr-livia';
const NOTIFICATION_CHANGED_EVENT = 'hydro:notifications-changed';

function emitNotificationsChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(NOTIFICATION_CHANGED_EVENT));
  }
}

function normalizeText(value) {
  return (value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function normalizeCatalogName(value) {
  return normalizeText(value).replace(/\s+/g, ' ').trim();
}

function cleanCatalogName(value) {
  return (value || '').replace(/\s+/g, ' ').trim();
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

function getNotificationRecipients(request) {
  const recipients = [request.solicitanteId, AUTOMATION_USER_ID];
  if (request.executorResponsavelId) {
    recipients.push(request.executorResponsavelId);
  }
  return Array.from(new Set(recipients.filter(Boolean)));
}

function buildNotificationSummary(type, request, payload = {}) {
  if (type === 'NOVO_CHAMADO') {
    return `${request.id} foi aberto e aguarda triagem.`;
  }
  if (type === 'COMENTARIO') {
    return `${payload.actorName || 'Usuário'} comentou no ${request.id}.`;
  }
  if (type === 'STATUS_ALTERADO') {
    return `${request.id} mudou de ${payload.from} para ${payload.to}.`;
  }
  if (type === 'ATRIBUICAO') {
    return `Responsável de ${request.id}: ${payload.toName || 'Sem responsável'}.`;
  }
  if (type === 'GM_ATUALIZADA') {
    if (!payload.to) {
      return `GM removida no ${request.id}.`;
    }
    if (!payload.from) {
      return `GM informada no ${request.id}: ${payload.to}.`;
    }
    return `GM alterada no ${request.id}: ${payload.from} -> ${payload.to}.`;
  }
  return `Atualização registrada no chamado ${request.id}.`;
}

function buildNotificationTitle(type) {
  if (type === 'NOVO_CHAMADO') {
    return 'Novo chamado criado';
  }
  if (type === 'COMENTARIO') {
    return 'Novo comentário no chamado';
  }
  if (type === 'STATUS_ALTERADO') {
    return 'Status alterado';
  }
  if (type === 'ATRIBUICAO') {
    return 'Atribuição de responsável';
  }
  if (type === 'GM_ATUALIZADA') {
    return 'GM atualizada';
  }
  return 'Atualização de chamado';
}

async function createRequestNotifications({
  type,
  request,
  actor,
  payload = {},
  createdAt = new Date().toISOString(),
}) {
  const recipients = getNotificationRecipients(request);
  const base = {
    createdAt,
    type,
    title: buildNotificationTitle(type),
    summary: buildNotificationSummary(type, request, { ...payload, actorName: actor?.name }),
    requestId: request.id,
    requestTitle: request.titulo,
    actorId: actor?.id || '',
    actorName: actor?.name || 'Sistema',
    actorRole: actor?.role || 'Sistema',
    read: false,
    readAt: '',
  };

  await db.notifications.bulkAdd(
    recipients.map((recipientUserId) => ({
      id: makeNotificationId(),
      ...base,
      recipientUserId,
    })),
  );
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

async function listCatalogRows() {
  const rows = await db.serviceCatalog.toArray();
  return rows.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }));
}

function buildSubcategoryMap(rows, activeOnly = true) {
  const map = SERVICE_MACROS.reduce((acc, macro) => {
    acc[macro] = [];
    return acc;
  }, {});

  rows.forEach((row) => {
    if (!map[row.macro]) {
      return;
    }
    if (activeOnly && !row.active) {
      return;
    }
    map[row.macro].push(row.name);
  });

  Object.keys(map).forEach((macro) => {
    map[macro] = map[macro].sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));
  });

  return map;
}

async function ensureValidSubcategoryForMacro(servicoMacro, servicoSubcategoria) {
  const normalizedName = normalizeCatalogName(servicoSubcategoria);
  const inMacro = await db.serviceCatalog.where('macro').equals(servicoMacro).toArray();
  const match = inMacro.find((row) => row.normalizedName === normalizedName);

  if (!match || !match.active) {
    throw new Error('Subcategoria inválida para o serviço macro selecionado.');
  }
}

export async function getRequestFormOptions() {
  await ensureDbReady();
  await delay();
  const rows = await listCatalogRows();

  return {
    areas: AREAS,
    serviceMacros: SERVICE_MACROS,
    serviceSubcategories: buildSubcategoryMap(rows, true),
    demandTypes: DEMAND_TYPES,
    statusOptions: STATUS_OPTIONS,
  };
}

export async function getExecutors() {
  await ensureDbReady();
  await delay();
  return db.users.where('role').equals('Executor').sortBy('name');
}

export async function getRequesterRequests(requesterId, filters = {}) {
  await ensureDbReady();
  await delay();
  const usersById = await getUsersIndex();
  const requests = await db.requests.where('solicitanteId').equals(requesterId).toArray();
  return requests
    .filter((request) => matchesFilters(request, filters))
    .sort(sortByRecent)
    .map((request) => mapRequestListItem(request, usersById));
}

export async function getQueueRequests(filters = {}) {
  await ensureDbReady();
  await delay();
  const usersById = await getUsersIndex();
  const requests = await db.requests.toArray();
  return requests
    .filter((request) => matchesFilters(request, filters))
    .sort(sortByRecent)
    .map((request) => mapRequestListItem(request, usersById));
}

export async function getRecentRequests(limit = 5) {
  await ensureDbReady();
  const all = await getQueueRequests();
  return all.slice(0, limit);
}

export async function createRequest(payload, requesterUser) {
  await ensureDbReady();
  const now = new Date().toISOString();
  const id = await nextRequestId();
  const servicoSubcategoria = cleanCatalogName(payload.servicoSubcategoria);

  await ensureValidSubcategoryForMacro(payload.servicoMacro, servicoSubcategoria);

  const requestBase = {
    id,
    dataInclusao: now,
    solicitanteId: requesterUser.id,
    titulo: payload.titulo,
    descricao: payload.descricao,
    area: payload.area,
    servicoMacro: payload.servicoMacro,
    servicoSubcategoria,
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
  await db.transaction('rw', db.requests, db.activities, db.notifications, async () => {
    await db.requests.add(request);

    await addEventActivity(id, EVENT_TYPES.CHAMADO_CRIADO, requesterUser, { requestId: id }, now);
    await createRequestNotifications({
      type: 'NOVO_CHAMADO',
      request,
      actor: requesterUser,
      createdAt: now,
    });
    await addEventActivity(id, EVENT_TYPES.PRIORIDADE_RECALCULADA, requesterUser, { to: prioridade }, new Date(new Date(now).getTime() + 1000).toISOString());
    await addEventActivity(id, EVENT_TYPES.SLA_RECALCULADO, requesterUser, { to: slaHoras }, new Date(new Date(now).getTime() + 2000).toISOString());
    if (request.gmId) {
      await addEventActivity(id, EVENT_TYPES.GM_ATUALIZADA, requesterUser, { from: '', to: request.gmId }, new Date(new Date(now).getTime() + 2300).toISOString());
      await createRequestNotifications({
        type: 'GM_ATUALIZADA',
        request,
        actor: requesterUser,
        payload: { from: '', to: request.gmId },
        createdAt: new Date(new Date(now).getTime() + 2300).toISOString(),
      });
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
  emitNotificationsChanged();

  return request;
}

export async function getRequestById(requestId) {
  await ensureDbReady();
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
  await ensureDbReady();
  await delay();

  const request = await db.requests.get(requestId);
  if (!request) {
    throw new Error('Chamado não encontrado');
  }

  const now = new Date().toISOString();
  const toUser = executorId ? await db.users.get(executorId) : null;

  const nextRequest = {
    ...request,
    executorResponsavelId: executorId || '',
    dataAtualizacao: now,
    status: request.status === 'Novo' ? 'Triagem' : request.status,
  };

  await db.transaction('rw', db.requests, db.activities, db.notifications, async () => {
    await db.requests.update(requestId, {
      executorResponsavelId: executorId || '',
      dataAtualizacao: now,
      status: request.status === 'Novo' ? 'Triagem' : request.status,
    });

    await addEventActivity(requestId, EVENT_TYPES.ATRIBUIDO_EXECUTOR, actorUser, { toName: toUser?.name || 'Sem responsável' }, now);
    await createRequestNotifications({
      type: 'ATRIBUICAO',
      request: nextRequest,
      actor: actorUser,
      payload: { toName: toUser?.name || 'Sem responsável' },
      createdAt: now,
    });
    if (request.status === 'Novo') {
      await addEventActivity(
        requestId,
        EVENT_TYPES.STATUS_ALTERADO,
        actorUser,
        { from: 'Novo', to: 'Triagem' },
        new Date(new Date(now).getTime() + 1000).toISOString(),
      );
      await createRequestNotifications({
        type: 'STATUS_ALTERADO',
        request: nextRequest,
        actor: actorUser,
        payload: { from: 'Novo', to: 'Triagem' },
        createdAt: new Date(new Date(now).getTime() + 1000).toISOString(),
      });
    }
  });
  emitNotificationsChanged();

  return getRequestById(requestId);
}

export async function updateRequestStatus(requestId, nextStatus, actorUser) {
  await ensureDbReady();
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

  const nextRequest = { ...request, ...updates };

  await db.transaction('rw', db.requests, db.activities, db.notifications, async () => {
    await db.requests.update(requestId, updates);
    await addEventActivity(requestId, EVENT_TYPES.STATUS_ALTERADO, actorUser, { from: request.status, to: nextStatus }, now);
    await createRequestNotifications({
      type: 'STATUS_ALTERADO',
      request: nextRequest,
      actor: actorUser,
      payload: { from: request.status, to: nextStatus },
      createdAt: now,
    });
  });
  emitNotificationsChanged();

  return getRequestById(requestId);
}

export async function updateRequestGm(requestId, gmId, actorUser) {
  await ensureDbReady();
  await delay();

  const request = await db.requests.get(requestId);
  if (!request) {
    throw new Error('Chamado não encontrado');
  }

  const now = new Date().toISOString();
  const nextGm = (gmId || '').trim();

  const nextRequest = { ...request, gmId: nextGm, dataAtualizacao: now };

  await db.transaction('rw', db.requests, db.activities, db.notifications, async () => {
    await db.requests.update(requestId, {
      gmId: nextGm,
      dataAtualizacao: now,
    });

    await addEventActivity(requestId, EVENT_TYPES.GM_ATUALIZADA, actorUser, { from: request.gmId, to: nextGm }, now);
    await createRequestNotifications({
      type: 'GM_ATUALIZADA',
      request: nextRequest,
      actor: actorUser,
      payload: { from: request.gmId, to: nextGm },
      createdAt: now,
    });
  });
  emitNotificationsChanged();

  return getRequestById(requestId);
}

export async function updateRequestDemandType(requestId, tipoDemanda, actorUser) {
  await ensureDbReady();
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
  await ensureDbReady();
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

  const nextRequest = { ...request, dataAtualizacao: now };

  await db.transaction('rw', db.activities, db.requests, db.notifications, async () => {
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
    await createRequestNotifications({
      type: 'COMENTARIO',
      request: nextRequest,
      actor: actorUser,
      createdAt: now,
    });
  });
  emitNotificationsChanged();

  return getRequestById(requestId);
}

export async function getUsers() {
  await ensureDbReady();
  await delay();
  return db.users.toArray();
}

function mapNotification(item) {
  return {
    id: item.id,
    createdAt: item.createdAt,
    type: item.type,
    title: item.title,
    summary: item.summary,
    requestId: item.requestId,
    requestTitle: item.requestTitle,
    actorId: item.actorId,
    actorName: item.actorName,
    actorRole: item.actorRole,
    read: Boolean(item.read),
    readAt: item.readAt || '',
  };
}

function sortNotificationsDesc(a, b) {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

export function getNotificationEventName() {
  return NOTIFICATION_CHANGED_EVENT;
}

export async function getNotifications(profile, userId, filter = 'ALL') {
  await ensureDbReady();
  await delay();

  if (profile === 'Gestão' || !userId) {
    return [];
  }

  const rows = await db.notifications
    .where('recipientUserId')
    .equals(userId)
    .toArray();

  return rows
    .filter((item) => (filter === 'UNREAD' ? !item.read : true))
    .sort(sortNotificationsDesc)
    .map(mapNotification);
}

export async function getUnreadNotificationsCount(profile, userId) {
  await ensureDbReady();
  await delay();

  if (profile === 'Gestão' || !userId) {
    return 0;
  }

  const rows = await db.notifications.where('recipientUserId').equals(userId).toArray();
  return rows.filter((item) => !item.read).length;
}

export async function markNotificationAsRead(notificationId, userId) {
  await ensureDbReady();
  await delay();

  const row = await db.notifications.get(notificationId);
  if (!row || row.recipientUserId !== userId) {
    return false;
  }

  if (!row.read) {
    await db.notifications.update(notificationId, { read: true, readAt: new Date().toISOString() });
    emitNotificationsChanged();
  }
  return true;
}

export async function markAllNotificationsAsRead(profile, userId) {
  await ensureDbReady();
  await delay();

  if (profile === 'Gestão' || !userId) {
    return 0;
  }

  const now = new Date().toISOString();
  const rows = await db.notifications.where('recipientUserId').equals(userId).toArray();
  const unreadRows = rows.filter((item) => !item.read);

  await Promise.all(unreadRows.map((item) => db.notifications.update(item.id, { read: true, readAt: now })));
  if (unreadRows.length) {
    emitNotificationsChanged();
  }
  return unreadRows.length;
}

export async function clearNotifications(profile, userId) {
  await ensureDbReady();
  await delay();

  if (profile === 'Gestão' || !userId) {
    return 0;
  }

  const rows = await db.notifications.where('recipientUserId').equals(userId).toArray();
  await Promise.all(rows.map((item) => db.notifications.delete(item.id)));
  if (rows.length) {
    emitNotificationsChanged();
  }
  return rows.length;
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
  await ensureDbReady();
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

function mapCatalogRow(row) {
  return {
    id: row.id,
    macro: row.macro,
    name: row.name,
    active: Boolean(row.active),
    updatedAt: row.updatedAt,
  };
}

export async function getServiceCatalog(search = '') {
  await ensureDbReady();
  await delay();

  const normalizedSearch = normalizeCatalogName(search);
  const rows = await listCatalogRows();
  const filteredRows = normalizedSearch
    ? rows.filter((row) => normalizeCatalogName(row.name).includes(normalizedSearch))
    : rows;

  return SERVICE_MACROS.map((macro) => ({
    macro,
    subcategories: filteredRows
      .filter((row) => row.macro === macro)
      .sort((a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }))
      .map(mapCatalogRow),
  }));
}

async function findCatalogByMacro(macro) {
  return db.serviceCatalog.where('macro').equals(macro).toArray();
}

export async function createServiceSubcategory(macro, name) {
  await ensureDbReady();
  await delay();

  const cleanName = cleanCatalogName(name);
  if (!SERVICE_MACROS.includes(macro)) {
    throw new Error('Serviço macro inválido.');
  }
  if (!cleanName) {
    throw new Error('Informe o nome da subcategoria.');
  }

  const normalizedName = normalizeCatalogName(cleanName);
  const rowsInMacro = await findCatalogByMacro(macro);
  const existing = rowsInMacro.find((row) => row.normalizedName === normalizedName);
  if (existing) {
    if (existing.active) {
      throw new Error('Essa subcategoria já existe nesse serviço macro.');
    }
    throw new Error('Essa subcategoria já existe e está desativada. Use a ação Reativar.');
  }

  const id = `CAT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const now = new Date().toISOString();
  const nextRow = {
    id,
    macro,
    name: cleanName,
    normalizedName,
    active: true,
    createdAt: now,
    updatedAt: now,
  };

  await db.serviceCatalog.add(nextRow);
  return mapCatalogRow(nextRow);
}

export async function updateServiceSubcategory(subcategoryId, nextName) {
  await ensureDbReady();
  await delay();

  const row = await db.serviceCatalog.get(subcategoryId);
  if (!row) {
    throw new Error('Subcategoria não encontrada.');
  }

  const cleanName = cleanCatalogName(nextName);
  if (!cleanName) {
    throw new Error('Informe o nome da subcategoria.');
  }

  const normalizedName = normalizeCatalogName(cleanName);
  const rowsInMacro = await findCatalogByMacro(row.macro);
  const conflict = rowsInMacro.find(
    (item) => item.id !== subcategoryId && item.normalizedName === normalizedName,
  );

  if (conflict) {
    throw new Error('Já existe uma subcategoria com esse nome nesse serviço macro.');
  }

  const updatedAt = new Date().toISOString();
  await db.serviceCatalog.update(subcategoryId, { name: cleanName, normalizedName, updatedAt });
  return mapCatalogRow({ ...row, name: cleanName, normalizedName, updatedAt });
}

export async function deactivateServiceSubcategory(subcategoryId) {
  await ensureDbReady();
  await delay();

  const row = await db.serviceCatalog.get(subcategoryId);
  if (!row) {
    throw new Error('Subcategoria não encontrada.');
  }

  const updatedAt = new Date().toISOString();
  await db.serviceCatalog.update(subcategoryId, { active: false, updatedAt });
  return mapCatalogRow({ ...row, active: false, updatedAt });
}

export async function reactivateServiceSubcategory(subcategoryId) {
  await ensureDbReady();
  await delay();

  const row = await db.serviceCatalog.get(subcategoryId);
  if (!row) {
    throw new Error('Subcategoria não encontrada.');
  }

  const rowsInMacro = await findCatalogByMacro(row.macro);
  const conflict = rowsInMacro.find(
    (item) => item.id !== subcategoryId && item.active && item.normalizedName === row.normalizedName,
  );

  if (conflict) {
    throw new Error('Já existe uma subcategoria ativa com esse nome nesse serviço macro.');
  }

  const updatedAt = new Date().toISOString();
  await db.serviceCatalog.update(subcategoryId, { active: true, updatedAt });
  return mapCatalogRow({ ...row, active: true, updatedAt });
}

export async function getAutomations() {
  await ensureDbReady();
  await delay();
  return db.automations.toArray();
}
