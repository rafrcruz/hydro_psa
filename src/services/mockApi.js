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

function parsePeriodDays(value) {
  const days = Number(value);
  if (!Number.isFinite(days) || days <= 0) {
    return 90;
  }
  return days;
}

function periodRangeFromDays(periodDays) {
  const days = parsePeriodDays(periodDays);
  const end = new Date();
  const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
  return { start, end, days };
}

function isDateInRange(dateValue, range) {
  if (!dateValue || !range) {
    return false;
  }
  const timestamp = new Date(dateValue).getTime();
  if (Number.isNaN(timestamp)) {
    return false;
  }
  return timestamp >= range.start.getTime() && timestamp <= range.end.getTime();
}

function resolveRequestClosedAt(request) {
  if (request.dataFechamento) {
    return request.dataFechamento;
  }
  if (FINAL_STATUS.includes(request.status)) {
    return request.dataAtualizacao || request.dataInclusao;
  }
  return '';
}

function toUtcDayStart(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function toUtcWeekStart(date) {
  const dayStart = toUtcDayStart(date);
  const dayOfWeek = dayStart.getUTCDay();
  const distanceToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  return new Date(dayStart.getTime() - distanceToMonday * 24 * 60 * 60 * 1000);
}

function toUtcMonthStart(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function chooseGranularity(periodDays) {
  if (periodDays <= 30) {
    return 'day';
  }
  if (periodDays <= 120) {
    return 'week';
  }
  return 'month';
}

function addGranularityStep(date, granularity) {
  if (granularity === 'day') {
    return new Date(date.getTime() + 24 * 60 * 60 * 1000);
  }
  if (granularity === 'week') {
    return new Date(date.getTime() + 7 * 24 * 60 * 60 * 1000);
  }
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
}

function floorByGranularity(date, granularity) {
  if (granularity === 'day') {
    return toUtcDayStart(date);
  }
  if (granularity === 'week') {
    return toUtcWeekStart(date);
  }
  return toUtcMonthStart(date);
}

function formatBucketLabel(startDate, granularity) {
  if (granularity === 'day') {
    return startDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  }
  if (granularity === 'week') {
    const endDate = new Date(startDate.getTime() + 6 * 24 * 60 * 60 * 1000);
    return `${startDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} - ${endDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`;
  }
  return startDate.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
}

function granularityLabel(granularity) {
  if (granularity === 'day') {
    return 'Dia';
  }
  if (granularity === 'week') {
    return 'Semana';
  }
  return 'Mes';
}

function buildTimeBuckets(range, granularity) {
  const firstStart = floorByGranularity(range.start, granularity);
  const rangeEndExclusive = new Date(range.end.getTime() + 1);
  const buckets = [];
  let cursor = firstStart;
  let safety = 0;

  while (cursor.getTime() < rangeEndExclusive.getTime() && safety < 500) {
    const next = addGranularityStep(cursor, granularity);
    buckets.push({
      key: `${granularity}-${cursor.toISOString()}`,
      label: formatBucketLabel(cursor, granularity),
      startAt: cursor.toISOString(),
      endAt: new Date(Math.min(next.getTime(), rangeEndExclusive.getTime()) - 1).toISOString(),
      startMs: cursor.getTime(),
      endExclusiveMs: Math.min(next.getTime(), rangeEndExclusive.getTime()),
    });
    cursor = next;
    safety += 1;
  }

  return buckets;
}

function findBucketIndex(buckets, timestamp) {
  if (Number.isNaN(timestamp)) {
    return -1;
  }

  for (let index = 0; index < buckets.length; index += 1) {
    const bucket = buckets[index];
    if (timestamp >= bucket.startMs && timestamp < bucket.endExclusiveMs) {
      return index;
    }
  }

  return -1;
}

function buildDistribution(list, field, topN = 6) {
  const counts = list.reduce((acc, item) => {
    const key = item[field] || 'Nao informado';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const total = list.length;
  const ranked = Object.entries(counts)
    .map(([label, count]) => ({ key: label, label, count, values: [label] }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'pt-BR', { sensitivity: 'base' }));

  const topRows = ranked.slice(0, topN);
  const othersRows = ranked.slice(topN);
  const othersCount = othersRows.reduce((acc, row) => acc + row.count, 0);
  if (othersCount > 0) {
    topRows.push({
      key: 'OUTROS',
      label: 'Outros',
      count: othersCount,
      values: othersRows.flatMap((row) => row.values),
    });
  }

  return {
    total,
    rows: topRows.map((row) => ({
      ...row,
      percentual: total ? (row.count / total) * 100 : 0,
    })),
  };
}

function buildDistributionFromGroups(groupMap, topN = 8) {
  const ranked = Object.entries(groupMap)
    .map(([key, data]) => ({
      key,
      label: data.label,
      count: data.count,
      delayedCount: data.delayedCount || 0,
      values: data.values || [key],
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'pt-BR', { sensitivity: 'base' }));

  const topRows = ranked.slice(0, topN);
  const others = ranked.slice(topN);
  if (others.length) {
    topRows.push({
      key: 'OUTROS',
      label: 'Outros',
      count: others.reduce((acc, row) => acc + row.count, 0),
      delayedCount: others.reduce((acc, row) => acc + row.delayedCount, 0),
      values: others.flatMap((row) => row.values),
    });
  }

  const total = ranked.reduce((acc, row) => acc + row.count, 0);
  return {
    total,
    rows: topRows.map((row) => ({
      ...row,
      percentual: total ? (row.count / total) * 100 : 0,
    })),
  };
}

function buildServiceMacroDistribution(list) {
  const mainCategories = ['PIMS', 'SDCD', 'Redes', 'Elétrica', 'Automação'];
  const counts = {
    PIMS: 0,
    SDCD: 0,
    Redes: 0,
    Elétrica: 0,
    Automação: 0,
    Outros: 0,
  };

  list.forEach(item => {
    const macro = item.servicoMacro;
    if (mainCategories.includes(macro)) {
      counts[macro] += 1;
    } else {
      counts.Outros += 1;
    }
  });

  const total = list.length;
  const rows = [...mainCategories, 'Outros'].map(category => ({
    key: category,
    label: category,
    count: counts[category],
    percentual: total > 0 ? (counts[category] / total) * 100 : 0,
    values: [category],
  }));

  return {
    total,
    rows,
  };
}

function hoursBetween(startAt, endAt) {
  const start = new Date(startAt).getTime();
  const end = new Date(endAt).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) {
    return 0;
  }
  return (end - start) / (1000 * 60 * 60);
}

function formatAging(hours) {
  if (hours < 24) {
    return `${Math.max(1, Math.round(hours))}h`;
  }
  const days = Math.floor(hours / 24);
  const remainder = Math.round(hours % 24);
  if (remainder === 0) {
    return `${days}d`;
  }
  return `${days}d ${remainder}h`;
}

function normalizeManagementFilters(filters = {}) {
  return {
    periodDays: parsePeriodDays(filters.periodDays),
    area: filters.area || [],
    servicoMacro: filters.servicoMacro || [],
    tipoDemanda: filters.tipoDemanda || [],
    status: filters.status || [],
    gm: filters.gm || 'ALL',
  };
}

function matchesManagementDrilldown(request, drilldown = {}, context = {}) {
  const type = drilldown?.type || 'ALL';
  const range = context.range;
  const nowIso = context.nowIso || new Date().toISOString();

  if (type === 'ALL') {
    return true;
  }
  if (type === 'ENTRADAS_PERIODO') {
    return isDateInRange(request.dataInclusao, range);
  }
  if (type === 'CONCLUIDOS_PERIODO') {
    return isDateInRange(resolveRequestClosedAt(request), range);
  }
  if (type === 'BACKLOG_ATUAL') {
    return !FINAL_STATUS.includes(request.status);
  }
  if (type === 'GM_PENDENTE') {
    return !request.gmId;
  }
  if (type === 'ERRO_CRITICO_ABERTO') {
    return request.tipoDemanda === 'Erro Crítico' && !FINAL_STATUS.includes(request.status);
  }
  if (type === 'TREND_ENTRADAS') {
    return isDateInRange(request.dataInclusao, {
      start: new Date(drilldown.startAt),
      end: new Date(drilldown.endAt),
    });
  }
  if (type === 'TREND_CONCLUIDOS') {
    return isDateInRange(resolveRequestClosedAt(request), {
      start: new Date(drilldown.startAt),
      end: new Date(drilldown.endAt),
    });
  }
  if (type === 'TREND_BACKLOG') {
    const pointTime = new Date(drilldown.pointAt).getTime();
    const createdMs = new Date(request.dataInclusao).getTime();
    if (Number.isNaN(pointTime) || Number.isNaN(createdMs) || createdMs > pointTime) {
      return false;
    }
    if (!FINAL_STATUS.includes(request.status)) {
      return true;
    }
    const closedMs = new Date(resolveRequestClosedAt(request)).getTime();
    return Number.isNaN(closedMs) || closedMs > pointTime;
  }
  if (type === 'DISTRIBUTION_AREA') {
    return isDateInRange(request.dataInclusao, range) && (drilldown.values || []).includes(request.area);
  }
  if (type === 'DISTRIBUTION_SERVICO') {
    return isDateInRange(request.dataInclusao, range) && (drilldown.values || []).includes(request.servicoMacro);
  }
  if (type === 'SLA_DENTRO') {
    if (!isDateInRange(resolveRequestClosedAt(request), range)) {
      return false;
    }
    return hoursBetween(request.dataInclusao, resolveRequestClosedAt(request)) <= Number(request.slaHoras || 0);
  }
  if (type === 'SLA_FORA') {
    if (!isDateInRange(resolveRequestClosedAt(request), range)) {
      return false;
    }
    return hoursBetween(request.dataInclusao, resolveRequestClosedAt(request)) > Number(request.slaHoras || 0);
  }
  if (type === 'SLA_ATRASADOS_ABERTOS') {
    return !FINAL_STATUS.includes(request.status) && hoursBetween(request.dataInclusao, nowIso) > Number(request.slaHoras || 0);
  }
  if (type === 'SLA_AGING_BUCKET') {
    if (FINAL_STATUS.includes(request.status)) {
      return false;
    }
    const ageDays = Math.floor(Math.max(0, hoursBetween(request.dataInclusao, nowIso)) / 24);
    const bucketKey = drilldown.bucketKey;
    if (bucketKey === 'D0_2') {
      return ageDays >= 0 && ageDays <= 2;
    }
    if (bucketKey === 'D3_7') {
      return ageDays >= 3 && ageDays <= 7;
    }
    if (bucketKey === 'D8_14') {
      return ageDays >= 8 && ageDays <= 14;
    }
    if (bucketKey === 'D15_PLUS') {
      return ageDays >= 15;
    }
    return false;
  }
  if (type === 'GM_BACKLOG_PENDENTE') {
    return !FINAL_STATUS.includes(request.status) && !request.gmId;
  }
  if (type === 'GM_BACKLOG_COM') {
    return !FINAL_STATUS.includes(request.status) && Boolean(request.gmId);
  }
  if (type === 'GM_PENDENTE_SERVICO') {
    return !FINAL_STATUS.includes(request.status) && !request.gmId && (drilldown.values || []).includes(request.servicoMacro);
  }
  if (type === 'GM_MUDANCAS_PERIODO') {
    return isDateInRange(request.dataInclusao, range) && request.tipoDemanda === 'Mudança';
  }
  if (type === 'GM_MUDANCAS_PERIODO_SEM_GM') {
    return isDateInRange(request.dataInclusao, range) && request.tipoDemanda === 'Mudança' && !request.gmId;
  }
  if (type === 'CAPACITY_WIP_ASSIGNED') {
    return !FINAL_STATUS.includes(request.status) && Boolean(request.executorResponsavelId);
  }
  if (type === 'CAPACITY_WIP_EXECUTOR') {
    return !FINAL_STATUS.includes(request.status) && (drilldown.executorIds || []).includes(request.executorResponsavelId || '');
  }
  if (type === 'CAPACITY_WIP_EXECUTOR_DELAY') {
    if (FINAL_STATUS.includes(request.status)) {
      return false;
    }
    if (!(drilldown.executorIds || []).includes(request.executorResponsavelId || '')) {
      return false;
    }
    const delayed = hoursBetween(request.dataInclusao, nowIso) > Number(request.slaHoras || 0);
    return drilldown.delayed ? delayed : !delayed;
  }
  if (type === 'CAPACITY_CONCLUIDOS_EXECUTOR') {
    if (!isDateInRange(resolveRequestClosedAt(request), range)) {
      return false;
    }
    const executorId = request.executorResponsavelId || 'UNASSIGNED';
    return (drilldown.executorIds || []).includes(executorId);
  }
  if (type === 'CAPACITY_CONCLUIDOS_EXECUTOR_SLA') {
    if (!isDateInRange(resolveRequestClosedAt(request), range)) {
      return false;
    }
    if (!(drilldown.executorIds || []).includes(request.executorResponsavelId || 'UNASSIGNED')) {
      return false;
    }
    const isDelayed = hoursBetween(request.dataInclusao, resolveRequestClosedAt(request)) > Number(request.slaHoras || 0);
    return drilldown.delayed ? isDelayed : !isDelayed;
  }
  if (type === 'CAPACITY_SEM_RESPONSAVEL') {
    return !FINAL_STATUS.includes(request.status) && !request.executorResponsavelId;
  }
  if (type === 'REQUEST_IDS') {
    return (drilldown.requestIds || []).includes(request.id);
  }
  return true;
}

function matchesDashboardFilters(request, filters = {}) {
  if (!matchesMulti(request.area, filters.area)) {
    return false;
  }
  if (!matchesMulti(request.servicoMacro, filters.servicoMacro)) {
    return false;
  }
  if (!matchesMulti(request.tipoDemanda, filters.tipoDemanda)) {
    return false;
  }
  if (!matchesMulti(request.status, filters.status)) {
    return false;
  }

  if (filters.gm === 'WITH' && !request.gmId) {
    return false;
  }
  if (filters.gm === 'PENDING' && request.gmId) {
    return false;
  }
  return true;
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

export async function getManagementDashboardMetrics(filters = {}) {
  await ensureDbReady();
  await delay();

  // 1. Normalizar filtros e preparar o ambiente
  const normalizedFilters = normalizeManagementFilters(filters);
  const range = periodRangeFromDays(normalizedFilters.periodDays);
  const nowIso = new Date().toISOString();
  const usersById = await getUsersIndex();
  const allRequests = await db.requests.toArray();

  // 2. Aplicar filtros dimensionais PRIMEIRO para obter um conjunto de dados base
  // Esta é a mudança principal: não filtramos por período aqui.
  const dimensionallyFilteredRequests = allRequests.filter((request) =>
    matchesDashboardFilters(request, normalizedFilters)
  );

  // 3. Calcular Métricas "AGORA" (baseadas no estado atual)
  const backlogNow = dimensionallyFilteredRequests.filter(
    (request) => !FINAL_STATUS.includes(request.status)
  );

  const gmPendenteAgora = backlogNow.filter((request) => !request.gmId);
  const semResponsavelAgora = backlogNow.filter((request) => !request.executorResponsavelId);
  const erroCriticoEmAberto = backlogNow.filter(
    (request) => request.tipoDemanda === 'Erro Crítico'
  );
  const atrasadosEmAberto = backlogNow.filter(
    (request) =>
      Number(request.slaHoras) > 0 &&
      hoursBetween(request.dataInclusao, nowIso) > Number(request.slaHoras)
  );

  const metricsNow = {
    backlogAtual: backlogNow.length,
    gmPendenteAgora: gmPendenteAgora.length,
    gmPendenteAgoraPercentual: backlogNow.length
      ? Math.round((gmPendenteAgora.length / backlogNow.length) * 100)
      : 0,
    semResponsavelAgora: semResponsavelAgora.length,
    semResponsavelAgoraPercentual: backlogNow.length
      ? Math.round((semResponsavelAgora.length / backlogNow.length) * 100)
      : 0,
    erroCriticoEmAberto: erroCriticoEmAberto.length,
    atrasadosEmAberto: atrasadosEmAberto.length,
    atrasadosEmAbertoPercentual: backlogNow.length
      ? Math.round((atrasadosEmAberto.length / backlogNow.length) * 100)
      : 0,
  };

  // 4. Calcular Métricas "NO PERÍODO"
  const entradasNoPeriodo = dimensionallyFilteredRequests.filter((request) =>
    isDateInRange(request.dataInclusao, range)
  );
  const concluidosNoPeriodo = dimensionallyFilteredRequests.filter((request) =>
    isDateInRange(resolveRequestClosedAt(request), range)
  );

  const concluidosDentroSla = concluidosNoPeriodo.filter(
    (r) =>
      Number(r.slaHoras) > 0 &&
      hoursBetween(r.dataInclusao, resolveRequestClosedAt(r)) <= Number(r.slaHoras)
  );
  const concluidosForaSla = concluidosNoPeriodo.filter(
    (r) =>
      Number(r.slaHoras) > 0 &&
      hoursBetween(r.dataInclusao, resolveRequestClosedAt(r)) > Number(r.slaHoras)
  );

  const metricsPeriod = {
    entradasNoPeriodo: entradasNoPeriodo.length,
    concluidosNoPeriodo: concluidosNoPeriodo.length,
    concluidosDentroSla: concluidosDentroSla.length,
    concluidosForaSla: concluidosForaSla.length,
    taxaConclusaoDentroSla: concluidosNoPeriodo.length
      ? Math.round((concluidosDentroSla.length / concluidosNoPeriodo.length) * 100)
      : 0,
  };

  // 5. Métricas de Capacidade
  const assignedBacklog = backlogNow.filter((r) => r.executorResponsavelId);
  const unassignedBacklog = backlogNow.filter((r) => !r.executorResponsavelId);
  const executors = (await db.users.where('role').equals('Executor').toArray());
  const executorCount = executors.length > 0 ? executors.length : 1;

  const wipByExecutorMap = assignedBacklog.reduce((acc, request) => {
    const { executorResponsavelId } = request;
    const executor = usersById[executorResponsavelId];
    if (!acc[executorResponsavelId]) {
      acc[executorResponsavelId] = {
        label: executor?.name || executorResponsavelId,
        count: 0,
        onTime: 0,
        overdue: 0,
      };
    }
    acc[executorResponsavelId].count += 1;
    const isOverdue = atrasadosEmAberto.some(r => r.id === request.id);
    if (isOverdue) {
      acc[executorResponsavelId].overdue += 1;
    } else {
      acc[executorResponsavelId].onTime += 1;
    }
    return acc;
  }, {});

  const wipByExecutor = Object.entries(wipByExecutorMap)
    .map(([key, data]) => ({ ...data, key, values: [key] }))
    .sort((a,b) => b.count - a.count || a.label.localeCompare(b.label));

  const concludedByExecutorMap = concluidosNoPeriodo.reduce((acc, request) => {
    const executorId = request.executorResponsavelId || 'UNASSIGNED';
    const label = request.executorResponsavelId
      ? (usersById[request.executorResponsavelId]?.name || request.executorResponsavelId)
      : 'Nao atribuido';
    if (!acc[executorId]) {
      acc[executorId] = { label, count: 0, onTime: 0, overdue: 0 };
    }
    acc[executorId].count += 1;

    const isOverdue = hoursBetween(request.dataInclusao, resolveRequestClosedAt(request)) > Number(request.slaHoras || 0);
    if (isOverdue) {
      acc[executorId].overdue += 1;
    } else {
      acc[executorId].onTime += 1;
    }

    return acc;
  }, {});
  
  const completedByExecutor = Object.entries(concludedByExecutorMap)
    .map(([key, data]) => ({ ...data, key, values: [key] }))
    .sort((a,b) => b.count - a.count || a.label.localeCompare(b.label));
  
  const unassignedOpenList = unassignedBacklog
    .map((request) => {
      const ageHours = hoursBetween(request.dataInclusao, nowIso);
      return {
        id: request.id,
        titulo: request.titulo,
        area: request.area,
        servicoMacro: request.servicoMacro,
        status: request.status,
        idadeDias: Math.max(0, Math.floor(ageHours / 24)),
        gm: Boolean(request.gmId),
      };
    })
    .sort((a, b) => b.idadeDias - a.idadeDias || a.id.localeCompare(b.id, 'pt-BR', { sensitivity: 'base' }))
    .slice(0, 10);

  const teamCapacity = {
    totalBacklogCount: metricsNow.backlogAtual,
    assignedBacklogCount: assignedBacklog.length,
    unassignedBacklogCount: unassignedBacklog.length,
    unassignedBacklogPercent: metricsNow.semResponsavelAgoraPercentual,
    executorsWithWipCount: wipByExecutor.length,
    wipByExecutor,
    completedByExecutor,
    unassignedOpenList,
    averageCapacity: {
      currentLoadPerExecutor: assignedBacklog.length / executorCount,
      recentAverageLoadPerExecutor: null, // TODO: Implement simple historical average
    }
  };


  // 6. Manter as análises de tendências e quebras existentes
  const trendBaseRequests = dimensionallyFilteredRequests;

  const granularity = chooseGranularity(range.days);
  const buckets = buildTimeBuckets(range, granularity);

  const entriesVsClosedSeries = buckets.map((bucket) => ({
    key: bucket.key,
    label: bucket.label,
    startAt: bucket.startAt,
    endAt: bucket.endAt,
    entradas: 0,
    concluidos: 0,
  }));

  trendBaseRequests.forEach((request) => {
    const createdMs = new Date(request.dataInclusao).getTime();
    if (isDateInRange(request.dataInclusao, range)) {
      const bucketIndex = findBucketIndex(buckets, createdMs);
      if (bucketIndex >= 0) {
        entriesVsClosedSeries[bucketIndex].entradas += 1;
      }
    }

    const closedAt = resolveRequestClosedAt(request);
    if (isDateInRange(closedAt, range)) {
      const closedMs = new Date(closedAt).getTime();
      const bucketIndex = findBucketIndex(buckets, closedMs);
      if (bucketIndex >= 0) {
        entriesVsClosedSeries[bucketIndex].concluidos += 1;
      }
    }
  });
  
  const backlogSeries = buckets.map((bucket) => {
    const pointTime = bucket.endExclusiveMs - 1;
    const count = trendBaseRequests.filter((request) => {
      const createdMs = new Date(request.dataInclusao).getTime();
      if (Number.isNaN(createdMs) || createdMs > pointTime) {
        return false;
      }

      if (!FINAL_STATUS.includes(request.status)) {
        return true;
      }

      const closedMs = new Date(resolveRequestClosedAt(request)).getTime();
      return Number.isNaN(closedMs) || closedMs > pointTime;
    }).length;

    return {
      key: bucket.key,
      label: bucket.label,
      startAt: bucket.startAt,
      endAt: bucket.endAt,
      pointAt: new Date(pointTime).toISOString(),
      backlog: count,
    };
  });

  // Base para distribuições: Entradas no Período
  const distributionBaseRequests = entradasNoPeriodo;
  const distributionByArea = buildDistribution(distributionBaseRequests, 'area', 8);
  const distributionByService = buildServiceMacroDistribution(distributionBaseRequests);

  // Base para saúde do SLA: Backlog Atual e Concluídos no Período
  const openAgingBucketsBase = [
    { key: 'D0_2', label: '0-2 dias', minDays: 0, maxDays: 2, count: 0 },
    { key: 'D3_7', label: '3-7 dias', minDays: 3, maxDays: 7, count: 0 },
    { key: 'D8_14', label: '8-14 dias', minDays: 8, maxDays: 14, count: 0 },
    { key: 'D15_PLUS', label: '>14 dias', minDays: 15, maxDays: null, count: 0 },
  ];
  const openAgingBuckets = backlogNow.reduce((acc, request) => {
    const ageHours = Math.max(0, hoursBetween(request.dataInclusao, nowIso));
    const ageDays = Math.floor(ageHours / 24);
    const bucket = acc.find((item) => (
      ageDays >= item.minDays && (item.maxDays === null || ageDays <= item.maxDays)
    ));
    if (bucket) {
      bucket.count += 1;
    }
    return acc;
  }, openAgingBucketsBase);

  // Manter outras seções se necessário, adaptando a base
  const topDelayRequests = atrasadosEmAberto
    .map((request) => {
      const ageHours = hoursBetween(request.dataInclusao, nowIso);
      const exceededHours = Math.max(0, ageHours - Number(request.slaHoras || 0));
      const responsible = request.executorResponsavelId ? usersById[request.executorResponsavelId] : null;
      return {
        id: request.id,
        titulo: request.titulo,
        area: request.area,
        servicoMacro: request.servicoMacro,
        status: request.status,
        responsavel: responsible?.name || 'Sem responsavel',
        idadeHoras: Math.round(ageHours),
        idadeLabel: formatAging(ageHours),
        excedeuSlaHoras: Math.round(exceededHours),
        excedeuSlaLabel: formatAging(exceededHours),
        gm: Boolean(request.gmId),
      };
    })
    .sort((a, b) => b.excedeuSlaHoras - a.excedeuSlaHoras || b.idadeHoras - a.idadeHoras)
    .slice(0, 5);
  
  const gmPendingInBacklog = backlogNow.filter((request) => !request.gmId);
  const gmPendingByServiceRanking = SERVICE_MACROS.map((macro) => {
    const pendingInService = gmPendingInBacklog.filter(r => r.servicoMacro === macro);
    const backlogInService = backlogNow.filter(r => r.servicoMacro === macro);
    return {
      key: macro,
      label: macro,
      count: pendingInService.length,
      backlogCount: backlogInService.length,
      pendingPercentOfServiceBacklog: backlogInService.length ? Math.round((pendingInService.length / backlogInService.length) * 100) : 0,
    };
  })
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'pt-BR', { sensitivity: 'base' }))
    .map((row) => ({
      ...row,
      percentual: gmPendingInBacklog.length ? (row.count / gmPendingInBacklog.length) * 100 : 0,
      values: [row.key],
    }));

  // 7. Montar e retornar o objeto final
  return {
    period: {
      days: range.days,
      startAt: range.start.toISOString(),
      endAt: range.end.toISOString(),
    },
    metricsPeriod,
    metricsNow,
    teamCapacity,
    trace: {
      totalGeral: allRequests.length,
      totalComFiltrosDimensionais: dimensionallyFilteredRequests.length,
      backlogAtual: backlogNow.length,
      entradasNoPeriodo: entradasNoPeriodo.length,
    },
    trends: {
      base: 'FILTROS_DIMENSIONAIS',
      baseLabel: 'Base: Chamados filtrados (sem filtro de período)',
      granularity,
      granularityLabel: granularityLabel(granularity),
      entriesVsClosed: entriesVsClosedSeries,
      backlog: backlogSeries,
    },
    distributions: {
      base: 'ENTRADAS_PERIODO',
      baseLabel: 'Base: Entradas no período',
      byArea: distributionByArea,
      byServiceMacro: distributionByService,
    },
    slaHealth: {
      concludedInPeriodTotal: concluidosNoPeriodo.length,
      concludedWithinSlaCount: concluidosDentroSla.length,
      concludedWithinSlaPercent: metricsPeriod.taxaConclusaoDentroSla,
      concludedOutsideSlaCount: concluidosForaSla.length,
      delayedOpenCount: metricsNow.atrasadosEmAberto,
      delayedOpenPercentOfBacklog: metricsNow.atrasadosEmAbertoPercentual,
      withinVsOutsideDistribution: {
        total: concluidosNoPeriodo.length,
        rows: [
          {
            key: 'WITHIN_SLA',
            label: 'Dentro do SLA',
            count: concluidosDentroSla.length,
            percentual: concluidosNoPeriodo.length ? (concluidosDentroSla.length / concluidosNoPeriodo.length) * 100 : 0,
          },
          {
            key: 'OUTSIDE_SLA',
            label: 'Fora do SLA',
            count: concluidosForaSla.length,
            percentual: concluidosNoPeriodo.length ? (concluidosForaSla.length / concluidosNoPeriodo.length) * 100 : 0,
          },
        ],
      },
      openAgingBuckets: {
        total: backlogNow.length,
        rows: openAgingBuckets.map((row) => ({
          ...row,
          percentual: backlogNow.length ? (row.count / backlogNow.length) * 100 : 0,
        })),
      },
      topDelays: topDelayRequests,
    },
    gmGovernance: {
      pendingCount: gmPendingInBacklog.length,
      pendingPercentOfBacklog: metricsNow.gmPendenteAgoraPercentual,
      withGmCount: backlogNow.length - gmPendingInBacklog.length,
      withGmPercentOfBacklog: 100 - metricsNow.gmPendenteAgoraPercentual,
      pendingByServiceRanking: gmPendingByServiceRanking,
    },
  };
}

function mapManagementListItem(request, usersById, nowIso) {
  const base = mapRequestListItem(request, usersById);
  const idadeHoras = Math.max(0, Math.round(hoursBetween(request.dataInclusao, nowIso)));
  return {
    ...base,
    idadeHoras,
    idadeDias: Math.floor(idadeHoras / 24),
    atualizadoEm: request.dataAtualizacao,
  };
}

export async function getManagementRequests(filters = {}, drilldown = { type: 'ALL' }) {
  await ensureDbReady();
  await delay();

  const normalizedFilters = normalizeManagementFilters(filters);
  const range = periodRangeFromDays(normalizedFilters.periodDays);
  const nowIso = new Date().toISOString();
  const usersById = await getUsersIndex();
  const requests = await db.requests.toArray();

  const list = requests
    .filter((request) => matchesDashboardFilters(request, normalizedFilters))
    .filter((request) => matchesManagementDrilldown(request, drilldown, { range, nowIso }))
    .map((request) => mapManagementListItem(request, usersById, nowIso))
    .sort((a, b) => new Date(b.dataAtualizacao).getTime() - new Date(a.dataAtualizacao).getTime());

  return {
    total: list.length,
    items: list,
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
