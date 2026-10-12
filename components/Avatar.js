'use client';

import { AVATAR_ICONS, AVATAR_INKS, AVATAR_NAMES, AVATAR_TINTS } from '@/lib/rules';
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
export const inkColor = (avatar) => AVATAR_INKS[avatar?.tint ?? 0] ?? AVATAR_INKS[0];
/** A chat line's name colours: the light ink night uses, and the tint itself for paper. */
export const nameColors = (avatar) => ({ '--ink': inkColor(avatar), '--name-tint': tintColor(avatar) });

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

/**
 * Pick a crest and a colour. Calls onChange with the full avatar on every tap. `taken` holds the
 * crests and colours other players in the room already have; those show but can't be chosen.
 */
export function AvatarPicker({ avatar, name, onChange, taken = { icons: new Set(), tints: new Set() } }) {
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
            aria-label={taken.icons.has(icon) ? `${AVATAR_NAMES[icon]} (taken)` : AVATAR_NAMES[icon]}
            title={taken.icons.has(icon) ? `${AVATAR_NAMES[icon]}: someone else has this` : AVATAR_NAMES[icon]}
            className="picker-icon"
            disabled={taken.icons.has(icon)}
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
            aria-label={taken.tints.has(tint) ? `Colour ${tint + 1} (taken)` : `Colour ${tint + 1}`}
            title={taken.tints.has(tint) ? 'Someone else has this colour' : undefined}
            className="picker-tint"
            style={{ '--tint': color }}
            disabled={taken.tints.has(tint)}
            onClick={() => onChange({ ...current, tint })}
          />
        ))}
      </div>
    </div>
  );
}
