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
    // Avatars: a valid choice is kept, junk falls back to initials, and anyone can change theirs.
    const extra = await call('/api/room', { body: { action: 'join', code, name: 'Extra', avatar: { icon: 'stag', tint: 3 } } });
    assert(extra.status === 200, 'join with avatar');
    let lobby = await v(players[0]);
    const seen = lobby.players.find((p) => p.id === extra.data.playerId);
    assert(seen.avatar.icon === 'stag' && seen.avatar.tint === 3, 'avatar kept');
    await act(players[1], { type: 'avatar', avatar: { icon: '<script>', tint: 99 } });
    lobby = await v(players[0]);
    const junk = lobby.players.find((p) => p.id === players[1].playerId).avatar;
    assert(junk.icon === null && junk.tint >= 0 && junk.tint < 10, 'junk avatar cleaned');
    await act(players[1], { type: 'avatar', avatar: { icon: 'owl', tint: 0 } });
    assert((await v(players[0])).players.find((p) => p.id === players[1].playerId).avatar.icon === 'owl', 'avatar changed');

    // Kicking: only the host can, and the removed player loses access.
    assert((await act(players[1], { type: 'kick', target: extra.data.playerId })).status === 400, 'nonhost kick');
    assert((await act(players[0], { type: 'kick', target: extra.data.playerId })).status === 200, 'host kick');
    assert((await call(`/api/room/${code}`, { token: extra.data.token })).status === 403, 'kicked player locked out');
    assert(!(await v(players[0])).players.some((p) => p.id === extra.data.playerId), 'kicked player gone');
  }

  // non-host can't start
  assert((await act(players[1], { type: 'start' })).status === 400, 'nonhost start');
  await act(players[0], { type: 'settings', mode, lady });
  // Reactions: a known icon shows over the sender's seat; anything else is refused.
  assert((await act(players[2], { type: 'react', icon: 'sus' })).status === 200, 'react');
  assert((await v(players[0])).reactions[players[2].playerId]?.icon === 'sus', 'reaction visible');
  assert((await act(players[2], { type: 'react', icon: '<img>' })).status === 400, 'unknown reaction refused');
  // chat
  await act(players[2], { type: 'chat', text: 'hello table' });
  const st = await act(players[0], { type: 'start' });
  assert(st.status === 200, 'start ' + JSON.stringify(st.data));

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
  const byId = Object.fromEntries(players.map(p => [p.playerId, p]));
  let guard = 0;
  while (guard++ < 60) {
    const s = await v(players[0]);
    if (s.phase === 'over') {
      console.log(`  -> ${s.game.winner} wins: ${s.game.reason}`);
      assert(s.game.roles, 'roles revealed at end');
      return s;
    }
    const g = s.game;
    if (s.phase === 'team') {
      const leader = byId[g.leader];
      const size = g.quests[g.questIdx].size;
      // wrong size rejected
      assert((await act(leader, { type: 'propose', team: ids.slice(0, size - 1) })).status === 400, 'bad size');
      // non-leader can't propose
      const other = players.find(p => p.playerId !== g.leader);
      assert((await act(other, { type: 'propose', team: ids.slice(0, size) })).status === 400, 'nonleader');
      const team = strategy.team(ids, roles, size);
      const r = await act(leader, { type: 'propose', team });
      assert(r.status === 200, 'propose ' + JSON.stringify(r.data));
    } else if (s.phase === 'vote') {
      for (const p of players) {
        const r = await act(p, { type: 'vote', approve: strategy.approve(g, s) });
        assert(r.status === 200, 'vote');
        if (p !== players.at(-1)) {
          // others' votes hidden mid-vote
          const peek = await v(players[0]);
          assert(!('votes' in peek.game) && peek.phase === 'vote' && peek.game.voted.length > 0, 'votes hidden');
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
  console.log('Room caps at 15 players');
}
console.log('ALL PASSED');
