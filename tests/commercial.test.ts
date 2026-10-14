import {test} from 'node:test';import assert from 'node:assert/strict';
import {scopedActivity,buildReminders,productivity,contactLinks,safeDocumentUrl,sortTimeline,goalProgress,validateGoals,emptyGoals,monthBounds} from '../src/commercial';
import type {ActivityData,Entity} from '../src/commercial';
import type {Prospecto,UserProfile} from '../src/types';
const lead=(id:string,patch:Partial<Prospecto>={})=>({id,nombre:id,telefono:'5551112233',propietarioEmail:'seller@example.com',propietario:'Seller',telemarketing:'GERAL',fechaRecepcion:'2026-10-01',creadoEn:'2026-10-01T17:00:00Z',intentos:0,contactosEfectivos:0,estado:'Nuevo',archivado:false,...patch} as Prospecto);
const data=(patch:Partial<ActivityData>={}):ActivityData=>({prospectos:[],gestiones:[],citas:[],ventas:[],...patch});
const profile=(role:string,email='seller@example.com',agent='GERAL')=>({role,email,telemarketingAgent:agent} as UserProfile);
test('recordatorios respetan cartera del vendedor y asignación; no incluyen registros huérfanos ni otras cuentas',()=>{
 const d=data({prospectos:[lead('own'),lead('foreign',{propietarioEmail:'other@example.com'}),lead('other-agent',{telemarketing:'IRENE'})],gestiones:[{id:'g',idProspecto:'foreign'},{id:'orphan',idProspecto:'missing'}] as any});
 assert.deepEqual(scopedActivity(d,profile('Vendedor')).prospectos.map(p=>p.id),['own','other-agent']);
 assert.deepEqual(scopedActivity(d,profile('Telemarketing')).prospectos.map(p=>p.id),['own','foreign']);
 assert.equal(scopedActivity(d,profile('Vendedor')).gestiones.length,0);
 assert.equal(scopedActivity(d,null).prospectos.length,0);
 assert.equal(scopedActivity(d,profile('Distribuidor')).prospectos.length,3);
});
test('citas inminentes, llamadas vencidas y contactos sin trabajar usan fecha de Los Ángeles y no inventan actividad histórica',()=>{
 const d=data({prospectos:[lead('call',{fechaProximaAccion:'2026-10-13',intentos:1}),lead('new'),lead('historic',{intentosHistoricos:3}),lead('booked'),lead('archived',{archivado:true}),lead('already-called')],gestiones:[{id:'g',idProspecto:'already-called'}] as any,citas:[{id:'c',idProspecto:'booked',fechaCita:'2026-10-14',horaCita:'11:10 AM',estadoCita:'Agendada'}] as any});
 const rows=buildReminders(d,new Date('2026-10-14T18:00:00Z'));
 assert.equal(rows[0].id,'appointment:c');assert.equal(rows[0].imminent,true);assert.equal(rows.find(r=>r.prospect.id==='call')?.overdue,true);
 assert.equal(rows.filter(r=>r.kind==='nuevo').length,1);assert.equal(rows.find(r=>r.kind==='nuevo')?.prospect.id,'new');
 const day=buildReminders(data({prospectos:[lead('midnight',{fechaProximaAccion:'2026-10-14',intentos:1})]}),new Date('2026-10-14T01:00:00Z'));
 assert.equal(day.length,0); // todavía es 13 de octubre en LA
});
test('citas realizadas y canceladas no generan pendientes; inminencia se recalcula al avanzar el reloj',()=>{
 const d=data({prospectos:[lead('p',{intentos:1})],citas:[{id:'c',idProspecto:'p',fechaCita:'2026-10-14',horaCita:'11:10 AM',estadoCita:'Agendada'},{id:'cancel',idProspecto:'p',fechaCita:'2026-10-14',horaCita:'11:00 AM',estadoCita:'Cancelada'}] as any});
 assert.equal(buildReminders(d,new Date('2026-10-14T17:00:00Z'))[0].imminent,false);
 assert.equal(buildReminders(d,new Date('2026-10-14T18:11:00Z'))[0].overdue,true);
 assert.equal(buildReminders(d,new Date('2026-10-14T18:11:00Z')).length,1);
});
test('productividad deduplica, usa denominador de cohorte, excluye cancelaciones y ventas futuras y suma centavos exactos',()=>{
 const p=lead('p');const q=lead('q');const old=lead('old',{fechaRecepcion:'2026-09-01'});
 const c={id:'c',idProspecto:'p',telemarketing:'GERAL',fechaCreacion:'2026-10-02T19:00:00Z',estadoCita:'Agendada'};
 const v={id:'v',idProspecto:'p',telemarketing:'GERAL',fechaReporte:'2026-10-04',estado:'Aprobada',montoAprobado:0.1};
 const d=data({prospectos:[p,p,q,old],gestiones:[{id:'g',idProspecto:'p',telemarketing:'GERAL',creadoEn:'2026-10-01T18:00:00Z'}] as any,citas:[c,c,{...c,id:'cancel',idProspecto:'q',estadoCita:'Cancelada'},{...c,id:'old-c',idProspecto:'old'}] as any,ventas:[v,v,{...v,id:'v2',montoAprobado:0.2},{...v,id:'future',idProspecto:'q',fechaReporte:'2026-11-01'},{...v,id:'cancel',idProspecto:'q',estado:'Cancelada'}] as any});
 const seller:Entity={type:'Vendedor',identity:'seller@example.com',name:'Seller'};const r=productivity(d,seller,'2026-10');
 assert.equal(r.ingresados,2);assert.equal(r.llamadas,1);assert.equal(r.citas,2);assert.equal(r.ventas,2);assert.equal(r.volumen,0.3);assert.equal(r.conversionCitas,50);assert.equal(r.conversionVentas,50);
 assert.equal(productivity(d,{type:'Telemarketing',identity:'IRENE',name:'Irene'},'2026-10').llamadas,0);
 const historical=data({prospectos:[p],gestiones:[{id:'local',idProspecto:'p',telemarketing:'GERAL',fechaHora:'05/10/2026, 09:00 a. m.'}] as any});assert.equal(productivity(historical,seller,'2026-10').llamadas,1);
});
test('cronología ordena horas, fechas ISO y fechas locales sin depender del huso del navegador; desconocidas al final',()=>{
 const rows=[{id:'unknown',date:''},{id:'earlier',date:'14/10/2026, 09:00 a. m.'},{id:'later',date:'2026-10-14T18:30:00Z'},{id:'day-before',date:'2026-10-13'}];
 assert.deepEqual(sortTimeline(rows).map(r=>r.id),['later','earlier','day-before','unknown']);assert.equal(rows[0].id,'unknown');
});
test('acciones de contacto requieren teléfono válido y documentos admiten solo HTTPS sin credenciales',()=>{
 assert.equal(contactLinks('(555) 111-2233')?.whatsapp,'https://wa.me/15551112233');assert.equal(contactLinks('+34 612 345 678')?.call,'tel:+34612345678');assert.equal(contactLinks('612345678','34')?.call,'tel:+34612345678');assert.equal(contactLinks('123'),null);
 assert.equal(safeDocumentUrl('https://docs.google.com/document/d/abc'),'https://docs.google.com/document/d/abc');
 for(const url of ['javascript:alert(1)','data:text/html,test','http://example.com','https://user:secret@example.com'])assert.throws(()=>safeDocumentUrl(url));
});
test('metas validan límites, cantidades enteras y volumen sin redondeo; meses válidos incluyendo cambio de año',()=>{
 assert.equal(goalProgress(20000000,10000000,true),200);assert.equal(goalProgress(0.3,0.1,true),300);assert.equal(validateGoals({...emptyGoals,volumen:123.459}).volumen,123.45);assert.throws(()=>validateGoals({...emptyGoals,llamadas:1.5}));assert.throws(()=>validateGoals({...emptyGoals,volumen:10000001}));assert.throws(()=>validateGoals({...emptyGoals,ventas:NaN}));assert.throws(()=>monthBounds('2026-13'));assert.equal(monthBounds('2026-12').until,'2027-01-01');
});
