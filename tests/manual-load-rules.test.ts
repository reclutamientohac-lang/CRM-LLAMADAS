import { readFileSync } from 'node:fs';
import { before, after, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { collection, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import { preparePhoneIndex, createProspectWithPhone } from '../src/phoneRegistry';

let env: Awaited<ReturnType<typeof initializeTestEnvironment>>;
const adminEmail = JSON.parse(readFileSync('scripts/seller-test-config.json', 'utf8')).adminEmail;
before(async () => {
  env = await initializeTestEnvironment({projectId:'demo-manual-load',firestore:{rules:readFileSync('firestore.rules','utf8')}});
});
beforeEach(async () => { await env.clearFirestore(); });
after(async () => { await env?.cleanup(); });

test('verificar no modifica datos; preparar habilita altas y conserva los prospectos existentes', async () => {
  const admin = env.authenticatedContext('admin',{email:adminEmail,email_verified:true}).firestore() as unknown as Firestore;
  const agent = env.authenticatedContext('agent',{email:'agent@example.com',email_verified:true}).firestore() as unknown as Firestore;
  await setDoc(doc(admin,'usuariosAutorizados','agent@example.com'),{rol:'Telemarketing',activo:true,nombre:'GERAL',telemarketingVinculada:'GERAL'});
  const existing = {id:'existing',nombre:'Existente',telefono:'(213) 555-0199',telemarketing:'GERAL',intentos:4,contactosEfectivos:2};
  await setDoc(doc(admin,'prospectos','existing'),existing);
  const lead = {id:'new',nombre:'Nuevo',telefono:'2025550148',telemarketing:'GERAL',intentos:0,contactosEfectivos:0,creadoPor:'agent@example.com'} as any;
  await assert.rejects(createProspectWithPhone(lead,agent),/preparar el índice/);
  const preview = await preparePhoneIndex(false,admin);
  assert.deepEqual(preview,{count:1,conflicts:[],invalid:[],applied:false});
  assert.equal((await getDoc(doc(admin,'settings','phoneIndexStatus'))).exists(),false);
  assert.equal((await getDocs(collection(admin,'telefonosUnicos'))).size,0);
  assert.equal((await preparePhoneIndex(true,admin)).applied,true);
  assert.deepEqual((await getDoc(doc(admin,'prospectos','existing'))).data(),existing);
  assert.equal((await getDoc(doc(admin,'telefonosUnicos','2135550199'))).data()?.idProspecto,'existing');
  await createProspectWithPhone(lead,agent);
  assert.equal((await getDoc(doc(admin,'prospectos','new'))).data()?.nombre,'Nuevo');
  await assert.rejects(createProspectWithPhone({...lead,id:'duplicate'},agent),/ya está registrado/);
  assert.equal((await getDoc(doc(admin,'prospectos','duplicate'))).exists(),false);
  await assert.rejects(preparePhoneIndex(true,agent));
});

test('los duplicados y teléfonos inválidos detienen la preparación sin alterar la cartera', async () => {
  const admin = env.authenticatedContext('admin',{email:adminEmail,email_verified:true}).firestore() as unknown as Firestore;
  for (const [id,telefono] of [['a','2135550199'],['b','12135550199'],['invalid','123']]) {
    await setDoc(doc(admin,'prospectos',id),{nombre:id,telefono});
  }
  const result = await preparePhoneIndex(true,admin);
  assert.equal(result.applied,false);
  assert.deepEqual(result.conflicts,['2135550199']);
  assert.deepEqual(result.invalid,['invalid']);
  assert.equal((await getDoc(doc(admin,'settings','phoneIndexStatus'))).exists(),false);
  assert.equal((await getDocs(collection(admin,'prospectos'))).size,3);
  assert.equal((await getDocs(collection(admin,'telefonosUnicos'))).size,0);
});
