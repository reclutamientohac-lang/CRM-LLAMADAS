import {collection,doc,addDoc,setDoc,runTransaction} from 'firebase/firestore';
import type {Firestore} from 'firebase/firestore';
import type {BackupFile,BackupRecord,Progress} from './types';
import {buildRestorePlan,encodeRecord,decodeRecord} from './backupCodec';
import {canonicalBackupRecord} from '../businessRules';
const yieldUI=()=>new Promise<void>(resolve=>setTimeout(resolve,0));
export async function applyRestore(db:Firestore,operator:string,file:BackupFile,current:Record<string,BackupRecord[]>,selected:string[],mode:'missing'|'replace',remove:boolean,includeUsers:boolean,signal:AbortSignal,progress:(p:Progress)=>void,filename:string){
  const ops=buildRestorePlan(file,current,selected,mode,remove,includeUsers);
  // No eliminar prospectos/citas si la selección dejaría registros dependientes vivos.
  const deletes=new Set(ops.filter(o=>o.action==='delete').map(o=>o.collection+'/'+o.id));
  const finalRecords=(name:string)=>{const map=new Map((current[name]||[]).map(r=>[r.id,r.data]));for(const op of ops.filter(o=>o.collection===name)){if(op.action==='delete')map.delete(op.id);else map.set(op.id,op.record!.data);}return [...map.values()];};
  for(const name of ['gestiones','citas','retroalimentaciones','ventas'])for(const data of finalRecords(name))if(deletes.has('prospectos/'+data.idProspecto)||deletes.has('citas/'+data.idCita))throw new Error('La eliminación dejaría registros sin prospecto o cita. Selecciona las colecciones relacionadas o conserva los registros actuales.');
  // Una restauración parcial no puede introducir registros con padres inexistentes.
  const currentProspectIds=new Set((current.prospectos||[]).map(r=>r.id));
  const prospectIds=new Set([...currentProspectIds,...ops.filter(o=>o.collection==='prospectos'&&o.action==='set').map(o=>o.id)]);
  for(const op of ops.filter(o=>o.collection==='prospectos'&&o.action==='delete'))prospectIds.delete(op.id);
  const citaIds=new Set((current.citas||[]).map(r=>r.id));
  for(const op of ops.filter(o=>o.collection==='citas')){if(op.action==='delete')citaIds.delete(op.id);else citaIds.add(op.id);}
  for(const op of ops.filter(o=>o.action==='set'&&['gestiones','citas','retroalimentaciones','ventas'].includes(o.collection))){const data=op.record!.data;if(!prospectIds.has(data.idProspecto))throw new Error(`No se restaura ${op.collection}/${op.id}: falta su prospecto. Incluye prospectos en la selección.`);if(['ventas','retroalimentaciones'].includes(op.collection)&&!citaIds.has(data.idCita))throw new Error(`No se restaura ${op.collection}/${op.id}: falta su cita. Incluye citas en la selección.`);}
  const logRef=await addDoc(collection(db,'logRestauraciones'),{fecha:new Date().toISOString(),usuario:operator,archivo:filename,hash:file.hash||'',modo:mode,colecciones:selected,eliminar:remove,total:ops.length,aplicados:0,lotes:[],estado:'En curso'});
  const results:any[]=[];let done=0;
  try{for(let offset=0;offset<ops.length;){if(signal.aborted)break;let bytes=0;const chunk:import('./backupCodec').RestoreOperation[]=[];while(offset+chunk.length<ops.length&&chunk.length<200){const op=ops[offset+chunk.length];const size=new TextEncoder().encode(JSON.stringify(op)).length;if(chunk.length&&bytes+size>6_000_000)break;bytes+=size;chunk.push(op);}const batchIndex=results.length+1;
      await runTransaction(db,async tx=>{
        // Lecturas antes de escrituras. Comparar evita sobrescribir cambios después de la vista previa.
        const snaps=[];for(const op of chunk)snaps.push(await tx.get(doc(db,op.collection,op.id)));
        for(let i=0;i<chunk.length;i++){const op=chunk[i];const snap=snaps[i];const now=snap.exists()?encodeRecord(snap.id,snap.data()!):undefined;
          if(mode==='missing'&&op.action==='set'){if(now)throw new Error(`Conflicto: ${op.collection}/${op.id} fue creado después de la vista previa. Actualízala.`);}
          else if(canonicalBackupRecord(now||null)!==canonicalBackupRecord(op.expected||null))throw new Error(`Conflicto en ${op.collection}/${op.id}: cambió después de la vista previa.`);
        }
        for(const op of chunk){const ref=doc(db,op.collection,op.id);if(op.action==='delete')tx.delete(ref);else tx.set(ref,decodeRecord(op.record!,db));}
        tx.set(logRef,{aplicados:done+chunk.length,lotes:[...results,{lote:batchIndex,operaciones:chunk.length,estado:'Aplicado'}],estado:'En curso'},{merge:true});
      });done+=chunk.length;offset+=chunk.length;results.push({lote:batchIndex,operaciones:chunk.length,estado:'Aplicado'});progress({message:`Restaurando... ${done} de ${ops.length}. Lote ${batchIndex} aplicado.`,done,total:ops.length});await yieldUI();}
    const state=signal.aborted?'Cancelada parcialmente':'Completada';await setDoc(logRef,{estado:state,aplicados:done,pendientes:ops.length-done,fin:new Date().toISOString()},{merge:true});await addDoc(collection(db,'auditoria'),{accion:'RESTAURACION',usuario:operator,fecha:new Date().toISOString(),logId:logRef.id,estado:state,aplicados:done});return {estado:state,aplicados:done,pendientes:ops.length-done,lotes:results};
  }catch(e){const error=String(e);try{await setDoc(logRef,{estado:'Detenida por error',error,aplicados:done,pendientes:ops.length-done,loteFallido:results.length+1},{merge:true});}catch{}return {estado:'Detenida por error',error,aplicados:done,pendientes:ops.length-done,lotes:results,loteFallido:results.length+1};}
}
