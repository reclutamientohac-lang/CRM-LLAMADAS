import type { Cita } from '../types';

export const CALENDAR_ID = '71d933f40940ebf6b2ddc9a8abd4326ce0a25a377eb76e8549d1cbb4a61480ad@group.calendar.google.com';
export const CALENDAR_ZONE = 'America/Los_Angeles';
export function calendarSyncRevision(cita: Cita): string {
  const requested = cita.calendarSyncRequested || '';
  // Una pestaña antigua puede cancelar/reprogramar sin escribir la nueva marca.
  return cita.calendarDestino === CALENDAR_ID
    ? [requested, cita.ultimaActualizacion || ''].sort().at(-1) || ''
    : requested;
}
export async function calendarEventId(id: string) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`crm-llamadas:${id}`));
  return 'crm' + Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, '0')).join('');
}
export function calendarEvent(cita: Cita) {
  const match = cita.horaCita.trim().toUpperCase().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/);
  if (!match) throw new Error('La hora de la cita no es válida.');
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (minutes > 59 || hours > (match[3] ? 12 : 23) || (match[3] && hours < 1)) throw new Error('La hora de la cita no es válida.');
  if (match[3]) hours = hours % 12 + (match[3] === 'PM' ? 12 : 0);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(cita.fechaCita)) throw new Error('La fecha de la cita no es válida.');
  const local = `${cita.fechaCita}T${String(hours).padStart(2, '0')}:${match[2]}:00`;
  const end = new Date(`${local}Z`);
  if (!Number.isFinite(end.getTime()) || end.toISOString().slice(0, 10) !== cita.fechaCita) throw new Error('La fecha de la cita no es válida.');
  end.setUTCMinutes(end.getUTCMinutes() + 60);
  return {
    summary: cita.asunto || 'Cita CRM LLAMADAS',
    location: cita.direccion || '',
    description: [cita.descripcion, `Atiende: ${cita.quienAtiende || 'Por asignar'}`, `Telemarketing: ${cita.telemarketing}`, `CRM: ${cita.id}`].filter(Boolean).join('\n'),
    start: { dateTime: local, timeZone: CALENDAR_ZONE },
    end: { dateTime: end.toISOString().slice(0, 19), timeZone: CALENDAR_ZONE },
    extendedProperties: { private: { crmCitaId: cita.id, crmApp: 'crm-llamadas' } },
  };
}
export class CalendarError extends Error {
  constructor(message: string, public status: number) { super(message); }
}
export async function syncCalendarEvent(cita: Cita, token: string, request: typeof fetch = fetch) {
  if (cita.calendarDestino && cita.calendarDestino !== CALENDAR_ID) throw new Error('La cita está vinculada a otro calendario. Requiere revisión.');
  const deterministicId = await calendarEventId(cita.id);
  const id = cita.idEventoCalendar || deterministicId;
  const base = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events`;
  const call = async (path: string, method: string, body?: object) => {
    const response = await request(`${base}${path}`, {
      method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(20000), ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (!response.ok) {
      const info = await response.json().catch(() => ({}));
      const reason = info?.error?.errors?.[0]?.reason;
      throw new CalendarError(response.status === 401 ? 'La conexión con Google venció. Vuelve a conectar.' : reason === 'accessNotConfigured' || reason === 'serviceDisabled' ? 'Google Calendar API no está habilitada en el proyecto de la app.' : response.status === 403 ? 'Google no autorizó la escritura. Revisa los permisos del calendario y de la aplicación.' : `Google Calendar rechazó la operación (${response.status}).`, response.status);
    }
    return response.status === 204 ? {} : response.json();
  };
  let existing: any;
  try { existing = await call(`/${encodeURIComponent(id)}`, 'GET'); }
  catch (e) { if (!(e instanceof CalendarError) || ![404, 410].includes(e.status)) throw e; }
  if (cita.estadoCita === 'Cancelada' && existing?.status === 'cancelled') {
    // Google puede devolver solo un tombstone, sin propiedades privadas.
    if (id !== deterministicId && cita.calendarDestino !== CALENDAR_ID) throw new Error('El evento cancelado requiere revisión.');
    return { idEventoCalendar: id, enlaceCalendar: cita.enlaceCalendar || '' };
  }
  if (existing && existing.extendedProperties?.private?.crmCitaId !== cita.id) {
    throw new Error('El evento vinculado no fue creado por esta integración. Requiere revisión para evitar modificar otro evento.');
  }
  if (cita.estadoCita === 'Cancelada') {
    if (existing && existing.status !== 'cancelled') await call(`/${encodeURIComponent(id)}?sendUpdates=none`, 'PATCH', { status: 'cancelled' });
    return { idEventoCalendar: existing ? id : cita.idEventoCalendar || '', enlaceCalendar: existing?.htmlLink || cita.enlaceCalendar || '' };
  }
  if (existing?.status === 'cancelled') throw new Error('El evento fue cancelado en Google Calendar. Revisa la cita antes de volver a publicarla.');
  const body = calendarEvent(cita);
  let result;
  if (existing) result = await call(`/${encodeURIComponent(id)}?sendUpdates=none`, 'PATCH', body);
  else {
    // A missing previously-linked event is never silently replaced with a duplicate.
    if (cita.idEventoCalendar) throw new Error('No se encontró el evento vinculado. Revisa si fue eliminado en Google Calendar.');
    try { result = await call('?sendUpdates=none', 'POST', { ...body, id }); }
    catch (e) {
      if (!(e instanceof CalendarError) || e.status !== 409) throw e;
      const raced = await call(`/${id}`, 'GET');
      if (raced.extendedProperties?.private?.crmCitaId !== cita.id || raced.status === 'cancelled') throw new Error('Conflicto con un evento existente. Requiere revisión.');
      result = await call(`/${id}?sendUpdates=none`, 'PATCH', body);
    }
  }
  return { idEventoCalendar: result.id, enlaceCalendar: result.htmlLink || '' };
}
