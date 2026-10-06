import {collection,onSnapshot,query,where} from 'firebase/firestore';
import type {DocumentData} from 'firebase/firestore';
import {db} from '../firebase';
// La seguridad del servidor verifica la asignación del prospecto actual, no quien hizo la llamada.
// Grupos de 10 prospectos evitan superar el límite de accesos de reglas por consulta.
export function subscribeCRMRecords(name:string,all:boolean,ids:string[],receive:(rows:DocumentData[])=>void,error:(e:any)=>void){
 if(all)return onSnapshot(collection(db,name),s=>receive(s.docs.map(d=>({...d.data(),id:d.id}))),error);
 if(!ids.length){receive([]);return ()=>{};}
 const lists=new Map<number,DocumentData[]>();let timer:ReturnType<typeof setTimeout>|undefined;let stopped=false;
 const subs:Array<()=>void>=[];for(let i=0;i<ids.length;i+=10){const index=i;subs.push(onSnapshot(query(collection(db,name),where('idProspecto','in',ids.slice(i,i+10))),s=>{lists.set(index,s.docs.map(d=>({...d.data(),id:d.id})));if(timer)clearTimeout(timer);timer=setTimeout(()=>{if(!stopped)receive([...lists.values()].flat());},30);},error));}
 return()=>{stopped=true;if(timer)clearTimeout(timer);subs.forEach(unsub=>unsub());};
}
