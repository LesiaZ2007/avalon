// POST { action: 'create', name } or { action: 'join', code, name }
import { createRoom, joinRoom, newCode, normCode } from '@/lib/game';
import { insertRoom, withRoom } from '@/lib/store';
import { GameError } from '@/lib/errors';
import { errorResponse, json } from '@/lib/http';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));

    if (body.action === 'create') {
      for (let attempt = 0; attempt < 20; attempt++) {
        const { room, player } = createRoom(newCode(), body.name);
        if (await insertRoom(room)) return json({ code: room.code, playerId: player.id, token: player.token });
      }
      throw new Error('Could not find a free room code. Try again.');
    }

    if (body.action === 'join') {
      const code = normCode(body.code);
      if (code.length !== 4) throw new GameError('Room codes are 4 letters.');
      const { result: player } = await withRoom(code, (room) => joinRoom(room, body.name));
      return json({ code, playerId: player.id, token: player.token });
    }

    throw new GameError('Unknown request.');
  } catch (err) {
    return errorResponse(err);
  }
}
