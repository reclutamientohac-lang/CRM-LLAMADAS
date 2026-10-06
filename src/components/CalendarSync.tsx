import React, { useEffect, useRef, useState } from 'react';
import { GoogleAuthProvider, reauthenticateWithPopup } from 'firebase/auth';
import { doc, runTransaction, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useCRM } from '../context/CRMContext';
import type { Cita } from '../types';
import { CALENDAR_ID, CalendarError, calendarSyncRevision, syncCalendarEvent } from '../calendar/events';

export function CalendarSync({ showExisting }: { showExisting: boolean }) {
  const { user } = useAuth();
  const { citas } = useCRM();
  const [session, setSession] = useState<{ token: string; uid: string; until: number } | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState('');
  const [tick, setTick] = useState(0);
  const running = useRef(false);
  const latest = useRef(citas);
  latest.current = citas;
  const pending = citas.filter(c => calendarSyncRevision(c) && calendarSyncRevision(c) !== c.calendarSyncDone);
  const connected = !!session && session.uid === user?.uid && session.until > Date.now();
  useEffect(() => { const timer = setInterval(() => setTick(n => n + 1), 15000); return () => clearInterval(timer); }, []);
  useEffect(() => { setSession(null); }, [user?.uid]);
  const connect = async () => {
    if (!auth.currentUser) return;
    setBusy(true); setMessage('');
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/calendar.events');
      provider.setCustomParameters({ login_hint: auth.currentUser.email || '', prompt: 'consent' });
      const result = await reauthenticateWithPopup(auth.currentUser, provider);
      const token = GoogleAuthProvider.credentialFromResult(result)?.accessToken;
      if (!token) throw new Error('Google no entregó la autorización para Calendar.');
      setSession({ token, uid: result.user.uid, until: Date.now() + 50 * 60 * 1000 });
      setMessage('Conexión autorizada. Las citas pendientes se enviarán a AGENDA DE CITAS.');
    } catch (e) { setMessage(e instanceof Error ? e.message : 'No se pudo conectar Google Calendar.'); }
    finally { setBusy(false); }
  };
  useEffect(() => {
    if (!connected || !session || running.current || !user) return;
    const candidate = latest.current.find(c => calendarSyncRevision(c) && calendarSyncRevision(c) !== c.calendarSyncDone && c.calendarSyncErrorVersion !== calendarSyncRevision(c) && (!c.calendarSyncLeaseUntil || c.calendarSyncLeaseUntil < Date.now()));
    if (!candidate) return;
    running.current = true;
    const lease = crypto.randomUUID();
    const ref = doc(db, 'citas', candidate.id);
    let snapshot: Cita | null = null;
    (async () => {
      try {
        snapshot = await runTransaction(db, async tx => {
          const record = await tx.get(ref);
          if (!record.exists()) return null;
          const current = { ...record.data(), id: record.id } as Cita;
          if (!calendarSyncRevision(current) || calendarSyncRevision(current) === current.calendarSyncDone || (current.calendarSyncLeaseUntil || 0) > Date.now()) return null;
          tx.update(ref, { calendarSyncLease: lease, calendarSyncLeaseUntil: Date.now() + 180000 });
          return current;
        });
        if (!snapshot) return;
        const result = await syncCalendarEvent(snapshot, session.token);
        await runTransaction(db, async tx => {
          const record = await tx.get(ref);
          if (!record.exists() || record.data().calendarSyncLease !== lease) return;
          tx.update(ref, { ...result, calendarDestino: CALENDAR_ID, calendarSyncDone: calendarSyncRevision(snapshot!), calendarSyncError: '', calendarSyncErrorVersion: '', calendarSyncLeaseUntil: 0 });
        });
        setMessage(snapshot.estadoCita === 'Cancelada' ? 'Cancelación sincronizada con AGENDA DE CITAS.' : 'Cita sincronizada con AGENDA DE CITAS.');
      } catch (e) {
        const error = e instanceof Error ? e.message : 'No se pudo sincronizar la cita.';
        setMessage(error);
        if (e instanceof CalendarError && e.status === 401) setSession(null);
        if (snapshot) await runTransaction(db, async tx => {
          const record = await tx.get(ref);
          if (!record.exists() || record.data().calendarSyncLease !== lease) return;
          tx.update(ref, { calendarSyncError: error, calendarSyncErrorVersion: calendarSyncRevision(snapshot!), calendarSyncLeaseUntil: 0 });
        }).catch(() => setMessage(`${error} No se pudo registrar el estado; la cita sigue pendiente.`));
      } finally { running.current = false; }
    })();
  }, [citas, session, connected, user?.uid, tick]);
  const enqueue = async (id: string) => {
    setBusy(true);
    try {
      await updateDoc(doc(db, 'citas', id), { calendarSyncRequested: new Date().toISOString(), calendarSyncError: '', calendarSyncErrorVersion: '' });
      setSelected(''); setMessage('Cita pendiente de sincronización.');
    } catch { setMessage('No se pudo preparar la cita. Revisa tu acceso al CRM.'); }
    finally { setBusy(false); }
  };
  const unlinked = citas.filter(c => !c.idEventoCalendar && !c.calendarSyncRequested && ['Agendada', 'Reprogramada'].includes(c.estadoCita));
  return <section className="mx-4 mt-3 rounded-xl border border-slate-200 bg-white p-4 text-sm" aria-label="Sincronización con Google Calendar">
    <div className="flex flex-wrap items-center justify-between gap-2"><strong>Google Calendar · AGENDA DE CITAS</strong><span>{connected ? 'Conectado en esta sesión' : 'Sin conexión'} · {pending.length} pendientes</span>
      <button className="rounded-lg bg-[#0D2240] px-3 py-2 text-white disabled:opacity-50" disabled={busy} onClick={connect}>{connected ? 'Renovar conexión' : 'Conectar Google Calendar'}</button></div>
    <p className="mt-2 text-xs text-slate-600">Sincroniza mientras esta app esté abierta y la conexión siga vigente. Horario de Los Ángeles; duración de 1 hora. Si cierras la app o vence el permiso, las operaciones quedan pendientes. Los cambios hechos en Google Calendar no regresan al CRM.</p>
    {message && <p role="status" className="mt-2">{message}</p>}
    {pending.filter(c => c.calendarSyncErrorVersion === calendarSyncRevision(c)).map(c => <div key={c.id} className="mt-2 text-rose-700">{c.asunto}: {c.calendarSyncError} <button className="underline" disabled={busy} onClick={() => enqueue(c.id)}>Reintentar</button></div>)}
    {showExisting && unlinked.length > 0 && <div className="mt-3 flex flex-wrap items-center gap-2"><label htmlFor="calendar-existing">Enviar una cita existente:</label><select className="max-w-full rounded border p-2" id="calendar-existing" value={selected} onChange={e => setSelected(e.target.value)}><option value="">Selecciona una cita</option>{unlinked.map(c => <option key={c.id} value={c.id}>{c.fechaCita} · {c.horaCita} · {c.asunto}</option>)}</select><button disabled={!selected || busy} className="rounded border px-3 py-2 disabled:opacity-50" onClick={() => enqueue(selected)}>Enviar a Calendar</button></div>}
  </section>;
}
