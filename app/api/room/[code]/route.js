// GET  -> this player's view of the room (send ?v=<version> to skip unchanged state)
// POST -> make a move: { type: 'vote', approve: true }, etc.
import { applyAction, normCode, playerByToken, touch, touchNeeded, view } from '@/lib/game';
import { loadRoom, withRoom } from '@/lib/store';
import { GameError } from '@/lib/errors';
import { errorResponse, json } from '@/lib/http';

export const dynamic = 'force-dynamic';

export async function GET(req, { params }) {
  try {
    const code = normCode((await params).code);
    const room = await loadRoom(code);
    if (!room) throw new GameError('That room does not exist or has expired.', 404);
    const me = playerByToken(room, req.headers.get('x-player-token'));
    if (!me) return json({ error: 'You are not in this room.', inLobby: room.phase === 'lobby' }, 403);
    // Presence: save a check-in now and then, not on every poll, to keep Redis traffic low.
    if (touchNeeded(me)) {
      const { room: fresh } = await withRoom(code, (r) => touch(r, me.id));
      return json(view(fresh, me.id));
    }
    const since = new URL(req.url).searchParams.get('v');
    if (since && Number(since) === room.version) return json({ unchanged: true });
    return json(view(room, me.id));
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req, { params }) {
  try {
    const code = normCode((await params).code);
    const token = req.headers.get('x-player-token');
    const action = await req.json().catch(() => ({}));
    const { room, result: pid } = await withRoom(code, (room) => {
      const me = playerByToken(room, token);
      if (!me) throw new GameError('You are not in this room.', 403);
      applyAction(room, me.id, action);
      touch(room, me.id);
      return me.id;
    });
    if (!room.players.some((p) => p.id === pid)) return json({ left: true });
    return json(view(room, pid));
  } catch (err) {
    return errorResponse(err);
  }
}
