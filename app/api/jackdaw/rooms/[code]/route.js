// GET (from Jackdaw's server) -> how a linked game stands: { phase, over } while it runs, then
// the winner, reason and every player's side and role, or { endedEarly: true }.
import { linkedStatus, normCode } from '@/lib/game';
import { loadRoomShared } from '@/lib/store';
import { requireJackdaw } from '@/lib/jackdaw';
import { GameError } from '@/lib/errors';
import { errorResponse, json } from '@/lib/http';

export const dynamic = 'force-dynamic';

export async function GET(req, { params }) {
  try {
    requireJackdaw(req);
    const code = normCode((await params).code);
    const room = await loadRoomShared(code);
    if (!room?.jackdaw) throw new GameError('That room does not exist or has expired.', 404);
    return json(linkedStatus(room));
  } catch (err) {
    return errorResponse(err);
  }
}
