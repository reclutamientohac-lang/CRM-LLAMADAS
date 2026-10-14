import type { Prospecto, Gestion, Cita, Venta, UserProfile } from './types';
import { reportDateLA } from './businessRules';
import { sumMoney, truncateDecimal, scaledInteger } from './money';
export interface ActivityData { prospectos: Prospecto[]; gestiones: Gestion[]; citas: Cita[]; ventas: Venta[] }
export type Entity = { type:'Vendedor'|'Telemarketing'; identity:string; name:string };
export type GoalValues = { ingresados:number; llamadas:number; citas:number; ventas:number; volumen:number };
export interface MonthlyGoal extends GoalValues { id:string; mes:string; tipo:Entity['type']; identidad:string; actualizadoPor:string }
export interface ClientEntry { id:string; idProspecto:string; tipo:'Nota'|'Documento'; texto:string; titulo:string; url:string; creadoPor:string; creadoEn?:unknown }
export const emptyGoals:GoalValues={ingresados:0,llamadas:0,citas:0,ventas:0,volumen:0};
const unique=<T extends {id:string}>(rows:T[])=>[...new Map(rows.map(r=>[r.id,r])).values()];
export function scopedActivity(data:ActivityData,profile:UserProfile|null,isAdmin=false):ActivityData {
 const global=isAdmin||profile?.role==='Distribuidor'||profile?.role==='Supervisor';
 const ps=unique(data.prospectos).filter(p=>global|| (profile?.role==='Vendedor'?!!profile.email&&p.propietarioEmail?.toLowerCase()===profile.email.toLowerCase():profile?.role==='Telemarketing'&&!!profile.telemarketingAgent&&p.telemarketing===profile.telemarketingAgent));
 const ids=new Set(ps.map(p=>p.id));return {prospectos:ps,gestiones:unique(data.gestiones).filter(g=>ids.has(g.idProspecto)),citas:unique(data.citas).filter(c=>ids.has(c.idProspecto)),ventas:unique(data.ventas).filter(v=>ids.has(v.idProspecto))};
}
export function contactLinks(phone:string,country='1') {
 const digits=phone.replace(/\D/g,'');const prefix=country.replace(/\D/g,'');
 if(!/^\d{7,15}$/.test(digits)||!/^\d{1,3}$/.test(prefix))return null;
 const international=phone.trim().startsWith('+')||digits.length>10?digits:prefix+digits;
 if(international.length>15)return null;
 return {call:`tel:+${international}`,whatsapp:`https://wa.me/${international}`};
}
export function safeDocumentUrl(raw:string):string {
 const url=new URL(raw.trim());if(url.protocol!=='https:'||url.username||url.password||!url.hostname)throw new Error('Usa un enlace HTTPS válido, sin usuario ni contraseña.');return url.href;
}
export function timestampISO(value:unknown):string {
 if(typeof value==='string')return value;
 if(value&&typeof value==='object'&&'toDate' in value&&typeof value.toDate==='function')return value.toDate().toISOString();
 return '';
}
export interface Reminder { id:string; kind:'llamada'|'cita'|'nuevo'; prospect:Prospecto; cita?:Cita; date:string; label:string; overdue:boolean; imminent:boolean }
export function buildReminders(data:ActivityData,now=new Date()):Reminder[] {
 const today=reportDateLA(now.toISOString());const tomorrow=new Date(today+'T12:00:00Z');tomorrow.setUTCDate(tomorrow.getUTCDate()+1);const tomorrowDay=tomorrow.toISOString().slice(0,10);
 const time=new Intl.DateTimeFormat('en-GB',{timeZone:'America/Los_Angeles',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(now).split(':').map(Number);const minute=time[0]*60+time[1];
 const ps=unique(data.prospectos).filter(p=>!p.archivado);const map=new Map(ps.map(p=>[p.id,p]));const called=new Set(data.gestiones.map(g=>g.idProspecto));
 const booked=new Set(data.citas.filter(c=>['Agendada','Reprogramada'].includes(c.estadoCita)).map(c=>c.idProspecto));const sold=new Set(data.ventas.filter(v=>v.estado==='Aprobada').map(v=>v.idProspecto));
 const rows:Reminder[]=[];
 for(const p of ps){
  const terminal=/^(Venta|Descartado|No interesado|Número desconectado\/incorrecto)$/i.test(p.estado||'');
  const date=reportDateLA(p.fechaProximaAccion||'');
  if(!terminal&&!booked.has(p.id)&&!sold.has(p.id)&&date&&date<=today)rows.push({id:'call:'+p.id,kind:'llamada',prospect:p,date,label:date<today?'Llamada vencida':'Llamar hoy',overdue:date<today,imminent:false});
  else if(!terminal&&!booked.has(p.id)&&!sold.has(p.id)&&!p.idCita&&!called.has(p.id)&&!(Number(p.intentos)>0)&&!(Number(p.intentosHistoricos)>0)&&!p.ultimoContacto)rows.push({id:'new:'+p.id,kind:'nuevo',prospect:p,date:reportDateLA(p.fechaRecepcion||p.creadoEn||''),label:'Sin primera llamada',overdue:false,imminent:false});
 }
 for(const c of unique(data.citas)){
  if(!['Agendada','Reprogramada'].includes(c.estadoCita)||!map.has(c.idProspecto)||!c.fechaCita||c.fechaCita>tomorrowDay)continue;
  const match=c.horaCita?.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);let minutes:number|null=null;
  if(match){let h=Number(match[1]);const m=Number(match[2]);if(match[3]){if(h>=1&&h<=12)h=h%12+(match[3].toUpperCase()==='PM'?12:0);else h=-1;}if(h>=0&&h<24&&m<60)minutes=h*60+m;}
  const overdue=c.fechaCita<today||(c.fechaCita===today&&minutes!==null&&minutes<minute);
  const diff=c.fechaCita===today&&minutes!==null?minutes-minute:null;
  rows.push({id:'appointment:'+c.id,kind:'cita',prospect:map.get(c.idProspecto)!,cita:c,date:c.fechaCita,label:overdue?'Cita pendiente de resultado':diff!==null&&diff>=0&&diff<=15?`Cita en ${diff} min`:c.fechaCita===today?'Cita de hoy':'Cita de mañana',overdue,imminent:diff!==null&&diff>=0&&diff<=15});
 }
 const score=(r:Reminder)=>r.imminent?0:r.overdue?1:r.kind==='llamada'?2:r.kind==='cita'?3:4;
 return rows.sort((a,b)=>score(a)-score(b)||(a.kind==='nuevo'&&b.kind==='nuevo'?b.date.localeCompare(a.date):a.date.localeCompare(b.date))||a.id.localeCompare(b.id));
}
export function monthBounds(month:string){if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))throw new Error('Mes inválido.');const d=new Date(month+'-01T12:00:00Z');d.setUTCMonth(d.getUTCMonth()+1);return {from:month+'-01',until:d.toISOString().slice(0,10)};}
export function ratioPercent(n:number,d:number){return d>0?Number(BigInt(n)*10000n/BigInt(d))/100:0;}
export function productivity(data:ActivityData,entity:Entity,month:string){
 const {from,until}=monthBounds(month);const inside=(v:string)=>{const d=chronologyKey(v||'').slice(0,10);return !!d&&d>=from&&d<until;};const beforeEnd=(v:string)=>{const d=chronologyKey(v||'').slice(0,10);return !!d&&d<until;};
 const ps=unique(data.prospectos).filter(p=>entity.type==='Vendedor'?p.propietarioEmail?.toLowerCase()===entity.identity.toLowerCase():p.telemarketing===entity.identity);const ids=new Set(ps.map(p=>p.id));
 const gs=unique(data.gestiones).filter(g=>ids.has(g.idProspecto)&&(entity.type!=='Telemarketing'||g.telemarketing===entity.identity));
 const cs=unique(data.citas).filter(c=>ids.has(c.idProspecto)&&c.estadoCita!=='Cancelada'&&(entity.type!=='Telemarketing'||c.telemarketing===entity.identity));
 const vs=unique(data.ventas).filter(v=>ids.has(v.idProspecto)&&v.estado==='Aprobada'&&(entity.type!=='Telemarketing'||v.telemarketing===entity.identity));
 const cohort=ps.filter(p=>inside(p.fechaRecepcion||p.creadoEn));const cohortIds=new Set(cohort.map(p=>p.id));
 const convertedCita=new Set(cs.filter(c=>cohortIds.has(c.idProspecto)&&beforeEnd(c.fechaCreacion)).map(c=>c.idProspecto));const convertedSale=new Set(vs.filter(v=>cohortIds.has(v.idProspecto)&&beforeEnd(v.fechaReporte)).map(v=>v.idProspecto));
 const periodSales=vs.filter(v=>inside(v.fechaReporte));
 return {ingresados:cohort.length,llamadas:gs.filter(g=>inside(g.creadoEn||g.fechaHora)).length,citas:cs.filter(c=>inside(c.fechaCreacion)).length,ventas:periodSales.length,volumen:sumMoney(periodSales.map(v=>v.montoAprobado)),conversionCitas:ratioPercent(convertedCita.size,cohort.length),conversionVentas:ratioPercent(convertedSale.size,cohort.length),contactosConCita:convertedCita.size,contactosConVenta:convertedSale.size};
}
export function validateGoals(values:GoalValues):GoalValues {
 for(const [key,value]of Object.entries(values)){if(!Number.isFinite(value)||value<0||value>(key==='volumen'?10000000:1000000000)||(key!=='volumen'&&!Number.isInteger(value)))throw new Error('Las metas de cantidad deben ser enteros positivos; el volumen debe ser un importe válido.');}
 return {...values,volumen:truncateDecimal(values.volumen)};
}
export function chronologyKey(value:string):string {
 if(!value)return '';
 if(/^\d{4}-\d{2}-\d{2}$/.test(value)){const date=new Date(value+'T12:00:00Z');return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value?value+'T00:00:00':'';}
 if(/^\d{4}-\d{2}-\d{2}T/.test(value)){
  const date=new Date(value);if(!Number.isFinite(date.getTime()))return '';
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Los_Angeles',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(date);const p=(t:string)=>parts.find(x=>x.type===t)?.value||'00';return `${p('year')}-${p('month')}-${p('day')}T${p('hour')}:${p('minute')}:${p('second')}`;
 }
 const m=value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:,?\s+(\d{1,2}):(\d{2}))?/);if(!m)return '';
 let h=Number(m[4]||0);const suffix=value.toLowerCase().replace(/[.\s]/g,'');if(suffix.endsWith('pm'))h=h%12+12;else if(suffix.endsWith('am'))h=h%12;
 return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}T${String(h).padStart(2,'0')}:${m[5]||'00'}:00`;
}
export function sortTimeline<T extends {id:string;date:string}>(events:T[]):T[]{return [...events].sort((a,b)=>chronologyKey(b.date).localeCompare(chronologyKey(a.date))||a.id.localeCompare(b.id));}

export function goalProgress(actual:number,target:number,money=false):number {if(target<=0)return 0;return money?Number(scaledInteger(actual,2)*10000n/scaledInteger(target,2))/100:ratioPercent(actual,target);}
