import { Bytes, DocumentReference, GeoPoint, Timestamp, doc } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import type { BackupFile, BackupRecord } from './types';
import { BACKUP_COLLECTIONS, canonicalBackupRecord } from '../businessRules';
const forbidden=/^(token|tokens|access_token|refresh_token|id_token|accessToken|refreshToken|idToken|credential|credentials|password|passwordHash|authToken|apiKey|privateKey|sessionToken|stsTokenManager)$/i;
export function encodeRecord(id:string,data:Record<string,any>):BackupRecord {
  const types:Record<string,string>={};
  const walk=(v:any,path:string):any=>{
    if(v instanceof Timestamp){types[path]='timestamp:'+v.nanoseconds;return v.toDate().toISOString();}
    if(v instanceof Date){types[path]='date';return v.toISOString();}
    if(v instanceof GeoPoint){types[path]='geopoint';return {latitude:v.latitude,longitude:v.longitude};}
    if(v instanceof DocumentReference){types[path]='reference';return v.path;}
    if(v instanceof Bytes){types[path]='bytes';return v.toBase64();}
    if(typeof v==='number'&&!Number.isFinite(v)){types[path]='number';return String(v);}
    if(Array.isArray(v))return v.map((x,i)=>walk(x,path+'/'+i));
    if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).map(([k,x])=>{if(forbidden.test(k))throw new Error(`Campo de autenticación ${k} en ${id}. Respaldo detenido para evitar incluir secretos.`);return [k,walk(x,path+'/'+k.replace(/~/g,'~0').replace(/\//g,'~1'))];}));
    return v;
  };
  return {id,data:walk(data,''),...(Object.keys(types).length?{types}:{})};
}
export function decodeRecord(record:BackupRecord,db:Firestore):Record<string,any> {
  const walk=(v:any,path:string):any=>{const type=record.types?.[path];if(type?.startsWith('timestamp:'))return new Timestamp(Math.floor(new Date(v).getTime()/1000),Number(type.split(':')[1]));if(type==='timestamp')return Timestamp.fromDate(new Date(v));if(type==='date')return new Date(v);if(type==='geopoint')return new GeoPoint(v.latitude,v.longitude);if(type==='reference')return doc(db,v);if(type==='bytes')return Bytes.fromBase64String(v);if(type==='number')return v==='NaN'?NaN:v==='Infinity'?Infinity:-Infinity;
    if(Array.isArray(v))return v.map((x,i)=>walk(x,path+'/'+i));if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,walk(x,path+'/'+k.replace(/~/g,'~0').replace(/\//g,'~1'))]));return v;};return walk(record.data,'');
}
export async function sha256(text:string):Promise<string>{return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))).map(b=>b.toString(16).padStart(2,'0')).join('');}
// Hash del documento canónico sin su campo hash (evita la autorreferencia).
export async function backupHash(file:BackupFile){const {hash,...payload}=file;return sha256(canonicalBackupRecord(payload));}
export async function validateBackup(value:any,extraCollections:string[]=[]):Promise<BackupFile> {
  if(!value||value.app!=='CRM LLAMADAS'||value.version!==1)throw new Error('El archivo no pertenece a CRM LLAMADAS o su versión no es compatible.');
  if(!value.fecha||!Number.isFinite(Date.parse(value.fecha))||typeof value.usuario!=='string'||!value.collections||Array.isArray(value.collections))throw new Error('Falta la fecha, el usuario o las colecciones.');
  const allowed=new Set<string>([...BACKUP_COLLECTIONS,...extraCollections]);
  const names=Object.keys(value.collections);if(!names.includes('prospectos')||!names.includes('settings'))throw new Error('Faltan las colecciones prospectos y/o settings.');
  for(const [name,records] of Object.entries(value.collections)){
    if(!allowed.has(name))throw new Error(`Colección no registrada: ${name}. Regístrala antes de restaurar.`);
    if(!Array.isArray(records))throw new Error(`Formato inválido en ${name}.`);
    const ids=new Set();for(const r of records){if(!r||typeof r.id!=='string'||!r.id||r.id.includes('/')||ids.has(r.id)||!r.data||typeof r.data!=='object'||Array.isArray(r.data))throw new Error(`ID duplicado o registro inválido en ${name}.`);ids.add(r.id);
      encodeRecord(r.id,r.data); // rechaza secretos incluso en archivos editados
      if(r.types){for(const [path,type] of Object.entries(r.types)){if(!path.startsWith('/')||!(['timestamp','date','geopoint','reference','bytes','number'].includes(type as string)||/^timestamp:\d{1,9}$/.test(type as string)))throw new Error(`Tipo no compatible en ${name}/${r.id}.`);let v:any=r.data;for(const k of path.slice(1).split('/').map(x=>x.replace(/~1/g,'/').replace(/~0/g,'~')))v=v?.[k];if(v===undefined)throw new Error('Ruta de tipo inexistente.');if((['date','timestamp'].includes(type as string)||(type as string).startsWith('timestamp:'))&&!Number.isFinite(Date.parse(v)))throw new Error('Fecha tipada inválida.');if(type==='reference'&&(typeof v!=='string'||v.split('/').length%2!==0))throw new Error('Referencia inválida.');if(type==='geopoint'&&(!(Math.abs(v.latitude)<=90)||!(Math.abs(v.longitude)<=180)))throw new Error('Coordenadas inválidas.');if(type==='bytes')Bytes.fromBase64String(v);if(type==='number'&&!['NaN','Infinity','-Infinity'].includes(v))throw new Error('Número especial inválido.');}}
    }
  }
  if(value.hash&&value.hash!==await backupHash(value))throw new Error('El hash SHA-256 no coincide. El archivo fue alterado o está dañado.');
  return value as BackupFile;
}
export interface RestoreOperation { collection:string;id:string;action:'set'|'delete';record?:BackupRecord;expected?:BackupRecord }
export function buildRestorePlan(file:BackupFile,current:Record<string,BackupRecord[]>,selected:string[],mode:'missing'|'replace',remove:boolean,includeUsers:boolean):RestoreOperation[]{
  const ops:RestoreOperation[]=[];
  const order=[...selected].sort((a,b)=>{const rank=(c:string)=>c==='settings'?0:c==='prospectos'?1:c==='citas'?2:c==='ventas'?4:3;return rank(a)-rank(b);});
  for(const collection of order){if(collection==='usuariosAutorizados'&&!includeUsers)continue;if(['respaldos','logRestauraciones','auditoria'].includes(collection))continue;
    const records=file.collections[collection]||[];const now=new Map((current[collection]||[]).map(r=>[r.id,r]));const ids=new Set(records.map(r=>r.id));
    for(const record of records){if(collection==='usuariosAutorizados'&&record.id.toLowerCase()==='reclutamientohac@gmail.com')continue;if(mode==='missing'&&now.has(record.id))continue;ops.push({collection,id:record.id,action:'set',record,expected:now.get(record.id)});}
    if(mode==='replace'&&remove)for(const [id,record]of now)if(!ids.has(id)&&!(collection==='usuariosAutorizados'&&id.toLowerCase()==='reclutamientohac@gmail.com'))ops.push({collection,id,action:'delete',expected:record});
  }
  // Padres se eliminan al final. No se permite eliminar un padre si quedan dependencias.
  return [...ops.filter(o=>o.action==='set'),...ops.filter(o=>o.action==='delete').reverse()];
}
