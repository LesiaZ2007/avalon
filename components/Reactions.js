'use client';

import { useState } from 'react';
import { REACTIONS } from '@/lib/rules';
import { REACTION_NAMES, ReactionIcon } from './reactionIcons';

/** A row of quick reactions. Each one pops up over your seat for everyone at the table. */
export default function ReactionBar({ act }) {
  const [cooling, setCooling] = useState(false);

  function send(icon) {
    if (cooling) return;
    setCooling(true);
    act({ type: 'react', icon });
    setTimeout(() => setCooling(false), 900);
  }

  return (
    <div className="reaction-bar" role="group" aria-label="React to the table">
      {REACTIONS.map((icon) => (
        <button key={icon} type="button" className="reaction" onClick={() => send(icon)} disabled={cooling} aria-label={REACTION_NAMES[icon]} title={REACTION_NAMES[icon]}>
          <ReactionIcon id={icon} />
        </button>
      ))}
    </div>
  );
}
