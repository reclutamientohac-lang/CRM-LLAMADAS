import { randomUUID } from 'node:crypto';
import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import type { Cita } from '../../src/types';
import { CALENDAR_ID, calendarSyncRevision, syncCalendarEvent } from '../../src/calendar/events';
import { eligible, payload, revision, retryDelay } from './policy';

const LEASE_MS = 180_000;
export class CalendarWorker {
  constructor(private db: Firestore, private token: () => Promise<string>) {}
  private config() { return this.db.doc('settings/calendarCentral'); }
  async enqueue(id: string, deleted?: Cita) {
    const citaRef = this.db.doc(`citas/${id}`), jobRef = this.db.doc(`calendarJobs/${id}`);
    await this.db.runTransaction(async tx => {
      const [settings, current, job] = await Promise.all([tx.get(this.config()), tx.get(citaRef), tx.get(jobRef)]);
      if (!settings.data()?.enabled) return;
      const old = job.data();
      const c = current.exists ? { ...current.data(), id } as Cita : deleted || old?.payload;
      if (!c || (!eligible(c) && !old)) return;
      // Never publish unrequested historical appointments during activation.
      if (!old && current.exists && calendarSyncRevision(c) === c.calendarSyncDone) return;
      const data = payload(current.exists ? c : { ...c, estadoCita: 'Cancelada' });
      const next = revision(data);
      if (old?.desiredRevision === next) return;
      tx.set(jobRef, { payload: data, desiredRevision: next, attempts: 0,
        state: 'pending', nextAttemptAt: Date.now(), updatedAt: new Date().toISOString(),
        error: '', ...(old ? {} : { leaseUntil: 0 }) }, { merge: true });
    });
  }
  async run(id: string) {
    const jobRef = this.db.doc(`calendarJobs/${id}`), citaRef = this.db.doc(`citas/${id}`);
    const lease = randomUUID();
    const claimed = await this.db.runTransaction(async tx => {
      const [cfg, snap, cita] = await Promise.all([tx.get(this.config()), tx.get(jobRef), tx.get(citaRef)]);
      const j = snap.data();
      if (!cfg.data()?.enabled || !j || j.doneRevision === j.desiredRevision || !j.nextAttemptAt || j.nextAttemptAt > Date.now() || j.leaseUntil > Date.now()) return null;
      // Respect in-flight legacy browser workers during migration.
      if ((cita.data()?.calendarSyncLeaseUntil || 0) > Date.now()) return null;
      tx.update(jobRef, { lease, leaseUntil: Date.now() + LEASE_MS, state: 'processing' });
      // Also makes an older browser's claim fail until the central worker finishes.
      if (cita.exists) tx.update(citaRef, { calendarSyncLease: lease, calendarSyncLeaseUntil: Date.now() + LEASE_MS });
      return j;
    });
    if (!claimed) return;
    const c: Cita = { ...claimed.payload, ...(claimed.eventId ? { idEventoCalendar: claimed.eventId, calendarDestino: CALENDAR_ID } : {}) };
    try {
      const result = await syncCalendarEvent(c, await this.token());
      await this.db.runTransaction(async tx => {
        const [snap, cita] = await Promise.all([tx.get(jobRef), tx.get(citaRef)]);
        const j = snap.data();
        if (j?.lease !== lease) return;
        const changed = j.desiredRevision !== claimed.desiredRevision;
        tx.update(jobRef, { ...{ eventId: result.idEventoCalendar, eventUrl: result.enlaceCalendar },
          doneRevision: claimed.desiredRevision, state: changed ? 'pending' : 'synced', error: '', attempts: 0,
          leaseUntil: 0, nextAttemptAt: changed ? Date.now() : FieldValue.delete(), syncedAt: new Date().toISOString() });
        if (cita.exists) {
          const same = revision({ ...cita.data(), id } as Cita) === claimed.desiredRevision;
          tx.update(citaRef, { ...result, calendarDestino: CALENDAR_ID, calendarSyncLeaseUntil: 0,
            ...(same ? { calendarSyncDone: calendarSyncRevision(c), calendarCentralDone: claimed.desiredRevision,
              calendarSyncError: '', calendarSyncErrorVersion: '' } : {}) });
        }
      });
      await this.config().set({ lastSuccessAt: new Date().toISOString() }, { merge: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo sincronizar con Calendar.';
      const attempts = (claimed.attempts || 0) + 1, delay = retryDelay(error, attempts);
      await this.db.runTransaction(async tx => {
        const [snap, cita] = await Promise.all([tx.get(jobRef), tx.get(citaRef)]);
        const j = snap.data();
        if (j?.lease !== lease) return;
        const changed = j.desiredRevision !== claimed.desiredRevision;
        tx.update(jobRef, { state: changed ? 'pending' : delay === null ? 'review' : 'retry',
          leaseUntil: 0, attempts: changed ? 0 : attempts, error: changed ? '' : message,
          nextAttemptAt: changed ? Date.now() : delay === null ? FieldValue.delete() : Date.now() + delay });
        if (cita.exists) tx.update(citaRef, { calendarSyncLeaseUntil: 0,
          ...(!changed ? { calendarSyncError: message, calendarSyncErrorVersion: calendarSyncRevision(c) } : {}) });
      });
    }
  }
  async sweep() {
    if (!(await this.config().get()).data()?.enabled) return;
    // Recover changes that occurred during activation/deployment or a missed trigger.
    const batches = await Promise.all([
      this.db.collection('citas').where('calendarSyncRequested', '>', '').get(),
      this.db.collection('citas').where('calendarDestino', '==', CALENDAR_ID).get(),
    ]);
    const ids = new Set(batches.flatMap(batch => batch.docs.map(c => c.id)));
    for (const id of ids) await this.enqueue(id);
    const due = await this.db.collection('calendarJobs').where('nextAttemptAt', '<=', Date.now()).orderBy('nextAttemptAt').limit(5).get();
    for (const job of due.docs) await this.run(job.id);
    await this.config().set({ lastCheckedAt: new Date().toISOString() }, { merge: true });
  }
}
