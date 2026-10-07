import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { setGlobalOptions } from 'firebase-functions/v2';
import { defineString } from 'firebase-functions/params';
import { GoogleAuth, Impersonated } from 'google-auth-library';
import { CALENDAR_ID, CalendarError } from '../../src/calendar/events';
import type { Cita } from '../../src/types';
import { CalendarWorker } from './worker';
import { adminAllowed } from './policy';

initializeApp();
const database = 'ai-studio-e3fb58d5-7744-4050-bf57-8e9490a79402';
const serviceAccount = 'crm-calendar-sync@project-76706253-7b54-4622-a4a.iam.gserviceaccount.com';
const region = defineString('CALENDAR_FUNCTION_REGION', { default: 'us-central1', description: 'Región compatible con la ubicación de la base Firestore.' });
setGlobalOptions({ region, serviceAccount: 'crm-calendar-worker@project-76706253-7b54-4622-a4a.iam.gserviceaccount.com', maxInstances: 2, concurrency: 1, memory: '256MiB', timeoutSeconds: 120 });
const db = getFirestore(database);
// Attached service identity: no downloaded private key and no user refresh token.
const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
let calendarClient: Impersonated | undefined;
async function token() {
  try {
    calendarClient ||= new Impersonated({ sourceClient: await auth.getClient(),
      targetPrincipal: serviceAccount, targetScopes: ['https://www.googleapis.com/auth/calendar.events'], lifetime: 3600 });
    const result = await calendarClient.getAccessToken();
    if (!result.token) throw new Error('missing token');
    return result.token;
  } catch {
    // Do not persist SDK errors that may include credential/request details.
    throw new CalendarError('El servidor no pudo renovar su autorización. Revisa los permisos de la cuenta de servicio.', 503);
  }
}
const worker = new CalendarWorker(db, token);
export const calendarCitaChanged = onDocumentWritten({ document: 'citas/{id}', database, retry: true }, async event => {
  const before = event.data?.before;
  await worker.enqueue(event.params.id, before?.exists ? { ...before.data(), id: event.params.id } as Cita : undefined);
});
export const calendarJobChanged = onDocumentWritten({ document: 'calendarJobs/{id}', database, retry: true }, async event => {
  if (event.data?.after.exists) await worker.run(event.params.id);
});
export const calendarRetry = onSchedule({ schedule: 'every 5 minutes', timeZone: 'America/Los_Angeles', timeoutSeconds: 540 }, async () => { await worker.sweep(); });
export const calendarCentralControl = onCall({ cors: ['https://crm-llamadas.ai.studio'], timeoutSeconds: 120 }, async request => {
  if (!adminAllowed(request.auth)) throw new HttpsError('permission-denied', 'Solo la administradora puede gestionar la conexión central.');
  const action = request.data?.action;
  if (!['activate', 'check', 'pause'].includes(action)) throw new HttpsError('invalid-argument', 'Acción no válida.');
  const ref = db.doc('settings/calendarCentral');
  if (action === 'pause') {
    await ref.set({ enabled: false, status: 'paused', updatedAt: new Date().toISOString() }, { merge: true });
    return { status: 'paused' };
  }
  try {
    const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events?maxResults=1&fields=accessRole`,
      { headers: { Authorization: `Bearer ${await token()}` }, signal: AbortSignal.timeout(20000) });
    const data = await response.json();
    if (!response.ok || !['writer', 'owner'].includes(data.accessRole)) throw new Error('La cuenta de servicio necesita permiso para modificar eventos en AGENDA DE CITAS.');
    const now = new Date().toISOString();
    await ref.set({ ...(action === 'activate' ? { enabled: true, activatedAt: now } : {}),
      status: 'ready', message: '', serviceAccountEmail: serviceAccount, calendarId: CALENDAR_ID, lastVerifiedAt: now }, { merge: true });
    // Scheduler recovers pending work even after the initiating client closes.
    return { status: 'ready' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo verificar el calendario.';
    await ref.set({ status: 'attention', message, lastVerifiedAt: new Date().toISOString() }, { merge: true });
    throw new HttpsError('failed-precondition', message);
  }
});
