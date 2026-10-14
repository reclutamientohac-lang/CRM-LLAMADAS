import { readFileSync } from 'node:fs';
import { before, after, test } from 'node:test';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { collection, doc, getDoc, getDocs, query, where, setDoc, updateDoc, writeBatch } from 'firebase/firestore';
let env: Awaited<ReturnType<typeof initializeTestEnvironment>>;
let seller:any, other:any, admin:any, boss:any, agent:any;
const adminEmail = JSON.parse(readFileSync('scripts/seller-test-config.json','utf8')).adminEmail;
before(async () => {
  env = await initializeTestEnvironment({ projectId:'demo-crm-sellers', firestore:{ rules:readFileSync('firestore.rules','utf8') } });
  const db = (uid:string,email:string) => env.authenticatedContext(uid,{email,email_verified:true}).firestore();
  seller=db('seller','seller@example.com');other=db('other','other@example.com');admin=db('admin',adminEmail);boss=db('boss','boss@example.com');agent=db('tm','tm@example.com');
  await env.withSecurityRulesDisabled(async c => {
    const d=c.firestore();
    for (const email of ['seller@example.com','other@example.com']) await setDoc(doc(d,'usuariosAutorizados',email),{activo:true,rol:'Vendedor',nombre:email,telemarketingVinculada:'GERAL'});
    await setDoc(doc(d,'usuariosAutorizados','boss@example.com'),{activo:true,rol:'Distribuidor'});
    await setDoc(doc(d,'usuariosAutorizados','tm@example.com'),{activo:true,rol:'Telemarketing',telemarketingVinculada:'GERAL'});
    for (const [id,email] of [['own','seller@example.com'],['foreign','other@example.com']]) {
      await setDoc(doc(d,'prospectos',id),{propietarioEmail:email,propietario:email,telemarketing:'GERAL',nombre:id});
      for (const name of ['gestiones','citas','ventas','retroalimentaciones']) await setDoc(doc(d,name,id),{idProspecto:id,telemarketing:'GERAL',estado:'Pendiente'});
    }
    for (let i=0;i<8;i++) { await setDoc(doc(d,'prospectos','batch'+i),{propietarioEmail:'seller@example.com',propietario:'seller@example.com',telemarketing:'GERAL'}); await setDoc(doc(d,'gestiones','batch'+i),{idProspecto:'batch'+i,telemarketing:'GERAL'}); }
    await setDoc(doc(d,'prospectos','legacy'),{propietario:'seller@example.com',telemarketing:'GERAL'});
  });
});
after(async () => { await env?.cleanup(); });
test('vendedor consulta únicamente cartera por correo; mismo agente no amplía permisos',async () => {
  await assertSucceeds(getDocs(query(collection(seller,'prospectos'),where('propietarioEmail','==','seller@example.com'))));
  await assertFails(getDocs(collection(seller,'prospectos')));
  await assertSucceeds(getDoc(doc(seller,'prospectos','own')));
  await assertFails(getDoc(doc(seller,'prospectos','foreign')));
  await assertFails(updateDoc(doc(seller,'prospectos','foreign'),{nombre:'Intento ajeno'}));
  await assertFails(getDoc(doc(seller,'prospectos','legacy')));
  for (const name of ['gestiones','citas','ventas','retroalimentaciones']) {
    await assertSucceeds(getDoc(doc(seller,name,'own')));
    await assertFails(getDoc(doc(seller,name,'foreign')));
    await assertSucceeds(getDocs(query(collection(seller,name),where('idProspecto','in',['own']))));
  }
});
test('alta obliga propiedad y telemarketing configuradas por administrador',async () => {
  const p={propietarioEmail:'seller@example.com',propietario:'seller@example.com',telemarketing:'GERAL',creadoPor:'seller@example.com'};
  await assertSucceeds(setDoc(doc(seller,'prospectos','new'),p));
  for (const patch of [{propietarioEmail:'other@example.com'},{propietario:'Otro'},{telemarketing:'IRENE'},{creadoPor:'other@example.com'}]) await assertFails(setDoc(doc(seller,'prospectos','forged'),{...p,...patch}));
});
test('solo administrador cambia propiedad o telemarketing; vendedor no modifica su cuenta',async () => {
  await assertSucceeds(updateDoc(doc(seller,'prospectos','own'),{nombre:'Editado'}));
  for (const patch of [{propietarioEmail:'other@example.com'},{propietario:'Otro'},{telemarketing:'IRENE'}]) await assertFails(updateDoc(doc(seller,'prospectos','own'),patch));
  await assertFails(updateDoc(doc(seller,'usuariosAutorizados','seller@example.com'),{telemarketingVinculada:'IRENE'}));
  await assertFails(updateDoc(doc(boss,'prospectos','own'),{propietarioEmail:'boss@example.com'}));
  await assertFails(updateDoc(doc(agent,'prospectos','own'),{propietario:'Otro'}));
  await assertSucceeds(updateDoc(doc(admin,'prospectos','legacy'),{propietarioEmail:'seller@example.com'}));
  await assertSucceeds(updateDoc(doc(admin,'usuariosAutorizados','seller@example.com'),{telemarketingVinculada:'IRENE'}));
  await assertSucceeds(setDoc(doc(seller,'prospectos','after-change'),{propietarioEmail:'seller@example.com',propietario:'seller@example.com',telemarketing:'IRENE',creadoPor:'seller@example.com'}));
  await assertFails(setDoc(doc(seller,'prospectos','stale-default'),{propietarioEmail:'seller@example.com',propietario:'seller@example.com',telemarketing:'GERAL',creadoPor:'seller@example.com'}));
});
test('distribuidor supervisa todas las carteras sin equipos asignados',async () => {
  await assertSucceeds(getDocs(collection(boss,'prospectos')));
  await assertSucceeds(getDocs(collection(boss,'citas')));
  await assertSucceeds(getDocs(collection(boss,'ventas')));
});
test('vendedor registra resultado y venta pendiente, sin aprobar montos ni bonos',async () => {
  const b=writeBatch(seller);
  b.set(doc(seller,'retroalimentaciones','result'),{idProspecto:'own',idCita:'own',resultado:'Venta'});
  b.update(doc(seller,'citas','own'),{estadoCita:'Realizada'});
  b.update(doc(seller,'prospectos','own'),{estado:'Venta'});
  const sale={idProspecto:'own',idCita:'own',telemarketing:'GERAL',estado:'Pendiente',montoAprobado:null,bonoGenerado:null,bonoPagable:0};
  b.set(doc(seller,'ventas','reported'),sale);
  await assertSucceeds(b.commit());
  await assertFails(setDoc(doc(seller,'ventas','approved'),{...sale,estado:'Aprobada',montoAprobado:2000}));
  await assertFails(updateDoc(doc(seller,'ventas','reported'),{bonoPagable:100}));
  await assertFails(updateDoc(doc(seller,'citas','own'),{idProspecto:'foreign'}));
});

test('consulta de ocho contactos respeta límites de reglas y excluye carteras ajenas',async () => {
  const ids=Array.from({length:8},(_,i)=>'batch'+i);
  await assertSucceeds(getDocs(query(collection(seller,'gestiones'),where('idProspecto','in',ids))));
  await assertFails(getDocs(query(collection(seller,'gestiones'),where('idProspecto','in',['batch0','foreign']))));
});
