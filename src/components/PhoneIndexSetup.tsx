import React,{useState} from 'react';
import { preparePhoneIndex } from '../phoneRegistry';
import { db } from '../firebase';
export function PhoneIndexSetup() {
  const [result,setResult]=useState<Awaited<ReturnType<typeof preparePhoneIndex>>|null>(null);
  const [busy,setBusy]=useState(false); const [error,setError]=useState('');
  const run=async(apply:boolean,preserveLegacy=false)=>{setBusy(true);setError('');try{setResult(await preparePhoneIndex(apply,db,preserveLegacy));}catch(e){setError(String(e));}finally{setBusy(false);}};
  const hasLegacyIssues=!!result&&(result.conflicts.length>0||result.invalid.length>0);
  return <section className="bg-white border rounded-2xl p-5 space-y-3">
    <h2 className="font-bold">Protección de teléfonos duplicados</h2>
    <p className="text-sm">Verifica los contactos existentes antes de activar ingresos y cambios de teléfono con control de duplicados simultáneos. Esta preparación conserva los prospectos, resultados y bonos.</p>
    <button disabled={busy} onClick={()=>run(false)} className="border rounded-xl p-2">Verificar sin modificar</button>
    {result&&!result.applied&&<button disabled={busy} onClick={()=>run(true,hasLegacyIssues)} className="ml-3 border rounded-xl p-2">{hasLegacyIssues?'Preparar índice conservando registros históricos':`Preparar índice de ${result.count} teléfonos`}</button>}
    {busy&&<p role="status">Procesando la verificación de teléfonos…</p>}
    {result&&<p role="status">{result.applied?'Índice preparado. El registro de nuevos prospectos está habilitado.':`${result.count} teléfonos válidos; ${result.conflicts.length} repetidos; ${result.invalid.length} registros con teléfono inválido.`}</p>}
    {hasLegacyIssues&&<p className="text-sm">Los contactos históricos se conservan sin unirlos ni eliminarlos. Los teléfonos repetidos quedan reservados para impedir nuevos duplicados; los teléfonos inválidos deben corregirse en sus fichas.</p>}
    {error&&<p role="alert">{error}</p>}
  </section>;
}
