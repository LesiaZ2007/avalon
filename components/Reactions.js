'use client';

import { useState } from 'react';
import { REACTIONS } from '@/lib/rules';

/** A row of quick reactions. Each one pops up over your seat for everyone at the table. */
export default function ReactionBar({ act }) {
  const [cooling, setCooling] = useState(false);

  function send(emoji) {
    if (cooling) return;
    setCooling(true);
    act({ type: 'react', emoji });
    setTimeout(() => setCooling(false), 900);
  }

  return (
    <div className="reaction-bar" role="group" aria-label="React to the table">
      {REACTIONS.map((emoji) => (
        <button key={emoji} type="button" className="reaction" onClick={() => send(emoji)} disabled={cooling}>
          <span aria-hidden="true">{emoji}</span>
          <span className="sr-only">React with {emoji}</span>
        </button>
      ))}
    </div>
  );
}
