'use client';

import { useEffect } from 'react';

/**
 * Background parallax: the backdrop's layers drift against the mouse, nearer layers more.
 * Publishes the pointer's offset from the centre as --px and --py (-1 to 1) on <html>, eased
 * towards the pointer so the scene glides rather than jumps. Only for a mouse or trackpad, and
 * never when the device asks for reduced motion.
 */
export default function Parallax() {
  useEffect(() => {
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
    const still = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!fine.matches || still.matches) return;
    const root = document.documentElement;
    const target = { x: 0, y: 0 };
    const now = { x: 0, y: 0 };
    let frame = 0;

    const step = () => {
      now.x += (target.x - now.x) * 0.08;
      now.y += (target.y - now.y) * 0.08;
      root.style.setProperty('--px', now.x.toFixed(4));
      root.style.setProperty('--py', now.y.toFixed(4));
      frame = Math.abs(target.x - now.x) + Math.abs(target.y - now.y) > 0.001 ? requestAnimationFrame(step) : 0;
    };
    const aim = (x, y) => {
      target.x = x;
      target.y = y;
      if (!frame) frame = requestAnimationFrame(step);
    };
    const onMove = (e) => aim((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1);
    const onLeave = () => aim(0, 0);

    window.addEventListener('pointermove', onMove, { passive: true });
    root.addEventListener('pointerleave', onLeave);
    return () => {
      window.removeEventListener('pointermove', onMove);
      root.removeEventListener('pointerleave', onLeave);
      cancelAnimationFrame(frame);
      root.style.removeProperty('--px');
      root.style.removeProperty('--py');
    };
  }, []);
  return null;
}
