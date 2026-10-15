import type { Prospecto, Gestion, Cita, Venta, Retroalimentacion } from './types';

export const PIPELINE_STAGES = [
  { id: 'sin-llamar', label: 'Sin llamar', description: 'Contactos sin llamadas registradas', color: '#64748b' },
  { id: 'una-llamada', label: '1 llamada', description: 'Contactos con un intento', color: '#0284c7' },
  { id: 'dos-llamadas', label: '2 llamadas', description: 'Contactos con dos intentos', color: '#4f46e5' },
  { id: 'tres-llamadas', label: '3 llamadas o más', description: 'Contactos con tres o más intentos', color: '#9333ea' },
  { id: 'con-cita', label: 'Con cita', description: 'Citas históricas y actuales', color: '#b8922a' },
  { id: 'con-venta', label: 'Con venta', description: 'Ventas aprobadas o pendientes', color: '#059669' },
] as const;
export type PipelineStage = typeof PIPELINE_STAGES[number]['id'];
export interface PipelineContact { prospecto: Prospecto; stage: PipelineStage; llamadas: number; citas: number; ventas: number; }
export interface PipelineData { prospectos: Prospecto[]; gestiones: Gestion[]; citas: Cita[]; ventas: Venta[]; retroalimentaciones: Retroalimentacion[]; }
export interface PipelineScope { global: boolean; agent?: string; }

const normalize = (value: string | undefined) => (value || '').trim().toLocaleUpperCase('es');
const count = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;

/** A snapshot's intentos includes its historical baseline; do not add that baseline twice. */
export function buildPipeline(data: PipelineData, scope: PipelineScope): PipelineContact[] {
  const agent = normalize(scope.agent);
  if (!scope.global && (!agent || agent === 'SIN ASIGNAR')) return [];
  const prospects = new Map(data.prospectos.filter(p => p.id && !p.archivado && (scope.global || normalize(p.telemarketing) === agent)).map(p => [p.id, p]));
  const calls = new Map<string, number>();
  const appointments = new Map<string, Set<string>>();
  const sales = new Map<string, Set<string>>();
  const citaOwner = new Map<string, string>();
  const salesById = new Map(data.ventas.map(v => [v.id, v]));
  const salesByCita = new Map<string, Venta[]>();
  const add = (map: Map<string, Set<string>>, owner: string, id: string) => {
    if (!prospects.has(owner) || !id) return;
    const ids = map.get(owner) || new Set<string>(); ids.add(id); map.set(owner, ids);
  };
  for (const c of data.citas) { citaOwner.set(c.id, c.idProspecto); add(appointments, c.idProspecto, c.id); }
  const seenCalls = new Set<string>();
  for (const g of data.gestiones) {
    if (!prospects.has(g.idProspecto) || !g.id || seenCalls.has(g.id)) continue;
    seenCalls.add(g.id);
    if (normalize(g.canal) === 'LLAMADA' || !g.canal) calls.set(g.idProspecto, (calls.get(g.idProspecto) || 0) + 1);
    if (g.idCita) add(appointments, g.idProspecto, g.idCita);
  }
  for (const v of data.ventas) {
    const owner = v.idProspecto || citaOwner.get(v.idCita) || '';
    const list = salesByCita.get(v.idCita) || []; list.push(v); salesByCita.set(v.idCita, list);
    if (v.estado !== 'Cancelada') add(sales, owner, v.id);
  }
  for (const r of data.retroalimentaciones) {
    const owner = r.idProspecto || citaOwner.get(r.idCita) || '';
    if (r.idCita) add(appointments, owner, r.idCita);
    if (r.resultado !== 'Venta') continue;
    // A later cancelled sale overrides its older successful appointment result.
    if ((r.idVenta && salesById.has(r.idVenta)) || (salesByCita.get(r.idCita) || []).length) continue;
    add(sales, owner, 'resultado:' + (r.idCita || r.id));
  }
  return Array.from(prospects.values(), prospecto => {
    if (prospecto.idCita) add(appointments, prospecto.id, prospecto.idCita);
    const llamadas = Math.max(count(prospecto.intentos), count(prospecto.intentosHistoricos) + (calls.get(prospecto.id) || 0));
    const citas = appointments.get(prospecto.id)?.size || 0;
    const ventas = sales.get(prospecto.id)?.size || 0;
    const stage: PipelineStage = ventas ? 'con-venta' : citas ? 'con-cita' : llamadas >= 3 ? 'tres-llamadas' : llamadas === 2 ? 'dos-llamadas' : llamadas === 1 ? 'una-llamada' : 'sin-llamar';
    return { prospecto, stage, llamadas, citas, ventas };
  });
}
