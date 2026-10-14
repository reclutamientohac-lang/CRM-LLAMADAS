import { serverTimestamp } from 'firebase/firestore';
import { collection, doc, getDocsFromServer, runTransaction } from 'firebase/firestore';
import { db } from '../firebase';
import React,{useMemo,useState,useRef} from 'react';
import { useCRM } from '../context/CRMContext';
import { useAuth } from '../context/AuthContext';
import { ownerSimilarity,normalizeOwner } from '../businessRules';
import { updateInChunks } from '../stage78/service';
import { Button,DataTable,Modal } from '../stage78/ui';
export function UnificarPropietarios(){const {isAdmin,user}=useAuth(),{prospectos}=useCRM();const [pair,setPair]=useState<string[]|null>(null),[name,setName]=useState(''),[confirm,setConfirm]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');const control=useRef<AbortController|null>(null);
 const pairs=useMemo(()=>{if(!isAdmin)return [];const names=[...new Set(prospectos.map(p=>p.propietario).filter(Boolean))];const buckets=new Map<string,string[]>();for(const n of names){const key=normalizeOwner(n).split(' ')[0];const list=buckets.get(key)||[];list.push(n);buckets.set(key,list);}const result:any[]=[];for(const bucket of buckets.values())for(let i=0;i<bucket.length;i++)for(let j=i+1;j<bucket.length;j++)if(ownerSimilarity(bucket[i],bucket[j]))result.push({Nombre:bucket[i],Variante:bucket[j],Registros:prospectos.filter(p=>p.propietario===bucket[i]||p.propietario===bucket[j]).length});return result;},[prospectos,isAdmin]);if(!isAdmin)return null;
 return <div className="crm78 crm78-card"><UnificarGenesis /><h3>Unificar propietarios</h3><p>Los reportes ya agrupan sin mayúsculas, tildes ni espacios sobrantes. Esta herramienta cambia los nombres guardados; revisa cada propuesta para evitar unir personas distintas.</p>{message&&<p className="crm78-status">{message}</p>}<DataTable rows={pairs} onCell={r=>{setPair([r.Nombre,r.Variante]);setName(r.Nombre.trim());setConfirm('');}}/>{pair&&<Modal title="Unificar nombres de propietario" onClose={()=>{if(!busy)setPair(null);}}><p>{pair.join(' ↔ ')}</p><input aria-label="Nombre correcto" value={name} onChange={e=>setName(e.target.value)}/><p>Escribe UNIFICAR y confirma el resumen antes de guardar.</p><input placeholder="UNIFICAR" value={confirm} onChange={e=>setConfirm(e.target.value)}/><Button disabled={busy||confirm!=='UNIFICAR'||!name.trim()} onClick={async()=>{const selected=prospectos.filter(p=>pair.includes(p.propietario));if(!window.confirm(`Se actualizarán ${selected.length} prospectos a «${name.trim()}». ¿Confirmar?`))return;setBusy(true);control.current=new AbortController();try{const count=await updateInChunks('prospectos',selected.map(p=>({id:p.id,data:{propietario:name.trim(),modificadoEn:new Date().toISOString(),modificadoPor:user?.email}})),'UNIFICAR_PROPIETARIOS',control.current.signal,{nombresAnteriores:pair,nombreCorrecto:name.trim()});setMessage(`${count} prospectos actualizados.`);setPair(null);}catch(e){setMessage(String(e));}finally{setBusy(false);}}}>Confirmar y unificar</Button>{busy&&<Button onClick={()=>control.current?.abort()}>Cancelar al terminar el lote</Button>}</Modal>}</div>;
}


// Explicit identity correction requested by administration. No account permissions are changed.
function UnificarGenesis() {
 const { isAdmin, user } = useAuth();
 const { settings } = useCRM();
 const [plan,setPlan] = useState<{collection:string;id:string;fields:string[]}[]|null>(null);
 const [busy,setBusy] = useState(false);
 const [message,setMessage] = useState('');
 const names = ['prospectos','gestiones','citas','retroalimentaciones','ventas'];
 const fields = ['telemarketing','propietario','creadoPor'];
 const isGenesis = (v:unknown) => typeof v==='string' && v.normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase()==='GENESIS';
 const target = settings.telemarketingAgents.find(a=>a.name.trim().toUpperCase()==='GERAL')?.name;
 if(!isAdmin) return null;
 const scan = async () => {
   if(!target) throw new Error('No se encontró la agente GERAL.');
   const rows:{collection:string;id:string;fields:string[]}[]=[];
   for(const name of names) {
     const snap=await getDocsFromServer(collection(db,name));
     for(const item of snap.docs) {
       const found=fields.filter(f=>isGenesis(item.data()[f]));
       if(found.length) rows.push({collection:name,id:item.id,fields:found});
     }
   }
   return rows;
 };
 return <section style={{borderBottom:'1px solid #ccd3de',paddingBottom:20,marginBottom:20}}>
   <h3>Unificar Genesis con GERAL</h3>
   <p>Corrige los campos de agente, propietario y autor de resultados que sean exactamente Genesis, también con tildes o espacios. Cada corrección conserva sus valores anteriores en auditoría.</p>
   <Button disabled={busy||!target} onClick={async()=>{setBusy(true);setMessage('Revisando registros...');try{const rows=await scan();setPlan(rows);setMessage(rows.length?`${rows.length} registros por corregir.`:'Verificado: no quedan registros operativos con Genesis.');}catch(e){setMessage(String(e));}finally{setBusy(false);}}}>Revisar Genesis → GERAL</Button>
   {plan && <p>{names.map(n=>`${n}: ${plan.filter(r=>r.collection===n).length}`).join(' · ')}</p>}
   {!!plan?.length && <Button disabled={busy} onClick={async()=>{
     setBusy(true);let applied=0;const operation=`UNIFICAR_GENESIS_${new Date().toISOString()}`;
     try {
       for(const row of plan) {
         const changed=await runTransaction(db,async tx=>{
           const ref=doc(db,row.collection,row.id);const snap=await tx.get(ref);
           if(!snap.exists()) return false;
           const data=snap.data();const before:Record<string,string>={};const after:Record<string,string>={};
           for(const field of row.fields) if(isGenesis(data[field])) {before[field]=data[field];after[field]=target!;}
           if(!Object.keys(after).length) return false;
           const now=new Date().toISOString();
           tx.set(doc(collection(db,'auditoria')),{registradoEnServidor:serverTimestamp(),accion:'UNIFICAR_IDENTIDAD',operacion:operation,coleccion:row.collection,idRegistro:row.id,antes:before,despues:after,usuario:user?.email,fecha:now});
           tx.update(ref,{...after,...(row.collection==='ventas'||row.collection==='citas'?{ultimaActualizacion:now}:{})});
           return true;
         });
         if(changed) applied++;
       }
       const remaining=await scan();setPlan(remaining);setMessage(`Corrección completada: ${applied} registros actualizados. Pendientes: ${remaining.length}.`);
     } catch(e) {setMessage(`Se corrigieron ${applied} registros. ${String(e)}. Vuelve a revisar para continuar sin duplicar.`);} finally {setBusy(false);}
   }}>Aplicar unificación a GERAL</Button>}
   {message&&<p role="status">{message}</p>}
 </section>;
}
