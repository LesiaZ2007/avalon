'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode';
import RoundTable from './RoundTable';
import { EventOverlay, QuestRow, waitingOn } from './Room';
import { Recap } from './Recap';
import { inkColor, tintColor } from './Avatar';
import { useTheme } from './Theme';
import TimerBadge from './Timer';
import { api } from '@/lib/client';
import { MAX_PLAYERS, MIN_PLAYERS, ROLES, isEvilRole } from '@/lib/rules';

const NUMERALS = ['I', 'II', 'III', 'IV', 'V'];

/** A shared screen for the table: public information only, refreshed by polling. */
export default function TvView({ code }) {
  const [view, setView] = useState(null);
  const [missing, setMissing] = useState(false);
  const [qr, setQr] = useState('');
  const versionRef = useRef(null);

  useEffect(() => {
    let stopped = false;
    let timer;
    const tick = async () => {
      try {
        const data = await api(`/api/room/${code}/tv?v=${versionRef.current ?? ''}`);
        if (stopped) return;
        if (!data.unchanged) {
          versionRef.current = data.version;
          setView(data);
        }
      } catch (err) {
        if (err.status === 404) return setMissing(true);
      }
      if (!stopped) timer = setTimeout(tick, 2000);
    };
    tick();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [code]);

  // Keep the screen awake while it's showing the table.
  useEffect(() => {
    let lock;
    const request = async () => {
      try {
        lock = await navigator.wakeLock?.request('screen');
      } catch {}
    };
    request();
    const again = () => document.visibilityState === 'visible' && request();
    document.addEventListener('visibilitychange', again);
    return () => {
      document.removeEventListener('visibilitychange', again);
      lock?.release?.();
    };
  }, []);

  const joinUrl = typeof window === 'undefined' ? '' : `${window.location.origin}/r/${code}`;
  // What to type to join without the QR code: the site, then the room code on its home page.
  const site = typeof window === 'undefined' ? '' : window.location.host;
  useEffect(() => {
    if (!joinUrl) return;
    QRCode.toString(joinUrl, { type: 'svg', margin: 1, color: { dark: '#e8dcbb', light: '#00000000' } })
      .then(setQr)
      .catch(() => setQr(''));
  }, [joinUrl]);

  const names = useMemo(() => Object.fromEntries((view?.players ?? []).map((p) => [p.id, p])), [view?.players]);
  useTheme(view?.settings?.theme);
  const nameOf = (id) => names[id]?.name ?? 'Someone';
  const avatarOf = (id) => names[id]?.avatar;

  if (missing) {
    return (
      <main className="tv tv-empty">
        <h1 className="wordmark">Avalon</h1>
        <p>Room {code} doesn&rsquo;t exist or has expired.</p>
      </main>
    );
  }
  if (!view) {
    return (
      <main className="tv tv-empty">
        <h1 className="wordmark">Avalon</h1>
        <p>Connecting to room {code}…</p>
      </main>
    );
  }

  const g = view.game;
  const seats = g ? g.seats : view.players.map((p) => p.id);
  const online = (id) => names[id]?.online;
  const lastVotes = g && (view.phase === 'quest' || (view.phase === 'team' && g.rejects > 0)) ? g.history.at(-1)?.votes : null;

  const info = (id) => {
    if (!g) return { leader: id === view.hostId, away: !online(id) };
    const over = view.phase === 'over';
    const s = {
      leader: g.leader === id && !over,
      lady: g.lady?.holder === id && !over,
      team: (view.phase === 'vote' || view.phase === 'quest') && g.team.includes(id),
      picked: view.phase === 'team' && g.draft.includes(id),
      done: (view.phase === 'vote' && g.voted.includes(id)) || (view.phase === 'quest' && g.played.includes(id)),
      vote: lastVotes ? lastVotes[id] : null,
      away: !online(id),
    };
    if (g.roles) {
      const evil = isEvilRole(g.roles[id]);
      s.ring = evil ? 'evil' : 'good';
      s.tag = ROLES[g.roles[id]].name.replace(' of Arthur', '').replace(' of Mordred', '');
      s.tagKind = evil ? 'evil' : 'good';
    } else if (g.evilRevealed?.includes(id)) {
      s.ring = 'evil';
      s.tag = g.assassin === id ? 'Assassin' : 'Evil';
      s.tagKind = 'evil';
    }
    return s;
  };

  let title = '';
  let line = '';
  if (!g) {
    title = view.code;
    line = `${view.players.length} of ${MAX_PLAYERS} seated`;
  } else {
    const quest = g.quests[g.questIdx];
    ({
      team: () => ((title = `Quest ${NUMERALS[g.questIdx]}`), (line = `${g.draft.length} of ${quest.size} knights chosen`)),
      vote: () => ((title = 'The vote'), (line = `${g.voted.length} of ${g.seats.length} have voted`)),
      quest: () => ((title = 'On quest'), (line = `${g.played.length} of ${g.team.length} cards played`)),
      lady: () => ((title = 'The Lady'), (line = 'of the Lake chooses')),
      assassin: () => ((title = 'Assassin'), (line = 'hunts for Merlin')),
      over: () => ((title = g.winner === 'good' ? 'Good wins' : 'Evil wins'), (line = g.reason)),
    })[view.phase]?.();
  }

  const waiting = waitingOn(view);
  const headline = !g
    ? view.players.length < MIN_PLAYERS
      ? `Waiting for ${MIN_PLAYERS - view.players.length} more`
      : 'Ready to deal'
    : {
        team: `${nameOf(g.leader)} is choosing ${g.quests[g.questIdx].size} knights`,
        vote: `Vote on ${nameOf(g.leader)}’s team`,
        quest: 'The quest is underway',
        lady: `${nameOf(g.lady?.holder)} holds the Lady of the Lake`,
        assassin: 'The Assassin has one guess',
        over: g.winner === 'good' ? 'Arthur prevails' : 'Mordred prevails',
      }[view.phase];

  const recap = view.phase === 'over' && g?.roles;

  return (
    <>
      <main className={`tv phase-${view.phase}`}>
        <div className="tv-table">
          <RoundTable
            seats={seats}
            nameOf={nameOf}
            avatarOf={avatarOf}
            you={null}
            info={info}
            reactions={view.reactions}
            center={
              g ? (
                <>
                  <span className={`center-title ${view.phase === 'over' ? `is-${g.winner}` : ''}`}>{title}</span>
                  <QuestRow view={view} open={null} setOpen={() => {}} />
                  <span className="center-line">{line}</span>
                  <div className="reject-track">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <span key={i} className={`reject-pip ${i < g.rejects ? 'is-on' : ''} ${i === 4 ? 'is-last' : ''}`} />
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <span className="center-kicker">Room</span>
                  <span className="center-code">{title}</span>
                  <span className="center-line">{line}</span>
                </>
              )
            }
          />
        </div>

        <aside className="tv-side">
          <p className="tv-mark">Avalon</p>
          <h1 className="tv-headline">{headline}</h1>
          {g && <TimerBadge view={view} tv />}
          {recap && (
            <a className="tv-recap-cue" href="#recap">
              Scroll down for the recap
            </a>
          )}
          {waiting.length > 0 && view.phase !== 'over' && (
            <p className="tv-waiting">
              Waiting on {waiting.map((id) => nameOf(id) + (online(id) ? '' : ' (away)')).join(', ')}
            </p>
          )}
          {(!g || view.phase === 'over') && view.scores.good + view.scores.evil > 0 && (
            <p className="tv-tally">
              <span className="good-text">Good {view.scores.good}</span>
              <span className="tally-sep" aria-hidden="true">
                –
              </span>
              <span className="evil-text">Evil {view.scores.evil}</span>
            </p>
          )}
          {(!g || view.phase === 'over') && (
            <div className="tv-join">
              <div className="tv-join-row">
                {qr && <div className="tv-qr" dangerouslySetInnerHTML={{ __html: qr }} aria-label="QR code to join this room" />}
                <div>
                  <p className="eyebrow">Room code</p>
                  <p className="tv-code">{view.code}</p>
                </div>
              </div>
              <div className="tv-join-at">
                <p className="eyebrow">Or join at</p>
                <p className="tv-url" style={{ '--chars': site.length || 1 }}>
                  {site}
                </p>
              </div>
            </div>
          )}
          <ol className="tv-chat" aria-label="Table talk">
            {view.chat
              .filter((m) => !m.system)
              .slice(-6)
              .map((m) => (
                <li key={m.id}>
                  <b className="tv-name" style={{ color: inkColor(names[m.pid]?.avatar), '--name-tint': tintColor(names[m.pid]?.avatar) }}>{m.name}</b> {m.text}
                </li>
              ))}
          </ol>
        </aside>

        <EventOverlay view={view} nameOf={nameOf} avatarOf={avatarOf} onRole={() => {}} tv />
      </main>
      {recap && (
        <div className="tv-recap" id="recap">
          <Recap view={view} nameOf={nameOf} avatarOf={avatarOf} inline />
        </div>
      )}
    </>
  );
}
