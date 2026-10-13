'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { saveSeat } from '@/lib/client';

/**
 * Where Jackdaw sends each player when it hands the table over: /j/CODE#seat=<playerId>.<token>.
 * The seat lives in the fragment, which never reaches a server or a log. It's saved like any
 * seat on this device, dropped from the address bar, and then the room opens as usual.
 */
export default function JackdawEntry() {
  const params = useParams();
  const router = useRouter();
  const code = String(params.code ?? '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);

  useEffect(() => {
    const match = /(?:^#|&)seat=([^&]+)/.exec(window.location.hash);
    if (match) {
      const raw = decodeURIComponent(match[1]);
      const dot = raw.indexOf('.');
      if (dot > 0) saveSeat(code, { playerId: raw.slice(0, dot), token: raw.slice(dot + 1) });
      window.history.replaceState(null, '', window.location.pathname);
    }
    router.replace(`/r/${code}`);
  }, [code, router]);

  return (
    <main className="shell">
      <p className="muted" role="status">
        Taking you to your seat…
      </p>
    </main>
  );
}
