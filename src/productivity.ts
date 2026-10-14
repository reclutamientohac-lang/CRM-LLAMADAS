import type { ActivityData, Entity, GoalValues } from './commercial';
import { chronologyKey, monthBounds, ratioPercent } from './commercial';
import { sumMoney, scaledInteger } from './money';
import type { UsuarioAutorizado } from './types';

export type ProductivityTab = Entity['type'];
export interface ReportPerson extends Entity { role?:string; unassigned?:boolean }
export interface Period { month:string; from:string; until:string; lastDay:number }
export interface ProductivityResult extends GoalValues {
  citasConVenta:number;
  contactosTrabajados:number;
  contactosBase:number;
  contactosConvertidos:number;
  citasConvertidas:number;
  conversionContacto:number|null;
  conversionCita:number|null;
  volumenPorVenta:number|null;
}
export const reportMetrics = (tab:ProductivityTab):[keyof GoalValues,string][] => tab==='Telemarketing'
  ? [['llamadas','Llamadas registradas'],['citas','Citas agendadas'],['ventas','Citas con venta'],['volumen','Volumen de venta']]
  : [['ingresados','Contactos ingresados'],['citas','Citas creadas'],['ventas','Ventas aprobadas'],['volumen','Volumen aprobado']];
export function previousMonth(month:string,offset=1):string {
  monthBounds(month);const date=new Date(month+'-01T12:00:00Z');date.setUTCMonth(date.getUTCMonth()-offset);return date.toISOString().slice(0,7);
}
export function daysInMonth(month:string):number { const {until}=monthBounds(month);const date=new Date(until+'T12:00:00Z');date.setUTCDate(date.getUTCDate()-1);return date.getUTCDate(); }
export function reportPeriod(month:string,day?:number):Period {
  const bounds=monthBounds(month);if(day!==undefined&&(!Number.isInteger(day)||day<1||day>31))throw new Error('El día de corte debe estar entre 1 y 31.');
  const lastDay=Math.min(day??31,daysInMonth(month));const date=new Date(`${month}-${String(lastDay).padStart(2,'0')}T12:00:00Z`);date.setUTCDate(date.getUTCDate()+1);
  return {month,from:bounds.from,until:date.toISOString().slice(0,10),lastDay};
}
export function comparableDay(first:string,second:string,requested:number):number { return Math.min(reportPeriod(first,requested).lastDay,reportPeriod(second,requested).lastDay); }
const unique=<T extends {id:string}>(rows:T[]):T[]=>[...new Map(rows.map(r=>[r.id,r])).values()];
const dateOf=(date?:string)=>chronologyKey(date||'').slice(0,10);
const validAgent=(name?:string)=>!!name&&name!=='SIN ASIGNAR';

// Identity comes from the stored email/agent. A display name never grants access.
export function reportPeople(data:ActivityData,users:UsuarioAutorizado[],agents:{name:string}[],tab:ProductivityTab):ReportPerson[] {
  const map=new Map<string,ReportPerson>();
  if(tab==='Telemarketing'){
    const add=(identity?:string)=>{if(validAgent(identity))map.set(identity!,{type:tab,identity:identity!,name:identity!,role:'Telemarketing'});};
    agents.forEach(a=>add(a.name));data.prospectos.forEach(p=>add(p.telemarketing));data.gestiones.forEach(g=>add(g.telemarketing));data.citas.forEach(c=>add(c.telemarketing));data.ventas.forEach(v=>add(v.telemarketing));
    if(data.gestiones.some(g=>!validAgent(g.telemarketing))||data.citas.some(c=>!validAgent(c.telemarketing))||data.ventas.some(v=>!validAgent(v.telemarketing)))map.set('__unassigned__',{type:tab,identity:'__unassigned__',name:'Sin agente registrado',unassigned:true});
  }else{
    data.prospectos.forEach(p=>{const email=p.propietarioEmail?.trim().toLowerCase();if(email)map.set(email,{type:tab,identity:email,name:p.propietario||email,role:'Propietario'});});
    users.filter(u=>u.rol==='Vendedor'||u.rol==='Distribuidor').forEach(u=>{const identity=u.email.trim().toLowerCase();if(identity)map.set(identity,{type:tab,identity,name:u.nombre||identity,role:u.rol});});
    if(data.prospectos.some(p=>!p.propietarioEmail?.trim()))map.set('__unassigned__',{type:tab,identity:'__unassigned__',name:'Sin propietario vinculado',unassigned:true});
  }
  return [...map.values()].sort((a,b)=>Number(!!a.unassigned)-Number(!!b.unassigned)||a.name.localeCompare(b.name,'es')||a.identity.localeCompare(b.identity));
}
export function productivityReport(data:ActivityData,tab:ProductivityTab,period:Period,person?:ReportPerson):ProductivityResult {
  const all=unique(data.prospectos);const allIds=new Set(all.map(p=>p.id));
  const owns=(p:typeof all[number])=>!person || (person.unassigned?!p.propietarioEmail?.trim():p.propietarioEmail?.trim().toLowerCase()===person.identity.toLowerCase());
  const ps=tab==='Vendedor'?all.filter(owns):all;
  const ids=tab==='Vendedor'?new Set(ps.map(p=>p.id)):allIds;
  const agentMatches=(agent?:string)=>tab!=='Telemarketing'||!person||(person.unassigned?!validAgent(agent):agent===person.identity);
  const inPeriod=(date?:string)=>{const d=dateOf(date);return !!d&&d>=period.from&&d<period.until;};
  const beforeEnd=(date?:string)=>{const d=dateOf(date);return !!d&&d<period.until;};
  const gs=unique(data.gestiones).filter(g=>ids.has(g.idProspecto)&&agentMatches(g.telemarketing)&&(!g.canal||g.canal==='Llamada'));
  const cs=unique(data.citas).filter(c=>ids.has(c.idProspecto)&&agentMatches(c.telemarketing)&&c.estadoCita!=='Cancelada');
  const vs=unique(data.ventas).filter(v=>ids.has(v.idProspecto)&&agentMatches(v.telemarketing)&&v.estado==='Aprobada');
  const calls=gs.filter(g=>inPeriod(g.creadoEn||g.fechaHora));const appointments=cs.filter(c=>inPeriod(c.fechaCreacion));const sales=vs.filter(v=>inPeriod(v.fechaReporte));
  // Match both parents: an unrelated sale never converts an appointment.
  const citaById=new Map(cs.map(c=>[c.id,c]));
  const validSale=(v:typeof vs[number])=>{const c=citaById.get(v.idCita);return !!c&&c.idProspecto===v.idProspecto;};
  const citasConVenta=new Set(sales.filter(validSale).map(v=>v.idCita)).size;
  const received=ps.filter(p=>inPeriod(p.fechaRecepcion||p.creadoEn));
  const firstCall=new Map<string,string>();calls.forEach(g=>{const time=chronologyKey(g.creadoEn||g.fechaHora);if(!firstCall.has(g.idProspecto)||time<firstCall.get(g.idProspecto)!)firstCall.set(g.idProspecto,time);});
  const base=tab==='Telemarketing'?new Set(firstCall.keys()):new Set(received.map(p=>p.id));
  const reception=new Map(received.map(p=>[p.id,chronologyKey(p.fechaRecepcion||p.creadoEn)]));
  const contactosConvertidos=new Set(cs.filter(c=>{const created=chronologyKey(c.fechaCreacion);const start=tab==='Telemarketing'?firstCall.get(c.idProspecto):reception.get(c.idProspecto);return !!created&&!!start&&base.has(c.idProspecto)&&created>=start&&created.slice(0,10)<period.until;}).map(c=>c.idProspecto)).size;
  const appointmentIds=new Set(appointments.map(c=>c.id));
  const citasConvertidas=new Set(vs.filter(v=>validSale(v)&&appointmentIds.has(v.idCita)&&beforeEnd(v.fechaReporte)&&dateOf(v.fechaReporte)>=dateOf(citaById.get(v.idCita)!.fechaCreacion)).map(v=>v.idCita)).size;
  const volumen=sumMoney(sales.map(v=>v.montoAprobado));
  return {ingresados:received.length,llamadas:calls.length,citas:appointments.length,ventas:tab==='Telemarketing'?citasConVenta:sales.length,volumen,citasConVenta,contactosTrabajados:firstCall.size,contactosBase:base.size,contactosConvertidos,citasConvertidas,conversionContacto:base.size?ratioPercent(contactosConvertidos,base.size):null,conversionCita:appointments.length?ratioPercent(citasConvertidas,appointments.length):null,volumenPorVenta:sales.length?Number(scaledInteger(volumen,2)/BigInt(sales.length))/100:null};
}
export function metricChange(current:number,previous:number,money=false):{difference:number;percentage:number|null} {
  const a=money?scaledInteger(current,2):BigInt(current);const b=money?scaledInteger(previous,2):BigInt(previous);const diff=a-b;
  return {difference:Number(diff)/(money?100:1),percentage:b===0n?null:Number(diff*10000n/b)/100};
}
export function sumGoals(goals:GoalValues[]):GoalValues {
  return {ingresados:goals.reduce((s,g)=>s+g.ingresados,0),llamadas:goals.reduce((s,g)=>s+g.llamadas,0),citas:goals.reduce((s,g)=>s+g.citas,0),ventas:goals.reduce((s,g)=>s+g.ventas,0),volumen:sumMoney(goals.map(g=>g.volumen))};
}
