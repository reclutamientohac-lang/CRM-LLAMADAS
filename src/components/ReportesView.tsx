import React, { useMemo, useState } from 'react';
import { useCRM } from '../context/CRMContext';
import { useAuth } from '../context/AuthContext';
import { normalizeOwner, getDateRangePreset, getDateInLA, getTodayInLA, formatDateDisplay, SIN_ASIGNAR } from '../businessRules';
import { Button, DataTable, Modal } from '../stage78/ui';
import { exportDashboardDrillDownToExcel } from '../excelUtils';
import type { Prospecto } from '../types';

export function ReportesView({onOpenProspecto}:{onOpenProspecto:(p:Prospecto)=>void}) {
  const crm = useCRM();
  const {isSupervisor} = useAuth();
  const [range,setRange] = useState(()=>getDateRangePreset('mes'));
  const [all,setAll] = useState(false);
  const [group,setGroup] = useState<'propietario'|'telemarketing'|'origen'>('propietario');
  const [detail,setDetail] = useState<{title:string;ids:string[]}|null>(null);
  const invalid = !all && (!range.desde || !range.hasta || range.desde > range.hasta);
  const data = useMemo(()=>{
    const inRange=(date:string)=>{const d=getDateInLA(date);return all || (!!d&&d>=range.desde&&d<=range.hasta);};
    const active=crm.prospectos.filter(p=>!p.archivado);
    const map=new Map(crm.prospectos.map(p=>[p.id,p]));
    const received=active.filter(p=>inRange(p.fechaRecepcion));
    const calls=crm.gestiones.filter(g=>inRange(g.fechaHora));
    const appointments=crm.citas.filter(c=>inRange(c.fechaCita)&&c.estadoCita!=='Cancelada');
    const soldIds=new Set(crm.ventas.filter(v=>v.estado!=='Cancelada').map(v=>v.idCita));
    const receivedIds=new Set(received.map(p=>p.id));
    const labels=[...new Set([...received.map(p=>normalizeOwner(p[group])||'Sin dato'),...appointments.map(c=>group==='telemarketing'?normalizeOwner(c.telemarketing)||SIN_ASIGNAR:normalizeOwner(map.get(c.idProspecto)?.[group]||'')||'Sin dato'),...calls.map(g=>group==='telemarketing'?normalizeOwner(g.telemarketing)||SIN_ASIGNAR:normalizeOwner(map.get(g.idProspecto)?.[group]||'')||'Sin dato')])];
    const groups=labels.map(label=>{
      const ps=received.filter(p=>(normalizeOwner(p[group])||'Sin dato')===label);
      const cs=appointments.filter(c=>(group==='telemarketing'?normalizeOwner(c.telemarketing)||SIN_ASIGNAR:normalizeOwner(map.get(c.idProspecto)?.[group]||'')||'Sin dato')===label);
      const gs=calls.filter(g=>(group==='telemarketing'?normalizeOwner(g.telemarketing)||SIN_ASIGNAR:normalizeOwner(map.get(g.idProspecto)?.[group]||'')||'Sin dato')===label);
      const sold=cs.filter(c=>soldIds.has(c.id));
      const without=ps.filter(p=>!p.telemarketing||p.telemarketing===SIN_ASIGNAR);
      return {_key:label,Grupo:label,Recibidos:ps.length,'Sin asignar':without.length,Llamadas:gs.length,Citas:cs.length,'Citas con venta':sold.length,'% Citas con venta':cs.length?sold.length/cs.length:0,_ids:{Recibidos:ps.map(p=>p.id),'Sin asignar':without.map(p=>p.id),Llamadas:gs.map(g=>g.idProspecto),Citas:cs.map(c=>c.idProspecto),'Citas con venta':sold.map(c=>c.idProspecto)}};
    }).sort((a,b)=>b.Recibidos-a.Recibidos||b.Citas-a.Citas);
    const today=getTodayInLA();
    const hasResult=new Set(crm.retroalimentaciones.map(r=>r.idCita));
    const pending=crm.citas.filter(c=>c.estadoCita!=='Cancelada'&&getDateInLA(c.fechaCita)&&getDateInLA(c.fechaCita)<today&&!hasResult.has(c.id));
    return {received,calls,appointments,groups,map,receivedIds,alerts:[
      {title:'Prospectos sin asignar',ps:active.filter(p=>!p.telemarketing||p.telemarketing===SIN_ASIGNAR)},
      {title:'Seguimientos vencidos',ps:active.filter(p=>p.fechaProximaAccion&&getDateInLA(p.fechaProximaAccion)<today&&!['Venta','Descartado'].includes(p.estado))},
      {title:'Citas pasadas sin resultado',ps:pending.map(c=>map.get(c.idProspecto)).filter((p):p is Prospecto=>!!p)},
      {title:'Sin fecha de ingreso',ps:active.filter(p=>!getDateInLA(p.fechaRecepcion))}
    ]};
  },[crm.prospectos,crm.gestiones,crm.citas,crm.ventas,crm.retroalimentaciones,range,all,group]);
  if(!isSupervisor)return <p>Disponible para administración.</p>;
  const detailRows=detail?[...new Set(detail.ids)].flatMap(id=>{const p=data.map.get(id);return p?[{_key:p.id,Prospecto:p.nombre,Teléfono:p.telefono,Telemarketing:p.telemarketing||SIN_ASIGNAR,Estado:p.estado,Ingreso:p.fechaRecepcion?formatDateDisplay(p.fechaRecepcion):'Sin fecha',Seguimiento:p.fechaProximaAccion?formatDateDisplay(p.fechaProximaAccion):'—'}]:[];}):[];
  return <section className="crm78 space-y-5">
    <div className="crm78-card"><h2>Resumen de gestión</h2><p>Consulta la actividad del período y abre los registros que necesitan atención.</p>
      <div className="crm78-toolbar">{(['hoy','semana','mes'] as const).map((p,i)=><Button key={p} onClick={()=>{setAll(false);setRange(getDateRangePreset(p));}}>{['Hoy','Esta semana','Este mes'][i]}</Button>)}<Button onClick={()=>setAll(true)}>Todo el historial</Button></div>
      <div className="crm78-toolbar"><label>Desde <input aria-label="Resumen desde" type="date" disabled={all} value={range.desde} onChange={e=>setRange({...range,desde:e.target.value})}/></label><label>Hasta <input aria-label="Resumen hasta" type="date" disabled={all} value={range.hasta} onChange={e=>setRange({...range,hasta:e.target.value})}/></label>{all&&<Button onClick={()=>setAll(false)}>Elegir fechas</Button>}<label>Agrupar por <select value={group} onChange={e=>setGroup(e.target.value as typeof group)}><option value="propietario">Propietario</option><option value="telemarketing">Telemarketing</option><option value="origen">Origen</option></select></label></div>
      <p>{all?'Todo el historial disponible':`${formatDateDisplay(range.desde)} al ${formatDateDisplay(range.hasta)}`} · Horario de Los Ángeles.</p>
    </div>
    {invalid?<p role="alert">Selecciona un rango de fechas válido.</p>:<div className="crm78-card"><h3>Resultados del período</h3><p>Recibidos: {data.received.length} · Llamadas registradas: {data.calls.length} · Citas no canceladas: {data.appointments.length}</p><p className="crm78-note">Recibidos usa la fecha de ingreso; llamadas, su fecha de gestión; citas, la fecha de la cita. Ventas corresponde a esas mismas citas. Los conteos históricos sin fecha de llamada no se presentan como actividad del período. El porcentaje de venta usa todas las citas no canceladas, incluidas las pendientes.</p><Button onClick={()=>exportDashboardDrillDownToExcel('Resumen_de_gestion',data.groups.map(({_key,_ids,...row})=>row))}>Exportar resumen</Button><DataTable rows={data.groups} onCell={(row,key)=>{const ids=key==='% Citas con venta'?row._ids['Citas con venta']:row._ids[key]||Object.values(row._ids).flat();setDetail({title:`${row.Grupo} · ${key}`,ids:ids as string[]});}}/><p>Pulsa una cifra para ver los prospectos relacionados.</p></div>}
    <div className="crm78-card"><h3>Necesita atención ahora</h3><p>Todos los prospectos activos y las citas pendientes, sin limitar al período seleccionado.</p><div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">{data.alerts.map(a=><button key={a.title} className="rounded-xl border border-slate-200 p-4 text-left hover:bg-amber-50" onClick={()=>setDetail({title:a.title,ids:a.ps.map(p=>p.id)})}><strong className="text-2xl block">{a.ps.length}</strong>{a.title}</button>)}</div></div>
    {detail&&<Modal title={detail.title} onClose={()=>setDetail(null)}><DataTable rows={detailRows} onCell={row=>{const p=data.map.get(row._key);if(p){setDetail(null);onOpenProspecto(p);}}}/><p>Selecciona un prospecto para abrir su ficha e historial.</p></Modal>}
  </section>;
}
