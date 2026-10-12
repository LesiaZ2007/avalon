// Server-side game engine. Rooms are plain JSON so they can live in Redis.
import { randomBytes, randomInt } from 'node:crypto';
import { GameError } from './errors';
import {
  DEFAULT_SETTINGS,
  MAX_PLAYERS,
  MIN_PLAYERS,
  OPTIONAL_ROLES,
  QUEST_SIZES,
  REACTIONS,
  THEMES,
  TIMER_CHOICES,
  AVATAR_TINTS,
  cleanAvatar,
  takenAvatars,
  failsNeeded,
  isEvilRole,
  lineup,
} from './rules';

const fail = (message, status) => {
  throw new GameError(message, status);
};

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // no I or O, easy to read aloud
export const newCode = () => Array.from({ length: 4 }, () => CODE_CHARS[randomInt(CODE_CHARS.length)]).join('');
export const normCode = (code) => String(code ?? '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
const newId = () => randomBytes(6).toString('hex');
const newToken = () => randomBytes(18).toString('base64url');

function shuffle(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function cleanName(name) {
  const n = String(name ?? '').replace(/\s+/g, ' ').trim().slice(0, 20);
  if (!n) fail('Enter a name first.');
  return n;
}

/**
 * The avatar a newcomer gets: what they asked for, minus anything someone in the room already
 * has. A taken crest falls back to initials and a taken colour to a free one, so joining never
 * fails over it; they can pick again from what's left once seated.
 */
function freeAvatar(players, wanted) {
  const taken = takenAvatars(players);
  const free = AVATAR_TINTS.map((_, i) => i).filter((i) => !taken.tints.has(i));
  const fallback = free.length ? free[randomInt(free.length)] : randomInt(AVATAR_TINTS.length);
  const avatar = cleanAvatar(wanted, fallback);
  return {
    icon: avatar.icon && taken.icons.has(avatar.icon) ? null : avatar.icon,
    tint: taken.tints.has(avatar.tint) ? fallback : avatar.tint,
  };
}

function makePlayer(name, avatar, players = []) {
  return { id: newId(), token: newToken(), name: cleanName(name), avatar: freeAvatar(players, avatar), lastSeen: Date.now() };
}

const nameOf = (room, id) => room.players.find((p) => p.id === id)?.name ?? 'Someone';

function pushChat(room, msg) {
  room.chatSeq = (room.chatSeq || 0) + 1;
  room.chat.push({ id: room.chatSeq, ts: Date.now(), ...msg });
  if (room.chat.length > 150) room.chat.splice(0, room.chat.length - 150);
}
const announce = (room, text) => pushChat(room, { system: true, text });

/** Move the game to a new phase and note when it began, so the optional timers can count down. */
function setPhase(room, phase) {
  room.phase = phase;
  room.game.phaseAt = Date.now();
}

function setEvent(room, event) {
  room.eventSeq = (room.eventSeq || 0) + 1;
  room.event = { id: room.eventSeq, ...event };
}

export function createRoom(code, hostName, avatar) {
  const host = makePlayer(hostName, avatar);
  const room = {
    code,
    version: 1,
    createdAt: Date.now(),
    hostId: host.id,
    players: [host],
    settings: structuredClone(DEFAULT_SETTINGS),
    phase: 'lobby',
    game: null,
    chat: [],
    event: null,
  };
  announce(room, `${host.name} opened the room.`);
  return { room, player: host };
}

export function joinRoom(room, name, avatar) {
  if (room.phase !== 'lobby')
    fail('That game is already underway. To watch it on a TV, use Show it on a TV. If you were playing and lost your seat, ask for a rejoin code and open the room link.');
  if (room.players.length >= MAX_PLAYERS) fail(`This room is full (${MAX_PLAYERS} players).`);
  const player = makePlayer(name, avatar, room.players);
  if (room.players.some((p) => p.name.toLowerCase() === player.name.toLowerCase())) {
    fail('Someone in this room already has that name. Pick another.');
  }
  room.players.push(player);
  announce(room, `${player.name} joined.`);
  return player;
}

export const playerByToken = (room, token) => (token ? room.players.find((p) => p.token === token) : undefined);

// Presence. Phones check in (store.touchPresence) while the page is open; `presence` maps
// player id -> last check-in. Players who never checked in fall back to when they joined.
export const ONLINE_MS = 45_000;
const REJOIN_OFFLINE_MS = 60_000;
const REJOIN_TTL_MS = 10 * 60_000;
const lastSeenOf = (p, presence) => presence?.[p.id] ?? p.lastSeen ?? 0;
const isOnline = (p, presence, now = Date.now()) => now - lastSeenOf(p, presence) < ONLINE_MS;

/** True when a player's last check-in is old enough to be worth saving again. */
export const touchNeeded = (lastSeen, now = Date.now()) => now - (lastSeen ?? 0) > 25_000;

/** Just the online flags, for polls where nothing else changed. */
export const onlineMap = (room, presence) => Object.fromEntries(room.players.map((p) => [p.id, isOnline(p, presence)]));

/**
 * Put a player back in their seat on a new device with a one-time code. The old device's
 * token stops working, so a seat is never held by two phones at once.
 */
export function redeemRejoin(room, rawCode) {
  const code = String(rawCode ?? '').toUpperCase().replace(/[^A-Z]/g, '');
  const now = Date.now();
  const player = room.players.find((p) => p.rejoin && p.rejoin.code === code && p.rejoin.expires > now);
  if (!player) fail('That rejoin code is wrong or has expired. Ask for a new one.');
  player.token = newToken();
  player.lastSeen = now;
  delete player.rejoin;
  announce(room, `${player.name} is back, on a new device.`);
  return player;
}

const emptyScores = () => ({ good: 0, evil: 0, players: {} });

function finish(room, winner, reason) {
  const g = room.game;
  setPhase(room, 'over');
  g.winner = winner;
  g.reason = reason;
  // The running tally for the room. Only finished games count, not ones the host ended early.
  const scores = (room.scores ??= emptyScores());
  scores[winner] += 1;
  for (const id of g.seats) {
    const record = (scores.players[id] ??= { played: 0, wins: 0 });
    record.played += 1;
    if ((isEvilRole(g.roles[id]) ? 'evil' : 'good') === winner) record.wins += 1;
  }
  announce(room, `${winner === 'good' ? 'Good' : 'Evil'} wins. ${reason}`);
}

function startGame(room) {
  const n = room.players.length;
  if (n < MIN_PLAYERS) fail(`Avalon needs at least ${MIN_PLAYERS} players. Waiting for ${MIN_PLAYERS - n} more.`);
  const deal = lineup(room.settings, n);
  const seats = room.players.map((p) => p.id);
  const dealt = shuffle([...deal.good, ...deal.evil]);
  const roles = Object.fromEntries(seats.map((id, i) => [id, dealt[i]]));
  const leaderIdx = randomInt(n);
  const ladyHolder = seats[(leaderIdx - 1 + n) % n];

  room.game = {
    id: newId(),
    seats,
    roles,
    lineup: { good: deal.good, evil: deal.evil },
    leaderIdx,
    questIdx: 0,
    rejects: 0,
    quests: QUEST_SIZES[n].map((size, i) => ({ size, failsNeeded: failsNeeded(n, i), result: null, fails: null, team: null })),
    team: [],
    draft: [],
    votes: {},
    cards: {},
    history: [],
    lady: room.settings.lady ? { holder: ladyHolder, held: [ladyHolder], checks: [] } : null,
    assassinTarget: null,
    winner: null,
    reason: null,
    phaseAt: null,
  };
  setPhase(room, 'team');
  setEvent(room, { type: 'start' });
  announce(room, `Roles are dealt. ${nameOf(room, seats[leaderIdx])} leads the first quest.`);
}

function nextLeader(g) {
  g.leaderIdx = (g.leaderIdx + 1) % g.seats.length;
  g.team = [];
  g.draft = [];
  g.votes = {};
}

function resolveVote(room) {
  const g = room.game;
  const yes = g.seats.filter((id) => g.votes[id]).length;
  const approved = yes > g.seats.length / 2;
  const leader = g.seats[g.leaderIdx];
  g.history.push({
    quest: g.questIdx,
    leader,
    team: g.team,
    votes: { ...g.votes },
    approved,
  });
  setEvent(room, { type: 'vote', quest: g.questIdx, leader, team: g.team, votes: { ...g.votes }, approved, rejects: approved ? 0 : g.rejects + 1 });

  if (approved) {
    g.rejects = 0;
    g.votes = {};
    g.cards = {};
    setPhase(room, 'quest');
    return;
  }
  g.rejects += 1;
  if (g.rejects >= 5) {
    finish(room, 'evil', 'Five teams in a row were rejected.');
    return;
  }
  nextLeader(g);
  setPhase(room, 'team');
}

function resolveQuest(room) {
  const g = room.game;
  const quest = g.quests[g.questIdx];
  const fails = Object.values(g.cards).filter((c) => c === 'fail').length;
  quest.fails = fails;
  quest.team = g.team;
  quest.result = fails >= quest.failsNeeded ? 'fail' : 'success';
  g.cards = {};
  setEvent(room, { type: 'quest', quest: g.questIdx, size: quest.size, fails, result: quest.result, failsNeeded: quest.failsNeeded });

  const wins = g.quests.filter((q) => q.result === 'success').length;
  const losses = g.quests.filter((q) => q.result === 'fail').length;
  if (losses >= 3) return finish(room, 'evil', 'Three quests failed.');
  if (wins >= 3) {
    if (g.seats.some((id) => g.roles[id] === 'assassin')) {
      setPhase(room, 'assassin');
      announce(room, 'Three quests succeeded. Evil reveals itself, and the Assassin must now name Merlin.');
      return;
    }
    return finish(room, 'good', 'Three quests succeeded.');
  }

  const finished = g.questIdx;
  g.questIdx += 1;
  nextLeader(g);
  // The Lady of the Lake is used after the 2nd, 3rd and 4th quests.
  setPhase(room, g.lady && finished >= 1 && finished <= 3 ? 'lady' : 'team');
}

const requirePhase = (room, phase) => {
  if (room.phase !== phase) fail('That move is not available right now.');
};

export function applyAction(room, pid, action, { presence } = {}) {
  const me = room.players.find((p) => p.id === pid);
  if (!me) fail('You are not in this room.', 403);
  const isHost = room.hostId === pid;
  const requireHost = () => {
    if (!isHost) fail('Only the host can do that.');
  };
  const g = room.game;

  switch (action?.type) {
    case 'chat': {
      const text = String(action.text ?? '').trim().slice(0, 300);
      if (text) pushChat(room, { pid, name: me.name, text });
      return;
    }

    case 'react': {
      if (!REACTIONS.includes(action.icon)) fail('Unknown reaction.');
      room.reactions ??= {};
      const last = room.reactions[pid];
      if (last && Date.now() - last.at < 800) return; // light rate limit
      room.reactionSeq = (room.reactionSeq || 0) + 1;
      room.reactions[pid] = { icon: action.icon, at: Date.now(), n: room.reactionSeq };
      return;
    }

    case 'draft': {
      // The leader's picks in progress, so the table can watch the team form.
      requirePhase(room, 'team');
      if (g.seats[g.leaderIdx] !== pid) fail('Only the leader picks the team.');
      const size = g.quests[g.questIdx].size;
      g.draft = [...new Set(Array.isArray(action.team) ? action.team : [])].filter((id) => g.seats.includes(id)).slice(0, size);
      return;
    }

    case 'avatar': {
      const avatar = cleanAvatar(action.avatar, me.avatar?.tint ?? 0);
      const taken = takenAvatars(room.players, pid);
      if (avatar.icon && taken.icons.has(avatar.icon)) fail('Someone else has that crest. Pick another.');
      if (taken.tints.has(avatar.tint)) fail('Someone else has that colour. Pick another.');
      me.avatar = avatar;
      return;
    }

    case 'theme': {
      // Cosmetic, so the host can change it at any point, even mid-game.
      requireHost();
      if (!THEMES[action.theme]) fail('Unknown theme.');
      room.settings.theme = action.theme;
      return;
    }

    case 'settings': {
      requireHost();
      requirePhase(room, 'lobby');
      const s = room.settings;
      if (['classic', 'full', 'custom', 'plain'].includes(action.mode)) s.mode = action.mode;
      if (action.custom) {
        for (const role of OPTIONAL_ROLES) {
          if (typeof action.custom[role] === 'boolean') s.custom[role] = action.custom[role];
        }
      }
      if (typeof action.lady === 'boolean') s.lady = action.lady;
      if (action.timers) {
        s.timers ??= { ...DEFAULT_SETTINGS.timers };
        for (const [key, choices] of Object.entries(TIMER_CHOICES)) {
          if (choices.includes(action.timers[key])) s.timers[key] = action.timers[key];
        }
      }
      return;
    }

    case 'rejoinCode': {
      // The host can make a code for anyone. Anyone can make one for a player who has been gone
      // a while, so a lost host phone doesn't strand the table.
      const target = room.players.find((p) => p.id === action.target);
      if (!target || target.id === pid) fail('Choose another player.');
      const away = Date.now() - lastSeenOf(target, presence) > REJOIN_OFFLINE_MS;
      if (!isHost && !away) fail('Only the host can do that while the player is still connected.');
      const code = Array.from({ length: 6 }, () => CODE_CHARS[randomInt(CODE_CHARS.length)]).join('');
      target.rejoin = { code, expires: Date.now() + REJOIN_TTL_MS, by: pid };
      return;
    }

    case 'kick': {
      requireHost();
      requirePhase(room, 'lobby');
      const target = room.players.find((p) => p.id === action.target);
      if (!target || target.id === pid) return;
      room.players = room.players.filter((p) => p.id !== target.id);
      announce(room, `${target.name} was removed by the host.`);
      return;
    }

    case 'seats': {
      // The host matches the table to where people are really sitting, clockwise. Seat order is
      // the play order: leadership passes around it. Anyone who joined after the host's list was
      // made keeps their place at the end.
      requireHost();
      requirePhase(room, 'lobby');
      if (!Array.isArray(action.order)) fail('Send the new seating order.');
      const byId = new Map(room.players.map((p) => [p.id, p]));
      const order = [...new Set(action.order)].filter((id) => byId.has(id));
      room.players = [...order.map((id) => byId.get(id)), ...room.players.filter((p) => !order.includes(p.id))];
      return;
    }

    case 'leave': {
      requirePhase(room, 'lobby');
      room.players = room.players.filter((p) => p.id !== pid);
      announce(room, `${me.name} left.`);
      if (isHost && room.players.length) {
        room.hostId = room.players[0].id;
        announce(room, `${room.players[0].name} is now the host.`);
      }
      return;
    }

    case 'start': {
      requireHost();
      requirePhase(room, 'lobby');
      startGame(room);
      return;
    }

    case 'propose': {
      requirePhase(room, 'team');
      if (g.seats[g.leaderIdx] !== pid) fail('Only the leader proposes the team.');
      const size = g.quests[g.questIdx].size;
      const team = [...new Set(Array.isArray(action.team) ? action.team : [])].filter((id) => g.seats.includes(id));
      if (team.length !== size) fail(`This quest needs exactly ${size} knights.`);
      g.team = g.seats.filter((id) => team.includes(id)); // keep seat order
      g.draft = [];
      g.votes = {};
      setPhase(room, 'vote');
      return;
    }

    case 'vote': {
      requirePhase(room, 'vote');
      if (!g.seats.includes(pid)) fail('You are not seated in this game.');
      g.votes[pid] = Boolean(action.approve);
      if (g.seats.every((id) => id in g.votes)) resolveVote(room);
      return;
    }

    case 'quest': {
      requirePhase(room, 'quest');
      if (!g.team.includes(pid)) fail('You are not on this quest.');
      if (pid in g.cards) fail('You already played your card.');
      const success = Boolean(action.success);
      if (!success && !isEvilRole(g.roles[pid])) fail('Loyal servants of Arthur must play Success.');
      g.cards[pid] = success ? 'success' : 'fail';
      if (g.team.every((id) => id in g.cards)) resolveQuest(room);
      return;
    }

    case 'lady': {
      requirePhase(room, 'lady');
      if (g.lady.holder !== pid) fail('Only the holder of the Lady of the Lake can do that.');
      const target = action.target;
      if (!g.seats.includes(target) || target === pid) fail('Choose another player.');
      if (g.lady.held.includes(target)) fail('You cannot examine someone who has already held the Lady of the Lake.');
      g.lady.checks.push({ holder: pid, target, evil: isEvilRole(g.roles[target]), quest: g.questIdx - 1 });
      g.lady.held.push(target);
      g.lady.holder = target;
      announce(room, `${me.name} used the Lady of the Lake on ${nameOf(room, target)}, who now holds it.`);
      setPhase(room, 'team');
      return;
    }

    case 'assassinate': {
      requirePhase(room, 'assassin');
      if (g.roles[pid] !== 'assassin') fail('Only the Assassin chooses.');
      const target = action.target;
      if (!g.seats.includes(target) || isEvilRole(g.roles[target])) fail('Choose a player on the side of good.');
      g.assassinTarget = target;
      if (g.roles[target] === 'merlin') finish(room, 'evil', `The Assassin named ${nameOf(room, target)}, who was Merlin.`);
      else finish(room, 'good', `The Assassin named ${nameOf(room, target)}, but Merlin stayed hidden.`);
      return;
    }

    case 'resetScores': {
      requireHost();
      requirePhase(room, 'lobby');
      if (!room.scores || (!room.scores.good && !room.scores.evil)) return;
      room.scores = emptyScores();
      announce(room, 'The host reset the scores.');
      return;
    }

    case 'lobby': {
      requireHost();
      if (room.phase === 'lobby') return;
      const early = room.phase !== 'over';
      room.phase = 'lobby';
      room.game = null;
      room.event = null;
      announce(room, early ? 'The host ended the game early.' : 'Back in the lobby.');
      return;
    }

    default:
      fail('Unknown move.');
  }
}

/** What each player is allowed to know about the others. */
function knowledge(g, pid) {
  const mine = g.roles[pid];
  const merlinLike = g.seats.filter((id) => g.roles[id] === 'merlin' || g.roles[id] === 'morgana').length;
  const known = [];
  for (const id of g.seats) {
    if (id === pid) continue;
    const r = g.roles[id];
    if (mine === 'merlin' && isEvilRole(r) && r !== 'mordred') known.push({ id, kind: 'evil', label: 'Evil' });
    else if (mine === 'percival' && (r === 'merlin' || r === 'morgana'))
      known.push({ id, kind: 'merlin', label: merlinLike > 1 ? 'Merlin or Morgana' : 'Merlin' });
    else if (isEvilRole(mine) && mine !== 'oberon' && isEvilRole(r) && r !== 'oberon') known.push({ id, kind: 'evil', label: 'Evil' });
  }
  return known;
}

/** The room as one player sees it. Hidden information never leaves the server. */
export function view(room, pid, presence) {
  const out = {
    code: room.code,
    version: room.version,
    you: pid,
    hostId: room.hostId,
    phase: room.phase,
    settings: room.settings,
    players: room.players.map((p) => ({ id: p.id, name: p.name, avatar: p.avatar ?? cleanAvatar(null), online: isOnline(p, presence) })),
    // Rejoin codes are shown only to whoever made them.
    rejoinCodes: Object.fromEntries(
      room.players.filter((p) => p.rejoin && p.rejoin.by === pid && p.rejoin.expires > Date.now()).map((p) => [p.id, p.rejoin])
    ),
    now: Date.now(),
    chat: room.chat.slice(-120),
    event: room.event,
    reactions: Object.fromEntries(
      Object.entries(room.reactions ?? {}).filter(([id, r]) => Date.now() - r.at < 6000 && room.players.some((p) => p.id === id))
    ),
    // Wins by side and by player across this room's finished games. Records only change when a
    // game ends and every role is revealed, so they never hint at a game in progress.
    scores: {
      good: room.scores?.good ?? 0,
      evil: room.scores?.evil ?? 0,
      players: Object.fromEntries(room.players.filter((p) => room.scores?.players[p.id]).map((p) => [p.id, room.scores.players[p.id]])),
    },
    game: null,
  };
  const g = room.game;
  if (!g) return out;

  const seated = g.seats.includes(pid);
  const revealEvil = room.phase === 'assassin' || room.phase === 'over';
  out.game = {
    id: g.id,
    seats: g.seats,
    lineup: g.lineup,
    leader: g.seats[g.leaderIdx],
    questIdx: g.questIdx,
    rejects: g.rejects,
    quests: g.quests,
    team: g.team,
    draft: room.phase === 'team' ? g.draft ?? [] : [],
    voted: room.phase === 'vote' ? Object.keys(g.votes) : [],
    played: room.phase === 'quest' ? Object.keys(g.cards) : [],
    myVote: room.phase === 'vote' && pid in g.votes ? g.votes[pid] : null,
    myCard: room.phase === 'quest' ? g.cards[pid] ?? null : null,
    history: g.history,
    lady: g.lady && {
      holder: g.lady.holder,
      held: g.lady.held,
      checks: g.lady.checks.map((c) => ({
        holder: c.holder,
        target: c.target,
        quest: c.quest,
        ...(c.holder === pid || room.phase === 'over' ? { evil: c.evil } : {}),
      })),
    },
    phaseAt: g.phaseAt ?? null,
    myRole: seated ? g.roles[pid] : null,
    known: seated ? knowledge(g, pid) : [],
    evilRevealed: revealEvil ? g.seats.filter((id) => isEvilRole(g.roles[id])) : null,
    assassin: revealEvil ? g.seats.find((id) => g.roles[id] === 'assassin') ?? null : null,
    roles: room.phase === 'over' ? g.roles : null,
    assassinTarget: g.assassinTarget,
    winner: g.winner,
    reason: g.reason,
  };
  return out;
}
