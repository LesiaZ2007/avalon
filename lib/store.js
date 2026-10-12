// Room storage. Uses Redis when configured, or process memory for local development.
// Vercel functions don't share memory, so production needs Redis.
//
// Two ways to reach Redis, depending on which store was connected in Vercel:
// - Upstash's REST API (KV_REST_API_URL + KV_REST_API_TOKEN, or UPSTASH_REDIS_REST_URL +
//   UPSTASH_REDIS_REST_TOKEN, or the same names under a custom prefix). Preferred: plain fetch,
//   no connection to keep open.
// - A redis:// or rediss:// connection string (REDIS_URL or KV_URL), as Vercel's own Redis
//   store provides.
import { randomBytes } from 'node:crypto';
import { createClient } from 'redis';
import { GameError } from './errors';

function findRest(env) {
  const pairs = [
    ['KV_REST_API_URL', 'KV_REST_API_TOKEN'],
    ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN'],
  ];
  for (const [url, token] of pairs) if (env[url] && env[token]) return { url: env[url], token: env[token] };
  // A custom prefix chosen when connecting the store, e.g. AVALON_KV_REST_API_URL.
  for (const key of Object.keys(env)) {
    const m = key.match(/^(.*)(REST_API_URL|REDIS_REST_URL)$/);
    const tokenKey = m && `${m[1]}${m[2].replace('URL', 'TOKEN')}`;
    if (m && /^https?:\/\//.test(env[key] ?? '') && env[tokenKey]) return { url: env[key], token: env[tokenKey] };
  }
  return null;
}

function findConnectionString(env) {
  if (/^rediss?:\/\//.test(env.REDIS_URL ?? '')) return env.REDIS_URL;
  if (/^rediss?:\/\//.test(env.KV_URL ?? '')) return env.KV_URL;
  const key = Object.keys(env).find((k) => /(REDIS|KV)_URL$/.test(k) && /^rediss?:\/\//.test(env[k]));
  return key ? env[key] : null;
}

const REST = findRest(process.env);
const CONNECTION = REST ? null : findConnectionString(process.env);
const useRedis = Boolean(REST || CONNECTION);
const TTL_SECONDS = 60 * 60 * 12; // rooms vanish 12 hours after their last change

const roomKey = (code) => `avalon:room:${code}`;
const seenKey = (code) => `avalon:seen:${code}`;
const lockKey = (code) => `avalon:lock:${code}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function assertConfigured() {
  if (useRedis || !process.env.VERCEL) return;
  // Names only, never values, so the error is safe to show.
  const seen = Object.keys(process.env).filter((k) => /REDIS|UPSTASH|^KV_|_KV_/.test(k));
  throw new Error(
    `Storage is not set up for this deployment (${process.env.VERCEL_ENV ?? 'unknown'} environment). ` +
      (seen.length
        ? `The app can see ${seen.join(', ')}, but no usable Redis REST URL + token or redis:// URL among them. `
        : 'The app can see no Redis variables at all. ') +
      'In Vercel, open Storage, make sure the Redis store is connected to this project for this environment, then redeploy.'
  );
}

async function tcpClient() {
  if (!globalThis.__avalonRedis) {
    const client = createClient({
      url: CONNECTION,
      socket: { connectTimeout: 5000, reconnectStrategy: (tries) => (tries > 5 ? false : Math.min(tries * 200, 1000)) },
    });
    client.on('error', (err) => console.error('Redis connection error:', err.message));
    globalThis.__avalonRedis = client.connect().then(
      () => client,
      (err) => {
        globalThis.__avalonRedis = null;
        throw new Error(`Could not connect to Redis: ${err.message}`);
      }
    );
  }
  return globalThis.__avalonRedis;
}

async function redis(...command) {
  if (CONNECTION) {
    const client = await tcpClient();
    return client.sendCommand(command.map(String));
  }
  const res = await fetch(REST.url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${REST.token}`, 'Content-Type': 'application/json' },
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
const memorySeen = (globalThis.__avalonSeen ??= new Map());

// Polls from many phones often land on the same server instance. Sharing a read for under a
// second turns fifteen phones polling one room into roughly one Redis read per second.
// Cached values are shared between requests, so callers must treat them as read-only.
const CACHE_MS = 900;
const cache = (globalThis.__avalonCache ??= new Map());
function shared(key, load) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.value;
  const value = load();
  cache.set(key, { at: Date.now(), value });
  value.catch(() => cache.delete(key));
  return value;
}

/** The room for read-only use (polling). May be up to a second old. */
export function loadRoomShared(code) {
  return shared(`room:${code}`, () => loadRoom(code));
}

/**
 * Presence lives in its own small hash (player id -> last check-in), so a check-in costs one
 * command and doesn't change the room's version or make every phone re-download it.
 */
export function loadPresence(code) {
  assertConfigured();
  return shared(`seen:${code}`, async () => {
    if (!useRedis) return { ...(memorySeen.get(code) ?? {}) };
    const raw = (await redis('HGETALL', seenKey(code))) ?? [];
    const pairs = Array.isArray(raw) ? raw : Object.entries(raw).flat();
    const out = {};
    for (let i = 0; i < pairs.length; i += 2) out[pairs[i]] = Number(pairs[i + 1]);
    return out;
  });
}

export async function touchPresence(code, pid) {
  assertConfigured();
  const now = Date.now();
  if (!useRedis) {
    memorySeen.set(code, { ...(memorySeen.get(code) ?? {}), [pid]: now });
  } else {
    await redis('HSET', seenKey(code), pid, now);
    await redis('EXPIRE', seenKey(code), TTL_SECONDS);
  }
  const hit = cache.get(`seen:${code}`);
  if (hit) hit.value = hit.value.then((m) => ({ ...m, [pid]: now }));
}

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
    cache.set(`room:${code}`, { at: Date.now(), value: Promise.resolve(room) });
    return { room, result };
  } finally {
    await release();
  }
}
