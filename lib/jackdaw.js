// The link from Jackdaw Games, which gathers a table in its own lobby and hands it over to
// Avalon. Jackdaw's server calls /api/jackdaw/* with a shared secret (JACKDAW_LINK_SECRET).
import { createHash, timingSafeEqual } from 'node:crypto';
import { GameError } from './errors';

const digest = (text) => createHash('sha256').update(String(text)).digest();

/** Throws unless the request carries `authorization: Bearer <JACKDAW_LINK_SECRET>`. */
export function requireJackdaw(req) {
  const secret = process.env.JACKDAW_LINK_SECRET;
  if (!secret) throw new GameError('The Jackdaw link is not set up on this server.', 503);
  const header = req.headers.get('authorization') ?? '';
  const given = header.startsWith('Bearer ') ? header.slice(7) : '';
  // Comparing fixed-length digests keeps the check constant-time whatever was sent.
  if (!given || !timingSafeEqual(digest(given), digest(secret))) throw new GameError('Not allowed.', 401);
}
