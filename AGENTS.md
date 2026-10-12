# Avalon

The Resistance: Avalon for phones around one table. One player creates a room, everyone else
joins with its 4-letter code, and the server deals hidden roles and runs the quests, votes,
Lady of the Lake and assassination. Deployed on Vercel.

## Stack

| Piece | What |
| --- | --- |
| Framework | Next.js 15 (App Router), React 19, plain JavaScript |
| Styling | One hand-written stylesheet, `app/globals.css` (no Tailwind) |
| Fonts | `next/font/google`: Uncial Antiqua (wordmark only), Alegreya SC, Alegreya Sans |
| Storage | Redis: Upstash REST API via `fetch` when available, otherwise a `redis://` URL via the `redis` client; in-memory fallback locally |
| Realtime | Clients poll `GET /api/room/[code]` about once a second; no websockets |
| Artwork | Inline SVG in `components/art.js`; no image files |

## Layout

- `lib/rules.js`: quest sizes, roles, lineups and reactions. Shared by server and browser, so
  it must never hold secrets.
- `lib/game.js`: the game engine (`applyAction`) and `view()`, which builds each player's
  private view of a room. **All hidden information is filtered in `view()`.** Never send
  roles, votes in progress, quest cards or another player's Lady result to a client that
  shouldn't see them.
- `lib/store.js`: the only code that talks to Redis. `withRoom()` takes a per-room lock so
  simultaneous moves can't overwrite each other.
- `app/api/room/`: create and join. `app/api/room/[code]/`: fetch state (GET) and make a
  move (POST).
- `app/page.js`: home. `app/r/[code]/page.js`: polling, joining and the toast.
- `components/`: `Room.js` (the tabletop scene, hand, drawers, seat sheets and overlays),
  `Lobby.js`, `RoundTable.js`, `Avatar.js` (avatar and picker), `Fan.js`, `Reactions.js`,
  `art.js`. Avatar creatures and colours live in `lib/rules.js` and are validated by
  `cleanAvatar()` on the server.
- `scripts/simulate.mjs`: plays full games through the HTTP API and checks the rules.
- `README.md`: player-facing features and deploy steps. Keep it current with every change.

## Commands

```bash
npm run dev       # dev server on :3000 (rooms kept in memory)
npm run build     # production build
npm run simulate  # with the dev server running: plays 5 full games and checks the rules
```

## Before you commit

`npm run build` must pass, and `npm run simulate` must pass against a running dev server.
If either fails, fix it or say plainly that it fails and why. Never commit over a failure,
and never report work as done without running both.

Changes to `lib/game.js` should come with a matching check in `scripts/simulate.mjs`.

## Restarting the dev server

Restart it after changes so they're visible locally.

This repo lives inside OneDrive, which sometimes locks `.next` and makes Next.js fail with
`EPERM`. Running `next build` while `next dev` is running also corrupts `.next`. The reliable
sequence:

1. Stop the running server (find the PID on port 3000, then `taskkill /PID <pid> /F`).
2. If the next start fails with `EPERM` or a strange invariant error, delete `.next` and start
   again.
3. `npm run dev`.

Write dev-server logs outside the repo.

## Windows / OneDrive

The primary shell is Windows PowerShell 5.1, which has no `&&`, `||` or ternaries. Use `;`
with `if ($?) { }`. A Bash tool is also available for POSIX scripts, but the two use different
syntax, so don't mix them in one command.

Quote every path that contains spaces.

**Create git worktrees outside OneDrive**, in the system temp directory. OneDrive's file
locking corrupts worktrees inside the synced folder.

## Branches and commits

- Branch names: `feat/`, `fix/` or `chore/` plus a short kebab-case description.
- Never commit directly to `main`. Branch first, even for a one-line change.
- Commit as you go with descriptive messages, then push. Delete the branch once it's merged.
- **Commits are authored by Lesia and credited to her.** Don't add a
  `Co-Authored-By: Claude` trailer or a "Generated with Claude Code" footer to commits or
  PR bodies.
- Push to GitHub without being asked. Ask before anything harder to reverse: force-pushing,
  rewriting history, deleting a remote branch, or touching production data.

## Delegating to subagents

Aim for the best result while conserving usage. These pull in opposite directions, so:

- Work solo on single-file changes, bug fixes, and anything touching fewer than a few files.
  At that size, fanning out costs more than it saves.
- Spawn parallel agents only for **3+ genuinely independent** features that touch separate
  files. Give each its own branch, then review and merge their work yourself; their output
  is not final until you have checked it.
- When several branches land at once, merge them into an integration branch, confirm the
  whole thing builds and simulates cleanly there, then merge to `main`.

## Things that need Lesia to act

You can't change Vercel's settings or the Upstash console. When a change needs either,
stop and say so explicitly, with exactly what to do:

- **Environment variables**: name the variable, its purpose and which environments need
  it, so it can be added in Vercel and mirrored into `.env.local`. Storage accepts, in
  order: `KV_REST_API_URL` + `KV_REST_API_TOKEN`, `UPSTASH_REDIS_REST_URL` +
  `UPSTASH_REDIS_REST_TOKEN`, either pair under a custom prefix, then a `redis://` /
  `rediss://` URL in `REDIS_URL` or `KV_URL`. When none is found on Vercel, the error lists
  the Redis-related variable *names* the deployment can see, never their values.
- **Storage changes**: rooms are JSON blobs under `avalon:room:<CODE>` with a 12-hour TTL.
  If you change the room shape, old rooms simply expire, but say so.

Never commit secrets. `.env*.local` is gitignored and must stay that way.

## Style

Match the existing look: lake at night, oak and brass for the table, blue for Arthur's side
and red for Mordred's. The scene is a tabletop rather than stacked boxes. Uncial Antiqua is
reserved for the wordmark, because its letterforms (t, E) are hard to read elsewhere. Every
colour is a token on `:root` in `globals.css`. Read neighbouring components before adding a
new pattern.

The UI must never reveal hidden information through layout. For example, good and evil
players see the same two quest cards. Keep it that way.

Update `README.md` whenever you add or change something players can see.
