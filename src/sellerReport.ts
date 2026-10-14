import type { Prospecto, Gestion, Cita, Venta } from './types';
import { reportDateLA } from './businessRules';
import { ownerEmail } from './sellerPolicy';

export function sellerReport(data: { prospectos: Prospecto[]; gestiones: Gestion[]; citas: Cita[]; ventas: Venta[] }, email: string, desde: string, hasta: string) {
  const inRange = (date?: string) => { const day = reportDateLA(date || ''); return !!day && (!desde || day >= desde) && (!hasta || day <= hasta); };
  const unique = <T extends {id: string}>(rows: T[]) => [...new Map(rows.map(r => [r.id, r])).values()];
  const ps = unique(data.prospectos).filter(p => ownerEmail(p.propietarioEmail) === email && !!email);
  const ids = new Set(ps.map(p => p.id));
  const gs = unique(data.gestiones).filter(g => ids.has(g.idProspecto) && inRange(g.creadoEn || g.fechaHora));
  const cs = unique(data.citas).filter(c => ids.has(c.idProspecto) && inRange(c.fechaCita));
  const vs = unique(data.ventas).filter(v => ids.has(v.idProspecto) && inRange(v.fechaReporte));
  return {
    cartera: ps.length,
    ingresados: ps.filter(p => inRange(p.fechaRecepcion || p.creadoEn)).length,
    cargadosPorVendedor: unique(data.prospectos).filter(p => ownerEmail(p.creadoPor) === email && inRange(p.creadoEn)).length,
    gestiones: gs.length,
    citas: cs.filter(c => c.estadoCita !== 'Cancelada').length,
    citasCanceladas: cs.filter(c => c.estadoCita === 'Cancelada').length,
    ventasAprobadas: vs.filter(v => v.estado === 'Aprobada').length,
    ventasPendientes: vs.filter(v => v.estado === 'Pendiente').length,
    volumen: vs.filter(v => v.estado === 'Aprobada').reduce((sum, v) => sum + (Number.isFinite(v.montoAprobado) ? v.montoAprobado! : 0), 0),
  };
}
