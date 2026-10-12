# Avalon

The Resistance: Avalon for phones around one table. One player creates a room, everyone else
joins with its 4-letter code, and the server deals hidden roles and runs the quests, votes,
Lady of the Lake and assassination. Deployed on Vercel.

## Stack

| Piece | What |
| --- | --- |
| Framework | Next.js 15 (App Router), React 19, plain JavaScript |
| Styling | Hand-written CSS, no Tailwind: `app/globals.css` (the night look) and `app/themes.css` (the parchment skin) |
| Fonts | `next/font/google`: Uncial Antiqua (wordmark only), Alegreya SC, Alegreya Sans; parchment adds Big Shoulders and UnifrakturMaguntia |
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
- `app/page.js`: home. `app/r/[code]/page.js`: polling, joining and the toast. `app/tv/page.js`: type a room code on a
  TV; `app/tv/[code]/page.js`: the public table view.
- `components/`: `Room.js` (the tabletop scene, hand, drawers, seat sheets and overlays),
  `Lobby.js`, `RoundTable.js`, `Avatar.js` (avatar and picker), `Fan.js`, `Reactions.js`,
  `Tutorial.js` (the eight-step walkthrough with a practice table; keep it in step with the
  rules), `Recap.js` (the room's score tally and the end-of-game recap), `Timer.js` (the optional phase countdown, timed against the server's clock), `Theme.js` (`useTheme()`, which puts the room's look on `<html data-theme>` and remembers it on the device), `RoomThemeScript.js` (server-rendered: stamps a room's look into room and TV pages before first paint), `TvLink.js` (the TV link and the address to type on another screen), `art.js`, `crests.js`, `reactionIcons.js`. Avatar crest ids, colours and their light text versions (`AVATAR_INKS`, used for chat names)
  live in `lib/rules.js` (the drawings are in
  `components/crests.js`) and are validated by
  `cleanAvatar()` on the server. No two players in a room share a crest or a colour
  (`takenAvatars()`): joining swaps a taken choice for a free one, and the `avatar` action refuses
  it. There are 15 colours so a full table always fits.
- `scripts/simulate.mjs`: plays full games through the HTTP API and checks the rules.
- `README.md`: player-facing features and deploy steps. Keep it current with every change.

## Commands

```bash
npm run dev          # dev server on :3000 (rooms kept in memory)
npm run build        # production build (into .next; don't run while `next dev` is up)
npm run build:check  # the same build into .next-check, safe while the dev server runs
npm run simulate     # with a server running: plays full games (5-15 players) and checks the rules
```

## Before you commit

`npm run build:check` must pass, and `npm run simulate` must pass against a running dev server.
GitHub Actions (`.github/workflows/ci.yml`) runs the same build and simulation on every push;
check it went green after pushing.
If either fails, fix it or say plainly that it fails and why. Never commit over a failure,
and never report work as done without running both.

Changes to `lib/game.js` should come with a matching check in `scripts/simulate.mjs`.

## Restarting the dev server

Restart it after changes so they're visible locally.

This repo lives inside OneDrive, which sometimes locks `.next` and makes Next.js fail with
`EPERM` or `EBUSY`. Running `next build` while `next dev` is running also corrupts `.next`, which
is why `build:check` builds into `.next-check` instead. The reliable
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
- **Storage changes**: rooms are JSON blobs under `avalon:room:<CODE>`, and presence is a hash
  under `avalon:seen:<CODE>` (player id -> last check-in), both with a 12-hour TTL. If you
  change the room shape, old rooms simply expire, but say so.

Polls read through `loadRoomShared()` / `loadPresence()`, which share results for under a
second within a server instance. Those objects are shared between requests: treat them as
read-only, and do every write through `withRoom()` or `touchPresence()`. Keep Redis traffic in
mind: Upstash bills per command.

Never commit secrets. `.env*.local` is gitignored and must stay that way.

## Style

There are two looks (`THEMES` in `lib/rules.js`), set by `useTheme()` as `data-theme` on
`<html>`. Before first paint, an inline script in `app/layout.js` applies the device's last look
(`localStorage` `avalon:theme`), and room and TV pages apply the room's own look server-side
(`RoomThemeScript`), so no screen flashes the wrong look. The host picks one with the `theme` action, at any phase. Looks are cosmetic and must
never change what information is shown.

- **night** (the default) is `app/globals.css`: lake at night, oak and brass for the table, blue
  for Arthur's side and red for Mordred's. The scene is a tabletop rather than stacked boxes.
  Uncial Antiqua is reserved for the wordmark, because its letterforms (t, E) are hard to read
  elsewhere. Every colour is a token on `:root`, and surfaces use flat fills from those
  tokens: no gradients and no literal hex values outside `:root`. **Night must not change
  when parchment changes**: never add parchment styling to `globals.css`.
- **parchment** is a skin over night's exact layout, in `app/themes.css`, after the Secret
  Hitler board game's print style in a heraldic palette: cream card stock and charcoal ink,
  double-ruled frames, perforated stamp edges on the hand and announcements, condensed capitals
  (Big Shoulders) on plaques, blackletter (UnifrakturMaguntia) on ballots and the winner's
  banner. Azure for Arthur, gules for Mordred, forest green for actions and choices (it belongs
  to neither side), muted gold only for small trim, never a yellow block. No italics. Every rule
  there is scoped to `[data-printed]` and may change only colour, typeface, background,
  texture, corner shape and shadow: **never a size, padding, margin, gap or border width**, so
  both looks lay out identically. Draw heavier frames with inset shadows. Watch text that wraps
  differently in the condensed face (capitals run wider than night's words): set it tighter or
  in lower case rather than letting a row grow. Fixed colours are `--p-*` tokens on `:root`.

New components: lay them out and style them in `globals.css` for night, using its tokens,
then check them in parchment and add `[data-printed]` skin rules to `themes.css` where needed.
New artwork follows the line style of `art.js` and `crests.js` (3 to 3.5px rounded strokes in
`currentColor`, a faint fill, brass accents). Read neighbouring components before adding a new
pattern.

The UI must never reveal hidden information through layout. For example, good and evil
players see the same two quest cards. Keep it that way.

Update `README.md` whenever you add or change something players can see.
