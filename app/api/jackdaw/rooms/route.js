// POST (from Jackdaw's server) -> a room with the table seated and the roles dealt:
// { code, seats: { <jackdaw player id>: { playerId, token } } }
import { createLinkedRoom, newCode } from '@/lib/game';
import { insertRoom } from '@/lib/store';
import { requireJackdaw } from '@/lib/jackdaw';
import { errorResponse, json } from '@/lib/http';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    requireJackdaw(req);
    const body = await req.json().catch(() => ({}));
    for (let attempt = 0; attempt < 20; attempt++) {
      const { room, seats } = createLinkedRoom(newCode(), body);
      if (await insertRoom(room)) return json({ code: room.code, seats });
    }
    throw new Error('Could not find a free room code. Try again.');
  } catch (err) {
    return errorResponse(err);
  }
}
