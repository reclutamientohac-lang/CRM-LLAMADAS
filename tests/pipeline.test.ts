import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPipeline, PIPELINE_STAGES, type PipelineData } from '../src/pipeline';
import type { Prospecto, Gestion, Cita, Venta, Retroalimentacion } from '../src/types';
const p = (id: string, extra: Partial<Prospecto> = {}) => ({ id, nombre: id, telemarketing: 'GERAL', intentos: 0, ...extra } as Prospecto);
const g = (id: string, idProspecto: string, extra: Partial<Gestion> = {}) => ({ id, idProspecto, canal: 'Llamada', ...extra } as Gestion);
const c = (id: string, idProspecto: string, extra: Partial<Cita> = {}) => ({ id, idProspecto, estadoCita: 'Agendada', ...extra } as Cita);
const v = (id: string, idProspecto: string, extra: Partial<Venta> = {}) => ({ id, idProspecto, idCita: id + '-cita', estado: 'Aprobada', ...extra } as Venta);
const data = (extra: Partial<PipelineData> = {}): PipelineData => ({ prospectos: [], gestiones: [], citas: [], ventas: [], retroalimentaciones: [], ...extra });
const global = { global: true };
test('six exclusive stages, duplicated records and repeated appointments never duplicate a contact', () => {
  const rows = buildPipeline(data({ prospectos: [p('0'), p('1', { intentos: 1 }), p('2', { intentos: 2 }), p('3', { intentos: 8 }), p('c'), p('v'), p('v')], citas: [c('ca', 'c'), c('cb', 'c'), c('ca', 'c'), c('cv', 'v')], ventas: [v('va', 'v'), v('va', 'v')] }), global);
  assert.deepEqual(rows.map(r => r.stage), PIPELINE_STAGES.map(s => s.id));
  assert.equal(rows.length, 6); assert.equal(rows[4].citas, 2); assert.equal(rows[5].ventas, 1);
});
test('historical attempts overlap with snapshot counter, new calls added only once', () => {
  const rows = buildPipeline(data({ prospectos: [p('a', { intentos: 2, intentosHistoricos: 2 }), p('b', { intentos: 3, intentosHistoricos: 2 }), p('c', { intentos: 0, intentosHistoricos: 2 })], gestiones: [g('new', 'b'), g('new', 'b'), g('other', 'b', { canal: 'WhatsApp' }), g('new-c', 'c')] }), global);
  assert.deepEqual(rows.map(r => r.llamadas), [2, 3, 3]);
});
test('historical, current, cancelled and rescheduled appointments all reach appointment stage', () => {
  const rows = buildPipeline(data({ prospectos: [p('old'), p('now'), p('cancel'), p('reschedule'), p('linked', { idCita: 'historical-link' })], citas: [c('old-c', 'old', { fechaCita: '2020-01-01' }), c('now-c', 'now', { fechaCita: '2030-01-01' }), c('cancel-c', 'cancel', { estadoCita: 'Cancelada' }), c('res-c', 'reschedule', { estadoCita: 'Reprogramada' })] }), global);
  assert.ok(rows.every(r => r.stage === 'con-cita'));
});
test('approved and pending sales have priority, cancelled sales never override appointments', () => {
  const rows = buildPipeline(data({ prospectos: [p('approved'), p('pending'), p('cancel')], citas: [c('cancel-c', 'cancel')], ventas: [v('a', 'approved'), v('b', 'pending', { estado: 'Pendiente' }), v('x', 'cancel', { estado: 'Cancelada', idCita: 'cancel-c' })], retroalimentaciones: [{ id: 'r', idProspecto: 'cancel', idCita: 'cancel-c', resultado: 'Venta', idVenta: 'x' } as Retroalimentacion] }), global);
  assert.deepEqual(rows.map(r => r.stage), ['con-venta', 'con-venta', 'con-cita']);
});
test('historical sale result without sale document is recognized, future sale is not', () => {
  const rows = buildPipeline(data({ prospectos: [p('closed'), p('future')], retroalimentaciones: [{ id: 'a', idProspecto: 'closed', idCita: 'ca', resultado: 'Venta' }, { id: 'b', idProspecto: 'future', idCita: 'cb', resultado: 'Venta futura' }] as Retroalimentacion[] }), global);
  assert.deepEqual(rows.map(r => r.stage), ['con-venta', 'con-cita']);
});
test('agent sees only currently assigned contacts, missing assignment fails closed, records never add orphan contacts', () => {
  const d = data({ prospectos: [p('mine', { telemarketing: ' Geral ' }), p('other', { telemarketing: 'IRENE' }), p('unassigned', { telemarketing: 'SIN ASIGNAR' })], gestiones: [g('g1', 'other', { telemarketing: 'GERAL' })], citas: [c('orphan-c', 'missing')], ventas: [v('orphan-v', 'missing')] });
  assert.deepEqual(buildPipeline(d, { global: false, agent: 'GERAL' }).map(r => r.prospecto.id), ['mine']);
  assert.deepEqual(buildPipeline(d, { global: false }), []); assert.deepEqual(buildPipeline(d, { global: false, agent: 'SIN ASIGNAR' }), []);
  assert.equal(buildPipeline(d, global).length, 3);
});
test('invalid counters stay finite and archived contacts remain available', () => {
  const rows = buildPipeline(data({ prospectos: [p('a', { intentos: -5 }), p('b', { intentos: NaN }), p('c', { archivado: true, intentos: 1.9 })] }), global);
  assert.deepEqual(rows.map(r => r.llamadas), [0, 0, 1]); assert.equal(rows.length, 3);
});
test('live changes advance contact without mutating snapshots or financial fields', () => {
  const d = data({ prospectos: [p('a')] }); const original = JSON.stringify(d); assert.equal(buildPipeline(d, global)[0].stage, 'sin-llamar'); assert.equal(JSON.stringify(d), original);
  d.gestiones.push(g('g', 'a')); assert.equal(buildPipeline(d, global)[0].stage, 'una-llamada');
  d.citas.push(c('c', 'a')); assert.equal(buildPipeline(d, global)[0].stage, 'con-cita');
  d.ventas.push(v('v', 'a', { bonoGenerado: 67.5, montoAprobado: 4500 })); const sold = JSON.stringify(d);
  assert.equal(buildPipeline(d, global)[0].stage, 'con-venta'); assert.equal(JSON.stringify(d), sold);
});
