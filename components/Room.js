'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { LobbyHand, LobbyTable } from './Lobby';
import RoundTable, { initials, tintFor } from './RoundTable';
import ReactionBar from './Reactions';
import Fan from './Fan';
import { ApproveMark, BrokenBlade, Grail, RejectMark, RoleEmblem } from './art';
import { ROLES, describeRoles, isEvilRole } from '@/lib/rules';

const NUMERALS = ['I', 'II', 'III', 'IV', 'V'];
const shortRole = (role) => ROLES[role].name.replace(' of Arthur', '').replace(' of Mordred', '');

/** Private Trust / Suspect notes, kept on this device for the current game only. */
function useNotes(code, gameId) {
  const key = gameId ? `avalon:notes:${code}:${gameId}` : null;
  const [notes, setNotes] = useState({});
  useEffect(() => {
    if (!key) return setNotes({});
    try {
      setNotes(JSON.parse(localStorage.getItem(key) ?? '{}'));
    } catch {
      setNotes({});
    }
  }, [key]);
  const setNote = useCallback(
    (id, value) =>
      setNotes((prev) => {
        const next = { ...prev };
        if (value) next[id] = value;
        else delete next[id];
        try {
          localStorage.setItem(key, JSON.stringify(next));
        } catch {}
        return next;
      }),
    [key]
  );
  return [notes, setNote];
}

/** True when the chat is docked on screen rather than in a drawer. */
function useWide() {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1240px)');
    const update = () => setWide(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return wide;
}

export default function Room({ view, act, netError }) {
  const [drawer, setDrawer] = useState(null); // 'chat' | 'log' | null
  const [roleOpen, setRoleOpen] = useState(false);
  const [inspect, setInspect] = useState(null);
  const wide = useWide();
  const names = useMemo(() => Object.fromEntries(view.players.map((p) => [p.id, p.name])), [view.players]);
  const nameOf = (id) => names[id] ?? 'Someone';
  const g = view.game;
  const [notes, setNote] = useNotes(view.code, g?.id);

  // Unread chat badge.
  const lastChatId = view.chat.at(-1)?.id ?? 0;
  const [seenChat, setSeenChat] = useState(lastChatId);
  const chatVisible = wide || drawer === 'chat';
  useEffect(() => {
    if (chatVisible) setSeenChat(lastChatId);
  }, [chatVisible, lastChatId]);
  const unread = view.chat.filter((m) => m.id > seenChat && !m.system && m.pid !== view.you).length;

  useEffect(() => {
    if (!drawer) return;
    const onKey = (e) => e.key === 'Escape' && setDrawer(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawer]);

  return (
    <main className={`scene phase-${view.phase}`}>
      <TopBar
        view={view}
        unread={unread}
        onRole={() => setRoleOpen(true)}
        onChat={() => setDrawer(drawer === 'chat' ? null : 'chat')}
        onLog={() => setDrawer(drawer === 'log' ? null : 'log')}
      />
      {netError && <p className="net-banner">{netError}</p>}

      <div className="scene-body">
        {view.phase === 'lobby' ? (
          <div className="stage">
            <div className="table-zone">
              <LobbyTable view={view} nameOf={nameOf} />
              <ReactionBar act={act} />
            </div>
            <section className="hand" aria-label="Lobby">
              <LobbyHand view={view} act={act} />
            </section>
          </div>
        ) : (
          <GameStage view={view} act={act} nameOf={nameOf} notes={notes} onInspect={setInspect} />
        )}

        <aside className={`drawer drawer-chat ${drawer === 'chat' ? 'is-open' : ''}`} aria-label="Table talk">
          <Chat view={view} act={act} onClose={() => setDrawer(null)} />
        </aside>
      </div>

      {g && (
        <aside className={`drawer drawer-log ${drawer === 'log' ? 'is-open' : ''}`} aria-label="Chronicle">
          <Chronicle view={view} act={act} nameOf={nameOf} onClose={() => setDrawer(null)} />
        </aside>
      )}
      {drawer && <button className="drawer-scrim" aria-label="Close panel" onClick={() => setDrawer(null)} />}

      {roleOpen && g?.myRole && <RoleModal view={view} nameOf={nameOf} onClose={() => setRoleOpen(false)} />}
      {inspect && g && <SeatSheet view={view} id={inspect} nameOf={nameOf} note={notes[inspect]} setNote={setNote} onClose={() => setInspect(null)} />}
      <EventOverlay view={view} nameOf={nameOf} onRole={() => setRoleOpen(true)} />
    </main>
  );
}

function ChatIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path d="M4 5h16v11H9l-5 4z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}
function ScrollIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path d="M7 4h11v13a3 3 0 01-3 3H6a2 2 0 01-2-2v-2h11v2a2 2 0 002-2M7 4a2 2 0 00-2 2v10M10 8h5M10 12h5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TopBar({ view, unread, onRole, onChat, onLog }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(`${location.origin}/r/${view.code}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  }

  return (
    <header className="topbar">
      <Link href="/" className="topbar-mark">
        Avalon
      </Link>
      <div className="topbar-actions">
        {view.game?.myRole && (
          <button className="btn btn-sm btn-primary" onClick={onRole}>
            My role
          </button>
        )}
        {view.game && (
          <button className="icon-btn" onClick={onLog} aria-label="Chronicle" title="Chronicle">
            <ScrollIcon />
          </button>
        )}
        <button className="icon-btn icon-btn-chat" onClick={onChat} aria-label={`Table talk${unread ? `, ${unread} unread` : ''}`} title="Table talk">
          <ChatIcon />
          {unread > 0 && <span className="badge">{unread}</span>}
        </button>
        <button className="code-chip" onClick={copy} title="Copy invite link">
          <span className="code-chip-label">{copied ? 'Copied' : 'Room'}</span>
          <strong>{view.code}</strong>
        </button>
      </div>
    </header>
  );
}

/** Who can be tapped on the table right now, and how many. */
function pickRules(view) {
  const g = view.game;
  const me = view.you;
  if (view.phase === 'team' && g.leader === me) return { kind: 'team', max: g.quests[g.questIdx].size, can: () => true };
  if (view.phase === 'lady' && g.lady?.holder === me) return { kind: 'lady', max: 1, can: (id) => id !== me && !g.lady.held.includes(id) };
  if (view.phase === 'assassin' && g.myRole === 'assassin') return { kind: 'assassin', max: 1, can: (id) => !(g.evilRevealed ?? []).includes(id) };
  return null;
}

function GameStage({ view, act, nameOf, notes, onInspect }) {
  const g = view.game;
  const rules = pickRules(view);
  const leaderPicking = view.phase === 'team' && g.leader === view.you;
  const [picked, setPicked] = useState([]);

  // Reset picks when the situation changes. A leader who reloads gets their draft back.
  const stage = `${view.phase}:${g.questIdx}:${g.leader}:${g.lady?.holder ?? ''}`;
  useEffect(() => {
    setPicked(leaderPicking ? g.draft : []);
  }, [stage]); // eslint-disable-line react-hooks/exhaustive-deps

  // Share the leader's picks with the table as they happen.
  const draftRef = useRef(g.draft);
  draftRef.current = g.draft;
  useEffect(() => {
    if (!leaderPicking) return;
    if (JSON.stringify(picked) === JSON.stringify(draftRef.current)) return;
    const t = setTimeout(() => act({ type: 'draft', team: picked }), 200);
    return () => clearTimeout(t);
  }, [picked, leaderPicking, act]);

  return (
    <div className="stage">
      <div className="table-zone">
        <GameTable view={view} nameOf={nameOf} rules={rules} picked={picked} setPicked={setPicked} notes={notes} onInspect={onInspect} />
        <ReactionBar act={act} />
      </div>
      <section className="hand" aria-label="Your move">
        <ActionPanel view={view} act={act} nameOf={nameOf} rules={rules} picked={picked} setPicked={setPicked} />
      </section>
    </div>
  );
}

function QuestRow({ view, open, setOpen }) {
  const g = view.game;
  const live = view.phase !== 'over' && view.phase !== 'assassin';
  return (
    <div className="quest-row">
      {g.quests.map((q, i) => {
        const current = live && i === g.questIdx && !q.result;
        const state = q.result ?? (current ? 'current' : 'pending');
        return (
          <button
            key={i}
            type="button"
            className={`medal is-${state} ${open === i ? 'is-open' : ''}`}
            onClick={() => setOpen(open === i ? null : i)}
            aria-label={`Quest ${i + 1}: ${q.size} knights${q.failsNeeded > 1 ? ', needs two fails' : ''}${q.result ? `, ${q.result}` : ''}`}
          >
            {q.result === 'success' ? <Grail size={22} /> : q.result === 'fail' ? <BrokenBlade size={22} /> : q.size}
            {q.failsNeeded > 1 && !q.result && <span className="medal-star" aria-hidden="true">2</span>}
          </button>
        );
      })}
    </div>
  );
}

function GameTable({ view, nameOf, rules, picked, setPicked, notes, onInspect }) {
  const g = view.game;
  const [open, setOpen] = useState(null);
  useEffect(() => {
    if (open === null) return;
    const t = setTimeout(() => setOpen(null), 6000);
    return () => clearTimeout(t);
  }, [open]);

  const known = Object.fromEntries(g.known.map((k) => [k.id, k]));
  const myChecks = Object.fromEntries((g.lady?.checks ?? []).filter((c) => c.holder === view.you && 'evil' in c).map((c) => [c.target, c.evil]));
  const over = view.phase === 'over';
  const shownTeam = rules?.kind === 'team' ? picked : view.phase === 'team' ? g.draft : [];
  const lastVotes = view.phase === 'quest' || (view.phase === 'team' && g.rejects > 0) ? g.history.at(-1)?.votes : null;

  const onPick = (id) =>
    setPicked((p) => {
      if (p.includes(id)) return p.filter((x) => x !== id);
      if (rules.max === 1) return [id];
      return p.length >= rules.max ? p : [...p, id];
    });

  const info = (id) => {
    const s = {
      leader: g.leader === id && !over,
      lady: g.lady?.holder === id && !over,
      team: (view.phase === 'vote' || view.phase === 'quest') && g.team.includes(id),
      picked: shownTeam.includes(id) || (rules && picked.includes(id)),
      done: (view.phase === 'vote' && g.voted.includes(id)) || (view.phase === 'quest' && g.played.includes(id)),
      vote: lastVotes ? lastVotes[id] : null,
      note: notes[id],
      muted: rules && !rules.can(id),
    };
    if (g.roles) {
      const evil = isEvilRole(g.roles[id]);
      s.ring = evil ? 'evil' : 'good';
      s.tag = shortRole(g.roles[id]);
      s.tagKind = evil ? 'evil' : 'good';
    } else if (g.evilRevealed?.includes(id)) {
      s.ring = 'evil';
      s.tag = g.assassin === id ? 'Assassin' : 'Evil';
      s.tagKind = 'evil';
    } else if (known[id]) {
      s.ring = known[id].kind;
      s.tag = known[id].kind === 'merlin' && known[id].label !== 'Merlin' ? 'Merlin?' : known[id].label;
      s.tagKind = known[id].kind;
    } else if (id in myChecks) {
      s.ring = myChecks[id] ? 'evil' : 'good';
      s.tag = myChecks[id] ? 'Lady: evil' : 'Lady: good';
      s.tagKind = myChecks[id] ? 'evil' : 'good';
    }
    if (g.assassinTarget === id) s.tag = `${s.tag ? `${s.tag}, ` : ''}named`;
    return s;
  };

  const quest = g.quests[g.questIdx];
  const centers = {
    team: [`Quest ${NUMERALS[g.questIdx]}`, `${shownTeam.length} of ${quest.size} knights chosen`],
    vote: ['The vote', `${g.voted.length} of ${g.seats.length} have voted`],
    quest: ['On quest', `${g.played.length} of ${g.team.length} cards played`],
    lady: ['The Lady', 'of the Lake chooses'],
    assassin: ['Assassin', 'hunts for Merlin', 'evil'],
    over: [g.winner === 'good' ? 'Good wins' : 'Evil wins', 'Tap anyone to see their record', g.winner],
  };
  let [title, line, kind] = centers[view.phase] ?? [];
  if (open !== null) {
    const q = g.quests[open];
    title = `Quest ${NUMERALS[open]}`;
    line = q.result
      ? `${q.result === 'success' ? 'Succeeded' : 'Failed'}, ${q.fails} fail${q.fails === 1 ? '' : 's'}: ${q.team.map(nameOf).join(', ')}`
      : `${q.size} knights${q.failsNeeded > 1 ? ', fails only with 2 Fail cards' : ''}`;
    kind = q.result === 'success' ? 'good' : q.result === 'fail' ? 'evil' : undefined;
  }

  return (
    <RoundTable
      seats={g.seats}
      nameOf={nameOf}
      you={view.you}
      info={info}
      reactions={view.reactions}
      onPick={rules ? onPick : null}
      canPick={rules?.can}
      onInspect={onInspect}
      center={
        <>
          <span className={`center-title ${kind ? `is-${kind}` : ''}`}>{title}</span>
          <QuestRow view={view} open={open} setOpen={setOpen} />
          <span className="center-line">{line}</span>
          <div className="reject-track" aria-label={`${g.rejects} of 5 teams rejected in a row`} title="Teams rejected in a row. The fifth hands evil the game.">
            {[0, 1, 2, 3, 4].map((i) => (
              <span key={i} className={`reject-pip ${i < g.rejects ? 'is-on' : ''} ${i === 4 ? 'is-last' : ''}`} />
            ))}
          </div>
        </>
      }
    />
  );
}

function ActionPanel({ view, act, nameOf, rules, picked, setPicked }) {
  const g = view.game;
  const me = view.you;
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const quest = g.quests[g.questIdx];
  useEffect(() => setNote(''), [view.phase, g.questIdx]);

  const send = async (action) => {
    setBusy(true);
    await act(action);
    setBusy(false);
  };

  const pickBar = rules && (
    <div className="pick-bar">
      <div className="team-line">
        {picked.length ? (
          picked.map((id) => (
            <button key={id} className="chip chip-brass chip-x" onClick={() => setPicked((p) => p.filter((x) => x !== id))} aria-label={`Remove ${nameOf(id)}`}>
              {nameOf(id)} ×
            </button>
          ))
        ) : (
          <span className="hand-text small">Tap seats at the table.</span>
        )}
      </div>
      <button
        className={`btn btn-lg ${rules.kind === 'assassin' ? 'btn-evil' : 'btn-primary'}`}
        disabled={busy || picked.length !== rules.max}
        onClick={() =>
          send(rules.kind === 'team' ? { type: 'propose', team: picked } : rules.kind === 'lady' ? { type: 'lady', target: picked[0] } : { type: 'assassinate', target: picked[0] })
        }
      >
        {rules.kind === 'team'
          ? `Propose team · ${picked.length}/${rules.max}`
          : picked[0]
          ? `${rules.kind === 'lady' ? 'Examine' : 'Assassinate'} ${nameOf(picked[0])}`
          : 'Choose a player'}
      </button>
    </div>
  );

  let body;
  switch (view.phase) {
    case 'team':
      body =
        g.leader === me ? (
          <>
            <p className="eyebrow">You lead quest {NUMERALS[g.questIdx]}</p>
            <h2 className="hand-title">Choose {quest.size} knights</h2>
            <p className="hand-text">
              Everyone watches your picks appear at the table.{quest.failsNeeded > 1 ? ' This quest only fails with two Fail cards.' : ''}
            </p>
            {g.rejects === 4 && <p className="banner">Four teams have been rejected. If this one is rejected too, evil wins.</p>}
            {pickBar}
          </>
        ) : (
          <>
            <p className="eyebrow">Quest {NUMERALS[g.questIdx]}</p>
            <h2 className="hand-title">
              {nameOf(g.leader)} is choosing {quest.size} knights
            </h2>
            <p className="hand-text">Watch the team form at the table. Argue for or against it out loud, then vote.</p>
            {g.rejects === 4 && <p className="banner">Four teams have been rejected. If the next one is rejected too, evil wins.</p>}
          </>
        );
      break;

    case 'vote':
      body = (
        <>
          <p className="eyebrow">{nameOf(g.leader)} proposes</p>
          <div className="team-line team-line-center">
            {g.team.map((id) => (
              <span key={id} className="chip chip-brass">
                {nameOf(id)}
              </span>
            ))}
          </div>
          <div className="token-row">
            <button className={`vote-token is-approve ${g.myVote === true ? 'is-on' : ''}`} disabled={busy} onClick={() => send({ type: 'vote', approve: true })}>
              <span className="token-face">
                <ApproveMark size={46} />
              </span>
              Approve
            </button>
            <button className={`vote-token is-reject ${g.myVote === false ? 'is-on' : ''}`} disabled={busy} onClick={() => send({ type: 'vote', approve: false })}>
              <span className="token-face">
                <RejectMark size={46} />
              </span>
              Reject
            </button>
          </div>
          <p className="hand-text small">
            {g.myVote !== null ? 'Vote cast. You can change it until everyone has voted.' : 'All votes are revealed together.'}
          </p>
        </>
      );
      break;

    case 'quest': {
      const onTeam = g.team.includes(me);
      if (onTeam && g.myCard === null) {
        const good = !isEvilRole(g.myRole);
        body = (
          <>
            <p className="eyebrow">You are on the quest</p>
            <h2 className="hand-title">Play a card, face down</h2>
            <div className="card-hand">
              <button className="quest-choice is-success" disabled={busy} onClick={() => send({ type: 'quest', success: true })}>
                <Grail size={58} />
                Success
              </button>
              <button className="quest-choice is-fail" disabled={busy} onClick={() => (good ? setNote('Loyal servants of Arthur must play Success.') : send({ type: 'quest', success: false }))}>
                <BrokenBlade size={58} />
                Fail
              </button>
            </div>
            <p className={note ? 'error' : 'hand-text small'}>{note || 'Shield your screen. Cards are shuffled before they are revealed.'}</p>
          </>
        );
      } else {
        body = (
          <>
            <p className="eyebrow">Quest {NUMERALS[g.questIdx]}</p>
            <h2 className="hand-title">{onTeam ? 'Your card is on the table' : 'The quest is underway'}</h2>
            <div className="card-slots" aria-label={`${g.played.length} of ${g.team.length} cards played`}>
              {g.team.map((id, i) => (
                <span key={id} className={`card-slot ${i < g.played.length ? 'is-in' : ''}`} />
              ))}
            </div>
            <p className="hand-text small">The seats show how everyone voted on this team.</p>
          </>
        );
      }
      break;
    }

    case 'lady':
      body =
        g.lady.holder === me ? (
          <>
            <p className="eyebrow">You hold the Lady of the Lake</p>
            <h2 className="hand-title">Whose loyalty will you learn?</h2>
            <p className="hand-text">Only you will see the answer, and that player takes the Lady next. Anyone who has held her is greyed out.</p>
            {pickBar}
          </>
        ) : (
          <>
            <p className="eyebrow">The Lady of the Lake</p>
            <h2 className="hand-title">{nameOf(g.lady.holder)} is choosing</h2>
            <p className="hand-text">They will secretly learn one player&rsquo;s loyalty.</p>
          </>
        );
      break;

    case 'assassin':
      body =
        g.myRole === 'assassin' ? (
          <>
            <p className="eyebrow">Good completed three quests</p>
            <h2 className="hand-title evil-text">Name Merlin</h2>
            <p className="hand-text">Talk it over with your allies out loud. If you name Merlin, evil wins.</p>
            {pickBar}
          </>
        ) : (
          <>
            <p className="eyebrow">Good completed three quests</p>
            <h2 className="hand-title">The Assassin has one guess</h2>
            <p className="hand-text">Evil is revealed at the table. If {nameOf(g.assassin)} names Merlin, evil steals the win.</p>
          </>
        );
      break;

    case 'over':
      body = (
        <div className={`winner is-${g.winner}`}>
          <div className="winner-art">{g.winner === 'good' ? <Grail size={80} /> : <RoleEmblem role="mordred" size={80} />}</div>
          <h2>{g.winner === 'good' ? 'Arthur prevails' : 'Mordred prevails'}</h2>
          <p>{g.reason}</p>
          {view.hostId === me ? (
            <button className="btn btn-primary btn-lg" onClick={() => send({ type: 'lobby' })}>
              Back to the lobby
            </button>
          ) : (
            <p className="hand-text small">The host can start a new game from the lobby.</p>
          )}
        </div>
      );
      break;

    default:
      body = null;
  }

  return (
    <div className="hand-inner" key={view.phase}>
      {body}
    </div>
  );
}

function RoleModal({ view, nameOf, onClose }) {
  const g = view.game;
  const role = ROLES[g.myRole];
  const myChecks = (g.lady?.checks ?? []).filter((c) => c.holder === view.you && 'evil' in c);
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Your role">
      <div className={`flip-card ${flipped ? 'is-flipped' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="flip-inner">
          <div className={`role-card flip-front is-${role.team}`}>
            <p className="role-team">{role.team === 'good' ? 'Loyal to Arthur' : 'Servant of Mordred'}</p>
            <div className="role-art">
              <RoleEmblem role={g.myRole} size={108} />
            </div>
            <h2 className="role-name">{role.name}</h2>
            <p className="role-blurb">{role.blurb}</p>

            {g.known.length > 0 && (
              <div className="role-section">
                <p className="eyebrow">{g.myRole === 'percival' ? 'You see' : g.myRole === 'merlin' ? 'You see the agents of evil' : 'Your allies'}</p>
                <ul className="known">
                  {g.known.map((k) => (
                    <li key={k.id}>
                      <span>{nameOf(k.id)}</span>
                      <span className={`chip ${k.kind === 'evil' ? 'chip-evil' : 'chip-brass'}`}>{k.label}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {g.myRole === 'mordred' && <p className="muted small">Merlin does not know you are evil.</p>}
            {g.myRole === 'oberon' && <p className="muted small">You have no information about your allies.</p>}

            {myChecks.length > 0 && (
              <div className="role-section">
                <p className="eyebrow">The Lady of the Lake showed you</p>
                <ul className="known">
                  {myChecks.map((c) => (
                    <li key={c.target}>
                      <span>{nameOf(c.target)}</span>
                      <span className={`chip ${c.evil ? 'chip-evil' : 'chip-good'}`}>{c.evil ? 'Evil' : 'Good'}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <button className="btn btn-block" onClick={onClose}>
              Hide my role
            </button>
          </div>
          <button className="card-back flip-back" onClick={() => setFlipped(true)} autoFocus>
            <span className="card-back-art">
              <RoleEmblem role="servant" size={64} />
            </span>
            <span className="card-back-title">Avalon</span>
            <span className="card-back-hint">Shield your screen, then tap to turn your card over</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function SeatSheet({ view, id, nameOf, note, setNote, onClose }) {
  const g = view.game;
  const seatIdx = g.seats.indexOf(id);
  const proposals = g.history.map((h, i) => ({ ...h, n: g.history.filter((x, j) => j <= i && x.quest === h.quest).length }));
  const led = g.history.filter((h) => h.leader === id).length;
  const approvals = g.history.filter((h) => h.votes[id]).length;
  const quests = g.quests.filter((q) => q.result && q.team.includes(id));
  const failed = quests.filter((q) => q.result === 'fail').length;
  const role = g.roles?.[id];

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="overlay overlay-sheet" onClick={onClose} role="dialog" aria-modal="true" aria-label={`${nameOf(id)}'s record`}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <span className="avatar avatar-lg" style={{ '--tint': tintFor(seatIdx) }}>
            {initials(nameOf(id))}
          </span>
          <div>
            <h2>
              {nameOf(id)} {id === view.you && <span className="muted">(you)</span>}
            </h2>
            <p className="muted small">{role ? <span className={isEvilRole(role) ? 'evil-text' : 'good-text'}>{ROLES[role].name}</span> : `Seat ${seatIdx + 1}`}</p>
          </div>
          <button className="btn btn-sm btn-ghost" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="stat-row">
          <div>
            <strong>{quests.length}</strong>
            <span>quests joined</span>
          </div>
          <div>
            <strong className={failed ? 'evil-text' : ''}>{failed}</strong>
            <span>of them failed</span>
          </div>
          <div>
            <strong>
              {approvals}/{g.history.length}
            </strong>
            <span>teams approved</span>
          </div>
          <div>
            <strong>{led}</strong>
            <span>teams proposed</span>
          </div>
        </div>

        {id !== view.you && !role && (
          <div className="note-picker">
            <p className="eyebrow">Your private note</p>
            <div className="note-buttons" role="group" aria-label="Your note about this player">
              <button className={`note-btn is-trust ${note === 'trust' ? 'is-on' : ''}`} onClick={() => setNote(id, note === 'trust' ? null : 'trust')}>
                ✓ Trust
              </button>
              <button className={`note-btn ${!note ? 'is-on' : ''}`} onClick={() => setNote(id, null)}>
                Unsure
              </button>
              <button className={`note-btn is-suspect ${note === 'suspect' ? 'is-on' : ''}`} onClick={() => setNote(id, note === 'suspect' ? null : 'suspect')}>
                ? Suspect
              </button>
            </div>
            <p className="muted small">Only you can see this. It shows next to their name.</p>
          </div>
        )}

        <div>
          <p className="eyebrow" style={{ marginBottom: 8 }}>
            Voting record
          </p>
          {proposals.length === 0 ? (
            <p className="muted small">No votes yet.</p>
          ) : (
            <ol className="record">
              {proposals.map((h, i) => (
                <li key={i}>
                  <span className={`mini-token sm ${h.votes[id] ? 'is-approve' : 'is-reject'}`}>{h.votes[id] ? <ApproveMark size={16} /> : <RejectMark size={16} />}</span>
                  <span className="record-text">
                    Quest {NUMERALS[h.quest]}.{h.n}: {h.leader === id ? 'proposed it' : `${nameOf(h.leader)}'s team`}
                    {h.team.includes(id) ? ' (on it)' : ''}
                  </span>
                  <span className={`chip ${h.approved ? 'chip-good' : 'chip-evil'}`}>{h.approved ? 'went' : 'rejected'}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}

function Chat({ view, act, onClose }) {
  const [text, setText] = useState('');
  const logRef = useRef(null);
  const lastId = view.chat.at(-1)?.id;

  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lastId]);

  async function send(e) {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    setText('');
    if (!(await act({ type: 'chat', text: t }))) setText(t);
  }

  return (
    <div className="panel-body chat">
      <div className="panel-head">
        <h2 className="panel-title">Table talk</h2>
        <button className="btn btn-sm btn-ghost drawer-close" onClick={onClose}>
          Close
        </button>
      </div>
      <div className="chat-log" ref={logRef} aria-live="polite">
        {view.chat.length === 0 && <p className="muted small">No messages yet.</p>}
        {view.chat.map((m) =>
          m.system ? (
            <p key={m.id} className="msg is-system">
              {m.text}
            </p>
          ) : (
            <p key={m.id} className={`msg ${m.pid === view.you ? 'is-me' : ''}`}>
              <b>{m.name}</b> {m.text}
            </p>
          )
        )}
      </div>
      <form className="chat-form" onSubmit={send}>
        <input id="chat-input" aria-label="Message" className="input" value={text} maxLength={300} placeholder="Say something…" autoComplete="off" onChange={(e) => setText(e.target.value)} />
        <button className="btn" type="submit" disabled={!text.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}

function EndGame({ act }) {
  const [confirm, setConfirm] = useState(false);
  useEffect(() => {
    if (!confirm) return;
    const t = setTimeout(() => setConfirm(false), 4000);
    return () => clearTimeout(t);
  }, [confirm]);
  return (
    <div className="host-tools">
      <p className="eyebrow">Host</p>
      <button className={`btn ${confirm ? 'btn-evil' : 'btn-ghost'}`} onClick={() => (confirm ? act({ type: 'lobby' }) : setConfirm(true))}>
        {confirm ? 'Tap again to end the game for everyone' : 'End game early'}
      </button>
    </div>
  );
}

function Chronicle({ view, act, nameOf, onClose }) {
  const g = view.game;
  const canEnd = view.hostId === view.you && view.phase !== 'over';
  const entries = [];
  g.quests.forEach((q, qi) => {
    g.history
      .filter((h) => h.quest === qi)
      .forEach((h, ai) => {
        const yes = g.seats.filter((id) => h.votes[id]);
        const no = g.seats.filter((id) => !h.votes[id]);
        entries.push(
          <li key={`v${qi}-${ai}`} className="entry">
            <div className="entry-head">
              <span>
                Quest {NUMERALS[qi]} · proposal {ai + 1}
              </span>
              <span className={`chip ${h.approved ? 'chip-good' : 'chip-evil'}`}>
                {h.approved ? 'Approved' : 'Rejected'} {yes.length}–{no.length}
              </span>
            </div>
            <span>
              {nameOf(h.leader)} sent {h.team.map(nameOf).join(', ')}
            </span>
            <span className="muted small">
              Approved: {yes.map(nameOf).join(', ') || 'nobody'}
              <br />
              Rejected: {no.map(nameOf).join(', ') || 'nobody'}
            </span>
          </li>
        );
      });
    if (q.result) {
      entries.push(
        <li key={`q${qi}`} className={`entry is-${q.result}`}>
          <div className="entry-head">
            <span>Quest {NUMERALS[qi]}</span>
            <span className={`chip ${q.result === 'success' ? 'chip-good' : 'chip-evil'}`}>{q.result === 'success' ? 'Succeeded' : 'Failed'}</span>
          </div>
          <span className="muted small">
            {q.team.map(nameOf).join(', ')} · {q.fails} Fail card{q.fails === 1 ? '' : 's'}
          </span>
        </li>
      );
    }
    (g.lady?.checks ?? [])
      .filter((c) => c.quest === qi)
      .forEach((c) =>
        entries.push(
          <li key={`l${qi}`} className="entry">
            <div className="entry-head">
              <span>Lady of the Lake</span>
              {'evil' in c && <span className={`chip ${c.evil ? 'chip-evil' : 'chip-good'}`}>{c.evil ? 'Evil' : 'Good'}</span>}
            </div>
            <span className="muted small">
              {nameOf(c.holder)} examined {nameOf(c.target)}
            </span>
          </li>
        )
      );
  });

  return (
    <div className="panel-body">
      <div className="panel-head">
        <h2 className="panel-title">Chronicle</h2>
        <button className="btn btn-sm btn-ghost drawer-close" onClick={onClose}>
          Close
        </button>
      </div>
      <div className="in-play">
        <p className="eyebrow">In this game</p>
        <Fan roles={[...g.lineup.good, ...g.lineup.evil]} size="sm" label="Roles in this game" />
        <p className="small">
          <span className="good-text">{describeRoles(g.lineup.good).join(', ')}</span> against <span className="evil-text">{describeRoles(g.lineup.evil).join(', ')}</span>
        </p>
      </div>
      {entries.length ? <ol className="chronicle">{entries.reverse()}</ol> : <p className="muted small">Every proposal, vote and quest will be recorded here.</p>}
      {canEnd && <EndGame act={act} />}
    </div>
  );
}

function EventOverlay({ view, nameOf, onRole }) {
  const ev = view.event;
  const [shown, setShown] = useState(null);
  const handled = useRef(null);
  const key = `avalon:event:${view.code}`;

  useEffect(() => {
    if (!ev) {
      // In the lobby: mark "nothing seen" so the next game's events are shown.
      try {
        if (!sessionStorage.getItem(key)) sessionStorage.setItem(key, '0');
      } catch {}
      return;
    }
    if (handled.current === ev.id) return;
    handled.current = ev.id;
    let seen = null;
    try {
      const raw = sessionStorage.getItem(key);
      seen = raw === null ? null : Number(raw);
      sessionStorage.setItem(key, String(ev.id));
    } catch {}
    // Don't replay an old result when someone reloads the page.
    if (seen === null || ev.id <= seen) return;
    if (ev.type === 'vote' || ev.type === 'quest' || ev.type === 'start') setShown(ev);
  }, [ev?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!shown || shown.type === 'start') return;
    const t = setTimeout(() => setShown(null), 10000);
    return () => clearTimeout(t);
  }, [shown]);

  if (!shown) return null;
  const close = () => setShown(null);

  let content;
  if (shown.type === 'start') {
    content = (
      <>
        <div className="overlay-art">
          <RoleEmblem role="servant" size={64} />
        </div>
        <p className="eyebrow">The game begins</p>
        <h2>Roles are dealt</h2>
        <p className="muted">Shield your screen before you look.</p>
        <button
          className="btn btn-primary btn-block btn-lg"
          onClick={() => {
            close();
            onRole();
          }}
          autoFocus
        >
          See my role
        </button>
        <button className="btn btn-ghost btn-block" onClick={close}>
          Later
        </button>
      </>
    );
  } else if (shown.type === 'vote') {
    const ids = Object.keys(shown.votes);
    content = (
      <>
        <p className="eyebrow">
          Quest {NUMERALS[shown.quest]} · {nameOf(shown.leader)}&rsquo;s team
        </p>
        <div className="vote-reveal">
          {ids.map((id, i) => (
            <div key={id} className="vote-reveal-item" style={{ animationDelay: `${0.15 + i * 0.12}s` }}>
              <span className={`mini-token ${shown.votes[id] ? 'is-approve' : 'is-reject'}`}>{shown.votes[id] ? <ApproveMark size={24} /> : <RejectMark size={24} />}</span>
              <span>{nameOf(id)}</span>
            </div>
          ))}
        </div>
        <h2 className={`result-title ${shown.approved ? 'good-text' : 'evil-text'}`} style={{ animationDelay: `${0.3 + ids.length * 0.12}s` }}>
          {shown.approved ? 'Approved' : 'Rejected'}
        </h2>
        {!shown.approved && <p className="muted">{shown.rejects >= 5 ? 'Five rejections in a row. Evil wins.' : `${shown.rejects} of 5 rejections. Leadership passes on.`}</p>}
      </>
    );
  } else {
    const cards = [...Array(shown.size - shown.fails).fill('success'), ...Array(shown.fails).fill('fail')];
    content = (
      <>
        <p className="eyebrow">Quest {NUMERALS[shown.quest]}</p>
        <div className="cards">
          {cards.map((c, i) => (
            <span key={i} className={`quest-card is-${c}`} style={{ animationDelay: `${0.2 + i * 0.5}s` }}>
              {c === 'success' ? <Grail size={38} /> : <BrokenBlade size={38} />}
              <span>{c === 'success' ? 'Success' : 'Fail'}</span>
            </span>
          ))}
        </div>
        <h2 className={`result-title ${shown.result === 'success' ? 'good-text' : 'evil-text'}`} style={{ animationDelay: `${0.4 + cards.length * 0.5}s` }}>
          {shown.result === 'success' ? 'The quest succeeds' : 'The quest fails'}
        </h2>
        {shown.failsNeeded > 1 && shown.fails === 1 && <p className="muted">One Fail was played, but this quest needed two.</p>}
      </>
    );
  }

  return (
    <div className="overlay" onClick={shown.type === 'start' ? undefined : close} role="dialog" aria-modal="true">
      <div className="overlay-card" onClick={(e) => e.stopPropagation()}>
        {content}
        {shown.type !== 'start' && (
          <button className="btn btn-block" onClick={close} autoFocus>
            Continue
          </button>
        )}
      </div>
    </div>
  );
}
