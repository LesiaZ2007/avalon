import { NextResponse } from 'next/server';
import { GameError } from './errors';

export const json = (data, status = 200) =>
  NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });

export function errorResponse(err) {
  if (err instanceof GameError) return json({ error: err.message }, err.status);
  console.error(err);
  return json({ error: err?.message || 'Something went wrong on the server.' }, 500);
}
