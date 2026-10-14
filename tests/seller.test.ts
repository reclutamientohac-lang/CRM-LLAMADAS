import { canAccessTab } from '../src/accessPolicy';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sellerDefaults, ownsProspect, sellerUpdateAllowed } from '../src/sellerPolicy';
import { sellerReport } from '../src/sellerReport';
import type { UserProfile } from '../src/types';
const profile = { email:'seller@example.com', displayName:'Vendedor', role:'Vendedor', telemarketingAgent:'GERAL' } as UserProfile;
test('propietario y telemarketing se obtienen de la cuenta, no del formulario', () => {
  const forged = { propietarioEmail:'other@example.com', propietario:'Otro', telemarketing:'IRENE' };
  assert.deepEqual({ ...forged, ...sellerDefaults(profile) }, { propietarioEmail:'seller@example.com', propietario:'Vendedor', telemarketing:'GERAL' });
  assert.throws(() => sellerDefaults({ ...profile, telemarketingAgent:'' }));
});
test('misma telemarketing o nombre nunca concede propiedad de otra cuenta', () => {
  assert.equal(ownsProspect(profile, { propietario:'Vendedor', telemarketing:'GERAL' }), false);
  assert.equal(ownsProspect(profile, { propietarioEmail:'other@example.com' }), false);
  assert.equal(ownsProspect(profile, { propietarioEmail:'seller@example.com' }), true);
});
test('edición de datos permitida sin cambiar identidad ni asignación', () => {
  const previous = sellerDefaults(profile);
  assert(sellerUpdateAllowed(previous, { nombre:'Nuevo nombre' }));
  for (const updates of [{ propietario:'Otro' }, { propietarioEmail:'other@example.com' }, { telemarketing:'IRENE' }]) assert.equal(sellerUpdateAllowed(previous, updates), false);
});
test('reporte de cartera filtra por cuenta, conserva agentes históricos y evita duplicados', () => {
  const p = { id:'own', ...sellerDefaults(profile), fechaRecepcion:'2026-10-01', creadoEn:'2026-10-01T20:00:00Z', creadoPor:profile.email };
  const g = { id:'call', idProspecto:'own', creadoEn:'2026-10-02T20:00:00Z', telemarketing:'IRENE' };
  const c = { id:'visit', idProspecto:'own', fechaCita:'2026-10-03', estadoCita:'Agendada' };
  const v = { id:'sale', idProspecto:'own', fechaReporte:'2026-10-03', estado:'Aprobada', montoAprobado:2000 };
  const data:any = { prospectos:[p,p,{...p,id:'foreign',propietarioEmail:'other@example.com'}],gestiones:[g,g,{...g,id:'other',idProspecto:'foreign'}],citas:[c,c,{...c,id:'cancel',estadoCita:'Cancelada'}],ventas:[v,v,{...v,id:'pending',estado:'Pendiente'},{...v,id:'cancel',estado:'Cancelada'}] };
  assert.deepEqual(sellerReport(data,profile.email,'2026-10-01','2026-10-31'), { cartera:1, ingresados:1, cargadosPorVendedor:2, gestiones:1, citas:1, citasCanceladas:1, ventasAprobadas:1, ventasPendientes:1, volumen:2000 });
  assert.equal(sellerReport(data,'','2026-10-01','2026-10-31').cartera,0);
  assert.equal(sellerReport(data,profile.email,'2026-11-01','2026-11-30').ventasAprobadas,0);
});

test('vendedor accede a módulos operativos y reporte, nunca a administración', () => {
 const can = (tab:string) => (canAccessTab as Function)(tab, 'Vendedor', false);
 for(const tab of ['trabajo','pipeline','prospectos','cargar','agenda','dashboard','individual']) assert.equal(can(tab),true);
 for(const tab of ['accesos','configuracion','respaldo','reportes']) assert.equal(can(tab),false);
});
