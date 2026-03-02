import Dexie from 'dexie';
import { seedAutomations, seedComments, seedRequests, seedUsers } from './seedData';

class HydroPsaDb extends Dexie {
  constructor() {
    super('hydro_psa_demo_db');
    this.version(1).stores({
      users: 'id, role, name',
      automations: 'id, status, owner',
      requests: 'id, requesterId, assigneeId, status, priority, createdAt',
      comments: 'id, requestId, authorId, createdAt',
    });
  }
}

export const db = new HydroPsaDb();

export async function ensureSeedData() {
  const hasUsers = await db.users.count();
  if (hasUsers > 0) {
    return;
  }

  await db.transaction('rw', db.users, db.automations, db.requests, db.comments, async () => {
    await db.users.bulkAdd(seedUsers);
    await db.automations.bulkAdd(seedAutomations);
    await db.requests.bulkAdd(seedRequests);
    await db.comments.bulkAdd(seedComments);
  });
}
