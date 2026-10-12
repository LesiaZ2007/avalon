'use client';

import { AVATAR_ICONS, AVATAR_NAMES, AVATAR_TINTS } from '@/lib/rules';
import { Crest } from './crests';

export const initials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

export const tintColor = (avatar) => AVATAR_TINTS[avatar?.tint ?? 0] ?? AVATAR_TINTS[0];

/** A player's avatar: their chosen crest (or initials) on their chosen colour. */
export default function Avatar({ avatar, name, className = '', children, ...rest }) {
  return (
    <span className={`avatar ${avatar?.icon ? 'has-icon' : ''} ${className}`} style={{ '--tint': tintColor(avatar) }} {...rest}>
      {avatar?.icon ? (
        <span className="avatar-icon">
          <Crest id={avatar.icon} />
        </span>
      ) : (
        initials(name)
      )}
      {children}
    </span>
  );
}

/** Pick a crest and a colour. Calls onChange with the full avatar on every tap. */
export function AvatarPicker({ avatar, name, onChange }) {
  const current = { icon: avatar?.icon ?? null, tint: avatar?.tint ?? 0 };
  return (
    <div className="picker">
      <div className="picker-preview">
        <Avatar avatar={current} name={name || '?'} className="avatar-xl" />
      </div>
      <div className="picker-icons" role="radiogroup" aria-label="Crest">
        <button
          type="button"
          role="radio"
          aria-checked={current.icon === null}
          className="picker-icon picker-initials"
          onClick={() => onChange({ ...current, icon: null })}
          title="Your initials"
        >
          {initials(name || '?') || 'Aa'}
        </button>
        {AVATAR_ICONS.map((icon) => (
          <button
            key={icon}
            type="button"
            role="radio"
            aria-checked={current.icon === icon}
            aria-label={AVATAR_NAMES[icon]}
            title={AVATAR_NAMES[icon]}
            className="picker-icon"
            onClick={() => onChange({ ...current, icon })}
          >
            <Crest id={icon} />
          </button>
        ))}
      </div>
      <div className="picker-tints" role="radiogroup" aria-label="Colour">
        {AVATAR_TINTS.map((color, tint) => (
          <button
            key={color}
            type="button"
            role="radio"
            aria-checked={current.tint === tint}
            aria-label={`Colour ${tint + 1}`}
            className="picker-tint"
            style={{ '--tint': color }}
            onClick={() => onChange({ ...current, tint })}
          />
        ))}
      </div>
    </div>
  );
}
