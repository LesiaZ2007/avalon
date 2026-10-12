'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, loadAvatar, loadName, saveAvatar, saveName, saveSeat } from '@/lib/client';
import Avatar, { AvatarPicker } from '@/components/Avatar';
import Fan from '@/components/Fan';
import Tutorial from '@/components/Tutorial';
import InstallButton from '@/components/InstallButton';

const CAST = ['merlin', 'percival', 'servant', 'assassin', 'morgana', 'mordred', 'oberon'];

export default function Home() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [avatar, setAvatar] = useState(null);
  const [picking, setPicking] = useState(false);
  const [learning, setLearning] = useState(false);

  useEffect(() => {
    setName(loadName());
    setAvatar(loadAvatar() ?? { icon: null, tint: Math.floor(Math.random() * 10) });
  }, []);
  const chooseAvatar = (next) => {
    setAvatar(next);
    saveAvatar(next);
  };

  async function enter(action) {
    setError('');
    if (!name.trim()) return setError('Enter your name first.');
    if (action === 'join' && code.length !== 4) return setError('Room codes are 4 letters.');
    setBusy(action);
    try {
      saveName(name.trim());
      const seat = await api('/api/room', { method: 'POST', body: { action, name, code, avatar } });
      saveSeat(seat.code, { playerId: seat.playerId, token: seat.token });
      router.push(`/r/${seat.code}`);
    } catch (err) {
      setError(err.message);
      setBusy('');
    }
  }

  return (
    <main className="home">
      <header className="hero">
        <p className="eyebrow">The Resistance</p>
        <h1 className="wordmark">Avalon</h1>
        <p className="hero-lede">Loyal knights and hidden traitors, for 5 to 15 players at one table. Everyone plays from their own phone.</p>
        <div className="hero-actions">
          <button className="btn btn-ghost" onClick={() => setLearning(true)}>
            New to Avalon? Learn to play
          </button>
          <InstallButton />
        </div>
      </header>

      <div className="home-cast">
        <Fan roles={CAST} size="lg" label="The roles of Avalon" />
      </div>

      <section className="gate" aria-label="Start or join a game">
        <div className="identity">
          <button type="button" className="identity-avatar" onClick={() => setPicking((p) => !p)} aria-expanded={picking} aria-label="Choose your avatar">
            <Avatar avatar={avatar} name={name || '?'} className="avatar-lg" />
            <span className="identity-edit">{picking ? 'Done' : 'Change'}</span>
          </button>
          <div className="field">
            <label htmlFor="name">Your name</label>
            <input id="name" className="input" value={name} maxLength={20} autoComplete="nickname" placeholder="e.g. Gawain" onChange={(e) => setName(e.target.value)} />
          </div>
        </div>
        {picking && <AvatarPicker avatar={avatar} name={name} onChange={chooseAvatar} />}

        <div className="gate-col">
          <p className="gate-title">Host a game</p>
          <button className="btn btn-primary btn-lg btn-block" disabled={!!busy} onClick={() => enter('create')}>
            {busy === 'create' ? 'Opening room…' : 'Create a room'}
          </button>
        </div>

        <div className="gate-divider" aria-hidden="true">
          or
        </div>

        <form
          className="gate-col"
          onSubmit={(e) => {
            e.preventDefault();
            enter('join');
          }}
        >
          <label className="gate-title" htmlFor="code">
            Join with a code
          </label>
          <input
            id="code"
            className="input input-code"
            value={code}
            maxLength={4}
            autoCapitalize="characters"
            autoComplete="off"
            placeholder="ABCD"
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))}
          />
          <button className="btn btn-block" type="submit" disabled={!!busy}>
            {busy === 'join' ? 'Joining…' : 'Take a seat'}
          </button>
        </form>

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </section>

      {learning && <Tutorial onClose={() => setLearning(false)} />}
    </main>
  );
}
