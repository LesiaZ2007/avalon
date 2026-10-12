'use client';

import { THEME_KEY } from './rules';

export async function api(path, { method = 'GET', token, body } = {}) {
  const res = await fetch(path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { 'x-player-token': token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status}).`);
    err.status = res.status;
    throw err;
  }
  return data;
}

const sessionKey = (code) => `avalon:seat:${code}`;

function storage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function loadSeat(code) {
  try {
    return JSON.parse(storage()?.getItem(sessionKey(code)) ?? 'null');
  } catch {
    return null;
  }
}
export function saveSeat(code, seat) {
  try {
    storage()?.setItem(sessionKey(code), JSON.stringify(seat));
  } catch {}
}
export function clearSeat(code) {
  try {
    storage()?.removeItem(sessionKey(code));
  } catch {}
}
export function loadName() {
  try {
    return storage()?.getItem('avalon:name') ?? '';
  } catch {
    return '';
  }
}
export function saveName(name) {
  try {
    storage()?.setItem('avalon:name', name);
  } catch {}
}

/** The look this device last showed, so loading and join screens match it before a room loads. */
export function saveTheme(theme) {
  try {
    storage()?.setItem(THEME_KEY, theme);
  } catch {}
}

/** The avatar this device last chose, used when creating or joining a room. */
export function loadAvatar() {
  try {
    return JSON.parse(storage()?.getItem('avalon:avatar') ?? 'null');
  } catch {
    return null;
  }
}
export function saveAvatar(avatar) {
  try {
    storage()?.setItem('avalon:avatar', JSON.stringify(avatar));
  } catch {}
}
