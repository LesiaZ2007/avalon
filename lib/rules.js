// Rules shared by the server and the browser. No secrets live here.

export const MIN_PLAYERS = 5;
export const MAX_PLAYERS = 15;
// The box stops at 10. Bigger tables use house rules: about a third of the table is evil, and
// teams grow so a quest still has a fair chance of including a traitor.
export const OFFICIAL_MAX = 10;

// Knights sent on each of the five quests, by player count.
export const QUEST_SIZES = {
  5: [2, 3, 2, 3, 3],
  6: [2, 3, 4, 3, 4],
  7: [2, 3, 3, 4, 4],
  8: [3, 4, 4, 5, 5],
  9: [3, 4, 4, 5, 5],
  10: [3, 4, 4, 5, 5],
  11: [3, 4, 4, 5, 5],
  12: [3, 4, 4, 5, 5],
  13: [4, 4, 5, 5, 6],
  14: [4, 5, 5, 6, 6],
  15: [4, 5, 5, 6, 6],
};

export const EVIL_COUNT = { 5: 2, 6: 2, 7: 3, 8: 3, 9: 3, 10: 4, 11: 4, 12: 5, 13: 5, 14: 5, 15: 6 };

// With 7+ players the fourth quest only fails with two Fail cards.
export const failsNeeded = (players, questIdx) => (players >= 7 && questIdx === 3 ? 2 : 1);

export const EVIL_ROLES = ['assassin', 'morgana', 'mordred', 'oberon', 'minion'];
export const isEvilRole = (role) => EVIL_ROLES.includes(role);

export const ROLES = {
  merlin: {
    name: 'Merlin',
    team: 'good',
    blurb:
      'You know the agents of evil, except Mordred. Steer your side toward victory without being obvious: if good wins three quests, the Assassin gets one guess at who you are.',
  },
  percival: {
    name: 'Percival',
    team: 'good',
    blurb: 'You see Merlin, but Morgana appears to you the same way. Work out which is the real Merlin and protect them.',
  },
  servant: {
    name: 'Loyal Servant of Arthur',
    team: 'good',
    blurb: 'You know only your own loyalty. Watch the votes and the quest results to find the traitors.',
  },
  assassin: {
    name: 'Assassin',
    team: 'evil',
    blurb: 'Fail quests quietly. If good completes three quests, you choose one player to assassinate. Name Merlin and evil wins.',
  },
  morgana: {
    name: 'Morgana',
    team: 'evil',
    blurb: 'You appear as Merlin to Percival. Use that to pull Percival off the real Merlin.',
  },
  mordred: {
    name: 'Mordred',
    team: 'evil',
    blurb: 'Merlin cannot see you. Of all the evil players, you can play the most boldly.',
  },
  oberon: {
    name: 'Oberon',
    team: 'evil',
    blurb: 'You serve evil, but you do not know your allies and they do not know you. Merlin can still see you.',
  },
  minion: {
    name: 'Minion of Mordred',
    team: 'evil',
    blurb: 'You know your fellow servants of Mordred (except Oberon). Fail quests without getting caught.',
  },
};

export const MODES = {
  classic: { label: 'Merlin & Assassin', hint: 'The recommended setup for new groups.' },
  full: { label: 'Full set', hint: 'Every special role that fits your player count.' },
  custom: { label: 'Custom', hint: 'Pick roles yourself.' },
  plain: { label: 'No special roles', hint: 'Servants and minions only.' },
};

// Reaction ids; the drawings are in components/reactionIcons.js.
export const REACTIONS = ['up', 'down', 'hmm', 'sus', 'wow', 'haha'];

// Avatar crests and colours. `icon: null` shows the player's initials instead.
export const AVATAR_ICONS = ['helm', 'crown', 'swords', 'shield', 'tower', 'key', 'rose', 'sun', 'moon', 'fleur', 'oak', 'owl', 'wolf', 'fox', 'stag', 'raven'];
export const AVATAR_NAMES = {
  helm: 'Helm', crown: 'Crown', swords: 'Crossed swords', shield: 'Shield', tower: 'Tower', key: 'Key', rose: 'Rose', sun: 'Sun',
  moon: 'Moon', fleur: 'Fleur-de-lis', oak: 'Oak leaf', owl: 'Owl', wolf: 'Wolf', fox: 'Fox', stag: 'Stag', raven: 'Raven',
};
export const AVATAR_TINTS = ['#3e5b6b', '#5b4b6f', '#4f6348', '#6c5a3d', '#3e5f5a', '#6a4b57', '#4a5678', '#5e6440', '#55606c', '#6f5147'];
// The same hues, lifted for text on the dark panels (chat names). Kept clear of the brass and the
// team red so a name never reads as a game signal.
export const AVATAR_INKS = ['#8fc0d8', '#b9a3dc', '#a7c79a', '#d6bf8e', '#8fcbc0', '#d79fb4', '#a3b0e3', '#c4cc86', '#b0bccb', '#d8ad8f'];

/** Keep only a valid icon and tint; anything else falls back to initials and a given tint. */
export function cleanAvatar(avatar, fallbackTint = 0) {
  const icon = AVATAR_ICONS.includes(avatar?.icon) ? avatar.icon : null;
  const tint = Number.isInteger(avatar?.tint) && avatar.tint >= 0 && avatar.tint < AVATAR_TINTS.length ? avatar.tint : fallbackTint;
  return { icon, tint };
}

export const OPTIONAL_ROLES = ['merlin', 'percival', 'morgana', 'mordred', 'oberon'];

// Roles that only make sense alongside another one.
export const ROLE_NEEDS = { percival: 'merlin', mordred: 'merlin', morgana: 'percival' };

// Optional timers, in seconds (0 is off). They're a nudge for groups that like a faster pace: when
// one runs out the table sees "Time's up" and the players it's waiting on get a buzz, but nothing
// is played for anyone. The talk timer runs while the leader picks a team and while evil decides
// whom to assassinate; the vote timer runs during the vote.
export const TIMER_CHOICES = { talk: [0, 120, 180, 300], vote: [0, 30, 60, 120] };
export const TIMED_PHASES = { team: 'talk', assassin: 'talk', vote: 'vote' };
export const formatSeconds = (secs) => (secs < 60 ? `${secs}s` : `${secs / 60} min`);

export const DEFAULT_SETTINGS = {
  mode: 'classic',
  custom: { merlin: true, percival: true, morgana: true, mordred: false, oberon: false },
  lady: false,
  timers: { talk: 0, vote: 0 },
};

/** Work out which roles are dealt for a player count. Evil specials that don't fit are dropped. */
export function lineup(settings, playerCount) {
  const n = Math.min(Math.max(playerCount, MIN_PLAYERS), MAX_PLAYERS);
  const evilN = EVIL_COUNT[n];
  const goodN = n - evilN;

  let picks;
  if (settings.mode === 'plain') picks = {};
  else if (settings.mode === 'classic') picks = { merlin: true };
  else if (settings.mode === 'full') picks = { merlin: true, percival: true, morgana: true, mordred: true, oberon: true };
  else picks = { ...settings.custom };

  for (const role of ['percival', 'mordred', 'morgana']) {
    if (!picks[ROLE_NEEDS[role]]) picks[role] = false;
  }

  const good = [];
  const evil = [];
  const dropped = [];
  if (picks.merlin) {
    good.push('merlin');
    evil.push('assassin');
  }
  if (picks.percival) good.push('percival');
  for (const role of ['morgana', 'mordred', 'oberon']) {
    if (!picks[role]) continue;
    if (evil.length < evilN) evil.push(role);
    else dropped.push(role);
  }
  while (good.length < goodN) good.push('servant');
  while (evil.length < evilN) evil.push('minion');
  return { players: n, good, evil, dropped };
}

export function describeRoles(roles) {
  const counts = {};
  for (const r of roles) counts[r] = (counts[r] || 0) + 1;
  return Object.entries(counts).map(([r, c]) => {
    const name = ROLES[r].name;
    if (c === 1) return name;
    const plural = r === 'servant' ? 'Loyal Servants' : r === 'minion' ? 'Minions' : name;
    return `${c} ${plural}`;
  });
}
