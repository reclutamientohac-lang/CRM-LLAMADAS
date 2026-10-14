import {readFileSync} from 'node:fs';
import {before,after,test} from 'node:test';
import assert from 'node:assert/strict';
import {initializeTestEnvironment,assertFails,assertSucceeds} from '@firebase/rules-unit-testing';
import {doc,setDoc,getDoc,updateDoc,deleteDoc,writeBatch,serverTimestamp,increment,runTransaction,getDocs,collection} from 'firebase/firestore';
import {createProspectWithPhone} from '../src/phoneRegistry';
import {financialFields} from '../src/money';
import {validateExcelFile} from '../src/excelUtils';
import {generateProspectoId} from '../src/businessRules';
let env:Awaited<ReturnType<typeof initializeTestEnvironment>>;
let admin:any;const accounts:Record<string,any>={};
const adminEmail=JSON.parse(readFileSync('scripts/seller-test-config.json','utf8')).adminEmail;
before(async()=>{
 env=await initializeTestEnvironment({projectId:'demo-security-repairs',firestore:{rules:readFileSync('firestore.rules','utf8')}});
 admin=env.authenticatedContext('admin',{email:adminEmail,email_verified:true}).firestore();
 await env.withSecurityRulesDisabled(async c=>{
  const db=c.firestore();await setDoc(doc(db,'settings','phoneIndexStatus'),{ready:true});
  for(const role of ['Telemarketing','Vendedor','Distribuidor','Supervisor']) {
   const email=role.toLowerCase()+'@example.com';accounts[role]=env.authenticatedContext(role,{email,email_verified:true}).firestore();
   await setDoc(doc(db,'usuariosAutorizados',email),{rol:role,activo:true,nombre:email,telemarketingVinculada:'GERAL'});
  }
  await setDoc(doc(db,'prospectos','p'),{id:'p',telefono:'5551110000',intentos:0,contactosEfectivos:0,propietarioEmail:'vendedor@example.com',telemarketing:'GERAL'});
  await setDoc(doc(db,'citas','c'),{idProspecto:'p',telemarketing:'GERAL'});
  for(const role of ['Telemarketing','Vendedor','Distribuidor','Supervisor'])for(let i=0;i<7;i++)await setDoc(doc(db,'citas',`c-${role}-${i}`),{idProspecto:'p',telemarketing:'GERAL'});
 });
});
after(async()=>{await env?.cleanup();});
const pending=()=>({idProspecto:'p',idCita:'c',telemarketing:'GERAL',estado:'Pendiente',montoAprobado:null,porcentajeBono:null,bonoGenerado:null,bonoPagable:0});
test('todos los roles no administrativos: sin monto, porcentaje, aprobación ni pagos; telemarketing sí registra resultados',async()=>{
 const roles=adminEmail==='lafuenteiliana@gmail.com'?['Telemarketing','Vendedor','Distribuidor']:['Telemarketing','Vendedor','Distribuidor','Supervisor'];
 for(const role of roles){const db=accounts[role];const id='VENTA-c-'+role+'-0';
  await assertSucceeds(setDoc(doc(db,'ventas',id),{...pending(),idCita:'c-'+role+'-0'}));
  let caseIndex=0;for(const patch of [{estado:'Aprobada'},{montoAprobado:100},{porcentajeBono:0.01},{bonoGenerado:2},{bonoPagable:2},{estadoPagoHistorico:'Pagada'}]) {
   await assertFails(setDoc(doc(db,'ventas','VENTA-c-'+role+'-'+(++caseIndex)),{...pending(),idCita:'c-'+role+'-'+caseIndex,...patch}));
   await assertFails(updateDoc(doc(db,'ventas',id),patch));
  }
 }
 await assertSucceeds(setDoc(doc(accounts.Telemarketing,'retroalimentaciones','r'),{idProspecto:'p',idCita:'c',resultado:'Venta',observacion:'Resultado informado',creadoPor:'telemarketing@example.com',registradoEnServidor:serverTimestamp()}));
 await assertSucceeds(updateDoc(doc(accounts.Telemarketing,'citas','c'),{estadoCita:'Realizada'}));
 await assertFails(setDoc(doc(accounts.Telemarketing,'settings','reglasComision'),{porcentaje:1}));
});
test('validación financiera en reglas y bitácora acoplada, sin alteración ni borrado posterior',async()=>{
 await setDoc(doc(admin,'ventas','finance'),pending());
 const save=(fields:Record<string,unknown>,logId:string)=>{const b=writeBatch(admin);b.update(doc(admin,'ventas','finance'),{...fields,estado:'Aprobada',ultimaOperacionId:logId,actualizadoEnServidor:serverTimestamp()});b.set(doc(admin,'logVentas',logId),{idVenta:'finance',usuario:adminEmail,registradoEnServidor:serverTimestamp(),montoAnterior:null,montoNuevo:fields.montoAprobado,porcentajeNuevo:fields.porcentajeBono,estadoNuevo:'Aprobada'});return b.commit();};
 const fields=financialFields(123.459,0.01239,'Aprobada');
 await assertFails(save({...fields,bonoGenerado:99},'badcalc'));
 await assertFails(updateDoc(doc(admin,'ventas','finance'),{...fields,estado:'Aprobada'}));
 await assertSucceeds(save(fields,'financial-log'));
 assert.equal((await getDoc(doc(admin,'ventas','finance'))).data()?.bonoGenerado,1.51);
 await assertFails(deleteDoc(doc(admin,'logVentas','financial-log')));
 await assertFails(updateDoc(doc(admin,'logVentas','financial-log'),{montoNuevo:999}));
 await assertFails(deleteDoc(doc(admin,'ventas','finance')));
});
test('reserva atómica: dos altas concurrentes con el mismo teléfono guardan exactamente una',async()=>{
 const db=accounts.Vendedor;const make=(id:string)=>({id,telefono:'5552223344',nombre:'Concurrente',intentos:0,contactosEfectivos:0,propietarioEmail:'vendedor@example.com',propietario:'vendedor@example.com',telemarketing:'GERAL',creadoPor:'vendedor@example.com'});
 const results=await Promise.allSettled([createProspectWithPhone(make('race1') as any,db),createProspectWithPhone(make('race2') as any,db)]);
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
 const found=await Promise.all(['race1','race2'].map(id=>getDoc(doc(admin,'prospectos',id))));assert.equal(found.filter(s=>s.exists()).length,1);
 await assertFails(setDoc(doc(db,'prospectos','without-index'),{...make('without-index'),telefono:'5552223355',registradoEnServidor:serverTimestamp()}));
});
test('contador solo aumenta junto con gestión nueva del actor, auditoría exige hora del servidor',async()=>{
 const db=accounts.Telemarketing;
 await assertFails(updateDoc(doc(db,'prospectos','p'),{intentos:200}));
 const b=writeBatch(db);b.set(doc(db,'gestiones','call'),{id:'call',resultado:'Cita',idProspecto:'p',telemarketing:'GERAL',creadoPor:'telemarketing@example.com',efectivo:'Sí',registradoEnServidor:serverTimestamp()});b.update(doc(db,'prospectos','p'),{intentos:increment(1),contactosEfectivos:increment(1),ultimaGestionId:'call'});await assertSucceeds(b.commit());
 assert.equal((await getDoc(doc(db,'prospectos','p'))).data()?.intentos,1);
 await assertFails(updateDoc(doc(db,'prospectos','p'),{intentos:increment(1),contactosEfectivos:increment(1),ultimaGestionId:'call'}));
 await assertFails(setDoc(doc(db,'auditoria','client-clock'),{usuario:'telemarketing@example.com',accion:'EXPORTAR',registradoEnServidor:new Date('2001-01-01')}));
 await assertSucceeds(setDoc(doc(db,'auditoria','server-clock'),{usuario:'telemarketing@example.com',accion:'EXPORTAR',registradoEnServidor:serverTimestamp()}));
 await assertFails(deleteDoc(doc(admin,'auditoria','server-clock')));
});
test('archivos se rechazan antes del parseo y IDs resisten generación masiva en el mismo instante',()=>{
 assert.throws(()=>validateExcelFile({name:'leads.xlsx',size:5*1024*1024+1}));assert.throws(()=>validateExcelFile({name:'leads.exe',size:500}));assert.throws(()=>validateExcelFile({name:'leads.xlsx',size:0}));
 const ids=Array.from({length:10000},()=>generateProspectoId());assert.equal(new Set(ids).size,10000);
});

import {applyRestore} from '../src/stage78/restoreEngine';
import {encodeRecord} from '../src/stage78/backupCodec';
import type {BackupFile} from '../src/stage78/types';
test('restauración mantiene bitácora existente y registra cambios financieros e importación histórica',async()=>{
 const old={...pending(),montoAprobado:100,porcentajeBono:0.01,bonoGenerado:1,bonoPagable:1,estado:'Aprobada'};
 await setDoc(doc(admin,'ventas','restore-finance'),old);
 await env.withSecurityRulesDisabled(async c=>{await setDoc(doc(c.firestore(),'logVentas','historic-existing'),{idVenta:'restore-finance',montoNuevo:100});});
 const current={prospectos:[encodeRecord('p',(await getDoc(doc(admin,'prospectos','p'))).data()!)],citas:[encodeRecord('c',(await getDoc(doc(admin,'citas','c'))).data()!)],ventas:[encodeRecord('restore-finance',old)],logVentas:[encodeRecord('historic-existing',{idVenta:'restore-finance',montoNuevo:100})]};
 const file:BackupFile={app:'CRM LLAMADAS',version:1,fecha:new Date().toISOString(),usuario:adminEmail,collections:{settings:[],ventas:[encodeRecord('restore-finance',{...old,montoAprobado:200,bonoGenerado:2,bonoPagable:2})],logVentas:[encodeRecord('historic-existing',{idVenta:'restore-finance',montoNuevo:999}),encodeRecord('historic-missing',{idVenta:'restore-finance',montoNuevo:200})]}};
 const result=await applyRestore(admin,adminEmail,file,current,['ventas','logVentas'],'replace',false,false,new AbortController().signal,()=>{},'seguridad.json');
 assert.equal(result.estado,'Completada',result.error);
 assert.equal((await getDoc(doc(admin,'ventas','restore-finance'))).data()?.montoAprobado,200);
 assert.equal((await getDoc(doc(admin,'logVentas','historic-existing'))).data()?.montoNuevo,100);
 assert.equal((await getDoc(doc(admin,'logVentas','historic-missing'))).data()?.origen,'Restauración histórica');
});


test('lectura de gestión nueva dentro de transacción no bloquea llamadas ni permite leer carteras ajenas',async()=>{
 const db=accounts.Telemarketing;
 await env.withSecurityRulesDisabled(async c=>{
  await setDoc(doc(c.firestore(),'prospectos','transaction-lead'),{id:'transaction-lead',telefono:'5558881111',intentos:0,contactosEfectivos:0,propietarioEmail:'vendedor@example.com',telemarketing:'GERAL'});
  for(const name of ['gestiones','citas','ventas'])await setDoc(doc(c.firestore(),name,'foreign-transaction'),{idProspecto:'foreign-parent',telemarketing:'IRENE'});
  await setDoc(doc(c.firestore(),'prospectos','foreign-parent'),{telemarketing:'IRENE',propietarioEmail:'other@example.com'});
 });
 await assertSucceeds(runTransaction(db,async tx=>{
  const g=doc(db,'gestiones','transaction-call');const p=doc(db,'prospectos','transaction-lead');
  assert.equal((await tx.get(g)).exists(),false);await tx.get(p);
  assert.equal((await tx.get(doc(db,'citas','transaction-cita'))).exists(),false);
  assert.equal((await tx.get(doc(db,'ventas','transaction-sale'))).exists(),false);
  tx.set(g,{id:'transaction-call',idProspecto:'transaction-lead',telemarketing:'GERAL',resultado:'No contesta',efectivo:'No',observacion:'',creadoPor:'telemarketing@example.com',registradoEnServidor:serverTimestamp()});
  tx.update(p,{intentos:increment(1),contactosEfectivos:increment(0),ultimaGestionId:'transaction-call'});
 }));
 assert.equal((await getDoc(doc(db,'prospectos','transaction-lead'))).data()?.intentos,1);
 for(const name of ['gestiones','citas','ventas']){
  await assertFails(getDoc(doc(db,name,'foreign-transaction')));
  await assertFails(getDocs(collection(db,name)));
  await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(),name,'missing-anonymous')));
 }
});
