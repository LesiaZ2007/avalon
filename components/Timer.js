'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { TIMED_PHASES } from '@/lib/rules';

const LABELS = { team: 'Time to pick the team', vote: 'Time to vote', assassin: 'Time to name Merlin' };
const clock = (secs) => `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;

/**
 * Counts down the optional timer for the current phase, if the host turned one on. The deadline
 * comes from the server's clock, so every phone shows the same time. When it runs out, whoever
 * the table is waiting on gets a buzz; nothing is played for them.
 */
export default function TimerBadge({ view, waiting = [], tv = false }) {
  const secs = view.settings.timers?.[TIMED_PHASES[view.phase]] ?? 0;
  const startedAt = view.game?.phaseAt;
  // How far this device's clock is from the server's, measured when the view arrived.
  const skew = useMemo(() => view.now - Date.now(), [view.now]);
  const deadline = secs && startedAt ? startedAt + secs * 1000 : null;
  const left = (now) => (deadline ? Math.max(0, Math.ceil((deadline - now - skew) / 1000)) : 0);

  const [remaining, setRemaining] = useState(() => left(Date.now()));
  useEffect(() => {
    if (!deadline) return;
    const update = () => setRemaining(left(Date.now()));
    update();
    const timer = setInterval(update, 250);
    return () => clearInterval(timer);
  }, [deadline, skew]); // eslint-disable-line react-hooks/exhaustive-deps

  // Buzz once when time runs out, if the table is waiting on you.
  const mine = !tv && waiting.includes(view.you);
  const was = useRef(remaining);
  useEffect(() => {
    const ranOut = remaining === 0 && was.current > 0;
    was.current = remaining;
    if (ranOut && mine) {
      try {
        navigator.vibrate?.([200, 100, 200, 100, 200]);
      } catch {}
    }
  }, [remaining, mine]);

  if (!deadline) return null;
  const up = remaining === 0;
  return (
    <div className={`timer ${tv ? 'is-tv' : ''} ${up ? 'is-up' : remaining <= 10 ? 'is-low' : ''}`} role="timer" aria-live={up ? 'assertive' : 'off'}>
      <span className="timer-label">{LABELS[view.phase]}</span>
      <strong className="timer-time">{up ? 'Time’s up' : clock(remaining)}</strong>
      <span className="timer-track" aria-hidden="true">
        <span className="timer-fill" style={{ transform: `scaleX(${remaining / secs})` }} />
      </span>
    </div>
  );
}
