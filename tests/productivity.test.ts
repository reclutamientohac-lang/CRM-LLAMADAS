import {test} from 'node:test';import assert from 'node:assert/strict';
import {reportMetrics,reportPeople,productivityReport,previousMonth,reportPeriod,comparableDay,metricChange,sumGoals} from '../src/productivity';
import {emptyGoals,scopedActivity,type ActivityData} from '../src/commercial';
import type {Prospecto,Cita,Venta,Gestion,UsuarioAutorizado,UserProfile} from '../src/types';
const lead=(id:string,patch:Partial<Prospecto>={})=>({id,nombre:id,propietarioEmail:'seller@example.com',propietario:'Seller',telemarketing:'NEW',fechaRecepcion:'2026-10-01',...patch} as Prospecto);
const call=(id:string,p='p',patch:Partial<Gestion>={})=>({id,idProspecto:p,telemarketing:'OLD',canal:'Llamada',creadoEn:'2026-10-02T17:00:00Z',...patch} as Gestion);
const cita=(id:string,p='p',patch:Partial<Cita>={})=>({id,idProspecto:p,telemarketing:'OLD',estadoCita:'Agendada',fechaCreacion:'2026-10-03T17:00:00Z',...patch} as Cita);
const sale=(id:string,c='c',patch:Partial<Venta>={})=>({id,idProspecto:'p',idCita:c,telemarketing:'OLD',estado:'Aprobada',fechaReporte:'2026-10-04',montoAprobado:0.1,...patch} as Venta);
const data=(patch:Partial<ActivityData>={}):ActivityData=>({prospectos:[],gestiones:[],citas:[],ventas:[],...patch});const period=reportPeriod('2026-10');
const seller={type:'Vendedor' as const,identity:'seller@example.com',name:'Seller'};const agent={type:'Telemarketing' as const,identity:'OLD',name:'Old'};
test('cada pestaña presenta solo sus cuatro indicadores solicitados',()=>{assert.deepEqual(reportMetrics('Telemarketing').map(m=>m[0]),['llamadas','citas','ventas','volumen']);assert.deepEqual(reportMetrics('Vendedor').map(m=>m[0]),['ingresados','citas','ventas','volumen']);});
test('actividad conserva agente del evento tras reasignar cartera y deduplica llamadas y citas con venta',()=>{
 const g=call('g'),c=cita('c'),v=sale('v');const d=data({prospectos:[lead('p'),lead('p')],gestiones:[g,g,call('whats','p',{canal:'WhatsApp'})],citas:[c,c],ventas:[v,v,sale('v2','c',{montoAprobado:0.2}),sale('pending','c',{estado:'Pendiente'})]});
 const r=productivityReport(d,'Telemarketing',period,agent);assert.equal(r.llamadas,1);assert.equal(r.citas,1);assert.equal(r.ventas,1);assert.equal(r.volumen,0.3);assert.equal(r.conversionContacto,100);assert.equal(r.conversionCita,100);assert.equal(r.volumenPorVenta,0.15);
 assert.equal(productivityReport(d,'Telemarketing',period,{...agent,identity:'NEW'}).llamadas,0);
 assert.equal(productivityReport(d,'Vendedor',period,seller).ventas,2);
});
test('cierres de citas anteriores cuentan como actividad, sin inflar la conversión de citas nuevas',()=>{
 const d=data({prospectos:[lead('p')],citas:[cita('old','p',{fechaCreacion:'2026-09-01'}),cita('new'),cita('cancel','p',{estadoCita:'Cancelada'})],ventas:[sale('old-sale','old'),sale('cancel-sale','cancel'),sale('mismatch','new',{idProspecto:'other'}),sale('future','new',{fechaReporte:'2026-11-01'})]});
 const r=productivityReport(d,'Telemarketing',period,agent);assert.equal(r.citas,1);assert.equal(r.ventas,1);assert.equal(r.citasConvertidas,0);assert.equal(r.conversionCita,0);assert.equal(r.volumen,0.2);assert.equal(r.conversionContacto,null);
});
test('carteras por email incluyen distribuidores, huérfanos se excluyen y datos sin propietario tienen fila explícita',()=>{
 const d=data({prospectos:[lead('p'),lead('d',{propietarioEmail:'boss@example.com'}),lead('legacy',{propietarioEmail:undefined})],gestiones:[call('g'),call('orphan','missing')]});
 const people=reportPeople(d,[{email:'boss@example.com',nombre:'Jefe',rol:'Distribuidor'} as UsuarioAutorizado],[],'Vendedor');assert.equal(people.find(p=>p.identity==='boss@example.com')?.role,'Distribuidor');assert.equal(people.at(-1)?.unassigned,true);
 assert.equal(productivityReport(d,'Vendedor',period,seller).ingresados,1);assert.equal(productivityReport(d,'Vendedor',period).ingresados,3);assert.equal(productivityReport(d,'Vendedor',period,people.at(-1)).ingresados,1);assert.equal(productivityReport(d,'Telemarketing',period).llamadas,1);
 const scoped=scopedActivity(d,{role:'Vendedor',email:'seller@example.com'} as UserProfile);assert.deepEqual(scoped.prospectos.map(p=>p.id),['p']);
});
test('cortes comparables respetan febrero, año y fecha operativa de Los Ángeles',()=>{
 assert.equal(previousMonth('2026-01'),'2025-12');assert.equal(comparableDay('2024-02','2024-03',31),29);assert.equal(comparableDay('2026-02','2026-03',31),28);assert.equal(reportPeriod('2026-12').until,'2027-01-01');assert.throws(()=>reportPeriod('2026-10',0));
 const d=data({prospectos:[lead('p')],gestiones:[call('la-sept','p',{creadoEn:'2026-10-01T01:00:00Z'}),call('day14','p',{creadoEn:'14/10/2026, 09:00 a. m.'}),call('day15','p',{creadoEn:'2026-10-15T17:00:00Z'})]});assert.equal(productivityReport(d,'Telemarketing',reportPeriod('2026-10',14),agent).llamadas,1);
});
test('efectividad total usa denominador del equipo y evita promediar porcentajes personales',()=>{
 const ps=Array.from({length:4},(_,i)=>lead(String(i),{propietarioEmail:i===0?'a@x.com':'b@x.com'}));const d=data({prospectos:ps,citas:[cita('c','0')]});assert.equal(productivityReport(d,'Vendedor',period).conversionContacto,25);assert.equal(productivityReport(d,'Vendedor',period,{...seller,identity:'a@x.com'}).conversionContacto,100);
 assert.equal(productivityReport(data(),'Vendedor',period).conversionCita,null);
});
test('variaciones y metas suman centavos enteros, truncando sin redondear y sin límite individual al agregado',()=>{
 assert.deepEqual(metricChange(0.3,0.1,true),{difference:0.2,percentage:200});assert.deepEqual(metricChange(3,0),{difference:3,percentage:null});assert.equal(metricChange(1,3).percentage,-66.66);
 assert.equal(sumGoals([{...emptyGoals,volumen:10000000},{...emptyGoals,volumen:10000000.01}]).volumen,20000000.01);
 const r=productivityReport(data({prospectos:[lead('p')],ventas:[sale('a','x',{montoAprobado:1}),sale('b','y',{montoAprobado:1}),sale('c','z',{montoAprobado:0})]}),'Vendedor',period);assert.equal(r.volumenPorVenta,0.66);
});
