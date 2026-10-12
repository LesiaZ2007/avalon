'use client';

import { useEffect, useRef, useState } from 'react';
import { ApproveMark, Check, Crown, LadyDrop, RejectMark, ShieldMark } from './art';
import Avatar from './Avatar';
import { ReactionIcon } from './reactionIcons';

/**
 * Move one seat to slot `to` around the circle, shifting only the seats along the shorter way
 * round, so everyone else stays exactly where they are.
 */
export function moveSeat(seats, id, to) {
  const n = seats.length;
  const from = seats.indexOf(id);
  if (from < 0 || from === to) return seats;
  const next = [...seats];
  const steps = (to - from + n) % n;
  const dir = steps <= n / 2 ? 1 : -1;
  for (let j = from; j !== to; j = (j + dir + n) % n) next[j] = seats[(j + dir + n) % n];
  next[to] = id;
  return next;
}

/**
 * Players seated clockwise around a round table, starting at the top.
 * `info(id)` describes a seat: { leader, lady, team, picked, done, vote, note, ring, tag, tagKind, muted }.
 * Seats call `onPick` while choosing (team, Lady, Assassin), and otherwise `onInspect` for the
 * seats `canInspect` allows. With `onArrange`, the seats can be moved instead: drag one to a new
 * place, tap one and then another's seat, or use the arrow keys. `onArrange` gets the new order.
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
  onArrange,
}) {
  const n = seats.length;
  const wrapRef = useRef(null);
  const drag = useRef(null);
  const [held, setHeld] = useState(null); // { id, x, y } while a seat is being dragged
  const [lifted, setLifted] = useState(null); // a seat tapped to move, waiting for its new place
  const arrangeable = Boolean(onArrange);
  useEffect(() => {
    if (!arrangeable) setLifted(null);
  }, [arrangeable]);

  // The slot nearest a point on the table, by its angle from the centre (0 is the top, clockwise).
  const slotAt = (x, y) => {
    const turn = (Math.atan2(x - 50, 50 - y) / (Math.PI * 2) + 1) % 1;
    return Math.round(turn * n) % n;
  };
  const pointAt = (e) => {
    const r = wrapRef.current.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 };
  };
  const arrangeHandlers = (id) => ({
    onPointerDown: (e) => {
      if (e.button > 0) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      drag.current = { id, pointer: e.pointerId, sx: e.clientX, sy: e.clientY, moved: false, start: seats };
    },
    onPointerMove: (e) => {
      const d = drag.current;
      if (!d || d.pointer !== e.pointerId) return;
      if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 8) return;
      d.moved = true;
      const p = pointAt(e);
      setHeld({ id, ...p });
      setLifted(null);
      // Over the middle of the table the direction is meaningless, so the seats wait. Each move
      // is worked out from the order at pickup, so passing other seats on the way doesn't
      // shuffle them.
      if (Math.hypot(p.x - 50, p.y - 50) < 20) return;
      const next = moveSeat(d.start, id, slotAt(p.x, p.y));
      if (next.join() !== seats.join()) onArrange(next);
    },
    onPointerUp: (e) => {
      const d = drag.current;
      if (!d || d.pointer !== e.pointerId) return;
      drag.current = null;
      setHeld(null);
      if (d.moved) return;
      // A tap: lift this seat, or put the lifted one down here.
      if (!lifted || lifted === id) setLifted(lifted === id ? null : id);
      else {
        onArrange(moveSeat(seats, lifted, seats.indexOf(id)));
        setLifted(null);
      }
    },
    onPointerCancel: () => {
      drag.current = null;
      setHeld(null);
    },
    onKeyDown: (e) => {
      const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      if (!step) return;
      e.preventDefault();
      onArrange(moveSeat(seats, id, (seats.indexOf(id) + step + n) % n));
    },
  });
  const radius = n <= 6 ? 37 : n <= 10 ? 39.5 : 41;
  // Bigger tables get smaller seats so 15 players still fit around the rim.
  const sizing =
    n > 12
      ? { '--seat-w': '15cqw', '--avatar-w': '8.6cqw', '--avatar-min': '34px' }
      : n > 10
      ? { '--seat-w': '16.5cqw', '--avatar-w': '9.4cqw', '--avatar-min': '38px' }
      : undefined;

  return (
    <div ref={wrapRef} className={`table-wrap ${onArrange ? 'is-arranging' : ''}`} data-count={n} style={sizing}>
      <div className="table-top">
        <div className="table-center">{center}</div>
      </div>
      {seats.map((id, i) => {
        const angle = (i / Math.max(n, 1)) * Math.PI * 2;
        const x = 50 + radius * Math.sin(angle);
        const y = 50 - radius * Math.cos(angle);
        const s = info(id);
        const arranging = Boolean(onArrange);
        const picking = !arranging && Boolean(onPick);
        const pickable = picking && canPick(id);
        const clickable = arranging || pickable || (!picking && onInspect && canInspect(id));
        const name = nameOf(id);
        const reaction = reactions[id];
        const label = arranging
          ? `Move ${name}, seat ${i + 1} of ${n}`
          : pickable
          ? `${s.picked ? 'Remove' : 'Choose'} ${name}`
          : clickable
          ? inspectLabel(name, id)
          : name;
        const dragging = arranging && held?.id === id;
        return (
          <button
            key={id}
            type="button"
            disabled={!clickable}
            className={[
              'seat-node',
              pickable && 'is-pickable',
              (s.picked || dragging || (arranging && lifted === id)) && 'is-picked',
              dragging && 'is-dragging',
              s.team && 'is-team',
              s.muted && 'is-muted',
              s.away && 'is-away',
              id === you && 'is-you',
            ]
              .filter(Boolean)
              .join(' ')}
            style={{ left: `${dragging ? held.x : x}%`, top: `${dragging ? held.y : y}%`, '--i': i }}
            onClick={arranging ? undefined : pickable ? () => onPick(id) : clickable ? () => onInspect(id) : undefined}
            {...(arranging ? arrangeHandlers(id) : {})}
            aria-pressed={pickable ? !!s.picked : arranging ? lifted === id : undefined}
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
