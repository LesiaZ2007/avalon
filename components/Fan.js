import { RoleEmblem } from './art';
import { ROLES } from '@/lib/rules';

const shortName = (role) => ROLES[role].name.replace(' of Arthur', '').replace(' of Mordred', '');

/** Role cards fanned out like a hand. Hover or focus a card to lift it. */
export default function Fan({ roles, size = 'md', label }) {
  const n = roles.length;
  // Keep the whole arc within ~44 degrees and a 14px dip, however many cards are in the hand.
  const spread = Math.min(9, 44 / Math.max(n - 1, 1));
  const half = Math.max((n - 1) / 2, 1);
  return (
    <div className={`fan fan-${size}`} role="list" aria-label={label} style={{ '--n': n }}>
      {roles.map((role, i) => {
        const offset = i - (n - 1) / 2;
        return (
          <div
            key={`${role}-${i}`}
            role="listitem"
            tabIndex={0}
            className={`fan-card is-${ROLES[role].team}`}
            style={{ '--r': `${offset * spread}deg`, '--y': `${(offset / half) ** 2 * 14}px`, '--i': i }}
            title={ROLES[role].blurb}
          >
            <span className="fan-art">
              <RoleEmblem role={role} size={size === 'lg' ? 56 : 40} />
            </span>
            <span className="fan-name">{shortName(role)}</span>
          </div>
        );
      })}
    </div>
  );
}
