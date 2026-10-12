'use client';

import { useState } from 'react';
import RoundTable from './RoundTable';
import Fan from './Fan';
import { MAX_PLAYERS, MIN_PLAYERS, MODES, ROLES, ROLE_NEEDS, lineup } from '@/lib/rules';

const ROLE_HINTS = {
  merlin: 'Adds the Assassin to evil.',
  percival: 'Sees who might be Merlin. Needs Merlin.',
  morgana: 'Looks like Merlin to Percival. Needs Percival.',
  mordred: 'Hidden from Merlin. Needs Merlin.',
  oberon: 'Evil, but unknown to the other evil players.',
};

export function LobbyTable({ view, nameOf, avatarOf, onInspect }) {
  const count = view.players.length;
  const isHost = view.hostId === view.you;
  const needed = Math.max(0, MIN_PLAYERS - count);
  return (
    <RoundTable
      seats={view.players.map((p) => p.id)}
      nameOf={nameOf}
      avatarOf={avatarOf}
      you={view.you}
      onInspect={onInspect}
      canInspect={(id) => id === view.you || isHost}
      inspectLabel={(name, id) => (id === view.you ? 'Change your avatar' : `Remove ${name}`)}
      reactions={view.reactions}
      info={(id) => ({ leader: id === view.hostId })}
      center={
        <>
          <span className="center-kicker">Room</span>
          <span className="center-code">{view.code}</span>
          <span className="center-line">
            {count} of {MAX_PLAYERS} seated · {needed ? `${needed} more needed` : 'ready'}
          </span>
        </>
      }
    />
  );
}

export function LobbyHand({ view, act }) {
  const isHost = view.hostId === view.you;
  const s = view.settings;
  const count = view.players.length;
  const needed = Math.max(0, MIN_PLAYERS - count);
  const deal = lineup(s, count);
  const [busy, setBusy] = useState(false);

  const update = (patch) => act({ type: 'settings', ...patch });
  const toggleRole = (role, on) => {
    const custom = { ...s.custom, [role]: on };
    // Turning a role off also turns off anything that depends on it.
    if (!on) {
      for (const [r, need] of Object.entries(ROLE_NEEDS)) if (need === role) custom[r] = false;
      if (role === 'merlin') custom.morgana = false;
    }
    update({ custom });
  };

  async function start() {
    setBusy(true);
    await act({ type: 'start' });
    setBusy(false);
  }

  return (
    <div className="hand-inner">
      <p className="eyebrow">Gathering at the Round Table</p>
      <h2 className="hand-title">
        {needed ? `Waiting for ${needed} more ${needed === 1 ? 'knight' : 'knights'}` : isHost ? 'Ready when you are' : 'Waiting for the host'}
      </h2>
      <p className="hand-text">
        {needed
          ? `Share room code ${view.code}, or tap the code in the corner to copy an invite link.`
          : isHost
          ? 'Roles are dealt the moment you start.'
          : 'The host will start once everyone is seated.'}
      </p>

      <Fan roles={[...deal.good, ...deal.evil]} label={`Roles dealt for ${Math.max(count, MIN_PLAYERS)} players`} />
      <p className="hand-text small">
        {count >= MIN_PLAYERS ? `The deal for ${count}:` : `Preview for ${MIN_PLAYERS}:`} <span className="good-text">{deal.good.length} loyal</span> against{' '}
        <span className="evil-text">{deal.evil.length} evil</span>.
        {deal.dropped.length > 0 && ` Not enough evil seats for ${deal.dropped.map((r) => ROLES[r].name).join(' and ')} yet.`}
      </p>

      <div className="pills" role="group" aria-label="Role setup">
        {Object.entries(MODES).map(([key, m]) => (
          <button key={key} type="button" className="pill" aria-pressed={s.mode === key} disabled={!isHost} onClick={() => update({ mode: key })} title={m.hint}>
            {m.label}
          </button>
        ))}
        <button type="button" className="pill pill-lady" aria-pressed={s.lady} disabled={!isHost} onClick={() => update({ lady: !s.lady })} title="After quests 2, 3 and 4, the holder secretly learns one player's loyalty. Best with 7+ players.">
          Lady of the Lake {s.lady ? 'on' : 'off'}
        </button>
      </div>

      {s.mode === 'custom' && (
        <div className="pills" role="group" aria-label="Custom roles">
          {Object.keys(ROLE_HINTS).map((role) => {
            const needs = ROLE_NEEDS[role];
            const blocked = needs && !s.custom[needs];
            const on = !blocked && !!s.custom[role];
            return (
              <button key={role} type="button" className="pill pill-role" aria-pressed={on} disabled={!isHost || blocked} title={ROLE_HINTS[role]} onClick={() => toggleRole(role, !on)}>
                {role === 'merlin' ? 'Merlin & Assassin' : ROLES[role].name}
              </button>
            );
          })}
        </div>
      )}
      {!isHost && <p className="hand-text small">The host chooses the roles.</p>}

      <div className="row row-center">
        {isHost && (
          <button className="btn btn-primary btn-lg" disabled={busy || count < MIN_PLAYERS} onClick={start}>
            {busy ? 'Dealing roles…' : 'Deal the roles'}
          </button>
        )}
        <button className="btn btn-ghost" onClick={() => act({ type: 'leave' })}>
          Leave room
        </button>
      </div>

      <p className="hand-text small">
        {isHost && count > 1 ? 'Tap a player’s seat to remove them, or your own to change your avatar.' : 'Tap your seat to change your avatar.'}
      </p>
    </div>
  );
}
