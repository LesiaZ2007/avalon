'use client';

import { useEffect, useMemo, useState } from 'react';
import { Grail, RoleEmblem } from './art';

// How long the whole effect runs, in ms. The longest piece of it ends just before this.
const LENGTH = 5600;

/**
 * The side whose win is being celebrated right now ('good' or 'evil'), or null. It plays once per
 * game, only on a screen that watched the game end (a reload or a late arrival doesn't replay
 * it), and waits while `hold` is true: the final vote or quest reveal plays out first.
 */
export function useCelebration(view, hold, { tv = false } = {}) {
  const [playing, setPlaying] = useState(null);
  const g = view?.game;
  const over = view?.phase === 'over';
  const key = view ? `avalon:${tv ? 'tv-fx' : 'fx'}:${view.code}` : null;

  useEffect(() => {
    if (!g?.id || !key) return;
    let seen = null;
    try {
      seen = sessionStorage.getItem(key);
    } catch {}
    if (!over) {
      // This screen is watching the game being played, so it gets the ending.
      try {
        if (seen !== g.id) sessionStorage.setItem(key, g.id);
      } catch {}
      return;
    }
    if (seen !== g.id || hold || !g.winner) return;
    // A short beat first, which also lets a reveal that arrives with the ending claim the screen.
    const t = setTimeout(() => {
      try {
        sessionStorage.setItem(key, `${g.id}:done`);
      } catch {}
      setPlaying(g.winner);
      if (!tv) navigator.vibrate?.(g.winner === 'evil' ? [90, 60, 220] : [40, 50, 40, 50, 90]);
    }, 700);
    return () => clearTimeout(t);
  }, [g?.id, g?.winner, over, hold, key, tv]);

  useEffect(() => {
    if (!playing) return;
    const t = setTimeout(() => setPlaying(null), LENGTH);
    return () => clearTimeout(t);
  }, [playing]);

  return playing;
}

const rand = (min, max) => min + Math.random() * (max - min);

/**
 * The end of a game, over the whole screen and never in the way of a tap. Good: a flash of light,
 * rings and falling confetti. Evil: the screen floods red, two blades slash across it, the table
 * shakes and embers rise. Every screen plays the same one, so it reveals nothing the table can't see.
 */
export default function Celebration({ side }) {
  const bits = useMemo(
    () =>
      side
        ? Array.from({ length: side === 'good' ? 90 : 50 }, () => ({
            '--x': `${rand(-2, 100).toFixed(1)}%`,
            '--sway': `${rand(-18, 18).toFixed(1)}vw`,
            '--spin': `${Math.round(rand(-900, 900))}deg`,
            '--size': `${rand(side === 'good' ? 7 : 3, side === 'good' ? 12 : 8).toFixed(1)}px`,
            '--dur': `${rand(2.6, 4.2).toFixed(2)}s`,
            '--delay': `${rand(0, side === 'good' ? 1 : 1.4).toFixed(2)}s`,
          }))
        : [],
    [side]
  );
  if (!side) return null;

  return (
    <div className={`fx is-${side}`} aria-hidden="true">
      <div className="fx-wash" />
      {side === 'good' ? (
        <>
          <span className="fx-ring" />
          <span className="fx-ring is-late" />
        </>
      ) : (
        <>
          <span className="fx-slash" />
          <span className="fx-slash is-late" />
        </>
      )}
      <div className="fx-bits">
        {bits.map((style, i) => (
          <span key={i} className="fx-bit" style={style}>
            <i />
          </span>
        ))}
      </div>
      <div className="fx-title">
        <div className="fx-art">{side === 'good' ? <Grail size={96} /> : <RoleEmblem role="mordred" size={96} />}</div>
        <p>{side === 'good' ? 'Arthur prevails' : 'Mordred prevails'}</p>
      </div>
    </div>
  );
}
