// Hand-drawn SVG artwork: role emblems, quest pieces, vote tokens and the Avalon landscape.

const line = { fill: 'none', stroke: 'currentColor', strokeWidth: 2.5, strokeLinecap: 'round', strokeLinejoin: 'round' };

function Merlin() {
  return (
    <>
      <path d="M17 50 C24 38 27 22 35 8 C37 16 41 34 47 50 Z" fill="currentColor" opacity="0.18" />
      <path d="M17 50 C24 38 27 22 35 8 C37 16 41 34 47 50" {...line} />
      <ellipse cx="32" cy="51" rx="21" ry="4.5" {...line} />
      <path d="M27 34 l1.6 3.4 3.4 1.6 -3.4 1.6 -1.6 3.4 -1.6 -3.4 -3.4 -1.6 3.4 -1.6z" fill="var(--brass)" />
      <path d="M37 23 l1.1 2.4 2.4 1.1 -2.4 1.1 -1.1 2.4 -1.1 -2.4 -2.4 -1.1 2.4 -1.1z" fill="var(--brass)" />
      <circle cx="50" cy="14" r="1.6" fill="var(--brass)" />
      <circle cx="14" cy="22" r="1.2" fill="var(--brass)" />
    </>
  );
}

function Percival() {
  return (
    <>
      <path d="M32 7 L51 13 V29 C51 42 43 51 32 57 C21 51 13 42 13 29 V13 Z" fill="currentColor" opacity="0.18" />
      <path d="M32 7 L51 13 V29 C51 42 43 51 32 57 C21 51 13 42 13 29 V13 Z" {...line} />
      <path d="M32 16 V48 M20 28 H44" {...line} stroke="var(--brass)" strokeWidth="4" />
    </>
  );
}

function Servant() {
  return (
    <>
      <path d="M32 6 L36 12 V40 H28 V12 Z" fill="currentColor" opacity="0.18" />
      <path d="M32 6 L36 12 V40 H28 V12 Z" {...line} />
      <path d="M32 14 V38" {...line} strokeWidth="1.2" opacity="0.6" />
      <path d="M19 41 H45" {...line} stroke="var(--brass)" strokeWidth="4" />
      <path d="M32 43 V51" {...line} strokeWidth="4" />
      <circle cx="32" cy="55" r="3.5" fill="var(--brass)" />
    </>
  );
}

function Assassin() {
  return (
    <>
      <path d="M46 10 L50 14 L27 37 L23 33 Z" fill="currentColor" opacity="0.18" />
      <path d="M46 10 L50 14 L27 37 L23 33 Z" {...line} />
      <path d="M19 30 L30 41" {...line} strokeWidth="4" />
      <path d="M22 40 L15 47" {...line} strokeWidth="4" />
      <circle cx="13" cy="49" r="3" fill="currentColor" />
      <path d="M44 42 C44 46 47 48 47 51 A3 3 0 0 1 41 51 C41 48 44 46 44 42 Z" fill="var(--evil)" />
    </>
  );
}

function Morgana() {
  return (
    <>
      <path d="M40 8 A24 24 0 1 0 40 56 A19 19 0 1 1 40 8 Z" fill="currentColor" opacity="0.18" />
      <path d="M40 8 A24 24 0 1 0 40 56 A19 19 0 1 1 40 8 Z" {...line} />
      <path d="M44 24 l1.4 3 3 1.4 -3 1.4 -1.4 3 -1.4 -3 -3 -1.4 3 -1.4z" fill="var(--evil)" />
      <circle cx="50" cy="40" r="1.6" fill="var(--evil)" />
    </>
  );
}

function Mordred() {
  return (
    <>
      <path d="M12 44 L14 18 L23 30 L32 12 L41 30 L50 18 L52 44 Z" fill="currentColor" opacity="0.18" />
      <path d="M12 44 L14 18 L23 30 L32 12 L41 30 L50 18 L52 44 Z" {...line} />
      <path d="M12 50 H52" {...line} strokeWidth="4" />
      <path d="M32 33 l3 4 -3 4 -3 -4z" fill="var(--evil)" />
    </>
  );
}

function Oberon() {
  return (
    <>
      <path d="M8 32 C16 20 24 16 32 16 C40 16 48 20 56 32 C48 44 40 48 32 48 C24 48 16 44 8 32 Z" fill="currentColor" opacity="0.18" />
      <path d="M8 32 C16 20 24 16 32 16 C40 16 48 20 56 32 C48 44 40 48 32 48 C24 48 16 44 8 32 Z" {...line} />
      <circle cx="32" cy="32" r="7" fill="var(--evil)" />
      <path d="M12 52 L52 12" {...line} strokeWidth="3" />
    </>
  );
}

function Minion() {
  return (
    <>
      <path d="M32 8 C18 8 14 24 14 36 C14 46 10 52 8 56 H56 C54 52 50 46 50 36 C50 24 46 8 32 8 Z" fill="currentColor" opacity="0.18" />
      <path d="M32 8 C18 8 14 24 14 36 C14 46 10 52 8 56 H56 C54 52 50 46 50 36 C50 24 46 8 32 8 Z" {...line} />
      <path d="M22 40 C22 28 26 22 32 22 C38 22 42 28 42 40 Z" fill="var(--bg)" />
      <circle cx="28" cy="33" r="1.8" fill="var(--evil)" />
      <circle cx="36" cy="33" r="1.8" fill="var(--evil)" />
    </>
  );
}

const EMBLEMS = { merlin: Merlin, percival: Percival, servant: Servant, assassin: Assassin, morgana: Morgana, mordred: Mordred, oberon: Oberon, minion: Minion };

export function RoleEmblem({ role, size = 96 }) {
  const Emblem = EMBLEMS[role] ?? Servant;
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
      <Emblem />
    </svg>
  );
}

export function Grail({ size = 40 }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
      <path d="M18 10 H46 C46 28 40 36 32 36 C24 36 18 28 18 10 Z" fill="currentColor" opacity="0.25" />
      <path d="M18 10 H46 C46 28 40 36 32 36 C24 36 18 28 18 10 Z" {...line} />
      <path d="M32 36 V48 M22 54 C22 50 26 48 32 48 C38 48 42 50 42 54 Z" {...line} />
      <path d="M24 18 H40" {...line} strokeWidth="1.5" opacity="0.6" />
    </svg>
  );
}

export function BrokenBlade({ size = 40 }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
      <path d="M30 34 L26 8 L34 8 L35 18 L31 22 L36 26 Z" fill="currentColor" opacity="0.25" />
      <path d="M30 34 L26 8 L34 8 L35 18 L31 22 L36 26 Z" {...line} />
      <path d="M41 38 L37 30 M34 46 L40 54" {...line} />
      <path d="M20 40 H46" {...line} strokeWidth="4" />
      <path d="M33 42 V54" {...line} strokeWidth="4" />
    </svg>
  );
}

export function ApproveMark({ size = 40 }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
      <path d="M18 34 L28 44 L47 21" {...line} strokeWidth="5" />
    </svg>
  );
}

export function RejectMark({ size = 40 }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
      <path d="M20 20 L44 44 M44 20 L20 44" {...line} strokeWidth="5" />
    </svg>
  );
}

export function Crown({ size = 14 }) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} aria-hidden="true">
      <path fill="currentColor" d="M1 4.5l3.5 3L8 2l3.5 5.5L15 4.5l-1.5 8.5h-11z" />
    </svg>
  );
}

export function LadyDrop({ size = 14 }) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} aria-hidden="true">
      <path fill="currentColor" d="M8 1C6 5 3 7.5 3 10.5a5 5 0 0010 0C13 7.5 10 5 8 1z" />
    </svg>
  );
}

export function ShieldMark({ size = 14 }) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} aria-hidden="true">
      <path fill="currentColor" d="M8 1l6 2v4.5C14 11 11.5 13.6 8 15 4.5 13.6 2 11 2 7.5V3z" />
    </svg>
  );
}

export function Check({ size = 12 }) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} aria-hidden="true">
      <path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** The Isle of Avalon over a misty lake. Fixed behind every page. */
/**
 * The backdrop. Its layers are grouped by depth so they can drift with the mouse (Parallax.js);
 * shapes that reach the sides run past the frame so a drifting layer never shows an edge.
 * The printed looks hide the night scene and show their own two pattern layers instead.
 */
export function Landscape() {
  return (
    <div className="landscape" aria-hidden="true">
      <div className="print-layer print-far" />
      <div className="print-layer print-near" />
      <svg viewBox="0 0 1440 640" preserveAspectRatio="xMidYMax slice">
        <defs>
          <radialGradient id="moonGlow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#f1ead0" stopOpacity="0.35" />
            <stop offset="1" stopColor="#f1ead0" stopOpacity="0" />
          </radialGradient>
          <filter id="mist" x="-20%" y="-200%" width="140%" height="500%">
            <feGaussianBlur stdDeviation="14" />
          </filter>
        </defs>

        <g className="depth depth-sky">
          <circle cx="1110" cy="170" r="190" fill="url(#moonGlow)" />
        <circle cx="1110" cy="170" r="44" fill="#ece5c9" />
        <circle cx="1096" cy="160" r="8" fill="#d9d1b2" opacity="0.6" />
        <circle cx="1124" cy="186" r="5" fill="#d9d1b2" opacity="0.5" />

        <g fill="#e6e0c8">
          <circle cx="180" cy="90" r="1.4" />
          <circle cx="320" cy="160" r="1" />
          <circle cx="470" cy="70" r="1.2" />
          <circle cx="640" cy="130" r="0.9" />
          <circle cx="860" cy="60" r="1.3" />
          <circle cx="1300" cy="80" r="1.1" />
          <circle cx="1380" cy="210" r="0.9" />
          <circle cx="90" cy="230" r="0.9" />
          <circle cx="980" cy="250" r="0.8" />
        </g>
        </g>

        <g className="depth depth-far">
          <path d="M-90 432 C-40 424 -10 434 0 430 C180 392 340 410 520 398 C700 386 840 418 1010 402 C1190 386 1320 410 1440 398 C1480 394 1510 400 1530 398 V700 H-90 Z" fill="#132a2e" />
          <path d="M-90 454 C-50 452 -20 454 0 452 C160 440 300 452 460 446 C640 440 760 456 940 450 C1120 444 1300 456 1440 448 C1480 446 1510 448 1530 448 V700 H-90 Z" fill="#102226" />
        </g>

        {/* The Tor with its tower */}
        <g className="depth depth-tor">
        <path d="M540 456 C620 448 662 372 724 338 C756 320 790 322 822 344 C872 380 916 446 1000 456 Z" fill="#0d1c1f" />
        <path d="M762 334 V276 H790 V340" fill="#0d1c1f" />
        <path d="M757 278 L776 248 L795 278 Z" fill="#0d1c1f" />
        <rect x="773" y="292" width="6" height="10" rx="3" fill="#d3ab57" />
        </g>

        <g className="depth depth-lake">
        <rect x="-90" y="456" width="1620" height="244" fill="#112326" />
        <g fill="#ece5c9">
          <rect x="1078" y="476" width="64" height="2" opacity="0.35" />
          <rect x="1090" y="494" width="40" height="2" opacity="0.28" />
          <rect x="1070" y="514" width="80" height="2" opacity="0.18" />
          <rect x="1098" y="536" width="26" height="2" opacity="0.2" />
          <rect x="1084" y="562" width="52" height="2" opacity="0.12" />
        </g>
        <path d="M766 470 H786 M760 486 H792" stroke="#d3ab57" strokeOpacity="0.25" strokeWidth="2" />
        <path d="M600 460 C680 470 700 474 776 470 C860 466 900 470 960 462" stroke="#0d1c1f" strokeWidth="6" fill="none" opacity="0.5" />
        </g>

        <g className="depth depth-mist">
        <g className="mist" filter="url(#mist)" fill="#a7bdb8">
          <ellipse cx="380" cy="450" rx="340" ry="14" opacity="0.16" />
          <ellipse cx="1000" cy="462" rx="420" ry="16" opacity="0.13" />
        </g>
        <g className="mist mist-2" filter="url(#mist)" fill="#a7bdb8">
          <ellipse cx="720" cy="500" rx="520" ry="12" opacity="0.1" />
          <ellipse cx="200" cy="530" rx="260" ry="10" opacity="0.08" />
        </g>
        </g>

        <g className="depth depth-reeds" stroke="#08100f" strokeWidth="3" strokeLinecap="round" fill="none">
          <path d="M40 640 C44 590 46 560 58 520" />
          <path d="M62 640 C62 600 70 580 84 548" />
          <path d="M80 640 C78 610 74 590 66 566" />
          <path d="M1370 640 C1372 600 1380 580 1392 540" />
          <path d="M1392 640 C1390 610 1386 590 1376 560" />
          <path d="M1408 640 C1410 606 1414 590 1422 570" />
        </g>
      </svg>
    </div>
  );
}
