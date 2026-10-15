import { collection, doc, getDocs, runTransaction, serverTimestamp, setDoc } from 'firebase/firestore';
import { db as defaultDb } from './firebase';
import type { Firestore } from 'firebase/firestore';
import { normalizePhone } from './businessRules';
import type { Prospecto } from './types';

const registry = (phone: string, db: Firestore) => doc(db, 'telefonosUnicos', phone);
const status = (db: Firestore) => doc(db, 'settings', 'phoneIndexStatus');
export function phoneIndexPreview(rows: {id:string;telefono:string}[]) {
  const phones = new Map<string,string>(); const conflicts: string[] = []; const invalid: string[] = [];
  for (const p of rows) { const phone=normalizePhone(p.telefono); if (!/^\d{10}$/.test(phone)) { invalid.push(p.id); continue; } if (phones.has(phone) && phones.get(phone)!==p.id) conflicts.push(phone); else phones.set(phone,p.id); }
  return { phones, conflicts:[...new Set(conflicts)], invalid };
}
export async function preparePhoneIndex(apply = false, db: Firestore = defaultDb, preserveLegacy = false) {
  const snapshot=await getDocs(collection(db,'prospectos'));
  const rows=snapshot.docs.map(d=>({id:d.id,telefono:d.data().telefono || ''}));
  const preview=phoneIndexPreview(rows);
  if (!apply || (!preserveLegacy && (preview.conflicts.length || preview.invalid.length))) return { count:preview.phones.size, conflicts:preview.conflicts, invalid:preview.invalid, applied:false };
  const initialPhones = new Map(rows.map(row => [row.id, normalizePhone(row.telefono)]));
  const conflicts = new Set(preview.conflicts);
  await setDoc(status(db),{ready:false,actualizadoEnServidor:serverTimestamp()});
  const entries=[...preview.phones];
  for(let i=0;i<entries.length;i+=50) {
    await runTransaction(db,async tx=>{
      const group=entries.slice(i,i+50);
      const sources=await Promise.all(group.map(([,id])=>tx.get(doc(db,'prospectos',id))));
      const indexes=await Promise.all(group.map(([phone])=>tx.get(registry(phone,db))));
      group.forEach(([phone,id],n)=>{
        if(!sources[n].exists() || normalizePhone(sources[n].data()?.telefono)!==phone) throw new Error('La cartera cambió durante la preparación. Vuelve a verificar.');
        const previous = indexes[n].data();
        const legacy = conflicts.has(phone) || previous?.conflictoHistorico === true;
        // A shared historical phone remains reserved independently of either lead.
        // Moving one of those leads must never release the other's phone.
        const owner = legacy ? `legacy:${phone}` : id;
        if(indexes[n].exists() && previous?.idProspecto!==owner && initialPhones.get(previous?.idProspecto)!==phone) throw new Error('Existe un conflicto en el índice. Requiere revisión administrativa.');
        tx.set(registry(phone,db),{idProspecto:owner,...(legacy ? {conflictoHistorico:true} : {}),actualizadoEnServidor:serverTimestamp()});
      });
    });
  }
  // Recheck membership and phones before enabling writes. Source creates in the app
  // remain blocked while ready=false; restoration must invalidate this flag.
  const current=await getDocs(collection(db,'prospectos'));
  if(current.size!==snapshot.size || current.docs.some(d=>initialPhones.get(d.id)!==normalizePhone(d.data().telefono))) throw new Error('La cartera cambió. El índice queda deshabilitado hasta una nueva verificación.');
  await setDoc(status(db),{ready:true,count:entries.length,conflictosHistoricos:preview.conflicts.length,telefonosInvalidosHistoricos:preview.invalid.length,actualizadoEnServidor:serverTimestamp()});
  return {count:entries.length,conflicts:preview.conflicts,invalid:preview.invalid,applied:true};
}
export async function createProspectWithPhone(lead: Prospecto, db: Firestore = defaultDb) {
  const phone=normalizePhone(lead.telefono);
  await runTransaction(db,async tx=>{
    const ready=await tx.get(status(db));
    if(!ready.data()?.ready) throw new Error('El administrador debe preparar el índice de teléfonos en Configuración antes de ingresar contactos.');
    const index=await tx.get(registry(phone,db));
    const existing=await tx.get(doc(db,'prospectos',lead.id));
    if(index.exists() || existing.exists()) throw new Error('El teléfono o identificador ya está registrado. No se guardó un duplicado.');
    tx.set(doc(db,'prospectos',lead.id),{...lead,telefono:phone,registradoEnServidor:serverTimestamp()});
    tx.set(registry(phone,db),{idProspecto:lead.id,actualizadoEnServidor:serverTimestamp()});
  });
}
export async function updateProspectWithPhone(id:string, updates:Record<string,unknown>, actor:string, db: Firestore = defaultDb) {
  await runTransaction(db,async tx=>{
    const ref=doc(db,'prospectos',id); const current=await tx.get(ref);
    if(!current.exists()) throw new Error('Prospecto no disponible.');
    const before=current.data(); const oldPhone=normalizePhone(before.telefono); const phone=normalizePhone(String(updates.telefono ?? before.telefono));
    if(phone!==oldPhone) {
      const ready=await tx.get(status(db)); if(!ready.data()?.ready) throw new Error('El administrador debe preparar el índice de teléfonos antes de cambiar un teléfono.');
      const next=await tx.get(registry(phone,db)); const prior=await tx.get(registry(oldPhone,db));
      if(next.exists() && next.data()?.idProspecto!==id) throw new Error('El teléfono ya está registrado.');
      tx.set(registry(phone,db),{idProspecto:id,actualizadoEnServidor:serverTimestamp()});
      if(prior.data()?.idProspecto===id) tx.delete(registry(oldPhone,db));
    }
    tx.update(ref,{...updates,actualizadoEnServidor:serverTimestamp()});
    if(updates.telemarketing!==undefined && updates.telemarketing!==before.telemarketing) tx.set(doc(collection(db,'logAsignaciones')),{idProspecto:id,anterior:before.telemarketing||'',nueva:updates.telemarketing,usuario:actor,fecha:new Date().toISOString(),registradoEnServidor:serverTimestamp()});
  });
}
