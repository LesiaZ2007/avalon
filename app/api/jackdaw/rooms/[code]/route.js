// GET (from Jackdaw's server) -> how a linked game stands: { phase, over } while it runs, then
// the winner, reason, every player's side and role and the quest story (quests, proposals and
// votes, Lady checks, the assassin's pick), or { endedEarly: true }.
// DELETE (from Jackdaw's server) -> Jackdaw's host ended the game there; a running game ends early.
import { endLinkedRoom, linkedStatus, normCode } from '@/lib/game';
import { loadRoomShared, withRoom } from '@/lib/store';
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

export async function DELETE(req, { params }) {
  try {
    requireJackdaw(req);
    const code = normCode((await params).code);
    const { room } = await withRoom(code, (r) => {
      if (!r.jackdaw) throw new GameError('That room does not exist or has expired.', 404);
      endLinkedRoom(r);
    });
    return json(linkedStatus(room));
  } catch (err) {
    return errorResponse(err);
  }
}
