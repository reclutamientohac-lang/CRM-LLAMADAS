import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { Firestore } from 'firebase-admin/firestore';
import { CalendarWorker } from '../src/worker';
import { revision, retryDelay, adminAllowed } from '../src/policy';
import { CALENDAR_ID, CalendarError } from '../../src/calendar/events';
import type { Cita } from '../../src/types';

const db = new Firestore({ projectId: 'demo-calendar-worker' });
const worker = new CalendarWorker(db, async () => 'test-token');
const originalFetch = globalThis.fetch;
const events = new Map<string, any>();
let creates = 0;
let failAfterCreate = false;
let duringCreate: (() => Promise<void>) | undefined;
const example = (id: string) => ({ id, fechaCita: '2026-10-10', horaCita: '10:00 AM', asunto: 'Prueba central', estadoCita: 'Agendada', calendarSyncRequested: '2026-10-07T12:00:00Z', ultimaActualizacion: '2026-10-07T12:00:00Z', idEventoCalendar: '', enlaceCalendar: '' } as Cita);
before(async () => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'Estas pruebas solo pueden ejecutarse en el emulador.');
  await db.doc('settings/calendarCentral').set({ enabled: true });
  globalThis.fetch = async (url: any, init: any) => {
    if (!String(url).startsWith('https://www.googleapis.com/calendar/v3/')) throw new Error('Unexpected external request');
    const path = new URL(url).pathname;
    const id = path.split('/').at(-1)!;
    if (init.method === 'GET') return new Response(JSON.stringify(events.get(id) || {}), { status: events.has(id) ? 200 : 404 });
    const body = JSON.parse(init.body);
    if (init.method === 'POST') {
      creates++;
      events.set(body.id, { ...body, htmlLink: 'https://calendar.google.com/test' });
      if (duringCreate) { const callback = duringCreate; duringCreate = undefined; await callback(); }
      if (failAfterCreate) { failAfterCreate = false; throw new TypeError('Network lost'); }
      return new Response(JSON.stringify(events.get(body.id)));
    }
    events.set(id, { ...events.get(id), ...body });
    return new Response(JSON.stringify(events.get(id)));
  };
});
after(async () => { globalThis.fetch = originalFetch; await db.terminate(); });
async function add(id: string) { await db.doc(`citas/${id}`).set(example(id)); await worker.enqueue(id); }
async function job(id: string) { return (await db.doc(`calendarJobs/${id}`).get()).data()!; }

test('autoridad exclusiva del administrador y errores transitorios', () => {
  assert.equal(adminAllowed(undefined), false);
  assert.equal(adminAllowed({token:{email:'agent@example.com',email_verified:true}}),false);
  assert.equal(adminAllowed({token:{email:'reclutamientohac@gmail.com',email_verified:false}}),false);
  assert.equal(adminAllowed({token:{email:'reclutamientohac@gmail.com',email_verified:true}}),true);
  assert.equal(retryDelay(new CalendarError('quota',429),2),120000);
  assert.equal(retryDelay(new CalendarError('permission',403),2),3600000);
  assert.equal(retryDelay(new Error('wrong event'),2),null);
});
test('procesa sin navegador, entrega duplicada no duplica el evento', async () => {
  const id='central-basic'; await add(id); const before=creates;
  await Promise.all([worker.run(id), worker.run(id)]);
  await worker.enqueue(id); await worker.run(id);
  assert.equal(creates,before+1); assert.equal((await job(id)).state,'synced');
  assert.equal((await db.doc(`citas/${id}`).get()).data()?.calendarSyncDone, example(id).calendarSyncRequested);
});
test('reprogramar y cancelar conserva el mismo evento', async () => {
  const id='central-basic', initial=(await job(id)).eventId;
  await db.doc(`citas/${id}`).update({horaCita:'3:00 PM',calendarSyncRequested:'2026-10-07T12:01:00Z'});
  await worker.enqueue(id); await worker.run(id);
  assert.equal((await job(id)).eventId,initial); assert.equal(events.get(initial).start.dateTime,'2026-10-10T15:00:00');
  await db.doc(`citas/${id}`).update({estadoCita:'Cancelada',calendarSyncRequested:'2026-10-07T12:02:00Z'});
  await worker.enqueue(id); await worker.run(id);
  assert.equal(events.get(initial).status,'cancelled');
});
test('respuesta perdida después del POST se recupera sin segundo POST', async () => {
  const id='central-lost'; await add(id); const before=creates; failAfterCreate=true;
  await worker.run(id); assert.equal((await job(id)).state,'retry');
  await db.doc(`calendarJobs/${id}`).update({nextAttemptAt:Date.now()-1});
  await worker.run(id); assert.equal((await job(id)).state,'synced'); assert.equal(creates,before+1);
});
test('cancelación concurrente queda pendiente hasta actualizar el evento recién creado', async () => {
  const id='central-race'; await add(id);
  duringCreate=async()=>{await db.doc(`citas/${id}`).update({estadoCita:'Cancelada',calendarSyncRequested:'2026-10-07T12:03:00Z'});await worker.enqueue(id);};
  await worker.run(id); assert.equal((await job(id)).state,'pending');
  await worker.run(id); const j=await job(id); assert.equal(j.state,'synced'); assert.equal(events.get(j.eventId).status,'cancelled');
});
test('lectura actual evita revertir una edición por entrega antigua fuera de orden', async () => {
  const id='central-order'; await add(id);
  await db.doc(`citas/${id}`).update({horaCita:'4:00 PM'});
  await worker.enqueue(id, example(id)); await worker.run(id);
  assert.equal(events.get((await job(id)).eventId).start.dateTime,'2026-10-10T16:00:00');
});
test('borrado de cita vinculada cancela con snapshot previo sin recrear la cita',async()=>{
  const id='central-delete';await add(id);await worker.run(id);
  const before=(await db.doc(`citas/${id}`).get()).data() as Cita;
  await db.doc(`citas/${id}`).delete();await worker.enqueue(id,before);await worker.run(id);
  assert.equal(events.get((await job(id)).eventId).status,'cancelled');
  assert.equal((await db.doc(`citas/${id}`).get()).exists,false);
});
test('no exportar historial no solicitado ni reprocesar estado del servidor',async()=>{
  const id='central-history';const c={...example(id),calendarSyncRequested:'',ultimaActualizacion:''};
  await db.doc(`citas/${id}`).set(c);await worker.enqueue(id);assert.equal((await db.doc(`calendarJobs/${id}`).get()).exists,false);
  assert.equal(revision(example(id)),revision({...example(id),idEventoCalendar:'new',calendarDestino:CALENDAR_ID,calendarSyncDone:'x'}));
});
test('lease interrumpido expira y pausa impide nuevas operaciones',async()=>{
  const id='central-lease';await add(id);await db.doc(`calendarJobs/${id}`).update({leaseUntil:Date.now()+60000});
  await worker.run(id);assert.equal((await job(id)).state,'pending');
  await db.doc(`calendarJobs/${id}`).update({leaseUntil:Date.now()-1});
  await db.doc('settings/calendarCentral').update({enabled:false});await worker.run(id);assert.equal((await job(id)).state,'pending');
  await db.doc('settings/calendarCentral').update({enabled:true});await worker.run(id);assert.equal((await job(id)).state,'synced');
});
test('barrido recupera cambios pendientes sin disparador ni navegador',async()=>{
 const id='central-sweep';await db.doc(`citas/${id}`).set(example(id));
 await worker.sweep();assert.equal((await job(id)).state,'synced');
 assert.ok((await db.doc('settings/calendarCentral').get()).data()?.lastCheckedAt);
});
