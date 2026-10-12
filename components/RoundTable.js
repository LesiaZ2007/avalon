'use client';

import { ApproveMark, Check, Crown, LadyDrop, RejectMark, ShieldMark } from './art';
import Avatar from './Avatar';
import { ReactionIcon } from './reactionIcons';

/**
 * Players seated clockwise around a round table, starting at the top.
 * `info(id)` describes a seat: { leader, lady, team, picked, done, vote, note, ring, tag, tagKind, muted }.
 * Seats call `onPick` while choosing (team, Lady, Assassin), and otherwise `onInspect` for the
 * seats `canInspect` allows.
 */
export default function RoundTable({
  seats,
  nameOf,
  avatarOf = () => null,
  you,
  info = () => ({}),
  center,
  onPick,
  canPick = () => false,
  onInspect,
  canInspect = () => true,
  inspectLabel = (name) => `${name}: details`,
  reactions = {},
}) {
  const n = seats.length;
  const radius = n <= 6 ? 37 : n <= 10 ? 39.5 : 41;
  // Bigger tables get smaller seats so 15 players still fit around the rim.
  const sizing =
    n > 12
      ? { '--seat-w': '15cqw', '--avatar-w': '8.6cqw', '--avatar-min': '34px' }
      : n > 10
      ? { '--seat-w': '16.5cqw', '--avatar-w': '9.4cqw', '--avatar-min': '38px' }
      : undefined;

  return (
    <div className="table-wrap" data-count={n} style={sizing}>
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
        const clickable = pickable || (!picking && onInspect && canInspect(id));
        const name = nameOf(id);
        const reaction = reactions[id];
        const label = pickable ? `${s.picked ? 'Remove' : 'Choose'} ${name}` : clickable ? inspectLabel(name, id) : name;
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
              s.away && 'is-away',
              id === you && 'is-you',
            ]
              .filter(Boolean)
              .join(' ')}
            style={{ left: `${x}%`, top: `${y}%`, '--i': i }}
            onClick={pickable ? () => onPick(id) : clickable ? () => onInspect(id) : undefined}
            aria-pressed={pickable ? !!s.picked : undefined}
            aria-label={label}
          >
            <Avatar avatar={avatarOf(id)} name={name} className={s.ring ? `ring-${s.ring}` : ''}>
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
            </Avatar>
            {reaction && (
              <span key={reaction.n} className="bubble" aria-hidden="true">
                <ReactionIcon id={reaction.icon} />
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
            {s.tag ? (
              <span className={`seat-tag tag-${s.tagKind || 'plain'}`}>{s.tag}</span>
            ) : (
              s.away && <span className="seat-tag tag-plain">away</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
