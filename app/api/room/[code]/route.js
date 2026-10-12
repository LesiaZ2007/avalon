// GET  -> this player's view of the room (send ?v=<version> to skip unchanged state)
// POST -> make a move: { type: 'vote', approve: true }, etc.
import { applyAction, normCode, onlineMap, playerByToken, touchNeeded, view } from '@/lib/game';
import { loadPresence, loadRoomShared, touchPresence, withRoom } from '@/lib/store';
import { GameError } from '@/lib/errors';
import { errorResponse, json } from '@/lib/http';

export const dynamic = 'force-dynamic';

export async function GET(req, { params }) {
  try {
    const code = normCode((await params).code);
    const room = await loadRoomShared(code);
    if (!room) throw new GameError('That room does not exist or has expired.', 404);
    const me = playerByToken(room, req.headers.get('x-player-token'));
    if (!me) return json({ error: 'You are not in this room.', inLobby: room.phase === 'lobby' }, 403);
    let presence = await loadPresence(code);
    // Check in now and then (one Redis command), not on every poll.
    if (touchNeeded(presence[me.id] ?? me.lastSeen)) {
      await touchPresence(code, me.id);
      presence = { ...presence, [me.id]: Date.now() };
    }
    const since = new URL(req.url).searchParams.get('v');
    if (since && Number(since) === room.version) return json({ unchanged: true, online: onlineMap(room, presence) });
    return json(view(room, me.id, presence));
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req, { params }) {
  try {
    const code = normCode((await params).code);
    const token = req.headers.get('x-player-token');
    const action = await req.json().catch(() => ({}));
    const presence = await loadPresence(code);
    const { room, result: pid } = await withRoom(code, (room) => {
      const me = playerByToken(room, token);
      if (!me) throw new GameError('You are not in this room.', 403);
      applyAction(room, me.id, action, { presence });
      return me.id;
    });
    if (!room.players.some((p) => p.id === pid)) return json({ left: true });
    await touchPresence(code, pid);
    return json(view(room, pid, { ...presence, [pid]: Date.now() }));
  } catch (err) {
    return errorResponse(err);
  }
}
