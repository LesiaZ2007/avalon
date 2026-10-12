// Room storage. Uses Upstash Redis (via its REST API) when configured, or process memory
// for local development. Vercel functions don't share memory, so production needs Redis.
import { randomBytes } from 'node:crypto';
import { GameError } from './errors';

const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const useRedis = Boolean(REDIS_URL && REDIS_TOKEN);
const TTL_SECONDS = 60 * 60 * 12; // rooms vanish 12 hours after their last change

const roomKey = (code) => `avalon:room:${code}`;
const lockKey = (code) => `avalon:lock:${code}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function assertConfigured() {
  if (!useRedis && process.env.VERCEL) {
    throw new Error(
      'Storage is not set up. In your Vercel project, add Upstash Redis from the Marketplace (Storage tab), connect it to this project, then redeploy.'
    );
  }
}

async function redis(...command) {
  const res = await fetch(REDIS_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
    cache: 'no-store',
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.error) throw new Error(`Redis error: ${body.error || res.status}`);
  return body.result;
}

// Local fallback. Kept on globalThis so hot reloads in `next dev` don't wipe it.
const memory = (globalThis.__avalonRooms ??= new Map());
const memoryLocks = (globalThis.__avalonLocks ??= new Map());

export async function loadRoom(code) {
  assertConfigured();
  if (!useRedis) {
    const room = memory.get(code);
    return room ? structuredClone(room) : null;
  }
  const raw = await redis('GET', roomKey(code));
  return raw ? JSON.parse(raw) : null;
}

async function saveRoom(room) {
  if (!useRedis) {
    memory.set(room.code, structuredClone(room));
    return;
  }
  await redis('SET', roomKey(room.code), JSON.stringify(room), 'EX', TTL_SECONDS);
}

/** Store a brand-new room. Returns false if the code is already taken. */
export async function insertRoom(room) {
  assertConfigured();
  if (!useRedis) {
    if (memory.has(room.code)) return false;
    memory.set(room.code, structuredClone(room));
    return true;
  }
  const ok = await redis('SET', roomKey(room.code), JSON.stringify(room), 'EX', TTL_SECONDS, 'NX');
  return ok === 'OK';
}

const RELEASE_SCRIPT = 'if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) else return 0 end';

async function lock(code) {
  if (!useRedis) {
    const prev = memoryLocks.get(code) ?? Promise.resolve();
    let release;
    const next = new Promise((r) => (release = r));
    memoryLocks.set(code, prev.then(() => next));
    await prev;
    return async () => release();
  }
  const owner = randomBytes(8).toString('hex');
  for (let attempt = 0; attempt < 80; attempt++) {
    const ok = await redis('SET', lockKey(code), owner, 'NX', 'PX', 5000);
    if (ok === 'OK') return () => redis('EVAL', RELEASE_SCRIPT, 1, lockKey(code), owner).catch(() => {});
    await sleep(40 + Math.random() * 40);
  }
  throw new Error('The room is busy. Try again in a moment.');
}

/**
 * Load a room, let `mutate` change it, and save it, while holding a lock so two players
 * acting at once can't overwrite each other. If `mutate` throws, nothing is saved.
 */
export async function withRoom(code, mutate) {
  assertConfigured();
  const release = await lock(code);
  try {
    const room = await loadRoom(code);
    if (!room) throw new GameError('That room does not exist or has expired. Check the code.', 404);
    const result = mutate(room);
    room.version += 1;
    await saveRoom(room);
    return { room, result };
  } finally {
    await release();
  }
}
