// Reaction icons, in the same line style as the crests and role emblems.

const line = { fill: 'none', stroke: 'currentColor', strokeWidth: 4.5, strokeLinecap: 'round', strokeLinejoin: 'round' };
const fill = { fill: 'currentColor', opacity: 0.18 };
const accent = 'var(--brass-hi)';

const thumb = (
  <>
    <path d="M21 30 L29 12 C31 8 37 9 37 14 V24 H48 C52 24 54 28 53 31 L49 48 C48 51 45 52 42 52 H21 Z" {...fill} />
    <path d="M21 30 L29 12 C31 8 37 9 37 14 V24 H48 C52 24 54 28 53 31 L49 48 C48 51 45 52 42 52 H21 Z" {...line} />
    <path d="M11 30 H21 V52 H11 Z" {...line} stroke={accent} />
  </>
);

const ICONS = {
  up: thumb,
  down: <g transform="matrix(1 0 0 -1 0 64)">{thumb}</g>,
  hmm: (
    <>
      <path d="M22 22 C22 12 42 10 42 22 C42 31 32 31 32 41" {...line} strokeWidth="5" />
      <circle cx="32" cy="52" r="3.6" fill={accent} />
    </>
  ),
  sus: (
    <>
      <circle cx="32" cy="32" r="22" {...fill} />
      <circle cx="32" cy="32" r="22" {...line} />
      <path d="M19 29 H28" {...line} strokeWidth="4" />
      <path d="M36 21 L47 17" {...line} strokeWidth="4" />
      <circle cx="41" cy="29" r="3" fill="currentColor" />
      <path d="M24 43 L40 39" {...line} stroke={accent} strokeWidth="4.5" />
    </>
  ),
  wow: (
    <>
      <circle cx="32" cy="32" r="22" {...fill} />
      <circle cx="32" cy="32" r="22" {...line} />
      <path d="M20 20 L27 23 M44 20 L37 23" {...line} strokeWidth="4" />
      <circle cx="25" cy="29" r="2.6" fill="currentColor" />
      <circle cx="39" cy="29" r="2.6" fill="currentColor" />
      <circle cx="32" cy="42" r="6" fill={accent} />
    </>
  ),
  haha: (
    <>
      <circle cx="32" cy="32" r="22" {...fill} />
      <circle cx="32" cy="32" r="22" {...line} />
      <path d="M20 28 Q24 22 28 28 M36 28 Q40 22 44 28" {...line} strokeWidth="4" />
      <path d="M20 36 H44 C44 45 39 49 32 49 C25 49 20 45 20 36 Z" fill={accent} />
    </>
  ),
};

export const REACTION_NAMES = { up: 'Thumbs up', down: 'Thumbs down', hmm: 'Hmm', sus: 'Suspicious', wow: 'Shocked', haha: 'Laughing' };

export function ReactionIcon({ id, size }) {
  const art = ICONS[id];
  if (!art) return null;
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
      {art}
    </svg>
  );
}
