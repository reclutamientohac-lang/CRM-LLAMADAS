import React, { useMemo, useState } from 'react';
import { Search, ArrowUpRight, Phone, Calendar, Award, Columns3, Users } from 'lucide-react';
import { useCRM } from '../context/CRMContext';
import { useAuth } from '../context/AuthContext';
import { buildPipeline, PIPELINE_STAGES, type PipelineStage } from '../pipeline';
import type { Prospecto } from '../types';

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLocaleLowerCase('es');
export function PipelineView({ onOpenProspecto }: { onOpenProspecto: (p: Prospecto) => void }) {
  const { prospectos, gestiones, citas, ventas, retroalimentaciones, loading, error } = useCRM();
  const { userProfile, isAdmin, isAuthorized, telemarketingAgent } = useAuth();
  const [agent, setAgent] = useState('');
  const [search, setSearch] = useState('');
  const [includeArchived, setIncludeArchived] = useState(true);
  const [limits, setLimits] = useState<Partial<Record<PipelineStage, number>>>({});
  const global = isAuthorized && (isAdmin || userProfile?.role === 'Supervisor' || userProfile?.role === 'Distribuidor');
  const contacts = useMemo(() => isAuthorized ? buildPipeline({ prospectos, gestiones, citas, ventas, retroalimentaciones }, { global, agent: telemarketingAgent }) : [], [prospectos, gestiones, citas, ventas, retroalimentaciones, global, isAuthorized, telemarketingAgent]);
  const agents = useMemo(() => Array.from(new Set(contacts.map(c => c.prospecto.telemarketing?.trim() || 'SIN ASIGNAR'))).sort((a, b) => a.localeCompare(b, 'es')), [contacts]);
  const visible = useMemo(() => contacts.filter(({ prospecto: p }) => {
    if (!includeArchived && p.archivado) return false;
    if (global && agent && normalize(p.telemarketing || 'SIN ASIGNAR') !== normalize(agent)) return false;
    const query = normalize(search);
    return !query || normalize([p.nombre, p.telefono, p.propietario, p.ciudadZona].join(' ')).includes(query);
  }).sort((a, b) => (b.prospecto.fechaRecepcion || '').localeCompare(a.prospecto.fechaRecepcion || '') || a.prospecto.nombre.localeCompare(b.prospecto.nombre, 'es')), [contacts, includeArchived, global, agent, search]);
  const groups = useMemo(() => PIPELINE_STAGES.map(stage => ({ ...stage, rows: visible.filter(c => c.stage === stage.id) })), [visible]);
  const total = visible.length;
  const appointments = visible.filter(c => c.citas > 0 || c.ventas > 0).length;
  const sold = visible.filter(c => c.ventas > 0).length;
  const reset = () => setLimits({});
  if (loading) return <div role="status" className="p-12 text-center text-slate-500">Cargando pipeline...</div>;
  return <div className="space-y-6">
    <section className="rounded-3xl bg-[#0D2240] text-white p-6 sm:p-8 shadow-lg">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div><div className="flex items-center gap-2 text-[#d4a938] text-xs font-bold uppercase tracking-widest"><Columns3 className="w-4 h-4" /> Avance comercial</div>
          <h1 className="text-2xl sm:text-3xl font-extrabold mt-2">Pipeline de contactos</h1>
          <p className="mt-2 text-sm text-slate-300">Historial completo, desde la primera llamada hasta la venta.</p></div>
        <div className="flex gap-6 text-center"><div><p className="text-3xl font-bold">{total.toLocaleString('es')}</p><p className="text-xs text-slate-300">Contactos</p></div><div><p className="text-3xl font-bold text-[#d4a938]">{total ? (100 * sold / total).toFixed(1) : '0'}%</p><p className="text-xs text-slate-300">Con venta</p></div></div>
      </div>
      <p className="text-xs text-slate-300 mt-5">{appointments.toLocaleString('es')} contactos alcanzaron una cita o venta. Cada contacto aparece en una sola etapa.</p>
    </section>
    {error && <div role="alert" className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-900">{error} Los conteos pueden estar incompletos hasta recuperar la conexión.</div>}
    <div className="flex flex-wrap items-end gap-4 bg-white rounded-2xl border border-slate-200 p-4">
      <label className="flex-1 min-w-48"><span className="block text-xs font-bold text-slate-600 mb-2">Buscar contacto</span><div className="relative"><Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" /><input type="search" value={search} onChange={e => { setSearch(e.target.value); reset(); }} placeholder="Nombre, teléfono o propietario" className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm" /></div></label>
      {global && <label><span className="block text-xs font-bold text-slate-600 mb-2">Telemarketing</span><select value={agent} onChange={e => { setAgent(e.target.value); reset(); }} className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm"><option value="">Todas las agentes</option>{agents.map(a => <option key={a} value={a}>{a}</option>)}</select></label>}
      {!global && <p className="text-sm font-semibold text-slate-600 py-3">Cartera: {telemarketingAgent || 'Sin asignar'}</p>}
      <label className="flex items-center gap-2 text-sm text-slate-600 py-3"><input type="checkbox" checked={includeArchived} onChange={e => { setIncludeArchived(e.target.checked); reset(); }} />Incluir archivados</label>
    </div>
    <p className="text-xs text-slate-500">Citas históricas y actuales, incluidas las canceladas. Ventas aprobadas o pendientes; las ventas canceladas no cuentan como venta. Las llamadas incluyen los intentos históricos.</p>
    <div className="overflow-x-auto pb-4" aria-label="Etapas del pipeline">
      <div className="grid grid-cols-6 gap-4" style={{ minWidth: 1200 }}>
        {groups.map(group => {
          const limit = limits[group.id] || 10;
          return <section key={group.id} aria-label={group.label} className="rounded-2xl border border-slate-200 bg-slate-100/70 overflow-hidden">
            <div className="p-4 bg-white border-t-4 border-b border-slate-200" style={{ borderTopColor: group.color }}>
              <h2 className="font-bold text-[#0D2240] text-sm">{group.label}</h2><div className="flex items-end justify-between mt-3"><span className="text-3xl font-extrabold" style={{ color: group.color }}>{group.rows.length.toLocaleString('es')}</span><span className="text-xs text-slate-500">{total ? (100 * group.rows.length / total).toFixed(1) : '0'}%</span></div><p className="text-xs text-slate-500 mt-2">{group.description}</p>
            </div>
            <div className="p-3 space-y-3">
              {group.rows.slice(0, limit).map(row => <button key={row.prospecto.id} onClick={() => onOpenProspecto(row.prospecto)} aria-label={`Abrir ficha de ${row.prospecto.nombre}`} className="w-full text-left bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:border-[#B8922A] hover:shadow-md focus-visible:outline-2 focus-visible:outline-[#B8922A] transition">
                <div className="flex justify-between gap-2"><span className="font-bold text-sm text-[#0D2240] break-words">{row.prospecto.nombre}</span><ArrowUpRight className="w-4 h-4 text-slate-400 shrink-0" /></div>
                <p className="text-xs text-slate-500 mt-1">{row.prospecto.telefono || 'Sin teléfono'}</p>
                <p className="flex items-center gap-1 text-xs text-slate-600 mt-3"><Users className="w-3 h-3" />{row.prospecto.telemarketing || 'SIN ASIGNAR'}</p>
                <div className="flex flex-wrap gap-2 mt-3 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1" title={`${row.llamadas} llamadas`} aria-label={`${row.llamadas} llamadas`}><Phone className="w-3 h-3" />{row.llamadas}</span>
                  <span className="inline-flex items-center gap-1" title={`${row.citas} citas`} aria-label={`${row.citas} citas`}><Calendar className="w-3 h-3" />{row.citas}</span>
                  <span className="inline-flex items-center gap-1" title={`${row.ventas} ventas`} aria-label={`${row.ventas} ventas`}><Award className="w-3 h-3" />{row.ventas}</span>
                </div>
                {row.prospecto.archivado && <span className="inline-block text-[10px] text-slate-500 bg-slate-100 px-2 py-1 rounded mt-3">Archivado</span>}
              </button>)}
              {!group.rows.length && <p className="text-xs text-slate-400 text-center py-8">Sin contactos en esta etapa</p>}
              {group.rows.length > limit && <button onClick={() => setLimits(prev => ({ ...prev, [group.id]: limit + 20 }))} className="w-full text-sm font-semibold text-[#0D2240] bg-white rounded-xl border border-slate-200 py-3">Ver más ({group.rows.length - limit})</button>}
            </div>
          </section>;
        })}
      </div>
    </div>
    {!total && <p role="status" className="text-center text-slate-500 text-sm pb-6">No hay contactos para estos filtros.</p>}
  </div>;
}
