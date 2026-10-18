'use client';

import { useState } from 'react';
import RoundTable from './RoundTable';
import Fan from './Fan';
import { Scoreboard } from './Recap';
import TvLink from './TvLink';
import { MAX_PLAYERS, MIN_PLAYERS, MODES, OFFICIAL_MAX, QUEST_SIZES, ROLES, ROLE_NEEDS, THEMES, TIMER_CHOICES, formatSeconds, lineup, themeOf } from '@/lib/rules';

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

/**
 * The seating being arranged: the host's order for everyone still here, then anyone who joined
 * since at the end (where the server will put them too).
 */
export function seatingOf(view, order) {
  const ids = view.players.map((p) => p.id);
  if (!order) return ids;
  const kept = order.filter((id) => ids.includes(id));
  return [...kept, ...ids.filter((id) => !kept.includes(id))];
}

export function LobbyTable({ view, nameOf, avatarOf, onInspect, arranging, onArrange }) {
  const count = view.players.length;
  const isHost = view.hostId === view.you;
  const needed = Math.max(0, MIN_PLAYERS - count);
  return (
    <RoundTable
      seats={seatingOf(view, arranging)}
      nameOf={nameOf}
      avatarOf={avatarOf}
      you={view.you}
      onInspect={onInspect}
      onArrange={arranging ? onArrange : undefined}
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

/** One lobby setting: its name on the left, its control (or, for players, its value) on the right. */
function Setting({ label, hint, children }) {
  return (
    <div className="setting" title={hint}>
      <span className="setting-label">{label}</span>
      {children}
    </div>
  );
}

/** The host's seating panel, shown in place of the lobby while the table is being rearranged. */
export function ArrangeHand({ view, act, arranging, onDone }) {
  const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true);
    if (await act({ type: 'seats', order: seatingOf(view, arranging) })) onDone();
    setBusy(false);
  }
  return (
    <div className="hand-inner">
      <p className="eyebrow">Seating</p>
      <h2 className="hand-title">Drag everyone to their real seat</h2>
      <p className="hand-text">
        Match the table to where people are actually sitting, going clockwise around the room. The leader&rsquo;s crown passes from seat to seat in
        this order.
        {view.game && ' The crown stays where it is for now. Nothing else in the game changes.'}
      </p>
      <p className="hand-text small">You can also tap a player, then tap the seat they belong in.</p>
      <div className="row row-center">
        <button className="btn btn-primary btn-lg" disabled={busy} onClick={save}>
          {busy ? 'Saving…' : 'Save seating'}
        </button>
        <button className="btn btn-ghost" disabled={busy} onClick={onDone}>
          Cancel
        </button>
      </div>
    </div>
  );
}

export function LobbyHand({ view, act, nameOf, avatarOf, onRearrange }) {
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

      <div className="settings" role="group" aria-label="Game settings">
        <Setting label="Roles" hint={MODES[s.mode]?.hint}>
          {isHost ? (
            <select className="setting-select" value={s.mode} onChange={(e) => update({ mode: e.target.value })} aria-label="Roles">
              {Object.entries(MODES).map(([key, m]) => (
                <option key={key} value={key}>
                  {m.label}
                </option>
              ))}
            </select>
          ) : (
            <span className="setting-value">{MODES[s.mode]?.label}</span>
          )}
        </Setting>

        {s.mode === 'custom' && (
          <div className="setting-checks" role="group" aria-label="Roles in play">
            {Object.keys(ROLE_HINTS).map((role) => {
              const needs = ROLE_NEEDS[role];
              const blocked = needs && !s.custom[needs];
              const on = !blocked && !!s.custom[role];
              return (
                <label key={role} className={`setting-check ${blocked ? 'is-blocked' : ''}`} title={ROLE_HINTS[role]}>
                  <input type="checkbox" checked={on} disabled={!isHost || blocked} onChange={() => toggleRole(role, !on)} />
                  {role === 'merlin' ? 'Merlin & Assassin' : ROLES[role].name}
                </label>
              );
            })}
          </div>
        )}

        <Setting label="Lady of the Lake" hint="After quests 2, 3 and 4, the holder secretly learns one player's loyalty. Best with 7+ players.">
          {isHost ? (
            <button type="button" role="switch" aria-checked={s.lady} aria-label="Lady of the Lake" className="setting-switch" onClick={() => update({ lady: !s.lady })}>
              <span className="setting-switch-knob" aria-hidden="true" />
              {s.lady ? 'On' : 'Off'}
            </button>
          ) : (
            <span className="setting-value">{s.lady ? 'On' : 'Off'}</span>
          )}
        </Setting>

        {Object.entries(TIMERS).map(([key, t]) => {
          const value = s.timers?.[key] ?? 0;
          return (
            <Setting key={key} label={t.label} hint={t.hint}>
              {isHost ? (
                <select className="setting-select" value={value} onChange={(e) => update({ timers: { [key]: Number(e.target.value) } })} aria-label={t.label}>
                  {TIMER_CHOICES[key].map((secs) => (
                    <option key={secs} value={secs}>
                      {secs ? formatSeconds(secs) : 'Off'}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="setting-value">{value ? formatSeconds(value) : 'Off'}</span>
              )}
            </Setting>
          );
        })}

        <Setting label="Look" hint={THEMES[themeOf(s)].hint}>
          {isHost ? (
            <select className="setting-select" value={themeOf(s)} onChange={(e) => act({ type: 'theme', theme: e.target.value })} aria-label="Look">
              {Object.entries(THEMES).map(([key, t]) => (
                <option key={key} value={key}>
                  {t.label}
                </option>
              ))}
            </select>
          ) : (
            <span className="setting-value">{THEMES[themeOf(s)].label}</span>
          )}
        </Setting>
      </div>
      {(s.timers?.talk > 0 || s.timers?.vote > 0) && <p className="hand-text small">When a timer runs out, the table sees it and the players being waited on get a buzz. Nothing is played for them.</p>}
      {!isHost && <p className="hand-text small">The host chooses these.</p>}

      <div className="row row-center">
        {isHost && (
          <button className="btn btn-primary btn-lg" disabled={busy || count < MIN_PLAYERS} onClick={start}>
            {busy ? 'Dealing roles…' : 'Deal the roles'}
          </button>
        )}
        {isHost && count >= 3 && (
          <button className="btn btn-ghost" onClick={onRearrange}>
            Rearrange players
          </button>
        )}
        <button className="btn btn-ghost" onClick={() => act({ type: 'leave' })}>
          Leave room
        </button>
      </div>

      <p className="hand-text small">
        {isHost && count > 1 ? 'Tap a player’s seat to remove them, or your own to change your avatar.' : 'Tap your seat to change your avatar.'}
      </p>
      <TvLink code={view.code} />
    </div>
  );
}
