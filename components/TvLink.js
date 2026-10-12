'use client';

import { useEffect, useState } from 'react';

/** Opens the TV view on this device, and says what to type on a TV or laptop that isn't playing. */
export default function TvLink({ code }) {
  const [site, setSite] = useState('');
  useEffect(() => setSite(location.host), []);
  return (
    <div className="tv-link-box">
      <a className="tv-link" href={`/tv/${code}`} target="_blank" rel="noreferrer">
        Show this table on a TV
      </a>
      {site && (
        <p className="muted small">
          Or on any other screen, go to <strong className="tv-address">{site}/tv</strong> and enter <strong>{code}</strong>.
        </p>
      )}
    </div>
  );
}
