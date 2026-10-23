// One-off (iteration 2): moves the sessions logged before sign-in existed (user_id 'local') to the
// owner and removes the placeholder profile. Safe to re-run: a second run changes nothing.
import { eq } from 'drizzle-orm';
import { LEGACY_LOCAL_USER_ID } from '../src/config';
import { profiles, sessions } from '../src/db/schema';
import { findOwner, loadScriptEnv } from './owner';

const { db, host } = loadScriptEnv();
const owner = await findOwner(db);
const moved = await db
  .update(sessions)
  .set({ userId: owner.id })
  .where(eq(sessions.userId, LEGACY_LOCAL_USER_ID))
  .returning({ id: sessions.id });
await db.delete(profiles).where(eq(profiles.userId, LEGACY_LOCAL_USER_ID));
console.log(`${host}: moved ${moved.length} sessions from '${LEGACY_LOCAL_USER_ID}' to the owner.`);
