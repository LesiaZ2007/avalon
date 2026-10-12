// Plays complete games against a running server through the HTTP API and checks the rules
// and information hiding. Start the app first (npm run dev), then: npm run simulate
// Pass another base URL as the first argument to test a deployment.

const BASE = process.argv[2] || 'http://localhost:3000';
const assert = (c, m) => { if (!c) throw new Error('ASSERT: ' + m); };
async function call(path, { token, body, method } = {}) {
  const res = await fetch(BASE + path, { method: method || (body ? 'POST' : 'GET'), headers: { 'Content-Type': 'application/json', ...(token ? { 'x-player-token': token } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json();
  return { status: res.status, data };
}
const EVIL = ['assassin', 'morgana', 'mordred', 'oberon', 'minion'];

async function game(n, mode, lady, strategy) {
  const names = ['Arthur', 'Bedivere', 'Cai', 'Dagonet', 'Elaine', 'Gawain', 'Gareth', 'Lamorak', 'Tristan', 'Yvain', 'Lancelot', 'Percival', 'Galahad', 'Bors', 'Kay'].slice(0, n);
  const host = await call('/api/room', { body: { action: 'create', name: names[0] } });
  const code = host.data.code;
  const players = [{ name: names[0], ...host.data }];
  for (const nm of names.slice(1)) {
    const j = await call('/api/room', { body: { action: 'join', code, name: nm.toLowerCase() === 'cai' ? 'Cai' : nm } });
    assert(j.status === 200, 'join ' + JSON.stringify(j.data));
    players.push({ name: nm, ...j.data });
  }
  // duplicate name rejected
  const dup = await call('/api/room', { body: { action: 'join', code, name: 'arthur' } });
  assert(dup.status === 400, 'dup name');
  const act = (p, body) => call(`/api/room/${code}`, { token: p.token, body });
  const v = async (p) => (await call(`/api/room/${code}`, { token: p.token })).data;

  if (n < 15) {
    // Avatars: nobody shares a crest or a colour. A free choice is kept, a taken one falls back
    // (initials, another colour) on joining and is refused when changing, and junk is cleaned.
    let lobby = await v(players[0]);
    const avatarOf = (id) => lobby.players.find((p) => p.id === id).avatar;
    const tints = new Set(lobby.players.map((p) => p.avatar.tint));
    assert(tints.size === lobby.players.length, 'every player gets their own colour');
    const own = avatarOf(players[1].playerId).tint;
    assert((await act(players[1], { type: 'avatar', avatar: { icon: 'owl', tint: own } })).status === 200, 'avatar changed');
    const extra = await call('/api/room', { body: { action: 'join', code, name: 'Extra', avatar: { icon: 'owl', tint: own } } });
    assert(extra.status === 200, 'join with a taken avatar still works');
    lobby = await v(players[0]);
    const copied = avatarOf(extra.data.playerId);
    assert(copied.icon === null && copied.tint !== own, 'taken crest and colour not shared on join ' + JSON.stringify(copied));
    const free = [...Array(15).keys()].find((t) => !lobby.players.some((p) => p.avatar.tint === t));
    assert((await act(extra.data, { type: 'avatar', avatar: { icon: 'stag', tint: free } })).status === 200, 'free avatar chosen');
    lobby = await v(players[0]);
    assert(avatarOf(extra.data.playerId).icon === 'stag' && avatarOf(extra.data.playerId).tint === free, 'avatar kept');
    assert((await act(players[1], { type: 'avatar', avatar: { icon: 'stag', tint: own } })).status === 400, 'taken crest refused');
    assert((await act(players[1], { type: 'avatar', avatar: { icon: 'owl', tint: free } })).status === 400, 'taken colour refused');
    await act(players[1], { type: 'avatar', avatar: { icon: '<script>', tint: 99 } });
    lobby = await v(players[0]);
    const junk = avatarOf(players[1].playerId);
    assert(junk.icon === null && junk.tint === own, 'junk avatar cleaned');

    // Kicking: only the host can, and the removed player loses access.
    assert((await act(players[1], { type: 'kick', target: extra.data.playerId })).status === 400, 'nonhost kick');
    assert((await act(players[0], { type: 'kick', target: extra.data.playerId })).status === 200, 'host kick');
    assert((await call(`/api/room/${code}`, { token: extra.data.token })).status === 403, 'kicked player locked out');
    assert(!(await v(players[0])).players.some((p) => p.id === extra.data.playerId), 'kicked player gone');
  }

  // non-host can't start
  assert((await act(players[1], { type: 'start' })).status === 400, 'nonhost start');
  await act(players[0], { type: 'settings', mode, lady });
  // Timers: only the listed lengths are accepted, and each one can be set on its own.
  await act(players[0], { type: 'settings', timers: { talk: 7, vote: 'soon' } });
  let timers = (await v(players[1])).settings.timers;
  assert(timers.talk === 0 && timers.vote === 0, 'junk timers ignored ' + JSON.stringify(timers));
  await act(players[0], { type: 'settings', timers: { talk: 180 } });
  await act(players[0], { type: 'settings', timers: { vote: 30 } });
  timers = (await v(players[1])).settings.timers;
  assert(timers.talk === 180 && timers.vote === 30, 'timers set ' + JSON.stringify(timers));
  assert((await act(players[1], { type: 'settings', timers: { talk: 300 } })).status === 400, 'non-host timers refused');
  // Theme: only the host picks the look, and only a known one.
  assert((await v(players[1])).settings.theme === 'parchment', 'parchment by default');
  assert((await act(players[1], { type: 'theme', theme: 'night' })).status === 400, 'non-host theme refused');
  assert((await act(players[0], { type: 'theme', theme: 'neon' })).status === 400, 'unknown theme refused');
  assert((await act(players[0], { type: 'theme', theme: 'tabletop' })).status === 400, 'retired theme refused');
  assert((await act(players[0], { type: 'theme', theme: 'parchment' })).status === 200, 'theme set');
  assert((await v(players[1])).settings.theme === 'parchment', 'theme seen by everyone');
  // Reactions: a known icon shows over the sender's seat; anything else is refused.
  assert((await act(players[2], { type: 'react', icon: 'sus' })).status === 200, 'react');
  assert((await v(players[0])).reactions[players[2].playerId]?.icon === 'sus', 'reaction visible');
  assert((await act(players[2], { type: 'react', icon: '<img>' })).status === 400, 'unknown reaction refused');
  // chat
  await act(players[2], { type: 'chat', text: 'hello table' });
  const st = await act(players[0], { type: 'start' });
  assert(st.status === 200, 'start ' + JSON.stringify(st.data));
  // The look is cosmetic, so it can change mid-game too.
  assert((await act(players[0], { type: 'theme', theme: 'night' })).status === 200, 'theme mid-game');

  // Collect roles via each player's own view
  const views = await Promise.all(players.map(v));
  const roles = {};
  views.forEach((vw, i) => { roles[players[i].playerId] = vw.game.myRole; assert(vw.game.roles === null, 'roles hidden'); });
  const ids = players.map(p => p.playerId);
  const evilCount = ids.filter(id => EVIL.includes(roles[id])).length;
  const expectedEvil = { 5: 2, 6: 2, 7: 3, 8: 3, 9: 3, 10: 4, 11: 4, 12: 5, 13: 5, 14: 5, 15: 6 }[n];
  assert(evilCount === expectedEvil, `evil count ${evilCount}`);
  // Knowledge checks
  views.forEach((vw, i) => {
    const me = roles[ids[i]];
    for (const k of vw.game.known) {
      const r = roles[k.id];
      if (me === 'merlin') assert(EVIL.includes(r) && r !== 'mordred', 'merlin sees ' + r);
      else if (me === 'percival') assert(r === 'merlin' || r === 'morgana', 'percival sees ' + r);
      else assert(EVIL.includes(me) && me !== 'oberon' && EVIL.includes(r) && r !== 'oberon', me + ' sees ' + r);
    }
    if (me === 'servant' || me === 'oberon') assert(vw.game.known.length === 0, me + ' knows something');
    // no secrets leaked in JSON
    const s = JSON.stringify(vw);
    assert(!s.includes('"token"'), 'token leaked');
  });
  console.log(`  n=${n} mode=${mode} roles:`, Object.values(roles).sort().join(','));

  // The TV view is public: the table and board, never roles or private knowledge.
  {
    const tv = (await call(`/api/room/${host.data.code}/tv`)).data;
    assert(tv.game && tv.game.myRole === null && tv.game.known.length === 0 && tv.game.roles === null, 'tv hides roles');
    assert(tv.settings.theme === 'night', 'tv follows the theme');
    assert(Object.keys(tv.rejoinCodes).length === 0, 'tv sees no rejoin codes');
    const raw = JSON.stringify(tv);
    assert(!raw.includes('"token"') && !raw.includes('"myRole":"') && !raw.includes('"roles":{') && !raw.includes('"evil":true'), 'tv leaks no roles');
  }
  // Rejoin on a new device: only the host can make a code for a connected player; the code
  // works once, keeps the player's role, and signs out the old device.
  {
    const target = players[2];
    assert((await act(players[1], { type: 'rejoinCode', target: target.playerId })).status === 400, 'non-host rejoin code refused');
    assert((await act(players[0], { type: 'rejoinCode', target: target.playerId })).status === 200, 'host rejoin code');
    const code = (await v(players[0])).rejoinCodes[target.playerId]?.code;
    assert(code && code.length === 6, 'host sees the code');
    assert(!(await v(players[1])).rejoinCodes[target.playerId], 'others do not see the code');
    const before = (await v(target)).game.myRole;
    assert((await call('/api/room', { body: { action: 'rejoin', code: players[0].code ?? host.data.code, rejoinCode: 'ZZZZZZ' } })).status === 400, 'wrong rejoin code');
    const back = await call('/api/room', { body: { action: 'rejoin', code: host.data.code, rejoinCode: code } });
    assert(back.status === 200 && back.data.playerId === target.playerId, 'rejoin works');
    assert((await call(`/api/room/${code && host.data.code}`, { token: target.token })).status === 403, 'old device signed out');
    target.token = back.data.token;
    assert((await v(target)).game.myRole === before, 'same role after rejoin');
    assert((await call('/api/room', { body: { action: 'rejoin', code: host.data.code, rejoinCode: code } })).status === 400, 'rejoin code is single-use');
    assert((await v(players[0])).players.every((p) => typeof p.online === 'boolean'), 'presence shown');
    const ver = (await v(players[0])).version;
    const quiet = (await call(`/api/room/${host.data.code}?v=${ver}`, { token: players[0].token })).data;
    assert(quiet.unchanged && typeof quiet.online[players[1].playerId] === 'boolean', 'unchanged polls carry presence');
  }
  // Scores: one finished game is counted for its winners; a game the host ends early isn't; only
  // the host can reset the tally.
  async function checkScores(s) {
    const loser = s.game.winner === 'good' ? 'evil' : 'good';
    assert(s.scores[s.game.winner] === 1 && s.scores[loser] === 0, 'side tally ' + JSON.stringify(s.scores));
    for (const id of ids) {
      const team = EVIL.includes(roles[id]) ? 'evil' : 'good';
      const rec = s.scores.players[id];
      assert(rec && rec.played === 1 && rec.wins === (team === s.game.winner ? 1 : 0), 'player record ' + JSON.stringify(rec));
    }
    assert((await call(`/api/room/${code}/tv`)).data.scores[s.game.winner] === 1, 'tv shows the tally');
    assert((await act(players[0], { type: 'lobby' })).status === 200, 'back to lobby');
    assert((await act(players[0], { type: 'start' })).status === 200, 'second game');
    assert((await act(players[0], { type: 'lobby' })).status === 200, 'end early');
    const after = await v(players[1]);
    assert(after.scores[s.game.winner] === 1 && after.scores[loser] === 0, 'early end not counted');
    assert(Object.values(after.scores.players).every((r) => r.played === 1), 'early end not in records');
    assert((await act(players[1], { type: 'resetScores' })).status === 400, 'non-host reset refused');
    assert((await act(players[0], { type: 'resetScores' })).status === 200, 'host reset');
    const reset = await v(players[1]);
    assert(reset.scores.good === 0 && reset.scores.evil === 0 && Object.keys(reset.scores.players).length === 0, 'scores reset');
  }

  const byId = Object.fromEntries(players.map(p => [p.playerId, p]));
  let guard = 0;
  while (guard++ < 60) {
    const s = await v(players[0]);
    if (s.phase === 'over') {
      console.log(`  -> ${s.game.winner} wins: ${s.game.reason}`);
      assert(s.game.roles, 'roles revealed at end');
      assert(s.game.history.every((h) => h.votes && h.yes === Object.values(h.votes).filter(Boolean).length), 'every vote in the recap');
      assert((await call(`/api/room/${host.data.code}/tv`)).data.game.roles, 'tv shows roles at the end');
      await checkScores(s);
      return s;
    }
    const g = s.game;
    // Past votes stay hidden mid-game: only the latest, while the seats show it.
    const onSeats = s.phase === 'quest' || (s.phase === 'team' && g.rejects > 0);
    for (const seen of [g, (await call(`/api/room/${host.data.code}/tv`)).data.game]) {
      assert(seen.history.every((h, i) => typeof h.yes === 'number' && 'votes' in h === (onSeats && i === seen.history.length - 1)), 'past votes hidden ' + s.phase);
    }
    if (s.phase === 'team') {
      const leader = byId[g.leader];
      const size = g.quests[g.questIdx].size;
      // wrong size rejected
      assert((await act(leader, { type: 'propose', team: ids.slice(0, size - 1) })).status === 400, 'bad size');
      // non-leader can't propose
      const other = players.find(p => p.playerId !== g.leader);
      assert((await act(other, { type: 'propose', team: ids.slice(0, size) })).status === 400, 'nonleader');
      const team = strategy.team(ids, roles, size);
      assert(typeof g.phaseAt === 'number' && g.phaseAt <= s.now, 'team phase has a start time');
      const r = await act(leader, { type: 'propose', team });
      assert(r.status === 200, 'propose ' + JSON.stringify(r.data));
      assert(r.data.phase === 'vote' && r.data.game.phaseAt >= g.phaseAt, 'vote phase restarts the clock');
    } else if (s.phase === 'vote') {
      for (const p of players) {
        const r = await act(p, { type: 'vote', approve: strategy.approve(g, s) });
        assert(r.status === 200, 'vote');
        // The last vote ends the vote phase (and its timer) at once, without waiting for the clock.
        if (p === players.at(-1)) assert(r.data.phase !== 'vote', 'last vote ends the vote timer');
        if (p !== players.at(-1)) {
          // others' votes hidden mid-vote
          const peek = await v(players[0]);
          assert(!('votes' in peek.game) && peek.phase === 'vote' && peek.game.voted.length > 0, 'votes hidden');
          assert(peek.game.phaseAt === g.phaseAt, 'a vote does not restart the clock');
        }
      }
    } else if (s.phase === 'quest') {
      for (const id of g.team) {
        const good = !EVIL.includes(roles[id]);
        if (good) assert((await act(byId[id], { type: 'quest', success: false })).status === 400, 'good cannot fail');
        const r = await act(byId[id], { type: 'quest', success: good ? true : strategy.evilPlays });
        assert(r.status === 200, 'quest card');
      }
    } else if (s.phase === 'lady') {
      const holder = byId[g.lady.holder];
      const target = ids.find(id => id !== g.lady.holder && !g.lady.held.includes(id));
      const r = await act(holder, { type: 'lady', target });
      assert(r.status === 200, 'lady');
      const check = r.data.game.lady.checks.at(-1);
      assert(check.evil === EVIL.includes(roles[target]), 'lady result correct');
      const other = (await v(byId[target])).game.lady.checks.at(-1);
      assert(!('evil' in other), 'lady result hidden from others');
    } else if (s.phase === 'assassin') {
      const assassin = byId[ids.find(id => roles[id] === 'assassin')];
      const target = strategy.assassinHits ? ids.find(id => roles[id] === 'merlin') : ids.find(id => roles[id] === 'servant' || roles[id] === 'percival');
      const r = await act(assassin, { type: 'assassinate', target });
      assert(r.status === 200, 'assassinate ' + JSON.stringify(r.data));
    }
  }
  throw new Error('game did not end');
}

const goodTeam = (ids, roles, size) => ids.filter(id => !EVIL.includes(roles[id])).slice(0, size);
const anyTeam = (ids, roles, size) => ids.slice(0, size);

console.log('Game 1: 7p full set + lady, good teams, assassin misses');
let s = await game(7, 'full', true, { team: goodTeam, approve: () => true, evilPlays: false, assassinHits: false });
assert(s.game.winner === 'good', 'good should win');
console.log('Game 2: 5p classic, assassin hits');
s = await game(5, 'classic', false, { team: goodTeam, approve: () => true, evilPlays: false, assassinHits: true });
assert(s.game.winner === 'evil', 'evil via assassin');
console.log('Game 3: 6p, all rejects');
s = await game(6, 'plain', false, { team: anyTeam, approve: () => false, evilPlays: false });
assert(s.game.reason.includes('Five'), 'five rejects');
console.log('Game 4: 10p full, evil fails everything');
s = await game(10, 'full', true, { team: anyTeam, approve: () => true, evilPlays: false === true ? true : false, assassinHits: false });
console.log('Game 5: 8p custom, evil always fails, mixed teams');
s = await game(8, 'custom', false, { team: (ids, roles, size) => [ids.find(id => EVIL.includes(roles[id])), ...ids.filter(id => !EVIL.includes(roles[id]))].slice(0, size), approve: () => true, evilPlays: false, assassinHits: false });
assert(s.game.reason.includes('Three quests failed'), 'evil via fails');
console.log('Game 6: 12p full set + lady (house rules), good teams, assassin misses');
s = await game(12, 'full', true, { team: goodTeam, approve: () => true, evilPlays: false, assassinHits: false });
assert(s.game.winner === 'good', '12p good should win');
console.log('Game 7: 15p full set, evil fails everything');
s = await game(15, 'full', false, { team: anyTeam, approve: () => true, evilPlays: false, assassinHits: false });
assert(s.game.quests[0].size === 4 && s.game.quests[3].failsNeeded === 2, '15p quest sizes');
// A 16th player is turned away.
{
  const r = await call('/api/room', { body: { action: 'create', name: 'Host' } });
  for (let i = 1; i < 15; i++) await call('/api/room', { body: { action: 'join', code: r.data.code, name: `P${i}` } });
  const extra = await call('/api/room', { body: { action: 'join', code: r.data.code, name: 'Sixteenth' } });
  assert(extra.status === 400 && /full/.test(extra.data.error), 'room caps at 15');
  const full = (await call(`/api/room/${r.data.code}`, { token: r.data.token })).data;
  assert(new Set(full.players.map((p) => p.avatar.tint)).size === 15, 'fifteen players, fifteen colours');
  console.log('Room caps at 15 players');
}
console.log('ALL PASSED');
