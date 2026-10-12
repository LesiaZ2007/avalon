'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, clearSeat, loadName, loadSeat, saveName, saveSeat } from '@/lib/client';
import Room from '@/components/Room';

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const code = String(params.code ?? '').toUpperCase();

  const [seat, setSeat] = useState(undefined); // undefined while reading storage, null = not joined
  const [view, setView] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | ok | missing
  const [netError, setNetError] = useState('');
  const [toast, setToast] = useState('');
  const versionRef = useRef(null);

  useEffect(() => setSeat(loadSeat(code)), [code]);

  // Poll for the latest state. Faster while the tab is visible.
  useEffect(() => {
    if (!seat) return;
    let stopped = false;
    let running = false;
    let timer;
    const tick = async () => {
      if (running) return;
      running = true;
      clearTimeout(timer);
      try {
        const data = await api(`/api/room/${code}?v=${versionRef.current ?? ''}`, { token: seat.token });
        if (stopped) return;
        if (!data.unchanged) {
          versionRef.current = data.version;
          setView(data);
          setStatus('ok');
        }
        setNetError('');
      } catch (err) {
        if (stopped) return;
        if (err.status === 403) {
          running = false;
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
      if (!stopped) timer = setTimeout(tick, document.hidden ? 4000 : 1200);
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

  if (seat === null) return <JoinHere code={code} onJoined={setSeat} />;

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

function JoinHere({ code, onJoined }) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => setName(loadName()), []);

  async function join(e) {
    e.preventDefault();
    setError('');
    if (!name.trim()) return setError('Enter your name first.');
    setBusy(true);
    try {
      saveName(name.trim());
      const seat = await api('/api/room', { method: 'POST', body: { action: 'join', code, name } });
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
      <form className="panel" style={{ maxWidth: 440, margin: '8vh auto 0' }} onSubmit={join}>
        <p className="eyebrow">Room {code}</p>
        <h2>Take a seat</h2>
        <div className="field">
          <label htmlFor="join-name">Your name</label>
          <input id="join-name" className="input" value={name} maxLength={20} onChange={(e) => setName(e.target.value)} autoFocus />
        </div>
        <button className="btn btn-primary btn-block" disabled={busy}>
          {busy ? 'Joining…' : 'Join room'}
        </button>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <Link href="/" className="muted small">
          Use a different code
        </Link>
      </form>
    </main>
  );
}
