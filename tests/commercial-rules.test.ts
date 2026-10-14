import {readFileSync} from 'node:fs';import {before,after,test} from 'node:test';import assert from 'node:assert/strict';
import {initializeTestEnvironment,assertSucceeds,assertFails} from '@firebase/rules-unit-testing';
import {doc,setDoc,getDoc,getDocs,query,collection,where,updateDoc,deleteDoc,serverTimestamp} from 'firebase/firestore';
import {appendClientEntry,saveMonthlyGoal,goalId} from '../src/clientActivityService';
import {emptyGoals} from '../src/commercial';
import {applyRestore} from '../src/stage78/restoreEngine';import {encodeRecord} from '../src/stage78/backupCodec';import type {BackupFile} from '../src/stage78/types';
let env:Awaited<ReturnType<typeof initializeTestEnvironment>>;let admin:any,seller:any,agent:any,boss:any;
const adminEmail=JSON.parse(readFileSync('scripts/seller-test-config.json','utf8')).adminEmail;
const entity={type:'Vendedor' as const,identity:'seller@example.com',name:'Seller'};
const entry=(idProspecto='own')=>({idProspecto,tipo:'Nota' as const,texto:'Cliente pidió contacto mañana',titulo:'',url:'',creadoPor:'seller@example.com'});
before(async()=>{env=await initializeTestEnvironment({projectId:'demo-commercial-features',firestore:{rules:readFileSync('firestore.rules','utf8')}});const db=(id:string,email:string)=>env.authenticatedContext(id,{email,email_verified:true}).firestore();admin=db('admin',adminEmail);seller=db('seller','seller@example.com');agent=db('agent','agent@example.com');boss=db('boss','boss@example.com');await env.withSecurityRulesDisabled(async c=>{const d=c.firestore();for(const [email,rol]of [['seller@example.com','Vendedor'],['agent@example.com','Telemarketing'],['boss@example.com','Distribuidor']])await setDoc(doc(d,'usuariosAutorizados',email),{activo:true,rol,telemarketingVinculada:'GERAL'});await setDoc(doc(d,'prospectos','own'),{propietarioEmail:'seller@example.com',telemarketing:'GERAL'});await setDoc(doc(d,'prospectos','foreign'),{propietarioEmail:'other@example.com',telemarketing:'IRENE'});});});
after(async()=>{await env?.cleanup();});
test('notas idempotentes con hora de servidor y documentos ligados al cliente, sin editar o eliminar historia',async()=>{
 await assertSucceeds(appendClientEntry('note',entry(),seller));await assertSucceeds(appendClientEntry('note',entry(),seller));
 const stored=(await getDoc(doc(seller,'historialCliente','note'))).data()!;assert.equal(typeof stored.creadoEn.toDate,'function');
 await assertSucceeds(appendClientEntry('document',{...entry(),tipo:'Documento',titulo:'Propuesta',url:'https://docs.google.com/document/d/propuesta'},seller));
 await assertFails(updateDoc(doc(seller,'historialCliente','note'),{texto:'Borrado de la historia'}));await assertFails(deleteDoc(doc(admin,'historialCliente','note')));
 await assert.rejects(appendClientEntry('note',{...entry(),texto:'Contenido diferente'},seller));
});
test('reglas impiden falsificar autor o fecha y bloquean enlaces inseguros incluso saltando el formulario',async()=>{
 for(const patch of [{creadoPor:adminEmail},{creadoEn:new Date('2000-01-01')},{tipo:'Documento',titulo:'Malicioso',url:'javascript:alert(1)'},{tipo:'Documento',titulo:'Credenciales',url:'https://user:pass@example.com'}])await assertFails(setDoc(doc(seller,'historialCliente','forged'),{...entry(),creadoEn:serverTimestamp(),...patch}));
 await assertFails(setDoc(doc(seller,'historialCliente','extra-finance'),{...entry(),creadoEn:serverTimestamp(),montoAprobado:200}));
});
test('lecturas y nuevas notas se restringen por propiedad o agente; distribuidor supervisa, sin acceso ajeno para vendedor',async()=>{
 await assertFails(appendClientEntry('foreign-note',entry('foreign'),seller));await assertFails(appendClientEntry('foreign-agent',{...entry('foreign'),creadoPor:'agent@example.com'},agent));
 await assertSucceeds(getDocs(query(collection(seller,'historialCliente'),where('idProspecto','==','own'))));await assertFails(getDocs(collection(seller,'historialCliente')));
 await assertSucceeds(getDoc(doc(agent,'historialCliente','note')));await assertSucceeds(getDoc(doc(boss,'historialCliente','note')));
 await env.withSecurityRulesDisabled(async c=>{await setDoc(doc(c.firestore(),'historialCliente','private'),{...entry('foreign'),creadoEn:serverTimestamp()});});await assertFails(getDoc(doc(seller,'historialCliente','private')));
});
test('solo administrador fija metas; vendedor ve las suyas y telemarketing las de su agente',async()=>{
 await assertSucceeds(saveMonthlyGoal('2026-10',entity,{...emptyGoals,llamadas:100,volumen:123.459},adminEmail,admin));
 const id=goalId('2026-10',entity);const meta=(await getDoc(doc(seller,'metasProductividad',id))).data()!;assert.equal(meta.volumen,123.45);assert.equal(meta.volumenCentavos,12345);
 for(const db of [seller,agent,boss])await assertFails(saveMonthlyGoal('2026-10',entity,{...emptyGoals,llamadas:999},'seller@example.com',db));
 await assertFails(getDoc(doc(agent,'metasProductividad',id)));
 const tm={type:'Telemarketing' as const,identity:'GERAL',name:'Geral'};await saveMonthlyGoal('2026-10',tm,{...emptyGoals,citas:20},adminEmail,admin);await assertSucceeds(getDoc(doc(agent,'metasProductividad',goalId('2026-10',tm))));await assertFails(getDoc(doc(seller,'metasProductividad',goalId('2026-10',tm))));await assertSucceeds(getDoc(doc(boss,'metasProductividad',id)));
});
test('reglas de metas rechazan cantidades fraccionarias, cifras monetarias incoherentes y cambio de identidad',async()=>{
 const ref=doc(admin,'metasProductividad',goalId('2026-10',entity));
 for(const patch of [{llamadas:1.5},{volumen:123.46},{identidad:'other@example.com'},{mes:'2026-13'}])await assertFails(updateDoc(ref,{...patch,actualizadoPor:adminEmail,actualizadoEn:serverTimestamp()}));
 await assertFails(deleteDoc(ref));
});
test('respaldo restaura entradas faltantes, conserva notas existentes y marca procedencia histórica',async()=>{
 const current={prospectos:[encodeRecord('own',(await getDoc(doc(admin,'prospectos','own'))).data()!)],historialCliente:[encodeRecord('note',(await getDoc(doc(admin,'historialCliente','note'))).data()!)]};
 const file:BackupFile={app:'CRM LLAMADAS',version:1,fecha:new Date().toISOString(),usuario:adminEmail,collections:{settings:[],historialCliente:[encodeRecord('note',{...entry(),texto:'Otro texto'}),encodeRecord('restored',{...entry(),creadoEn:'2026-10-01T12:00:00Z'})]}};
 const result=await applyRestore(admin,adminEmail,file,current,['historialCliente'],'replace',false,false,new AbortController().signal,()=>{},'cliente.json');assert.equal(result.estado,'Completada',result.error);assert.equal((await getDoc(doc(seller,'historialCliente','note'))).data()?.texto,entry().texto);assert.equal((await getDoc(doc(seller,'historialCliente','restored'))).data()?.origen,'Restauración histórica');
});
