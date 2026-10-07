import { createHash } from 'node:crypto';
import type { Cita } from '../../src/types';
import { CALENDAR_ID, CalendarError } from '../../src/calendar/events';

// Only scheduling data, never client-supplied processing/lease fields.
export function payload(c: Cita): Cita {
  return Object.fromEntries(['id','fechaCita','horaCita','asunto','direccion','descripcion',
    'quienAtiende','telemarketing','estadoCita','calendarSyncRequested','ultimaActualizacion',
    'idEventoCalendar','enlaceCalendar','calendarDestino'].map(k => [k, (c as any)[k] || ''])) as unknown as Cita;
}
export function revision(c: Cita): string {
  const { idEventoCalendar, enlaceCalendar, calendarDestino, ...fields } = payload(c);
  return createHash('sha256').update(JSON.stringify(fields)).digest('hex');
}
export function eligible(c: Cita): boolean {
  return !!(c.calendarSyncRequested || c.calendarDestino === CALENDAR_ID);
}
export function retryDelay(error: unknown, attempt: number): number | null {
  // Semantic conflicts / invalid dates need a user correction, not repeated writes.
  if (error instanceof CalendarError) {
    if ([401, 403].includes(error.status)) return 60 * 60_000;
    if (![408, 429].includes(error.status) && error.status < 500) return null;
  } else if (!(error instanceof TypeError) && !(error instanceof Error && ['TimeoutError','AbortError'].includes(error.name))) return null;
  return Math.min(60 * 60_000, 30_000 * 2 ** Math.min(attempt, 7));
}
export function adminAllowed(auth: {token: Record<string, unknown>} | undefined): boolean {
  return auth?.token.email_verified === true && String(auth.token.email || '').toLowerCase() === 'reclutamientohac@gmail.com';
}
