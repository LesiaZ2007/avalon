'use client';

import { ApproveMark, Check, Crown, LadyDrop, RejectMark, ShieldMark } from './art';

// Muted heraldic tints, so seats are easy to tell apart without suggesting a team colour.
const TINTS = ['#3e5b6b', '#5b4b6f', '#4f6348', '#6c5a3d', '#3e5f5a', '#6a4b57', '#4a5678', '#5e6440', '#55606c', '#6f5147'];

export const initials = (name) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

export const tintFor = (index) => TINTS[index % TINTS.length];

/**
 * Players seated clockwise around a round table, starting at the top.
 * `info(id)` describes a seat: { leader, lady, team, picked, done, vote, note, ring, tag, tagKind, muted }.
 * Seats call `onPick` while choosing (team, Lady, Assassin) and `onInspect` otherwise.
 */
export default function RoundTable({ seats, nameOf, you, info = () => ({}), center, onPick, canPick = () => false, onInspect, reactions = {} }) {
  const n = seats.length;
  const radius = n <= 6 ? 37 : 39.5;

  return (
    <div className="table-wrap" data-count={n}>
      <div className="table-top">
        <div className="table-center">{center}</div>
      </div>
      {seats.map((id, i) => {
        const angle = (i / Math.max(n, 1)) * Math.PI * 2;
        const x = 50 + radius * Math.sin(angle);
        const y = 50 - radius * Math.cos(angle);
        const s = info(id);
        const picking = Boolean(onPick);
        const pickable = picking && canPick(id);
        const clickable = pickable || (!picking && onInspect);
        const name = nameOf(id);
        const reaction = reactions[id];
        const label = pickable ? `${s.picked ? 'Remove' : 'Choose'} ${name}` : `${name}: details`;
        return (
          <button
            key={id}
            type="button"
            disabled={!clickable}
            className={[
              'seat-node',
              pickable && 'is-pickable',
              s.picked && 'is-picked',
              s.team && 'is-team',
              s.muted && 'is-muted',
              id === you && 'is-you',
            ]
              .filter(Boolean)
              .join(' ')}
            style={{ left: `${x}%`, top: `${y}%`, '--i': i }}
            onClick={pickable ? () => onPick(id) : clickable ? () => onInspect(id) : undefined}
            aria-pressed={pickable ? !!s.picked : undefined}
            aria-label={label}
          >
            <span className={`avatar ${s.ring ? `ring-${s.ring}` : ''}`} style={{ '--tint': tintFor(i) }}>
              {initials(name)}
              {s.leader && (
                <span className="badge-icon badge-leader" title="Leader">
                  <Crown size={20} />
                </span>
              )}
              {s.lady && (
                <span className="badge-icon badge-lady" title="Lady of the Lake">
                  <LadyDrop size={13} />
                </span>
              )}
              {(s.team || s.picked) && (
                <span className="badge-icon badge-team" title="On the quest">
                  <ShieldMark size={13} />
                </span>
              )}
              {s.done && (
                <span className="badge-icon badge-done" title="Done">
                  <Check size={12} />
                </span>
              )}
              {s.vote !== undefined && s.vote !== null && (
                <span className={`badge-icon badge-vote ${s.vote ? 'is-approve' : 'is-reject'}`} title={s.vote ? 'Approved' : 'Rejected'}>
                  {s.vote ? <ApproveMark size={16} /> : <RejectMark size={16} />}
                </span>
              )}
            </span>
            {reaction && (
              <span key={reaction.n} className="bubble" aria-hidden="true">
                {reaction.emoji}
              </span>
            )}
            <span className="seat-name">
              {s.note && (
                <span className={`note-dot is-${s.note}`} title={s.note === 'trust' ? 'You trust them' : 'You suspect them'}>
                  {s.note === 'trust' ? '✓' : '?'}
                </span>
              )}
              {name}
              {id === you && <span className="seat-you"> (you)</span>}
            </span>
            {s.tag && <span className={`seat-tag tag-${s.tagKind || 'plain'}`}>{s.tag}</span>}
          </button>
        );
      })}
    </div>
  );
}
