// GET -> what a shared screen (a TV) may show: the table, the board and the reveals, never
// anyone's role or private knowledge. No token needed; it's the same as watching the table.
import { normCode, view } from '@/lib/game';
import { loadPresence, loadRoomShared } from '@/lib/store';
import { GameError } from '@/lib/errors';
import { errorResponse, json } from '@/lib/http';

export const dynamic = 'force-dynamic';

export async function GET(req, { params }) {
  try {
    const code = normCode((await params).code);
    const room = await loadRoomShared(code);
    if (!room) throw new GameError('That room does not exist or has expired.', 404);
    const since = new URL(req.url).searchParams.get('v');
    if (since && Number(since) === room.version) return json({ unchanged: true });
    return json(view(room, null, await loadPresence(code)));
  } catch (err) {
    return errorResponse(err);
  }
}
