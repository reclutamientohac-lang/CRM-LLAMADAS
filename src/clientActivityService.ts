import {doc,collection,runTransaction,serverTimestamp,setDoc,type Firestore} from 'firebase/firestore';
import {db as defaultDb} from './firebase';
import {safeDocumentUrl,validateGoals,type ClientEntry,type Entity,type GoalValues} from './commercial';
import {cents} from './money';
export function goalId(month:string,entity:Entity){return `${month}_${entity.type}_${encodeURIComponent(entity.identity)}`;}
export async function saveMonthlyGoal(month:string,entity:Entity,values:GoalValues,actor:string,database:Firestore=defaultDb){
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))throw new Error('Mes inválido.');
 const validated=validateGoals(values);
 await setDoc(doc(database,'metasProductividad',goalId(month,entity)),{...validated,volumenCentavos:cents(validated.volumen),mes:month,tipo:entity.type,identidad:entity.identity,actualizadoPor:actor.toLowerCase(),actualizadoEn:serverTimestamp()});
}
export async function appendClientEntry(id:string,input:Omit<ClientEntry,'id'|'creadoEn'>,database:Firestore=defaultDb){
 if(!input.idProspecto||input.texto.length>5000||input.titulo.length>200||input.url.length>2000)throw new Error('Contenido demasiado largo o cliente inválido.');
 const data={...input,texto:input.texto.trim(),titulo:input.titulo.trim(),url:input.tipo==='Documento'?safeDocumentUrl(input.url):'',creadoPor:input.creadoPor.toLowerCase()};
 if(input.tipo==='Nota'&&!data.texto)throw new Error('Escribe una nota.');
 if(input.tipo==='Documento'&&!data.titulo)throw new Error('Indica el nombre del documento.');
 await runTransaction(database,async tx=>{const ref=doc(database,'historialCliente',id);const previous=await tx.get(ref);if(previous.exists()){const old=previous.data();if(Object.entries(data).every(([k,v])=>old[k]===v))return;throw new Error('El identificador ya existe. Vuelve a abrir la ficha.');}tx.set(ref,{...data,creadoEn:serverTimestamp()});});
}
export const newEntryId=()=>doc(collection(defaultDb,'historialCliente')).id;
