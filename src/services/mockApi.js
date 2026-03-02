import { db, ensureSeedData } from '../data/mockDb';

const SIMULATED_DELAY_MS = 320;

function delay(ms = SIMULATED_DELAY_MS) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function makeRequestId() {
  return `REQ-${Math.floor(Date.now() / 1000)}`;
}

function makeCommentId() {
  return `CMT-${Math.floor(Date.now() / 1000)}`;
}

function sortByRecent(a, b) {
  return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
}

export async function bootstrapMockApi() {
  await ensureSeedData();
}

export async function getRequesterRequests(requesterId) {
  await delay();
  return db.requests.where('requesterId').equals(requesterId).sortBy('updatedAt').then((rows) => rows.reverse());
}

export async function getQueueRequests() {
  await delay();
  const requests = await db.requests.toArray();
  return requests
    .filter((item) => item.status !== 'Concluido')
    .sort(sortByRecent);
}

export async function getRecentRequests(limit = 5) {
  await delay();
  const requests = await db.requests.toArray();
  return requests.sort(sortByRecent).slice(0, limit);
}

export async function createRequest(payload, requesterId) {
  const now = new Date().toISOString();
  const id = makeRequestId();

  const request = {
    id,
    title: payload.title,
    description: payload.description,
    category: payload.category,
    priority: payload.priority,
    status: 'Novo',
    requesterId,
    assigneeId: '',
    createdAt: now,
    updatedAt: now,
  };

  await delay();
  await db.requests.add(request);
  return request;
}

export async function getRequestById(requestId) {
  await delay();
  const request = await db.requests.get(requestId);
  if (!request) {
    return null;
  }

  const requester = await db.users.get(request.requesterId);
  const assignee = request.assigneeId ? await db.users.get(request.assigneeId) : null;
  const comments = await db.comments.where('requestId').equals(request.id).sortBy('createdAt');

  return {
    ...request,
    requesterName: requester?.name || 'Usuario desconhecido',
    assigneeName: assignee?.name || 'Nao atribuido',
    comments,
  };
}

export async function assignRequest(requestId, assigneeId) {
  await delay();
  const request = await db.requests.get(requestId);
  if (!request) {
    throw new Error('Chamado nao encontrado');
  }

  const updatedAt = new Date().toISOString();
  await db.requests.update(requestId, {
    assigneeId,
    status: request.status === 'Novo' ? 'Em atendimento' : request.status,
    updatedAt,
  });

  return db.requests.get(requestId);
}

export async function updateRequestStatus(requestId, status) {
  await delay();
  await db.requests.update(requestId, {
    status,
    updatedAt: new Date().toISOString(),
  });

  return db.requests.get(requestId);
}

export async function addRequestComment(requestId, author, message) {
  const createdAt = new Date().toISOString();
  const comment = {
    id: makeCommentId(),
    requestId,
    authorId: author.id,
    authorName: author.name,
    message,
    createdAt,
  };

  await delay();
  await db.comments.add(comment);
  await db.requests.update(requestId, { updatedAt: createdAt });

  return comment;
}

export async function getAutomations() {
  await delay();
  return db.automations.toArray();
}

export async function getUsers() {
  await delay();
  return db.users.toArray();
}

export async function getDashboardMetrics() {
  await delay();
  const requests = await db.requests.toArray();
  const automations = await db.automations.toArray();

  const byStatus = requests.reduce((acc, request) => {
    acc[request.status] = (acc[request.status] || 0) + 1;
    return acc;
  }, {});

  return {
    totalRequests: requests.length,
    openRequests: requests.filter((item) => item.status !== 'Concluido').length,
    inProgress: requests.filter((item) => item.status === 'Em atendimento').length,
    done: requests.filter((item) => item.status === 'Concluido').length,
    activeAutomations: automations.filter((item) => item.status === 'Ativo').length,
    byStatus,
  };
}
