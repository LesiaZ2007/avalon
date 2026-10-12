'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, clearSeat, loadAvatar, loadName, loadSeat, saveName, saveSeat } from '@/lib/client';
import Room from '@/components/Room';

/**
 * How long to wait before the next poll. Fast while things are happening, slower during long
 * discussions and in the lobby, slowest in a background tab. Every poll costs a Redis read.
 */
function pollDelay(idle, phase) {
  if (typeof document !== 'undefined' && document.hidden) return 8000;
  if (phase === 'lobby') return idle >= 6 ? 4000 : 2500;
  if (idle >= 12) return 3000;
  if (idle >= 4) return 2200;
  return 1500;
}

/** Update online flags from a poll that had nothing else new. Same object if nothing changed. */
function withOnline(view, online) {
  if (!view) return view;
  if (view.players.every((p) => online[p.id] === undefined || online[p.id] === p.online)) return view;
  return { ...view, players: view.players.map((p) => (online[p.id] === undefined ? p : { ...p, online: online[p.id] })) };
}

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const code = String(params.code ?? '').toUpperCase();

  const [seat, setSeat] = useState(undefined); // undefined while reading storage, null = not joined
  const [view, setView] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | ok | missing
  const [netError, setNetError] = useState('');
  const [toast, setToast] = useState('');
  const [removed, setRemoved] = useState(false);
  const versionRef = useRef(null);
  const phaseRef = useRef('lobby');
  useEffect(() => {
    if (view) phaseRef.current = view.phase;
  }, [view]);

  useEffect(() => setSeat(loadSeat(code)), [code]);

  // Poll for the latest state. Faster while the tab is visible.
  useEffect(() => {
    if (!seat) return;
    let stopped = false;
    let running = false;
    let timer;
    let idle = 0; // polls in a row with nothing new
    const tick = async () => {
      if (running) return;
      running = true;
      clearTimeout(timer);
      try {
        const data = await api(`/api/room/${code}?v=${versionRef.current ?? ''}`, { token: seat.token });
        if (stopped) return;
        if (!data.unchanged) {
          idle = 0;
          versionRef.current = data.version;
          setView(data);
          setStatus('ok');
        } else {
          idle += 1;
          if (data.online) setView((v) => withOnline(v, data.online));
        }
        setNetError('');
      } catch (err) {
        if (stopped) return;
        if (err.status === 403) {
          running = false;
          setRemoved(true);
          clearSeat(code);
          versionRef.current = null;
          setView(null);
          setSeat(null);
          return;
        }
        if (err.status === 404) {
          setStatus('missing');
          return;
        }
        setNetError(err.message || 'Lost connection. Retrying…');
      }
      running = false;
      if (!stopped) timer = setTimeout(tick, pollDelay(idle, phaseRef.current));
    };
    const onVisible = () => !document.hidden && tick();
    document.addEventListener('visibilitychange', onVisible);
    tick();
    return () => {
      stopped = true;
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [seat, code]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const act = useCallback(
    async (action) => {
      try {
        const data = await api(`/api/room/${code}`, { method: 'POST', token: seat.token, body: action });
        if (data.left) {
          clearSeat(code);
          router.push('/');
          return true;
        }
        versionRef.current = data.version;
        setView(data);
        return true;
      } catch (err) {
        setToast(err.message);
        return false;
      }
    },
    [code, seat, router]
  );

  if (status === 'missing') {
    return (
      <main className="shell">
        <div className="panel" style={{ maxWidth: 480, margin: '10vh auto 0' }}>
          <h2>Room {code} not found</h2>
          <p className="muted">The code may be mistyped, or the room expired after 12 quiet hours.</p>
          <Link className="btn btn-primary" href="/">
            Back to start
          </Link>
        </div>
      </main>
    );
  }

  if (seat === null)
    return (
      <JoinHere
        code={code}
        notice={removed ? 'You’re no longer in this room. The host may have removed you; you can rejoin while they’re in the lobby.' : ''}
        onJoined={(s) => {
          setRemoved(false);
          setSeat(s);
        }}
      />
    );

  if (!view) {
    return (
      <main className="shell">
        <p className="muted" style={{ textAlign: 'center', marginTop: '20vh' }}>
          {netError || `Entering room ${code}…`}
        </p>
      </main>
    );
  }

  return (
    <>
      <Room view={view} act={act} netError={netError} />
      {toast && (
        <div className="toast" role="alert">
          {toast}
        </div>
      )}
    </>
  );
}

function JoinHere({ code, notice, onJoined }) {
  const [name, setName] = useState('');
  const [rejoin, setRejoin] = useState('');
  const [mode, setMode] = useState('join'); // join | rejoin
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => setName(loadName()), []);

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (mode === 'join' && !name.trim()) return setError('Enter your name first.');
    if (mode === 'rejoin' && rejoin.length !== 6) return setError('Rejoin codes are 6 letters.');
    setBusy(true);
    try {
      if (mode === 'join') saveName(name.trim());
      const body = mode === 'join' ? { action: 'join', code, name, avatar: loadAvatar() } : { action: 'rejoin', code, rejoinCode: rejoin };
      const seat = await api('/api/room', { method: 'POST', body });
      const s = { playerId: seat.playerId, token: seat.token };
      saveSeat(code, s);
      onJoined(s);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <main className="shell">
      <form className="panel" style={{ maxWidth: 440, margin: '8vh auto 0' }} onSubmit={submit}>
        <p className="eyebrow">Room {code}</p>
        {notice && <p className="banner">{notice}</p>}
        <div className="pills" role="tablist" aria-label="How are you joining?">
          <button type="button" role="tab" className="pill" aria-pressed={mode === 'join'} aria-selected={mode === 'join'} onClick={() => setMode('join')}>
            New player
          </button>
          <button type="button" role="tab" className="pill" aria-pressed={mode === 'rejoin'} aria-selected={mode === 'rejoin'} onClick={() => setMode('rejoin')}>
            Back on a new device
          </button>
        </div>
        {mode === 'join' ? (
          <>
            <h2>Take a seat</h2>
            <div className="field">
              <label htmlFor="join-name">Your name</label>
              <input id="join-name" className="input" value={name} maxLength={20} onChange={(e) => setName(e.target.value)} autoFocus />
            </div>
          </>
        ) : (
          <>
            <h2>Return to your seat</h2>
            <p className="muted small">Ask the host (or anyone at the table, if you&rsquo;ve been gone a minute) to tap your seat and make a rejoin code.</p>
            <div className="field">
              <label htmlFor="rejoin-code">Rejoin code</label>
              <input
                id="rejoin-code"
                className="input input-code"
                value={rejoin}
                maxLength={6}
                autoCapitalize="characters"
                autoComplete="off"
                placeholder="ABCDEF"
                onChange={(e) => setRejoin(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))}
                autoFocus
              />
            </div>
          </>
        )}
        <button className="btn btn-primary btn-block" disabled={busy}>
          {busy ? 'One moment…' : mode === 'join' ? 'Join room' : 'Rejoin'}
        </button>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <Link href={`/tv/${code}`} className="tv-link">
          Just watching? Show this table on a TV
        </Link>
        <Link href="/" className="muted small">
          Use a different code
        </Link>
      </form>
    </main>
  );
}
