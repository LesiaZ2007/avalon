'use client';

import { useState } from 'react';
import RoundTable from './RoundTable';
import Fan from './Fan';
import { Scoreboard } from './Recap';
import { MAX_PLAYERS, MIN_PLAYERS, MODES, OFFICIAL_MAX, QUEST_SIZES, ROLES, ROLE_NEEDS, TIMER_CHOICES, formatSeconds, lineup } from '@/lib/rules';

const TIMERS = {
  talk: { label: 'Talk timer', hint: 'How long the leader has to pick a team, and evil has to name Merlin.' },
  vote: { label: 'Vote timer', hint: 'How long everyone has to vote on a team.' },
};

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
      info={(id) => ({ leader: id === view.hostId, away: !view.players.find((p) => p.id === id)?.online })}
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

export function LobbyHand({ view, act, nameOf, avatarOf }) {
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
      {count > OFFICIAL_MAX && (
        <p className="house-note">
          More than {OFFICIAL_MAX} players uses house rules, since the box stops at {OFFICIAL_MAX}: {deal.evil.length} evil, and quest teams of{' '}
          {QUEST_SIZES[count].join(', ')}.
        </p>
      )}

      <Scoreboard view={view} nameOf={nameOf} avatarOf={avatarOf} act={act} />

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
      <div className="timer-settings">
        {Object.entries(TIMERS).map(([key, t]) => (
          <div key={key} className="pills" role="group" aria-label={t.label} title={t.hint}>
            <span className="pills-label">{t.label}</span>
            {TIMER_CHOICES[key].map((secs) => (
              <button key={secs} type="button" className="pill pill-sm" aria-pressed={(s.timers?.[key] ?? 0) === secs} disabled={!isHost} onClick={() => update({ timers: { [key]: secs } })}>
                {secs ? formatSeconds(secs) : 'Off'}
              </button>
            ))}
          </div>
        ))}
        {(s.timers?.talk > 0 || s.timers?.vote > 0) && <p className="hand-text small">When time runs out, the table sees it and the players being waited on get a buzz. Nothing is played for them.</p>}
      </div>
      {!isHost && <p className="hand-text small">The host chooses the roles and timers.</p>}

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
      <a className="tv-link" href={`/tv/${view.code}`} target="_blank" rel="noreferrer">
        Show this table on a TV
      </a>
    </div>
  );
}
