import React, { useState, useMemo, useEffect } from 'react';
import {
  LayoutDashboard,
  Calendar,
  Filter,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  PhoneCall,
  CheckCircle2,
  CalendarDays,
  Target,
  Percent,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  Download,
  AlertCircle,
  Clock,
  Sparkles,
  Info,
  ShieldAlert,
  Headphones,
  Flame,
  PieChart as PieIcon,
  BarChart2,
  GitCommit,
  ExternalLink,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import { useCRM } from '../context/CRMContext';
import { useAuth } from '../context/AuthContext';
import {
  Prospecto,
  Gestion,
  Cita,
  PresetRango,
  DashboardFilters,
  TelemarketingRow,
  DrillDownType,
} from '../types';
import {
  TIMEZONE_LA,
  getTodayInLA,
  getDateRangePreset,
  getPreviousPeriodRange,
  isInDateRangeLA,
  formatDateTimeLA,
  formatDateDisplay,
  isContactoEfectivo,
  filterRecordsForDashboard,
  calculateKPIsFromRecords,
  calculateKPIComparison,
  calculateTelemarketingTableData,
  calculateDailyTrendData,
  calculateCallResultsDistributionData,
  calculateProspectosBreakdown,
} from '../businessRules';
import { DashboardDrillDownModal } from './DashboardDrillDownModal';

interface DashboardViewProps {
  onOpenProspecto?: (prospecto: Prospecto) => void;
  onOpenCita?: (cita: Cita) => void;
}

type SortColumn =
  | 'telemarketing'
  | 'prospectos'
  | 'contactos'
  | 'efectivos'
  | 'citas'
  | 'efectividadPct'
  | 'conversionCitaPct';

export const DashboardView: React.FC<DashboardViewProps> = ({
  onOpenProspecto,
  onOpenCita,
}) => {
  const { prospectos, gestiones, citas, settings } = useCRM();
  const { userProfile, isSupervisor, isAdmin, telemarketingAgent } = useAuth();

  const userRole = userProfile?.role || 'Supervisor';
  const isTm = userRole === 'Telemarketing';
  const effectiveTmAgent = isTm ? (telemarketingAgent || userProfile?.telemarketingAgent || '') : '';

  // Filtros por defecto: del día 1 del mes actual a hoy
  const initialRange = useMemo(() => getDateRangePreset('mes'), []);
  const [desde, setDesde] = useState<string>(initialRange.desde);
  const [hasta, setHasta] = useState<string>(initialRange.hasta);
  const [activePreset, setActivePreset] = useState<PresetRango | 'custom'>('mes');

  // Filtros opcionales
  const [filtroPropietario, setFiltroPropietario] = useState<string>('TODOS');
  const [filtroTelemarketing, setFiltroTelemarketing] = useState<string>('TODAS');

  // Estado de actualización y carga
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>(() => formatDateTimeLA(new Date()));

  // Ordenamiento de tabla por telemarketing
  const [sortCol, setSortCol] = useState<SortColumn>('contactos');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  // Drill-down Modal State
  const [drillDownData, setDrillDownData] = useState<{
    isOpen: boolean;
    title: string;
    type: DrillDownType;
    subtitle: string;
    items: Array<{
      id: string;
      prospecto?: Prospecto;
      gestion?: Gestion;
      cita?: Cita;
    }>;
  }>({
    isOpen: false,
    title: '',
    type: 'prospectos',
    subtitle: '',
    items: [],
  });

  // Mostrar tarjeta explicativa de índices compuestos
  const [showIndexInfo, setShowIndexInfo] = useState(false);

  // Lista de propietarios únicos para el selector
  const availablePropietarios = useMemo(() => {
    const setProps = new Set<string>();
    prospectos.forEach((p) => {
      if (p.propietario && p.propietario.trim()) {
        setProps.add(p.propietario.trim());
      }
    });
    return Array.from(setProps).sort((a, b) => a.localeCompare(b));
  }, [prospectos]);

  // Lista de telemarketing activas para selector de Supervisor
  const availableTelemarketings = useMemo(() => {
    return settings.telemarketingAgents.filter((a) => a.active);
  }, [settings.telemarketingAgents]);

  // Manejar cambio de atajos rápidos
  const handlePresetChange = (preset: PresetRango) => {
    setActivePreset(preset);
    const range = getDateRangePreset(preset);
    setDesde(range.desde);
    setHasta(range.hasta);
  };

  // Manejar cambio manual de fechas
  const handleCustomDateChange = (newDesde: string, newHasta: string) => {
    setActivePreset('custom');
    setDesde(newDesde);
    setHasta(newHasta);
  };

  // Botón "Actualizar"
  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setLastUpdated(formatDateTimeLA(new Date()));
      setIsRefreshing(false);
    }, 600);
  };

  // Período anterior de igual duración para comparación
  const prevPeriodRange = useMemo(() => {
    return getPreviousPeriodRange(desde, hasta);
  }, [desde, hasta]);

  // Filtros empaquetados actuales
  const currentFilters: DashboardFilters = useMemo(() => {
    return {
      desde,
      hasta,
      propietario: filtroPropietario !== 'TODOS' ? filtroPropietario : undefined,
      telemarketing: isTm
        ? effectiveTmAgent
        : filtroTelemarketing !== 'TODAS'
        ? filtroTelemarketing
        : undefined,
    };
  }, [desde, hasta, filtroPropietario, filtroTelemarketing, isTm, effectiveTmAgent]);

  // Filtros empaquetados del período anterior
  const previousFilters: DashboardFilters = useMemo(() => {
    return {
      desde: prevPeriodRange.desde,
      hasta: prevPeriodRange.hasta,
      propietario: filtroPropietario !== 'TODOS' ? filtroPropietario : undefined,
      telemarketing: isTm
        ? effectiveTmAgent
        : filtroTelemarketing !== 'TODAS'
        ? filtroTelemarketing
        : undefined,
    };
  }, [prevPeriodRange, filtroPropietario, filtroTelemarketing, isTm, effectiveTmAgent]);

  // 1. Filtrado de registros actuales
  const {
    filteredProspectos,
    filteredGestiones,
    filteredCitas,
    prospectosById,
  } = useMemo(() => {
    return filterRecordsForDashboard(
      prospectos,
      gestiones,
      citas,
      currentFilters,
      userRole,
      effectiveTmAgent
    );
  }, [prospectos, gestiones, citas, currentFilters, userRole, effectiveTmAgent]);

  // 2. Filtrado de registros del período anterior
  const prevRecords = useMemo(() => {
    return filterRecordsForDashboard(
      prospectos,
      gestiones,
      citas,
      previousFilters,
      userRole,
      effectiveTmAgent
    );
  }, [prospectos, gestiones, citas, previousFilters, userRole, effectiveTmAgent]);

  // 3. KPIs del período actual
  const currentKPIs = useMemo(() => {
    return calculateKPIsFromRecords(filteredProspectos, filteredGestiones, filteredCitas);
  }, [filteredProspectos, filteredGestiones, filteredCitas]);

  // 4. KPIs del período anterior
  const previousKPIs = useMemo(() => {
    return calculateKPIsFromRecords(
      prevRecords.filteredProspectos,
      prevRecords.filteredGestiones,
      prevRecords.filteredCitas
    );
  }, [prevRecords]);

  // 5. Comparación y variaciones
  const kpiComparison = useMemo(() => {
    return calculateKPIComparison(currentKPIs, previousKPIs);
  }, [currentKPIs, previousKPIs]);

  // 6. Datos de la tabla por Telemarketing
  const { rows: tmRows, totalRow: tmTotalRow } = useMemo(() => {
    return calculateTelemarketingTableData(
      filteredProspectos,
      filteredGestiones,
      filteredCitas,
      settings.telemarketingAgents,
      userRole,
      effectiveTmAgent
    );
  }, [
    filteredProspectos,
    filteredGestiones,
    filteredCitas,
    settings.telemarketingAgents,
    userRole,
    effectiveTmAgent,
  ]);

  // Filas ordenadas de la tabla
  const sortedTmRows = useMemo(() => {
    const list = [...tmRows];
    list.sort((a, b) => {
      if (a.telemarketing === 'SIN ASIGNAR') return 1;
      if (b.telemarketing === 'SIN ASIGNAR') return -1;

      let valA: any = a[sortCol];
      let valB: any = b[sortCol];

      if (typeof valA === 'string') {
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortAsc ? valA - valB : valB - valA;
    });
    return list;
  }, [tmRows, sortCol, sortAsc]);

  // 7. Tendencia diaria dentro del rango
  const dailyTrendData = useMemo(() => {
    return calculateDailyTrendData(filteredGestiones, filteredCitas, desde, hasta);
  }, [filteredGestiones, filteredCitas, desde, hasta]);

  // 8. Distribución de resultados de llamada
  const callResultsData = useMemo(() => {
    return calculateCallResultsDistributionData(filteredGestiones);
  }, [filteredGestiones]);

  // 9. Desglose de prospectos por temperatura y estado
  const { temperaturaData, estadoData } = useMemo(() => {
    return calculateProspectosBreakdown(filteredProspectos);
  }, [filteredProspectos]);

  // 10. Datos para barras agrupadas por telemarketing
  const groupedBarsData = useMemo(() => {
    return tmRows
      .filter((r) => r.telemarketing !== 'SIN ASIGNAR')
      .map((r) => ({
        name: r.telemarketing,
        Contactos: r.contactos,
        Efectivos: r.efectivos,
        Citas: r.citas,
      }));
  }, [tmRows]);

  // 11. Embudo de conversión comercial
  const funnelSteps = useMemo(() => {
    const stepProspectos = currentKPIs.prospectosIngresados;
    const stepContactos = currentKPIs.contactos;
    const stepEfectivos = currentKPIs.contactosEfectivos;
    const stepCitas = currentKPIs.citasAgendadas;

    return [
      {
        etapa: 'Prospectos Ingresados',
        count: stepProspectos,
        color: '#0D2240',
        ratioPrev: 100,
      },
      {
        etapa: 'Contactos Registrados',
        count: stepContactos,
        color: '#1E3A8A',
        ratioPrev: stepProspectos > 0 ? Math.min(100, Math.round((stepContactos / stepProspectos) * 100)) : 0,
      },
      {
        etapa: 'Contactos Efectivos',
        count: stepEfectivos,
        color: '#B8922A',
        ratioPrev: stepContactos > 0 ? Math.round((stepEfectivos / stepContactos) * 100) : 0,
      },
      {
        etapa: 'Citas Agendadas',
        count: stepCitas,
        color: '#10B981',
        ratioPrev: stepEfectivos > 0 ? Math.round((stepCitas / stepEfectivos) * 100) : 0,
      },
    ];
  }, [currentKPIs]);

  // Toggle de ordenamiento
  const handleSort = (column: SortColumn) => {
    if (sortCol === column) {
      setSortAsc(!sortAsc);
    } else {
      setSortCol(column);
      setSortAsc(false);
    }
  };

  // Abrir DrillDown modal para una métrica global
  const handleOpenDrillDownKPI = (type: DrillDownType, title: string) => {
    let items: Array<{ id: string; prospecto?: Prospecto; gestion?: Gestion; cita?: Cita }> = [];

    if (type === 'prospectos') {
      items = filteredProspectos.map((p) => ({ id: p.id, prospecto: p }));
    } else if (type === 'contactos') {
      items = filteredGestiones.map((g) => ({
        id: g.id,
        gestion: g,
        prospecto: prospectosById.get(g.idProspecto),
      }));
    } else if (type === 'efectivos') {
      items = filteredGestiones
        .filter((g) => g.efectivo === 'Sí' || isContactoEfectivo(g.resultado))
        .map((g) => ({
          id: g.id,
          gestion: g,
          prospecto: prospectosById.get(g.idProspecto),
        }));
    } else if (type === 'citas') {
      items = filteredCitas.map((c) => ({
        id: c.id,
        cita: c,
        prospecto: prospectosById.get(c.idProspecto),
      }));
    }

    setDrillDownData({
      isOpen: true,
      title,
      type,
      subtitle: `Período: ${formatDateDisplay(desde)} al ${formatDateDisplay(hasta)}`,
      items,
    });
  };

  // Abrir DrillDown para una celda de la tabla por Telemarketing
  const handleOpenDrillDownCell = (
    type: DrillDownType,
    tmName: string,
    title: string
  ) => {
    const tmNorm = tmName.trim().toLowerCase();
    let items: Array<{ id: string; prospecto?: Prospecto; gestion?: Gestion; cita?: Cita }> = [];

    if (type === 'prospectos') {
      items = filteredProspectos
        .filter((p) => {
          if (tmName === 'TOTAL') return true;
          if (tmName === 'SIN ASIGNAR') return !p.telemarketing || p.telemarketing === 'SIN ASIGNAR';
          return (p.telemarketing || '').trim().toLowerCase() === tmNorm;
        })
        .map((p) => ({ id: p.id, prospecto: p }));
    } else if (type === 'contactos') {
      items = filteredGestiones
        .filter((g) => {
          if (tmName === 'TOTAL') return true;
          return (g.telemarketing || '').trim().toLowerCase() === tmNorm;
        })
        .map((g) => ({
          id: g.id,
          gestion: g,
          prospecto: prospectosById.get(g.idProspecto),
        }));
    } else if (type === 'efectivos') {
      items = filteredGestiones
        .filter((g) => {
          const isEf = g.efectivo === 'Sí' || isContactoEfectivo(g.resultado);
          if (!isEf) return false;
          if (tmName === 'TOTAL') return true;
          return (g.telemarketing || '').trim().toLowerCase() === tmNorm;
        })
        .map((g) => ({
          id: g.id,
          gestion: g,
          prospecto: prospectosById.get(g.idProspecto),
        }));
    } else if (type === 'citas') {
      items = filteredCitas
        .filter((c) => {
          if (tmName === 'TOTAL') return true;
          return (c.telemarketing || '').trim().toLowerCase() === tmNorm;
        })
        .map((c) => ({
          id: c.id,
          cita: c,
          prospecto: prospectosById.get(c.idProspecto),
        }));
    }

    setDrillDownData({
      isOpen: true,
      title: `${title} - ${tmName}`,
      type,
      subtitle: `Período: ${formatDateDisplay(desde)} al ${formatDateDisplay(hasta)}`,
      items,
    });
  };

  // Helper para renderizar indicador de variación
  const renderTrendDiff = (diffVal: number, isPercent = false, invertColors = false) => {
    if (diffVal === 0) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-400">
          <Minus className="w-3 h-3" />
          <span>Sin cambio</span>
        </span>
      );
    }

    const isPositive = diffVal > 0;
    // En ventas/citas/contactos, positivo es verde. Si invertColors fuera true (como costos o cancelaciones), sería al revés
    const isGood = invertColors ? !isPositive : isPositive;

    return (
      <span
        className={`inline-flex items-center gap-1 text-[11px] font-extrabold px-1.5 py-0.5 rounded-md ${
          isGood
            ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
            : 'text-rose-700 bg-rose-50 border border-rose-200'
        }`}
      >
        {isPositive ? <TrendingUp className="w-3 h-3 shrink-0" /> : <TrendingDown className="w-3 h-3 shrink-0" />}
        <span>
          {isPositive ? '+' : ''}
          {diffVal}
          {isPercent ? '%' : ''}
        </span>
      </span>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200 pb-12">
      {/* BARRA SUPERIOR: TÍTULO, ZONA HORARIA, BOTÓN ACTUALIZAR */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200/90 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#0D2240] to-[#163665] text-[#B8922A] flex items-center justify-center font-black shadow-md">
              <LayoutDashboard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-[#0D2240] tracking-tight">
                  Dashboard
                </h1>
                <span className="text-[10px] uppercase font-extrabold px-2.5 py-0.5 rounded-full bg-[#B8922A]/15 text-[#91721e] border border-[#B8922A]/30">
                  Etapa 5
                </span>
                {isTm && (
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-300">
                    Mis números: {effectiveTmAgent || 'Telemarketing'}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Métricas de telemarketing, efectividad y agendamiento comercial
              </p>
            </div>
          </div>
        </div>

        {/* Última actualización y botón Actualizar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="text-right">
            <div className="text-[11px] text-slate-400 font-semibold flex items-center gap-1 justify-end">
              <Clock className="w-3 h-3 text-[#B8922A]" />
              <span>Última actualización (LA):</span>
            </div>
            <div className="text-xs font-bold text-slate-700 font-mono">
              {lastUpdated}
            </div>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#0D2240] hover:bg-[#163665] text-white font-extrabold text-xs shadow-md shadow-slate-900/10 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#B8922A] ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Actualizando...' : 'Actualizar'}</span>
          </button>
        </div>
      </div>

      {/* FILTROS Y ATAJOS DE FECHAS */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200/90 space-y-4">
        {/* Fila 1: Atajos rápidos */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <Calendar className="w-4 h-4 text-[#B8922A]" />
            <span>Rango de Período (Zona America/Los_Angeles):</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'hoy', label: 'Hoy' },
              { id: 'ayer', label: 'Ayer' },
              { id: 'semana', label: 'Esta semana' },
              { id: 'mes', label: 'Este mes' },
              { id: 'mes_anterior', label: 'Mes anterior' },
              { id: 'ultimos_30', label: 'Últimos 30 días' },
            ].map((p) => {
              const active = activePreset === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handlePresetChange(p.id as PresetRango)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                    active
                      ? 'bg-[#0D2240] text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Fila 2: Inputs Desde / Hasta y Selectores opcionales */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Desde */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-slate-600">
              Fecha Desde (00:00:00 LA):
            </label>
            <input
              type="date"
              value={desde}
              onChange={(e) => handleCustomDateChange(e.target.value, hasta)}
              className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 focus:border-[#0D2240] outline-none"
            />
          </div>

          {/* Hasta */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-slate-600">
              Fecha Hasta (23:59:59 LA):
            </label>
            <input
              type="date"
              value={hasta}
              onChange={(e) => handleCustomDateChange(desde, e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 focus:border-[#0D2240] outline-none"
            />
          </div>

          {/* Propietario del lead (opcional) */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-slate-600">
              Propietario del Lead:
            </label>
            <select
              value={filtroPropietario}
              onChange={(e) => setFiltroPropietario(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:border-[#0D2240] outline-none"
            >
              <option value="TODOS">Todos los propietarios</option>
              {availablePropietarios.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          {/* Telemarketing (solo supervisor / admin) */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-slate-600">
              Filtro Telemarketing:
            </label>
            {isTm ? (
              <div className="px-3 py-2 bg-slate-100 rounded-xl border border-slate-200 text-xs font-bold text-slate-600">
                {effectiveTmAgent || 'Mi agente'} (Fijo por rol)
              </div>
            ) : (
              <select
                value={filtroTelemarketing}
                onChange={(e) => setFiltroTelemarketing(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:border-[#0D2240] outline-none"
              >
                <option value="TODAS">Todo el equipo</option>
                {availableTelemarketings.map((a) => (
                  <option key={a.id} value={a.name}>
                    Agente: {a.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Comparativa de período subtexto */}
        <div className="pt-1 flex flex-wrap items-center justify-between text-[11px] text-slate-500 font-medium">
          <div>
            Período analizado: <strong className="text-slate-700">{formatDateDisplay(desde)} al {formatDateDisplay(hasta)}</strong>
          </div>
          <div className="text-slate-400">
            Comparado contra: <span className="font-semibold text-slate-600">{formatDateDisplay(prevPeriodRange.desde)} al {formatDateDisplay(prevPeriodRange.hasta)}</span> (igual duración)
          </div>
        </div>
      </div>

      {/* SKELETONS O INDICADOR DE CARGA */}
      {isRefreshing ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-28 bg-slate-200 rounded-2xl" />
          ))}
        </div>
      ) : (
        /* TARJETAS (KPIS) - RESPONSIVE: 2 COLUMNAS EN CELULAR, 6 EN DESKTOP */
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          {/* KPI 1: Prospectos ingresados */}
          <div
            onClick={() => handleOpenDrillDownKPI('prospectos', 'Prospectos Ingresados')}
            className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200/90 hover:border-[#0D2240] hover:shadow-md transition-all cursor-pointer group relative overflow-hidden"
            title="Clic para ver el listado de prospectos de este período"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-tight">
                Prospectos
              </span>
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Users className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-2xl font-black text-[#0D2240]">
              {currentKPIs.prospectosIngresados}
            </div>
            <div className="mt-2 flex items-center justify-between">
              {renderTrendDiff(kpiComparison.diff.prospectosIngresados)}
              <span className="text-[10px] text-slate-400 font-medium">prev: {previousKPIs.prospectosIngresados}</span>
            </div>
          </div>

          {/* KPI 2: Contactos (llamadas registradas) */}
          <div
            onClick={() => handleOpenDrillDownKPI('contactos', 'Contactos (Llamadas Registradas)')}
            className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200/90 hover:border-[#0D2240] hover:shadow-md transition-all cursor-pointer group relative overflow-hidden"
            title="Clic para ver las llamadas registradas en este período"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-tight">
                Contactos
              </span>
              <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                <PhoneCall className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-2xl font-black text-[#0D2240]">
              {currentKPIs.contactos}
            </div>
            <div className="mt-2 flex items-center justify-between">
              {renderTrendDiff(kpiComparison.diff.contactos)}
              <span className="text-[10px] text-slate-400 font-medium">prev: {previousKPIs.contactos}</span>
            </div>
          </div>

          {/* KPI 3: Contactos efectivos */}
          <div
            onClick={() => handleOpenDrillDownKPI('efectivos', 'Contactos Efectivos')}
            className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200/90 hover:border-[#0D2240] hover:shadow-md transition-all cursor-pointer group relative overflow-hidden"
            title="Clic para ver los contactos efectivos (No interesado, Llamar luego, Cita)"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-tight">
                Efectivos
              </span>
              <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-2xl font-black text-[#B8922A]">
              {currentKPIs.contactosEfectivos}
            </div>
            <div className="mt-2 flex items-center justify-between">
              {renderTrendDiff(kpiComparison.diff.contactosEfectivos)}
              <span className="text-[10px] text-slate-400 font-medium">prev: {previousKPIs.contactosEfectivos}</span>
            </div>
          </div>

          {/* KPI 4: Citas agendadas */}
          <div
            onClick={() => handleOpenDrillDownKPI('citas', 'Citas Agendadas en el Período')}
            className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200/90 hover:border-[#0D2240] hover:shadow-md transition-all cursor-pointer group relative overflow-hidden"
            title="Clic para ver las citas creadas en este período"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-tight">
                Citas
              </span>
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                <CalendarDays className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-2xl font-black text-emerald-700">
              {currentKPIs.citasAgendadas}
            </div>
            <div className="mt-2 flex items-center justify-between">
              {renderTrendDiff(kpiComparison.diff.citasAgendadas)}
              <span className="text-[10px] text-slate-400 font-medium">prev: {previousKPIs.citasAgendadas}</span>
            </div>
          </div>

          {/* KPI 5: % de efectividad */}
          <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200/90 space-y-1">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-tight">
                % Efectividad
              </span>
              <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                <Percent className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-800">
              {currentKPIs.efectividadPct}%
            </div>
            <div className="mt-2 flex items-center justify-between">
              {renderTrendDiff(kpiComparison.diff.efectividadPct, true)}
              <span className="text-[10px] text-slate-400 font-medium">prev: {previousKPIs.efectividadPct}%</span>
            </div>
          </div>

          {/* KPI 6: % de conversión a cita */}
          <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200/90 space-y-1">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-tight">
                % Conv. Cita
              </span>
              <div className="w-7 h-7 rounded-lg bg-slate-100 text-[#B8922A] flex items-center justify-center">
                <Target className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-800">
              {currentKPIs.conversionCitaPct}%
            </div>
            <div className="mt-2 flex items-center justify-between">
              {renderTrendDiff(kpiComparison.diff.conversionCitaPct, true)}
              <span className="text-[10px] text-slate-400 font-medium">prev: {previousKPIs.conversionCitaPct}%</span>
            </div>
          </div>
        </div>
      )}

      {/* MENSAJE AMIGABLE SI NO HAY DATOS */}
      {currentKPIs.contactos === 0 && currentKPIs.prospectosIngresados === 0 && (
        <div className="p-6 bg-amber-50/70 border border-amber-200 rounded-2xl flex items-start gap-3.5 text-xs text-amber-900">
          <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-extrabold text-sm text-amber-950">
              Sin registros en este rango de fechas
            </p>
            <p className="text-amber-800 leading-relaxed">
              No se encontraron prospectos, llamadas ni citas registradas entre el {formatDateDisplay(desde)} y el {formatDateDisplay(hasta)}.
              Puedes ampliar el rango con los atajos rápidos de arriba (ejemplo: <strong>"Últimos 30 días"</strong> o <strong>"Este mes"</strong>) o cargar datos de muestra en la pestaña de Configuración.
            </p>
          </div>
        </div>
      )}

      {/* TABLA POR TELEMARKETING */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200/90 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-extrabold text-[#0D2240] flex items-center gap-2">
              <span>Rendimiento por Telemarketing</span>
              <span className="text-xs font-semibold text-slate-400">
                (Haz clic en cualquier celda para desglosar)
              </span>
            </h2>
            <p className="text-xs text-slate-500">
              {isTm ? 'Resultados de tu gestión comercial' : 'Comparativa del equipo comercial con porcentajes y totales'}
            </p>
          </div>

          <div className="text-xs text-slate-400 font-medium self-end sm:self-center">
            Ordenado por: <strong className="text-slate-700 capitalize">{sortCol}</strong> ({sortAsc ? 'asc' : 'desc'})
          </div>
        </div>

        {/* Tabla Responsive con scroll horizontal */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead>
              <tr className="bg-[#0D2240] text-white uppercase font-bold text-[11px] tracking-wider">
                <th
                  onClick={() => handleSort('telemarketing')}
                  className="py-3.5 px-4 cursor-pointer hover:bg-white/10 transition-colors select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Telemarketing</span>
                    {sortCol === 'telemarketing' && (sortAsc ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />)}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('prospectos')}
                  className="py-3.5 px-4 text-right cursor-pointer hover:bg-white/10 transition-colors select-none"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Prospectos</span>
                    {sortCol === 'prospectos' && (sortAsc ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />)}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('contactos')}
                  className="py-3.5 px-4 text-right cursor-pointer hover:bg-white/10 transition-colors select-none"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Contactos</span>
                    {sortCol === 'contactos' && (sortAsc ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />)}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('efectivos')}
                  className="py-3.5 px-4 text-right cursor-pointer hover:bg-white/10 transition-colors select-none"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Efectivos</span>
                    {sortCol === 'efectivos' && (sortAsc ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />)}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('citas')}
                  className="py-3.5 px-4 text-right cursor-pointer hover:bg-white/10 transition-colors select-none"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Citas</span>
                    {sortCol === 'citas' && (sortAsc ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />)}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('efectividadPct')}
                  className="py-3.5 px-4 text-right cursor-pointer hover:bg-white/10 transition-colors select-none"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>% Efectividad</span>
                    {sortCol === 'efectividadPct' && (sortAsc ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />)}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('conversionCitaPct')}
                  className="py-3.5 px-4 text-right cursor-pointer hover:bg-white/10 transition-colors select-none"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>% Conv. Cita</span>
                    {sortCol === 'conversionCitaPct' && (sortAsc ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />)}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {sortedTmRows.map((row) => {
                const isSinAsignar = row.telemarketing === 'SIN ASIGNAR';
                return (
                  <tr
                    key={row.telemarketing}
                    className={`hover:bg-slate-50 transition-colors ${
                      isSinAsignar ? 'bg-slate-50/50 text-slate-500 italic' : ''
                    }`}
                  >
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      <div className="flex items-center gap-2">
                        <span className={isSinAsignar ? 'text-slate-500' : 'text-[#0D2240] font-black'}>
                          {row.telemarketing}
                        </span>
                        {isTm && row.telemarketing === effectiveTmAgent && (
                          <span className="text-[10px] px-1.5 py-0.2 bg-[#B8922A]/15 text-[#91721e] rounded font-bold">
                            Tú
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Prospectos */}
                    <td
                      onClick={() => handleOpenDrillDownCell('prospectos', row.telemarketing, 'Prospectos')}
                      className="py-3.5 px-4 text-right font-mono font-bold hover:bg-blue-50/80 hover:text-blue-700 cursor-pointer transition-colors"
                      title="Clic para ver prospectos"
                    >
                      {row.prospectos}
                    </td>

                    {/* Contactos */}
                    <td
                      onClick={() => !isSinAsignar && handleOpenDrillDownCell('contactos', row.telemarketing, 'Contactos')}
                      className={`py-3.5 px-4 text-right font-mono font-bold ${
                        isSinAsignar ? 'text-slate-300' : 'hover:bg-indigo-50/80 hover:text-indigo-700 cursor-pointer transition-colors'
                      }`}
                      title={isSinAsignar ? '' : 'Clic para ver contactos'}
                    >
                      {isSinAsignar ? '-' : row.contactos}
                    </td>

                    {/* Efectivos */}
                    <td
                      onClick={() => !isSinAsignar && handleOpenDrillDownCell('efectivos', row.telemarketing, 'Contactos Efectivos')}
                      className={`py-3.5 px-4 text-right font-mono font-bold ${
                        isSinAsignar ? 'text-slate-300' : 'text-[#B8922A] hover:bg-amber-50/80 cursor-pointer transition-colors'
                      }`}
                      title={isSinAsignar ? '' : 'Clic para ver efectivos'}
                    >
                      {isSinAsignar ? '-' : row.efectivos}
                    </td>

                    {/* Citas */}
                    <td
                      onClick={() => !isSinAsignar && handleOpenDrillDownCell('citas', row.telemarketing, 'Citas Agendadas')}
                      className={`py-3.5 px-4 text-right font-mono font-extrabold ${
                        isSinAsignar ? 'text-slate-300' : 'text-emerald-700 hover:bg-emerald-50/80 cursor-pointer transition-colors'
                      }`}
                      title={isSinAsignar ? '' : 'Clic para ver citas'}
                    >
                      {isSinAsignar ? '-' : row.citas}
                    </td>

                    {/* % Efectividad */}
                    <td className="py-3.5 px-4 text-right font-mono font-semibold">
                      {isSinAsignar ? '-' : `${row.efectividadPct.toFixed(1)}%`}
                    </td>

                    {/* % Conversión Cita */}
                    <td className="py-3.5 px-4 text-right font-mono font-semibold">
                      {isSinAsignar ? '-' : `${row.conversionCitaPct.toFixed(1)}%`}
                    </td>
                  </tr>
                );
              })}

              {/* FILA TOTAL */}
              <tr className="bg-[#0D2240] text-white font-extrabold border-t-2 border-slate-300">
                <td className="py-3.5 px-4 font-black tracking-wide text-white">
                  TOTAL
                </td>
                <td
                  onClick={() => handleOpenDrillDownCell('prospectos', 'TOTAL', 'Total Prospectos')}
                  className="py-3.5 px-4 text-right font-mono text-white hover:bg-white/10 cursor-pointer transition-colors"
                  title="Clic para ver todos los prospectos del total"
                >
                  {tmTotalRow.prospectos}
                </td>
                <td
                  onClick={() => handleOpenDrillDownCell('contactos', 'TOTAL', 'Total Contactos')}
                  className="py-3.5 px-4 text-right font-mono text-white hover:bg-white/10 cursor-pointer transition-colors"
                  title="Clic para ver todas las llamadas del total"
                >
                  {tmTotalRow.contactos}
                </td>
                <td
                  onClick={() => handleOpenDrillDownCell('efectivos', 'TOTAL', 'Total Efectivos')}
                  className="py-3.5 px-4 text-right font-mono text-[#F4CA54] hover:bg-white/10 cursor-pointer transition-colors"
                  title="Clic para ver todos los efectivos del total"
                >
                  {tmTotalRow.efectivos}
                </td>
                <td
                  onClick={() => handleOpenDrillDownCell('citas', 'TOTAL', 'Total Citas')}
                  className="py-3.5 px-4 text-right font-mono text-emerald-300 hover:bg-white/10 cursor-pointer transition-colors"
                  title="Clic para ver todas las citas del total"
                >
                  {tmTotalRow.citas}
                </td>
                <td className="py-3.5 px-4 text-right font-mono text-white">
                  {tmTotalRow.efectividadPct.toFixed(1)}%
                </td>
                <td className="py-3.5 px-4 text-right font-mono text-white">
                  {tmTotalRow.conversionCitaPct.toFixed(1)}%
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* GRÁFICOS (RECHARTS) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* GRÁFICO 1: Barras agrupadas por Telemarketing (Contactos, Efectivos y Citas) */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200/90 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-[#0D2240] flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-[#B8922A]" />
                <span>Comparativa por Telemarketing</span>
              </h3>
              <p className="text-xs text-slate-500">
                Contactos registrados, contactos efectivos y citas agendadas
              </p>
            </div>
          </div>

          <div className="h-64 sm:h-72 w-full pt-2">
            {groupedBarsData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Sin datos para graficar
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={groupedBarsData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 700, fill: '#0D2240' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748B' }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '12px',
                      border: '1px solid #E2E8F0',
                      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Bar dataKey="Contactos" fill="#1E3A8A" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Efectivos" fill="#B8922A" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Citas" fill="#10B981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* GRÁFICO 2: Línea de tendencia diaria dentro del rango */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200/90 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-[#0D2240] flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#B8922A]" />
                <span>Tendencia Diaria en el Período</span>
              </h3>
              <p className="text-xs text-slate-500">
                Evolución día por día de llamadas, efectividad y citas
              </p>
            </div>
          </div>

          <div className="h-64 sm:h-72 w-full pt-2">
            {dailyTrendData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Sin datos para graficar
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="displayDate" tick={{ fontSize: 10, fill: '#64748B' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748B' }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '12px',
                      border: '1px solid #E2E8F0',
                      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Line
                    type="monotone"
                    dataKey="contactos"
                    name="Contactos"
                    stroke="#1E3A8A"
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="efectivos"
                    name="Efectivos"
                    stroke="#B8922A"
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="citas"
                    name="Citas"
                    stroke="#10B981"
                    strokeWidth={2.5}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* SEGUNDA FILA DE GRÁFICOS: EMBUDO Y DISTRIBUCIÓN DE RESULTADOS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* GRÁFICO 3: Embudo del período (Prospectos -> Contactos -> Efectivos -> Citas) */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200/90 space-y-4">
          <div>
            <h3 className="text-base font-extrabold text-[#0D2240] flex items-center gap-2">
              <GitCommit className="w-4 h-4 text-[#B8922A]" />
              <span>Embudo de Conversión Comercial</span>
            </h3>
            <p className="text-xs text-slate-500">
              Paso a paso desde prospectos hasta citas agendadas
            </p>
          </div>

          <div className="space-y-3 pt-2">
            {funnelSteps.map((step, idx) => {
              const maxVal = Math.max(1, funnelSteps[0].count);
              const widthPct = Math.max(12, Math.round((step.count / maxVal) * 100));

              return (
                <div key={step.etapa} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-extrabold text-slate-800">{step.etapa}</span>
                    <div className="flex items-center gap-2 font-mono">
                      <span className="font-black text-sm text-[#0D2240]">{step.count}</span>
                      {idx > 0 && (
                        <span className="text-[10px] text-slate-400 font-semibold">
                          ({step.ratioPrev}% del paso anterior)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Barra animada */}
                  <div className="w-full h-8 bg-slate-100 rounded-xl overflow-hidden p-0.5 flex">
                    <div
                      style={{
                        width: `${widthPct}%`,
                        backgroundColor: step.color,
                      }}
                      className="h-full rounded-lg transition-all duration-500 flex items-center px-3"
                    >
                      <span className="text-[11px] font-bold text-white drop-shadow-xs">
                        {step.count}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* GRÁFICO 4: Distribución de resultados de llamada (Barras horizontales) */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200/90 space-y-4">
          <div>
            <h3 className="text-base font-extrabold text-[#0D2240] flex items-center gap-2">
              <PhoneCall className="w-4 h-4 text-[#B8922A]" />
              <span>Distribución de Resultados de Llamada</span>
            </h3>
            <p className="text-xs text-slate-500">
              Frecuencia y proporción de los 6 resultados registrados
            </p>
          </div>

          <div className="space-y-3 pt-1">
            {callResultsData.map((item) => {
              const isEfectivo = item.resultado === 'Cita' || item.resultado === 'Llamar luego' || item.resultado === 'No interesado';

              return (
                <div key={item.resultado} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-slate-700">
                      <span className={item.resultado === 'Cita' ? 'text-emerald-700' : ''}>
                        {item.resultado}
                      </span>
                      {isEfectivo && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-extrabold">
                          Efectivo
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 font-mono">
                      <span className="font-extrabold text-slate-900">{item.count}</span>
                      <span className="text-[11px] text-slate-400">({item.percentage}%)</span>
                    </div>
                  </div>

                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      style={{
                        width: `${Math.max(item.percentage > 0 ? 3 : 0, item.percentage)}%`,
                        backgroundColor:
                          item.resultado === 'Cita'
                            ? '#10B981'
                            : item.resultado === 'Llamar luego'
                            ? '#B8922A'
                            : item.resultado === 'No interesado'
                            ? '#64748B'
                            : '#94A3B8',
                      }}
                      className="h-full rounded-full transition-all duration-500"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* TERCERA FILA: PROSPECTOS POR TEMPERATURA Y POR ESTADO */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Temperatura */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200/90 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-[#0D2240] flex items-center gap-2">
                <Flame className="w-4 h-4 text-red-500" />
                <span>Prospectos por Temperatura</span>
              </h3>
              <p className="text-xs text-slate-500">
                Segmentación por antigüedad y contacto comercial
              </p>
            </div>
            <span className="text-xs font-bold text-slate-600 font-mono">
              Total: {currentKPIs.prospectosIngresados}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-2">
            {temperaturaData.map((t) => (
              <div
                key={t.name}
                className="p-3 rounded-2xl border text-center space-y-1"
                style={{ borderColor: `${t.color}40`, backgroundColor: `${t.color}08` }}
              >
                <div className="text-xs font-extrabold" style={{ color: t.color }}>
                  {t.name}
                </div>
                <div className="text-xl font-black text-slate-900 font-mono">
                  {t.count}
                </div>
                <div className="text-[10px] text-slate-400 font-semibold">
                  {t.pct}%
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Estado comercial */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200/90 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-[#0D2240] flex items-center gap-2">
                <PieIcon className="w-4 h-4 text-[#B8922A]" />
                <span>Prospectos por Estado Comercial</span>
              </h3>
              <p className="text-xs text-slate-500">
                Estados actuales en el período
              </p>
            </div>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {estadoData.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">Sin prospectos en el período</div>
            ) : (
              estadoData.map((st) => (
                <div key={st.name} className="flex items-center justify-between text-xs py-1 px-2.5 rounded-xl hover:bg-slate-50 transition-colors">
                  <span className="font-semibold text-slate-700">{st.name}</span>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="font-bold text-slate-900">{st.count}</span>
                    <span className="text-[11px] text-slate-400">({st.pct}%)</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* INFORMACIÓN DE ÍNDICES COMPUESTOS (FIRESTORE) PARA ADMINISTRADOR / SUPERVISOR */}
      {isSupervisor && (
        <div className="bg-slate-50 rounded-2xl border border-slate-200/80 p-4 space-y-2">
          <button
            type="button"
            onClick={() => setShowIndexInfo(!showIndexInfo)}
            className="w-full flex items-center justify-between text-left text-xs font-bold text-slate-700 cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-[#B8922A]" />
              <span>Optimización & Índices Compuestos de Firestore (Rendimiento)</span>
            </div>
            <span className="text-[11px] text-[#0D2240] underline font-extrabold">
              {showIndexInfo ? 'Ocultar detalles' : 'Ver índices recomendados'}
            </span>
          </button>

          {showIndexInfo && (
            <div className="pt-2 text-xs text-slate-600 space-y-2 leading-relaxed animate-in fade-in duration-150">
              <p>
                Para consultas escalables del lado del servidor con millones de registros, se configuran los siguientes índices compuestos en Firebase Console:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 font-mono text-[11px]">
                <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                  <div className="font-bold text-[#0D2240]">Colección gestiones:</div>
                  <div>telemarketing ASC</div>
                  <div>creadoEn ASC</div>
                </div>
                <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                  <div className="font-bold text-[#0D2240]">Colección citas:</div>
                  <div>telemarketing ASC</div>
                  <div>fechaCreacion ASC</div>
                </div>
                <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                  <div className="font-bold text-[#0D2240]">Colección prospectos:</div>
                  <div>telemarketing ASC</div>
                  <div>fechaRecepcion ASC</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL DE DETALLE (DRILL-DOWN) */}
      {drillDownData.isOpen && (
        <DashboardDrillDownModal
          title={drillDownData.title}
          type={drillDownData.type}
          subtitle={drillDownData.subtitle}
          items={drillDownData.items}
          onClose={() => setDrillDownData((prev) => ({ ...prev, isOpen: false }))}
          onOpenProspecto={(p) => {
            setDrillDownData((prev) => ({ ...prev, isOpen: false }));
            if (onOpenProspecto) onOpenProspecto(p);
          }}
          onOpenCita={(c) => {
            setDrillDownData((prev) => ({ ...prev, isOpen: false }));
            if (onOpenCita) onOpenCita(c);
          }}
        />
      )}
    </div>
  );
};
