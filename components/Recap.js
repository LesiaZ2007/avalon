'use client';

import { useEffect, useState } from 'react';
import Avatar from './Avatar';
import { ApproveMark, BrokenBlade, Grail, RejectMark } from './art';
import { ROLES, isEvilRole } from '@/lib/rules';

const NUMERALS = ['I', 'II', 'III', 'IV', 'V'];
const list = (names) => (names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`);

/** Who approved a team and who rejected it, as each player's avatar and name. */
export function VoteSplit({ seats, votes, nameOf, avatarOf }) {
  return (
    <div className="vote-split">
      {[true, false].map((approve) => {
        const ids = seats.filter((id) => Boolean(votes[id]) === approve);
        return (
          <div key={String(approve)} className="vote-split-row" aria-label={`${approve ? 'Approved' : 'Rejected'}: ${ids.map(nameOf).join(', ') || 'nobody'}`}>
            <span className={`mini-token xs ${approve ? 'is-approve' : 'is-reject'}`} title={approve ? 'Approved' : 'Rejected'}>
              {approve ? <ApproveMark size={12} /> : <RejectMark size={12} />}
            </span>
            {ids.length ? (
              ids.map((id) => (
                <span key={id} className="who-chip">
                  <Avatar avatar={avatarOf(id)} name={nameOf(id)} className="avatar-xs" />
                  {nameOf(id)}
                </span>
              ))
            ) : (
              <span className="muted small">nobody</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** The room's running tally, "Good 3 – Evil 2", plus each player's wins. */
export function Scoreboard({ view, nameOf, avatarOf, act, compact = false }) {
  const s = view.scores;
  const played = s.good + s.evil;
  const [confirm, setConfirm] = useState(false);
  useEffect(() => {
    if (!confirm) return;
    const t = setTimeout(() => setConfirm(false), 4000);
    return () => clearTimeout(t);
  }, [confirm]);
  if (!played) return null;

  const standings = view.players
    .filter((p) => s.players[p.id])
    .map((p) => ({ id: p.id, ...s.players[p.id] }))
    .sort((a, b) => b.wins - a.wins || a.played - b.played || nameOf(a.id).localeCompare(nameOf(b.id)));
  const canReset = act && view.hostId === view.you && view.phase === 'lobby';

  return (
    <div className={`tally ${compact ? 'is-compact' : ''}`}>
      <p className="eyebrow">
        {played} {played === 1 ? 'game' : 'games'} in this room
      </p>
      <p className="tally-score" aria-label={`Good ${s.good}, evil ${s.evil}`}>
        <span className="good-text">Good {s.good}</span>
        <span className="tally-sep" aria-hidden="true">
          –
        </span>
        <span className="evil-text">Evil {s.evil}</span>
      </p>
      {!compact && standings.length > 0 && (
        <details className="standings">
          <summary>Player standings</summary>
          <ol>
            {standings.map((r) => (
              <li key={r.id}>
                <Avatar avatar={avatarOf(r.id)} name={nameOf(r.id)} className="avatar-sm" />
                <span className="roster-name">
                  {nameOf(r.id)}
                  {r.id === view.you && <span className="muted"> (you)</span>}
                </span>
                <span className="standings-wins">
                  {r.wins} of {r.played} won
                </span>
              </li>
            ))}
          </ol>
          {canReset && (
            <button className={`btn btn-sm ${confirm ? 'btn-evil' : 'btn-ghost'}`} onClick={() => (confirm ? act({ type: 'resetScores' }) : setConfirm(true))}>
              {confirm ? 'Tap again to reset the scores' : 'Reset scores'}
            </button>
          )}
        </details>
      )}
    </div>
  );
}

/** Who was who, every quest and the votes that sent it, once the game is over. */
export function Recap({ view, nameOf, avatarOf, onClose }) {
  const g = view.game;

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const evil = (id) => isEvilRole(g.roles[id]);
  const side = (team) => g.seats.filter((id) => (team === 'evil') === evil(id));
  const roleName = (id) => ROLES[g.roles[id]].name;
  const named = (id) => <span className={evil(id) ? 'evil-text' : 'good-text'}>{nameOf(id)}</span>;
  const team = (ids) =>
    ids.map((id, i) => (
      <span key={id}>
        {i > 0 && (i === ids.length - 1 ? ' and ' : ', ')}
        {named(id)}
      </span>
    ));

  // One entry per quest that was reached: its proposals and, if it went, its result.
  const quests = g.quests
    .map((q, i) => ({ ...q, i, proposals: g.history.filter((h) => h.quest === i) }))
    .filter((q) => q.result || q.proposals.length);

  return (
    <div className="overlay overlay-sheet" onClick={onClose} role="dialog" aria-modal="true" aria-label="Game recap">
      <div className="sheet recap" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <div>
            <p className="eyebrow">Game recap</p>
            <h2 className={g.winner === 'good' ? 'good-text' : 'evil-text'}>{g.winner === 'good' ? 'Arthur prevails' : 'Mordred prevails'}</h2>
            <p className="muted small">{g.reason}</p>
          </div>
          <button className="btn btn-sm btn-ghost" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="recap-sides">
          {['good', 'evil'].map((t) => (
            <div key={t} className={`recap-side is-${t}`}>
              <p className="eyebrow">{t === 'good' ? 'Loyal to Arthur' : 'Servants of Mordred'}</p>
              <ul>
                {side(t).map((id) => (
                  <li key={id}>
                    <Avatar avatar={avatarOf(id)} name={nameOf(id)} className="avatar-sm" />
                    <span className="recap-who">
                      <strong>
                        {nameOf(id)}
                        {id === view.you && <span className="muted"> (you)</span>}
                      </strong>
                      <span className="small">{roleName(id)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div>
          <p className="eyebrow" style={{ marginBottom: 8 }}>
            Quest by quest
          </p>
          <ol className="recap-quests">
            {quests.map((q) => {
              const sent = q.proposals.find((h) => h.approved);
              const rejected = q.proposals.filter((h) => !h.approved).length;
              const yes = sent ? g.seats.filter((id) => sent.votes[id]) : [];
              const traitors = q.result ? q.team.filter(evil) : [];
              return (
                <li key={q.i} className={`entry ${q.result ? `is-${q.result}` : 'is-fail'}`}>
                  <div className="entry-head">
                    <span className="recap-quest-title">
                      {q.result === 'success' ? <Grail size={20} /> : q.result === 'fail' ? <BrokenBlade size={20} /> : <RejectMark size={20} />}
                      Quest {NUMERALS[q.i]}
                    </span>
                    <span className={`chip ${q.result === 'success' ? 'chip-good' : 'chip-evil'}`}>
                      {q.result === 'success' ? 'Succeeded' : q.result === 'fail' ? `Failed, ${q.fails} Fail card${q.fails === 1 ? '' : 's'}` : 'Never went'}
                    </span>
                  </div>
                  {sent ? (
                    <>
                      <span>
                        {nameOf(sent.leader)} sent {team(sent.team)}
                        {rejected > 0 && <span className="muted"> after {rejected === 1 ? 'one rejected team' : `${rejected} rejected teams`}</span>}.
                      </span>
                      <span className="muted small">
                        Approved {yes.length}–{g.seats.length - yes.length}:
                      </span>
                      <VoteSplit seats={g.seats} votes={sent.votes} nameOf={nameOf} avatarOf={avatarOf} />
                      <span className="small">
                        {traitors.length
                          ? `${list(traitors.map(nameOf))} ${traitors.length === 1 ? 'was' : 'were'} evil on this quest.`
                          : 'Every knight on this quest was loyal.'}
                      </span>
                    </>
                  ) : (
                    <span className="small">
                      {rejected} {rejected === 1 ? 'team was' : 'teams were'} rejected, led by {list(q.proposals.map((h) => nameOf(h.leader)))}.
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        </div>

        {(g.lady?.checks.length > 0 || g.assassinTarget) && (
          <div>
            <p className="eyebrow" style={{ marginBottom: 8 }}>
              Secrets
            </p>
            <ul className="record">
              {(g.lady?.checks ?? []).map((c, i) => (
                <li key={i}>
                  <span className="record-text">
                    After quest {NUMERALS[c.quest]}, {named(c.holder)} used the Lady of the Lake on {named(c.target)}
                  </span>
                  <span className={`chip ${c.evil ? 'chip-evil' : 'chip-good'}`}>{c.evil ? 'Evil' : 'Good'}</span>
                </li>
              ))}
              {g.assassinTarget && (
                <li>
                  <span className="record-text">
                    {named(g.assassin)} named {named(g.assassinTarget)}, who was {g.roles[g.assassinTarget] === 'servant' ? 'a Loyal Servant' : roleName(g.assassinTarget)}
                  </span>
                  <span className={`chip ${g.roles[g.assassinTarget] === 'merlin' ? 'chip-evil' : 'chip-good'}`}>
                    {g.roles[g.assassinTarget] === 'merlin' ? 'Hit' : 'Missed'}
                  </span>
                </li>
              )}
            </ul>
          </div>
        )}

        <Scoreboard view={view} nameOf={nameOf} avatarOf={avatarOf} />
      </div>
    </div>
  );
}
