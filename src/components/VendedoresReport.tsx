import React, { useMemo, useState } from 'react';
import { useCRM } from '../context/CRMContext';
import { useAuth } from '../context/AuthContext';
import { getTodayInLA } from '../businessRules';
import { sellerReport } from '../sellerReport';
import { ownerEmail } from '../sellerPolicy';

export function VendedoresReport() {
  const data = useCRM();
  const { userProfile, isAdmin, isSupervisor } = useAuth();
  const isSeller = userProfile?.role === 'Vendedor';
  const allowed = isSeller || isAdmin || isSupervisor || userProfile?.role === 'Distribuidor';
  const today = getTodayInLA();
  const [desde, setDesde] = useState(today.slice(0, 7) + '-01');
  const [hasta, setHasta] = useState(today);
  const [selected, setSelected] = useState('');
  const sellers = useMemo(() => {
    const names = new Map<string, string>();
    if (isSeller && userProfile) names.set(ownerEmail(userProfile.email), userProfile.displayName);
    else {
      data.prospectos.forEach(p => { if (p.propietarioEmail) names.set(ownerEmail(p.propietarioEmail), p.propietario || p.propietarioEmail); });
      if (isAdmin) data.usuariosAutorizados.filter(u => u.rol === 'Vendedor').forEach(u => names.set(ownerEmail(u.email), u.nombre));
    }
    return [...names].sort((a,b) => a[1].localeCompare(b[1], 'es'));
  }, [isSeller, isAdmin, userProfile, data.prospectos, data.usuariosAutorizados]);
  if (!allowed) return null;
  const rows = sellers.filter(([email]) => !selected || selected === email).map(([email, name]) => ({ email, name, ...sellerReport(data, email, desde, hasta) }));
  return <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
    <h2 className="text-lg font-extrabold text-[#0D2240]">{isSeller ? 'Mi actividad y resultados' : 'Actividad por vendedor'}</h2>
    <p className="text-xs text-slate-500">Resultados de la cartera actual, incluida la actividad de sus telemarketings. Las citas se cuentan por fecha programada; las ventas, por fecha de reporte. No se duplican registros. La carga personal se atribuye a quien ingresó el contacto.</p>
    <div className="flex gap-3 flex-wrap text-sm">
      <label>Desde<input aria-label="Vendedores desde" type="date" value={desde} onChange={e => setDesde(e.target.value)} className="block border rounded-lg p-2" /></label>
      <label>Hasta<input aria-label="Vendedores hasta" type="date" value={hasta} onChange={e => setHasta(e.target.value)} className="block border rounded-lg p-2" /></label>
      {!isSeller && <label>Vendedor<select aria-label="Vendedor del reporte" value={selected} onChange={e => setSelected(e.target.value)} className="block border rounded-lg p-2"><option value="">Todos los vendedores</option>{sellers.map(([email,name]) => <option key={email} value={email}>{name} — {email}</option>)}</select></label>}
      <button onClick={() => { setDesde(''); setHasta(''); }} className="underline self-end p-2">Ver histórico completo</button>
    </div>
    {desde && hasta && desde > hasta ? <p role="alert">La fecha inicial debe ser anterior a la final.</p> : <div className="overflow-x-auto"><table className="w-full text-xs text-left"><thead className="bg-slate-100"><tr>{['Vendedor','Cartera total','Ingresados en cartera','Cargados por vendedor','Gestiones','Citas','Canceladas','Ventas aprobadas','Pendientes','Volumen aprobado'].map(x => <th className="p-2" key={x}>{x}</th>)}</tr></thead><tbody>{rows.map(r => <tr key={r.email} className="border-b"><td className="p-2"><strong>{r.name}</strong><span className="block text-slate-500">{r.email}</span></td>{[r.cartera,r.ingresados,r.cargadosPorVendedor,r.gestiones,r.citas,r.citasCanceladas,r.ventasAprobadas,r.ventasPendientes,r.volumen.toLocaleString('es', { style:'currency', currency:'USD' })].map((v,i) => <td className="p-2" key={i}>{v}</td>)}</tr>)}</tbody></table></div>}
    {!rows.length && <p className="text-sm text-slate-500">No hay vendedores con cuentas vinculadas en esta vista.</p>}
    {!isSeller && <p className="text-xs text-slate-500">{data.prospectos.filter(p => !p.propietarioEmail).length} prospectos históricos sin cuenta de propietario vinculada. El administrador puede vincularlos desde Editar prospecto; no se asignan automáticamente por nombre.</p>}
  </section>;
}
