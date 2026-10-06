import test from 'node:test';
import assert from 'node:assert/strict';
import { calendarEvent, calendarEventId, syncCalendarEvent } from '../src/calendar/events.ts';
import type { Cita } from '../src/types.ts';
const cita = { id: 'CITA-TEST', fechaCita: '2026-10-06', horaCita: '11:30 PM', asunto: 'Prueba', estadoCita: 'Agendada', idEventoCalendar: '', enlaceCalendar: '' } as Cita;
test('hora de LA y cambio de día independientes del navegador', () => {
 const event=calendarEvent(cita);
 assert.equal(event.start.dateTime, '2026-10-06T23:30:00'); assert.equal(event.end.dateTime, '2026-10-07T00:30:00'); assert.equal(event.start.timeZone, 'America/Los_Angeles');
 assert.equal(calendarEvent({...cita,horaCita:'12:00 AM'}).start.dateTime,'2026-10-06T00:00:00');
 assert.throws(()=>calendarEvent({...cita,horaCita:'13:00 PM'}));
});
test('id estable y válido para reintentos', async () => { const id=await calendarEventId(cita.id); assert.match(id,/^[0-9a-v]{5,1024}$/); assert.equal(id,await calendarEventId(cita.id)); });
test('crear y reintentar tras respuesta perdida reutiliza el evento', async () => {
 let event: any; let posts=0;
 const request = async (_url: any, init: any) => {
  if(init.method==='GET') return new Response(JSON.stringify(event || {}),{status:event?200:404});
  if(init.method==='POST'){ posts++; event={...JSON.parse(init.body),htmlLink:'https://calendar.google.com/event'}; }
  else event={...event,...JSON.parse(init.body)};
  return new Response(JSON.stringify(event));
 };
 const first=await syncCalendarEvent(cita,'test',request as typeof fetch);
 const retry=await syncCalendarEvent({...cita,horaCita:'1:30 PM'},'test',request as typeof fetch);
 assert.equal(first.idEventoCalendar,retry.idEventoCalendar); assert.equal(posts,1); assert.equal(event.start.dateTime,'2026-10-06T13:30:00');
});
test('no modificar un evento ajeno o reemplazar uno desaparecido', async () => {
 const foreign=async()=>new Response(JSON.stringify({id:'foreign',extendedProperties:{private:{crmCitaId:'otro'}}}));
 await assert.rejects(()=>syncCalendarEvent({...cita,idEventoCalendar:'foreign'},'test',foreign as typeof fetch),/no fue creado/);
 await assert.rejects(()=>syncCalendarEvent({...cita,idEventoCalendar:'missing'},'test',(async()=>new Response('{}',{status:404})) as typeof fetch),/No se encontró/);
});
test('cancelación sin evento no crea uno; cancelación vinculada conserva id', async () => {
 let methods:string[]=[];
 const missing=async (_u:any,i:any)=>{methods.push(i.method);return new Response('{}',{status:404});};
 await syncCalendarEvent({...cita,estadoCita:'Cancelada'},'test',missing as typeof fetch);assert.deepEqual(methods,['GET']);
 methods=[];
 const existing=async (_u:any,i:any)=>{methods.push(i.method); if(i.method==='PATCH') assert.equal(JSON.parse(i.body).status,'cancelled'); return new Response(JSON.stringify({id:'known',extendedProperties:{private:{crmCitaId:cita.id}}}));};
 const result=await syncCalendarEvent({...cita,estadoCita:'Cancelada',idEventoCalendar:'known'},'test',existing as typeof fetch); assert.equal(result.idEventoCalendar,'known');assert.deepEqual(methods,['GET','PATCH']);
});
test('detecta cancelación desde una pestaña anterior sin marca de sincronización', async () => {
 const {calendarSyncRevision,CALENDAR_ID}=await import('../src/calendar/events.ts');
 const linked={...cita,calendarDestino:CALENDAR_ID,calendarSyncRequested:'2026-10-06T18:34:00Z',calendarSyncDone:'2026-10-06T18:34:00Z',ultimaActualizacion:'2026-10-06T18:38:00Z',estadoCita:'Cancelada'} as Cita;
 assert.equal(calendarSyncRevision(linked),'2026-10-06T18:38:00Z');
 assert.equal(calendarSyncRevision({...linked,calendarDestino:undefined}),linked.calendarSyncRequested);
});
test('cancelación ya realizada en Google acepta tombstone sin duplicar ni modificar',async()=>{
 const id=await calendarEventId(cita.id); let calls=0;
 const result=await syncCalendarEvent({...cita,idEventoCalendar:id,estadoCita:'Cancelada'},'test',(async()=>{calls++;return new Response(JSON.stringify({id,status:'cancelled'}));}) as typeof fetch);
 assert.equal(calls,1);assert.equal(result.idEventoCalendar,id);
});
