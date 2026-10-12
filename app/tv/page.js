'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

/** Type a room code on a TV or laptop to show that table, at any point in the game. */
export default function TvStart() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  function submit(e) {
    e.preventDefault();
    if (code.length !== 4) return setError('Room codes are 4 letters.');
    router.push(`/tv/${code}`);
  }

  return (
    <main className="shell">
      <form className="panel tv-start" onSubmit={submit}>
        <h1 className="wordmark">Avalon</h1>
        <h2>Show a table on this screen</h2>
        <p className="muted">Enter the room code from any player&rsquo;s phone. It works before or during a game, and this screen only ever shows what the whole table can see.</p>
        <div className="field">
          <label htmlFor="tv-code">Room code</label>
          <input
            id="tv-code"
            className="input input-code"
            value={code}
            maxLength={4}
            autoCapitalize="characters"
            autoComplete="off"
            placeholder="ABCD"
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))}
            autoFocus
          />
        </div>
        <button className="btn btn-primary btn-lg btn-block">Show the table</button>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <Link href="/" className="muted small">
          Play instead
        </Link>
      </form>
    </main>
  );
}
