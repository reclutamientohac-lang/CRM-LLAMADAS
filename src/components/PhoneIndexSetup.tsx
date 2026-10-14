import React,{useState} from 'react';
import { preparePhoneIndex } from '../phoneRegistry';
export function PhoneIndexSetup() {
  const [result,setResult]=useState<Awaited<ReturnType<typeof preparePhoneIndex>>|null>(null);
  const [busy,setBusy]=useState(false); const [error,setError]=useState('');
  const run=async(apply:boolean)=>{setBusy(true);setError('');try{setResult(await preparePhoneIndex(apply));}catch(e){setError(String(e));}finally{setBusy(false);}};
  return <section className="bg-white border rounded-2xl p-5 space-y-3"><h2 className="font-bold">Protección de teléfonos duplicados</h2><p className="text-sm">Verifica los contactos existentes antes de activar ingresos y cambios de teléfono con control de duplicados simultáneos. Esta preparación conserva los prospectos, resultados y bonos.</p><button disabled={busy} onClick={()=>run(false)} className="border rounded-xl p-2">Verificar sin modificar</button>{result&&!result.applied&&!result.conflicts.length&&!result.invalid.length&&<button disabled={busy} onClick={()=>run(true)} className="ml-3 border rounded-xl p-2">Preparar índice de {result.count} teléfonos</button>}{result&&<p>{result.applied?'Índice preparado.':`${result.count} teléfonos válidos; ${result.conflicts.length} repetidos; ${result.invalid.length} registros con teléfono inválido.`}</p>}{error&&<p role="alert">{error}</p>}{!!result?.conflicts.length&&<p className="text-sm">Revisa los teléfonos repetidos en Prospectos. No se han unido ni eliminado contactos.</p>}</section>;
}
