'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, loadName, saveName, saveSeat } from '@/lib/client';
import Fan from '@/components/Fan';

const CAST = ['merlin', 'percival', 'servant', 'assassin', 'morgana', 'mordred', 'oberon'];

export default function Home() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  useEffect(() => setName(loadName()), []);

  async function enter(action) {
    setError('');
    if (!name.trim()) return setError('Enter your name first.');
    if (action === 'join' && code.length !== 4) return setError('Room codes are 4 letters.');
    setBusy(action);
    try {
      saveName(name.trim());
      const seat = await api('/api/room', { method: 'POST', body: { action, name, code } });
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
        <p className="hero-lede">Loyal knights and hidden traitors, for 5 to 10 players at one table. Everyone plays from their own phone.</p>
      </header>

      <div className="home-cast">
        <Fan roles={CAST} size="lg" label="The roles of Avalon" />
      </div>

      <section className="gate" aria-label="Start or join a game">
        <div className="field">
          <label htmlFor="name">Your name</label>
          <input id="name" className="input" value={name} maxLength={20} autoComplete="nickname" placeholder="e.g. Gawain" onChange={(e) => setName(e.target.value)} />
        </div>

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

      <details className="how">
        <summary>How to play</summary>
        <ol>
          <li>Everyone is secretly dealt a role: loyal to Arthur (good) or a minion of Mordred (evil). Evil players know each other.</li>
          <li>Each round the leader proposes a team for the quest, and everyone votes to approve or reject it in the open.</li>
          <li>
            If the team is approved, its members secretly play Success or Fail. Good players must play Success. One Fail sinks the quest (two on quest 4 with 7+ players).
          </li>
          <li>Three successful quests and good wins, unless the Assassin then names Merlin. Three failed quests, or five rejected teams in a row, and evil wins.</li>
        </ol>
      </details>
    </main>
  );
}
