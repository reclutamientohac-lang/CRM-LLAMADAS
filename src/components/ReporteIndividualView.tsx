import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  Calendar,
  Filter,
  User,
  Phone,
  FileSpreadsheet,
  Printer,
  TrendingUp,
  DollarSign,
  Award,
  CheckCircle2,
  Clock,
  ExternalLink,
  Users,
  PhoneCall,
  Target,
  RefreshCw,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  Legend,
} from 'recharts';
import { useCRM } from '../context/CRMContext';
import { useAuth } from '../context/AuthContext';
import {
  Prospecto,
  Cita,
  PresetRango,
} from '../types';
import {
  formatCurrency,
  formatPercentageDisplay,
  formatPhoneDisplay,
  getEstadoVentaBadgeClass,
  getDateRangePreset,
  formatDateTimeLA,
  calculateReporteIndividual,
} from '../businessRules';
import { exportReporteIndividualToExcel } from '../excelUtils';

interface ReporteIndividualViewProps {
  onOpenProspectoDetail?: (prospecto: Prospecto) => void;
  onOpenCitaDetail?: (cita: Cita) => void;
}

export const ReporteIndividualView: React.FC<ReporteIndividualViewProps> = ({
  onOpenProspectoDetail,
  onOpenCitaDetail,
}) => {
  const { prospectos, gestiones, citas, ventas, settings } = useCRM();
  const { userProfile, isSupervisor, isAdmin, telemarketingAgent } = useAuth();

  // Permisos: supervisor y admin pueden elegir cualquier telemarketing.
  // La telemarketing solo puede ver su propio agente vinculado.
  const isAgentOrRestricted = !isSupervisor && !isAdmin;

  const activeAgents = useMemo(() => {
    return settings.telemarketingAgents.filter((a) => a.active);
  }, [settings.telemarketingAgents]);

  // Selección de agente inicial
  const defaultSelectedAgent = useMemo(() => {
    if (isAgentOrRestricted && telemarketingAgent) {
      return telemarketingAgent;
    }
    return activeAgents[0]?.name || 'GERAL';
  }, [isAgentOrRestricted, telemarketingAgent, activeAgents]);

  const [selectedAgent, setSelectedAgent] = useState<string>(defaultSelectedAgent);

  // Asegurar que si es telemarketing, siempre tenga forzado su propio agente
  const currentAgent = isAgentOrRestricted && telemarketingAgent ? telemarketingAgent : selectedAgent;

  // Filtros de fecha (Por defecto: del día 1 del mes actual a hoy)
  const initialPreset = useMemo(() => getDateRangePreset('mes'), []);
  const [desde, setDesde] = useState<string>(initialPreset.desde);
  const [hasta, setHasta] = useState<string>(initialPreset.hasta);
  const [activePreset, setActivePreset] = useState<PresetRango | 'custom'>('mes');
  const [lastUpdated, setLastUpdated] = useState<string>(() => formatDateTimeLA(new Date()));

  const handlePresetSelect = (preset: PresetRango) => {
    setActivePreset(preset);
    const range = getDateRangePreset(preset);
    setDesde(range.desde);
    setHasta(range.hasta);
  };

  const handleRefresh = () => {
    setLastUpdated(formatDateTimeLA(new Date()));
  };

  // Cálculo de métricas y datos del reporte individual
  const { kpis, ventasPeriodo, evolucionDiaria, distribucionResultados } = useMemo(() => {
    return calculateReporteIndividual({
      telemarketing: currentAgent,
      desde,
      hasta,
      prospectos,
      gestiones,
      citas,
      ventas,
    });
  }, [currentAgent, desde, hasta, prospectos, gestiones, citas, ventas]);

  // Exportar a Excel
  const handleExportExcel = () => {
    exportReporteIndividualToExcel({
      telemarketing: currentAgent,
      desde,
      hasta,
      kpis,
      ventas: ventasPeriodo,
    });
  };

  // Imprimir / Guardar en PDF
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto print:space-y-4 print:p-0">
      {/* Estilos específicos para impresión limpia */}
      <style>{`
        @media print {
          body {
            background-color: white !important;
            color: black !important;
          }
          header, aside, .no-print, .print\\:hidden {
            display: none !important;
          }
          .print-full-width {
            width: 100% !important;
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .card-print {
            border: 1px solid #cbd5e1 !important;
            box-shadow: none !important;
            page-break-inside: avoid;
          }
        }
      `}</style>

      {/* ENCABEZADO Y CONTROLES PRINCIPALES */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 shadow-xs border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4 print:border-none print:shadow-none print:p-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-[#0D2240] text-[#B8922A] flex items-center justify-center font-bold shadow-xs">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-[#0D2240] tracking-tight">
                Reporte Individual de Rendimiento
              </h1>
              <p className="text-xs text-slate-500">
                Métricas personales, llamadas, conversión a citas, ventas cerradas y bonos acumulados.
              </p>
            </div>
          </div>
          <div className="text-[11px] font-medium text-slate-400 pl-12 print:text-slate-600">
            Última actualización: {lastUpdated}
          </div>
        </div>

        {/* Acciones principales (Ocultas en impresión) */}
        <div className="flex flex-wrap items-center gap-2.5 print:hidden">
          <button
            type="button"
            onClick={handleRefresh}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 transition-colors cursor-pointer"
            title="Recalcular métricas"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            <span>Actualizar</span>
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
            title="Descargar reporte en formato Excel"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Exportar Excel</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0D2240] hover:bg-[#14325a] text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
            title="Imprimir o guardar en PDF"
          >
            <Printer className="w-4 h-4 text-[#B8922A]" />
            <span>Imprimir / PDF</span>
          </button>
        </div>
      </div>

      {/* FILTROS: TELEMARKETING Y RANGO DE FECHAS */}
      <div className="bg-white rounded-3xl p-5 shadow-xs border border-slate-200/80 space-y-4 print:border-slate-200 print:p-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          {/* Selector de Agente */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs font-black text-slate-700 uppercase tracking-wider">
              <User className="w-4 h-4 text-[#B8922A]" />
              <span>Telemarketing:</span>
            </div>

            {isAgentOrRestricted ? (
              <div className="px-4 py-2 bg-[#0D2240] text-white rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>{currentAgent}</span>
              </div>
            ) : (
              <select
                value={selectedAgent}
                onChange={(e) => setSelectedAgent(e.target.value)}
                className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-extrabold text-[#0D2240] focus:ring-2 focus:ring-[#B8922A] focus:outline-none cursor-pointer"
              >
                {activeAgents.map((agent) => (
                  <option key={agent.id} value={agent.name}>
                    {agent.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Atajos Rápidos de Rango */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs print:hidden">
            {(
              [
                { id: 'hoy', label: 'Hoy' },
                { id: 'ayer', label: 'Ayer' },
                { id: 'semana', label: 'Esta semana' },
                { id: 'mes', label: 'Este mes' },
                { id: 'mes_anterior', label: 'Mes anterior' },
                { id: 'ultimos_30', label: 'Últimos 30 días' },
              ] as const
            ).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handlePresetSelect(p.id)}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
                  activePreset === p.id
                    ? 'bg-[#0D2240] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Inputs de Fecha Desde / Hasta */}
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-semibold">Desde:</span>
            <input
              type="date"
              value={desde}
              onChange={(e) => {
                setDesde(e.target.value);
                setActivePreset('custom');
              }}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#0D2240]"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-semibold">Hasta:</span>
            <input
              type="date"
              value={hasta}
              onChange={(e) => {
                setHasta(e.target.value);
                setActivePreset('custom');
              }}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#0D2240]"
            />
          </div>

          <div className="ml-auto text-[11px] text-slate-400 font-medium">
            Rango evaluado: <span className="font-bold text-slate-700">{desde}</span> al <span className="font-bold text-slate-700">{hasta}</span>
          </div>
        </div>
      </div>

      {/* BLOQUE DE TARJETAS (KPIS) - 9 TARJETAS */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-black text-slate-400 uppercase tracking-wider">
            Resumen de Actividad y Resultados
          </h2>
          <span className="text-[11px] text-slate-500 font-semibold">
            Agente: <strong className="text-[#0D2240]">{currentAgent}</strong>
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {/* 1. Prospectos Asignados */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1 card-print">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Prospectos Asignados
              </span>
              <Users className="w-4 h-4 text-sky-500" />
            </div>
            <div className="text-2xl font-black text-slate-900">{kpis.prospectosAsignados}</div>
            <p className="text-[10px] text-slate-400 leading-tight">Recibidos en el período</p>
          </div>

          {/* 2. Contactos Realizados */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1 card-print">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Llamadas Realizadas
              </span>
              <PhoneCall className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="text-2xl font-black text-slate-900">{kpis.contactosRealizados}</div>
            <p className="text-[10px] text-slate-400 leading-tight">Total gestiones registradas</p>
          </div>

          {/* 3. Contactos Efectivos */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1 card-print">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                Contactos Efectivos
              </span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-black text-emerald-700">{kpis.contactosEfectivos}</div>
            <p className="text-[10px] text-slate-400 leading-tight">Llamar luego, Cita o No interesado</p>
          </div>

          {/* 4. Citas Agendadas */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1 card-print">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#B8922A]">
                Citas Agendadas
              </span>
              <Calendar className="w-4 h-4 text-[#B8922A]" />
            </div>
            <div className="text-2xl font-black text-[#9a781f]">{kpis.citasAgendadas}</div>
            <p className="text-[10px] text-slate-400 leading-tight">Creadas en el período</p>
          </div>

          {/* 5. Citas Asistidas */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1 card-print">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
                Citas Asistidas
              </span>
              <Target className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-black text-amber-700">{kpis.citasAsistidas}</div>
            <p className="text-[10px] text-slate-400 leading-tight">Realizadas en el período</p>
          </div>

          {/* 6. Ventas Cerradas (Aprobadas) */}
          <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-2xs space-y-1 bg-gradient-to-br from-emerald-50/50 to-white card-print">
            <div className="flex items-center justify-between text-emerald-800">
              <span className="text-[11px] font-bold uppercase tracking-wider">
                Ventas Cerradas
              </span>
              <Award className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-emerald-800">{kpis.ventasCerradas}</div>
            <p className="text-[10px] text-emerald-600/80 leading-tight">Estado Aprobada</p>
          </div>

          {/* 7. Monto Total Vendido */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1 card-print">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                Total Vendido
              </span>
              <DollarSign className="w-4 h-4 text-slate-600" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-slate-900">
              {formatCurrency(kpis.montoTotalVendido)}
            </div>
            <p className="text-[10px] text-slate-400 leading-tight">Monto aprobado de ventas</p>
          </div>

          {/* 8. Bonos Acumulados (Aprobados) */}
          <div className="bg-white p-4 rounded-2xl border border-amber-200 shadow-2xs space-y-1 bg-gradient-to-br from-amber-50/50 to-white card-print">
            <div className="flex items-center justify-between text-amber-800">
              <span className="text-[11px] font-bold uppercase tracking-wider">
                Bono Acumulado
              </span>
              <Sparkles className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-amber-700">
              {formatCurrency(kpis.bonosAcumulados)}
            </div>
            <p className="text-[10px] text-amber-600/80 leading-tight">Pagable (Aprobadas)</p>
          </div>

          {/* 9. Bonos Pendientes */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1 col-span-2 sm:col-span-1 card-print">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                Bonos en Revisión
              </span>
              <Clock className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-slate-600">
              {formatCurrency(kpis.bonosPendientes)}
            </div>
            <p className="text-[10px] text-slate-400 leading-tight">Ventas Pendientes</p>
          </div>
        </div>
      </div>

      {/* BLOQUE DE TASAS DE CONVERSIÓN Y RENDIMIENTO */}
      <div className="bg-white rounded-3xl p-5 shadow-xs border border-slate-200/80 card-print">
        <h2 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-4">
          Tasas de Efectividad y Conversión
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
            <div className="text-xs text-slate-500 font-bold">% Efectividad</div>
            <div className="text-2xl font-black text-[#0D2240]">{kpis.efectividadPct}%</div>
            <div className="text-[10px] text-slate-400">Efectivos / Contactos</div>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
            <div className="text-xs text-slate-500 font-bold">% Conversión a Cita</div>
            <div className="text-2xl font-black text-[#B8922A]">{kpis.conversionCitaPct}%</div>
            <div className="text-[10px] text-slate-400">Citas / Contactos efectivos</div>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
            <div className="text-xs text-slate-500 font-bold">% Cierre de Ventas</div>
            <div className="text-2xl font-black text-emerald-700">{kpis.cierrePct}%</div>
            <div className="text-[10px] text-slate-400">Ventas aprobadas / Citas asistidas</div>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
            <div className="text-xs text-slate-500 font-bold">Ticket Promedio</div>
            <div className="text-2xl font-black text-slate-800">
              {formatCurrency(kpis.ticketPromedio)}
            </div>
            <div className="text-[10px] text-slate-400">Monto total / Ventas aprobadas</div>
          </div>
        </div>
      </div>

      {/* GRÁFICOS DEL AGENTE: EVOLUCIÓN DIARIA Y DISTRIBUCIÓN DE LLAMADAS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Gráfico 1: Evolución Diaria */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-3 card-print">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-[#0D2240] flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#B8922A]" />
              <span>Evolución Diaria (Llamadas y Citas)</span>
            </h3>
            <span className="text-[11px] text-slate-400 font-medium">Por día del período</span>
          </div>

          <div className="h-64 w-full pt-2">
            {evolucionDiaria.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Sin datos en este período
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={evolucionDiaria} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorLlamadas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0D2240" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#0D2240" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorCitas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#B8922A" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="#B8922A" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="fechaDisplay" stroke="#94a3b8" fontSize={10} />
                  <YAxis stroke="#94a3b8" fontSize={10} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                      fontSize: '11px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Area
                    type="monotone"
                    dataKey="llamadas"
                    name="Llamadas"
                    stroke="#0D2240"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorLlamadas)"
                  />
                  <Area
                    type="monotone"
                    dataKey="citas"
                    name="Citas agendadas"
                    stroke="#B8922A"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorCitas)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Gráfico 2: Distribución de Resultados de Llamada */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-3 card-print">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-[#0D2240] flex items-center gap-2">
              <Phone className="w-4 h-4 text-sky-600" />
              <span>Distribución de Resultados de Llamada</span>
            </h3>
            <span className="text-[11px] text-slate-400 font-medium">
              Total: {kpis.contactosRealizados}
            </span>
          </div>

          <div className="h-64 w-full pt-2">
            {distribucionResultados.every((r) => r.count === 0) ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No hay llamadas registradas en este período
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={distribucionResultados}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" stroke="#94a3b8" fontSize={10} allowDecimals={false} />
                  <YAxis
                    dataKey="name"
                    type="category"
                    stroke="#64748b"
                    fontSize={10}
                    width={90}
                    tick={{ fill: '#475569' }}
                  />
                  <Tooltip
                    formatter={(val: any, name: any, item: any) => [
                      `${val} llamadas (${item.payload.pct}%)`,
                      'Cantidad',
                    ]}
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                      fontSize: '11px',
                    }}
                  />
                  <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                    {distribucionResultados.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* TABLA DE VENTAS DEL PERÍODO */}
      <div className="bg-white rounded-3xl p-5 shadow-xs border border-slate-200/80 space-y-4 card-print">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-black text-[#0D2240] flex items-center gap-2">
              <Award className="w-5 h-5 text-[#B8922A]" />
              <span>Ventas del Período ({ventasPeriodo.length})</span>
            </h3>
            <p className="text-xs text-slate-500">
              Ventas generadas por {currentAgent} cuya fecha de cita corresponde al período seleccionado.
            </p>
          </div>
          <div className="text-xs font-bold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            Aprobadas: <span className="text-emerald-700">{kpis.ventasCerradas}</span> | Pendientes:{' '}
            <span className="text-amber-700">
              {ventasPeriodo.filter((v) => v.venta.estado === 'Pendiente').length}
            </span>
          </div>
        </div>

        {ventasPeriodo.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <AlertCircle className="w-8 h-8 text-slate-300 mx-auto" />
            <div className="text-sm font-bold text-slate-700">
              No hay ventas registradas para este agente en el período seleccionado.
            </div>
            <p className="text-xs text-slate-400">
              Prueba cambiando las fechas o el agente de telemarketing.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200/70">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3">Fecha Cita</th>
                  <th className="py-3 px-3">Prospecto</th>
                  <th className="py-3 px-3">Teléfono</th>
                  <th className="py-3 px-3 text-right">Monto Aprobado</th>
                  <th className="py-3 px-3 text-center">% Bono</th>
                  <th className="py-3 px-3 text-center">Estado</th>
                  <th className="py-3 px-3 text-right">Bono</th>
                  <th className="py-3 px-3">Observación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ventasPeriodo.map((item) => {
                  const v = item.venta;
                  const isAprobada = v.estado === 'Aprobada';
                  const bonoMostrar = isAprobada
                    ? v.bonoPagable || 0
                    : v.bonoGenerado || 0;

                  return (
                    <tr key={v.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-3 whitespace-nowrap font-medium text-slate-900">
                        <button
                          type="button"
                          onClick={() => item.cita && onOpenCitaDetail && onOpenCitaDetail(item.cita)}
                          className="hover:text-[#B8922A] hover:underline flex items-center gap-1 cursor-pointer"
                          title="Ver detalle de la cita"
                        >
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{item.fechaCita}</span>
                          {item.horaCita && (
                            <span className="text-[10px] text-slate-400">({item.horaCita})</span>
                          )}
                        </button>
                      </td>

                      <td className="py-3 px-3 font-bold text-slate-900">
                        {item.prospecto && onOpenProspectoDetail ? (
                          <button
                            type="button"
                            onClick={() => onOpenProspectoDetail(item.prospecto!)}
                            className="text-[#0D2240] hover:text-[#B8922A] hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <span>{item.nombreProspecto}</span>
                            <ExternalLink className="w-3 h-3 text-slate-400" />
                          </button>
                        ) : (
                          <span>{item.nombreProspecto}</span>
                        )}
                      </td>

                      <td className="py-3 px-3 font-mono text-slate-600 whitespace-nowrap">
                        {formatPhoneDisplay(item.telefonoProspecto)}
                      </td>

                      <td className="py-3 px-3 text-right font-bold text-slate-900 whitespace-nowrap">
                        {formatCurrency(v.montoAprobado)}
                      </td>

                      <td className="py-3 px-3 text-center font-bold text-slate-700 whitespace-nowrap">
                        {formatPercentageDisplay(v.porcentajeBono)}
                      </td>

                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold border ${getEstadoVentaBadgeClass(
                            v.estado
                          )}`}
                        >
                          {v.estado}
                        </span>
                      </td>

                      <td
                        className={`py-3 px-3 text-right font-black whitespace-nowrap ${
                          isAprobada ? 'text-amber-700 font-extrabold' : 'text-slate-500'
                        }`}
                      >
                        {formatCurrency(bonoMostrar)}
                      </td>

                      <td className="py-3 px-3 text-slate-500 max-w-xs truncate" title={v.observacion}>
                        {v.observacion || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
