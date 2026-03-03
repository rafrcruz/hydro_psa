import Dexie from 'dexie';
import {
  seedActivities,
  seedAutomations,
  seedNotifications,
  seedRequests,
  seedServiceCatalog,
  seedUsers,
} from './seedData';

const SEED_VERSION = 4;

class HydroPsaDb extends Dexie {
  constructor() {
    super('hydro_psa_demo_db');

    this.version(1).stores({
      users: 'id, role, name',
      automations: 'id, status, owner',
      requests: 'id, requesterId, assigneeId, status, priority, createdAt',
      comments: 'id, requestId, authorId, createdAt',
    });

    this.version(2).stores({
      users: 'id, role, name',
      automations: 'id, status, owner',
      requests: 'id, solicitanteId, executorResponsavelId, status, prioridade, area, servicoMacro, dataInclusao, dataAtualizacao, dataFechamento',
      activities: 'id, requestId, kind, eventType, actorId, createdAt',
      metadata: 'key',
      comments: 'id, requestId, authorId, createdAt',
    });

    this.version(3).stores({
      users: 'id, role, name',
      automations: 'id, status, owner',
      requests: 'id, solicitanteId, executorResponsavelId, status, prioridade, area, servicoMacro, dataInclusao, dataAtualizacao, dataFechamento',
      activities: 'id, requestId, kind, eventType, actorId, createdAt',
      metadata: 'key',
      comments: 'id, requestId, authorId, createdAt',
      serviceCatalog: 'id, macro, normalizedName, active, updatedAt',
    });

    this.version(4).stores({
      users: 'id, role, name',
      automations: 'id, status, owner',
      requests: 'id, solicitanteId, executorResponsavelId, status, prioridade, area, servicoMacro, dataInclusao, dataAtualizacao, dataFechamento',
      activities: 'id, requestId, kind, eventType, actorId, createdAt',
      metadata: 'key',
      comments: 'id, requestId, authorId, createdAt',
      serviceCatalog: 'id, macro, normalizedName, active, updatedAt',
      notifications: 'id, recipientUserId, read, createdAt, requestId, type',
    });
  }
}

export const db = new HydroPsaDb();

export async function ensureSeedData() {
  const seedVersion = await db.metadata.get('seedVersion');

  if (seedVersion?.value === SEED_VERSION) {
    return;
  }

  await db.transaction(
    'rw',
    db.users,
    db.automations,
    db.requests,
    db.activities,
    db.metadata,
    db.comments,
    db.serviceCatalog,
    db.notifications,
    async () => {
    await db.users.clear();
    await db.automations.clear();
    await db.requests.clear();
    await db.activities.clear();
    await db.metadata.clear();
    await db.comments.clear();
    await db.serviceCatalog.clear();
    await db.notifications.clear();

    await db.users.bulkAdd(seedUsers);
    await db.automations.bulkAdd(seedAutomations);
    await db.requests.bulkAdd(seedRequests);
    await db.activities.bulkAdd(seedActivities);
    await db.serviceCatalog.bulkAdd(seedServiceCatalog);
    await db.notifications.bulkAdd(seedNotifications);
    await db.metadata.put({ key: 'seedVersion', value: SEED_VERSION });
  },
  );
}
