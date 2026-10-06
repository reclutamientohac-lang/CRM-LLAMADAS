import React, { useState, useMemo } from 'react';
import {
  Calendar,
  CalendarDays,
  ListFilter,
  Search,
  Filter,
  RotateCcw,
  Clock,
  User,
  Phone,
  MapPin,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  CalendarCheck,
  AlertTriangle,
  Flame,
  ArrowRight,
  Eye,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { Cita, EstadoCita, Prospecto } from '../types';
import { useCRM } from '../context/CRMContext';
import { useAuth } from '../context/AuthContext';
import {
  formatDateDisplay,
  formatPhoneDisplay,
  getTodayInLA,
  getEstadoCitaBadgeClass,
  isCitaVencidaSinResultado,
  getTemperaturaBadgeClass,
  SIN_ASIGNAR,
} from '../businessRules';

interface AgendaViewProps {
  onOpenRegistrarResultado: (cita: Cita) => void;
  onOpenCitaDetail: (cita: Cita) => void;
  onOpenProspectoDetail?: (prospecto: Prospecto) => void;
}

type ViewMode = 'lista' | 'calendario';
type CalendarSubMode = 'mes' | 'semana';
type DateFilterType = 'futuras' | 'hoy' | 'semana' | 'mes' | 'todas' | 'personalizado';

export const AgendaView: React.FC<AgendaViewProps> = ({
  onOpenRegistrarResultado,
  onOpenCitaDetail,
  onOpenProspectoDetail,
}) => {
  const { citas, prospectos, settings } = useCRM();
  const { isSupervisor, telemarketingAgent } = useAuth();

  const todayLA = getTodayInLA();

  // Modo de visualización
  const [viewMode, setViewMode] = useState<ViewMode>('lista');
  const [calendarSubMode, setCalendarSubMode] = useState<CalendarSubMode>('mes');

  // Filtros
  const [dateFilter, setDateFilter] = useState<DateFilterType>('futuras'); // Por defecto: de hoy en adelante
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<string>('TODOS');
  const [selectedEstado, setSelectedEstado] = useState<string>('TODOS');
  const [searchTerm, setSearchTerm] = useState('');

  // Navegación Calendario
  const [calendarAnchorDate, setCalendarAnchorDate] = useState<Date>(new Date());

  // Mapa de prospectos por id para lookup O(1)
  const prospectosMap = useMemo(() => {
    const map = new Map<string, Prospecto>();
    prospectos.forEach((p) => map.set(p.id, p));
    return map;
  }, [prospectos]);

  // Lista base según rol (telemarketing solo ve sus citas)
  const baseCitas = useMemo(() => {
    if (isSupervisor) {
      return citas;
    }
    const myAgent = telemarketingAgent || '';
    return citas.filter((c) => c.telemarketing.toUpperCase() === myAgent.toUpperCase());
  }, [citas, isSupervisor, telemarketingAgent]);

  // Helpers para rango de semanas y meses
  const getWeekDates = (d: Date) => {
    const date = new Date(d);
    const day = date.getDay(); // 0 is Sunday
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Monday
    const monday = new Date(date.setDate(diff));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const format = (dt: Date) => {
      const year = dt.getFullYear();
      const month = String(dt.getMonth() + 1).padStart(2, '0');
      const dayStr = String(dt.getDate()).padStart(2, '0');
      return `${year}-${month}-${dayStr}`;
    };

    return { startStr: format(monday), endStr: format(sunday) };
  };

  const getMonthDates = (d: Date) => {
    const year = d.getFullYear();
    const month = d.getMonth();
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);

    const format = (dt: Date) => {
      const y = dt.getFullYear();
      const m = String(dt.getMonth() + 1).padStart(2, '0');
      const dayStr = String(dt.getDate()).padStart(2, '0');
      return `${y}-${m}-${dayStr}`;
    };

    return { startStr: format(start), endStr: format(end) };
  };

  // Contadores del encabezado
  const headerCounters = useMemo(() => {
    let pendientesResultado = 0;
    let hoy = 0;
    let proximas = 0;

    baseCitas.forEach((c) => {
      if (isCitaVencidaSinResultado(c, todayLA)) {
        pendientesResultado++;
      }
      if (c.fechaCita === todayLA) {
        hoy++;
      }
      if (c.fechaCita > todayLA) {
        proximas++;
      }
    });

    return {
      pendientesResultado,
      hoy,
      proximas,
      total: baseCitas.length,
    };
  }, [baseCitas, todayLA]);

  // Filtrado de citas
  const filteredCitas = useMemo(() => {
    return baseCitas.filter((c) => {
      // 1. Filtro Telemarketing (si es supervisor)
      if (isSupervisor && selectedAgent !== 'TODOS') {
        if (c.telemarketing !== selectedAgent) return false;
      }

      // 2. Filtro Estado
      if (selectedEstado !== 'TODOS') {
        if (c.estadoCita !== selectedEstado) return false;
      }

      // 3. Filtro Fecha
      if (dateFilter === 'futuras') {
        if (c.fechaCita < todayLA) return false;
      } else if (dateFilter === 'hoy') {
        if (c.fechaCita !== todayLA) return false;
      } else if (dateFilter === 'semana') {
        const { startStr, endStr } = getWeekDates(new Date());
        if (c.fechaCita < startStr || c.fechaCita > endStr) return false;
      } else if (dateFilter === 'mes') {
        const { startStr, endStr } = getMonthDates(new Date());
        if (c.fechaCita < startStr || c.fechaCita > endStr) return false;
      } else if (dateFilter === 'personalizado') {
        if (fechaInicio && c.fechaCita < fechaInicio) return false;
        if (fechaFin && c.fechaCita > fechaFin) return false;
      }

      // 4. Búsqueda por texto (nombre de prospecto, teléfono o ID de cita)
      if (searchTerm.trim()) {
        const term = searchTerm.trim().toLowerCase();
        const lead = prospectosMap.get(c.idProspecto);
        const matchId = c.id.toLowerCase().includes(term);
        const matchAsunto = (c.asunto || '').toLowerCase().includes(term);
        const matchLeadName = lead ? lead.nombre.toLowerCase().includes(term) : false;
        const matchLeadPhone = lead ? lead.telefono.includes(term) : false;

        if (!matchId && !matchAsunto && !matchLeadName && !matchLeadPhone) {
          return false;
        }
      }

      return true;
    });
  }, [
    baseCitas,
    isSupervisor,
    selectedAgent,
    selectedEstado,
    dateFilter,
    todayLA,
    fechaInicio,
    fechaFin,
    searchTerm,
    prospectosMap,
  ]);

  // Lista ordenada por fecha y hora
  const sortedCitas = useMemo(() => {
    return [...filteredCitas].sort((a, b) => {
      if (a.fechaCita !== b.fechaCita) {
        return a.fechaCita.localeCompare(b.fechaCita);
      }
      return (a.horaCita || '').localeCompare(b.horaCita || '');
    });
  }, [filteredCitas]);

  const handleClearFilters = () => {
    setDateFilter('futuras');
    setFechaInicio('');
    setFechaFin('');
    setSelectedAgent('TODOS');
    setSelectedEstado('TODOS');
    setSearchTerm('');
  };

  const hasActiveFilters =
    dateFilter !== 'futuras' ||
    selectedAgent !== 'TODOS' ||
    selectedEstado !== 'TODOS' ||
    searchTerm.trim().length > 0 ||
    Boolean(fechaInicio || fechaFin);

  // Navegación Calendario
  const navigateCalendar = (direction: 'prev' | 'next' | 'today') => {
    if (direction === 'today') {
      setCalendarAnchorDate(new Date());
      return;
    }
    const current = new Date(calendarAnchorDate);
    if (calendarSubMode === 'mes') {
      current.setMonth(current.getMonth() + (direction === 'next' ? 1 : -1));
    } else {
      current.setDate(current.getDate() + (direction === 'next' ? 7 : -7));
    }
    setCalendarAnchorDate(current);
  };

  // Nombres de meses en español
  const monthNames = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
  ];

  return (
    <div className="space-y-6">
      {/* Encabezado Principal y Contadores */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-[#0D2240] text-white">
                <Calendar className="w-5 h-5 text-[#B8922A]" />
              </span>
              <div>
                <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                  Agenda de Citas
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isSupervisor
                    ? 'Supervisión global de citas agendadas por telemarketing'
                    : `Citas asignadas a ${telemarketingAgent || 'tu usuario'}`}
                </p>
              </div>
            </div>
          </div>

          {/* Selector de Vista: Lista vs Calendario */}
          <div className="flex items-center gap-2">
            <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200">
              <button
                type="button"
                onClick={() => setViewMode('lista')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
                  viewMode === 'lista'
                    ? 'bg-white text-[#0D2240] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ListFilter className="w-3.5 h-3.5" />
                <span>Lista</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('calendario')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
                  viewMode === 'calendario'
                    ? 'bg-white text-[#0D2240] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                <span>Calendario</span>
              </button>
            </div>
          </div>
        </div>

        {/* 4 Contadores del Encabezado */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-100">
          {/* Pendientes de Resultado (Alerta Roja) */}
          <div
            onClick={() => {
              setSelectedEstado('Agendada');
              setDateFilter('todas');
            }}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
              headerCounters.pendientesResultado > 0
                ? 'bg-rose-50 border-rose-200 hover:bg-rose-100/70'
                : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-800">Pendiente resultado</span>
              <AlertTriangle
                className={`w-4 h-4 ${
                  headerCounters.pendientesResultado > 0 ? 'text-rose-600 animate-bounce' : 'text-slate-400'
                }`}
              />
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span
                className={`text-2xl font-black ${
                  headerCounters.pendientesResultado > 0 ? 'text-rose-700' : 'text-slate-700'
                }`}
              >
                {headerCounters.pendientesResultado}
              </span>
              <span className="text-[10px] text-slate-500 font-medium">ya pasaron su hora</span>
            </div>
          </div>

          {/* Citas de Hoy */}
          <div
            onClick={() => setDateFilter('hoy')}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
              dateFilter === 'hoy'
                ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-500/20'
                : 'bg-slate-50 border-slate-200 hover:bg-slate-100/70'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">Hoy</span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-800">{headerCounters.hoy}</span>
              <span className="text-[10px] text-slate-500 font-medium">para el día de hoy</span>
            </div>
          </div>

          {/* Próximas */}
          <div
            onClick={() => setDateFilter('futuras')}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
              dateFilter === 'futuras'
                ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-500/20'
                : 'bg-slate-50 border-slate-200 hover:bg-slate-100/70'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">Próximas</span>
              <CalendarCheck className="w-4 h-4 text-blue-600" />
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-800">{headerCounters.proximas}</span>
              <span className="text-[10px] text-slate-500 font-medium">de mañana en adelante</span>
            </div>
          </div>

          {/* Total */}
          <div
            onClick={handleClearFilters}
            className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100/70 transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">Total</span>
              <Calendar className="w-4 h-4 text-slate-500" />
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-black text-[#0D2240]">{sortedCitas.length}</span>
              <span className="text-[10px] text-slate-500 font-medium">
                de {headerCounters.total}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 text-xs font-extrabold text-slate-700">
            <SlidersHorizontal className="w-4 h-4 text-[#0D2240]" />
            <span>Filtros de Búsqueda</span>
          </div>

          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="text-xs text-[#0D2240] hover:text-rose-600 font-bold flex items-center gap-1 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Limpiar filtros</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* 1. Rango de Fechas */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Rango de Fecha
            </label>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as DateFilterType)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0D2240]"
            >
              <option value="futuras">De hoy en adelante (Por defecto)</option>
              <option value="hoy">Solo citas de hoy</option>
              <option value="semana">Esta semana</option>
              <option value="mes">Este mes</option>
              <option value="todas">Todas las fechas (Histórico)</option>
              <option value="personalizado">Personalizado (desde / hasta)</option>
            </select>
          </div>

          {/* 2. Filtro Telemarketing (si es supervisor) */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Telemarketing
            </label>
            {isSupervisor ? (
              <select
                value={selectedAgent}
                onChange={(e) => setSelectedAgent(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0D2240]"
              >
                <option value="TODOS">Todas las telemarketing</option>
                {settings.telemarketingAgents
                  .filter((a) => a.active)
                  .map((a) => (
                    <option key={a.id} value={a.name}>
                      {a.name}
                    </option>
                  ))}
              </select>
            ) : (
              <div className="bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700">
                {telemarketingAgent || 'Mi usuario'}
              </div>
            )}
          </div>

          {/* 3. Filtro Estado de Cita */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Estado de la Cita
            </label>
            <select
              value={selectedEstado}
              onChange={(e) => setSelectedEstado(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0D2240]"
            >
              <option value="TODOS">Todos los estados</option>
              <option value="Agendada">Agendada (Azul)</option>
              <option value="Realizada">Realizada (Verde)</option>
              <option value="Reprogramada">Reprogramada (Naranja)</option>
              <option value="Cancelada">Cancelada (Gris)</option>
            </select>
          </div>

          {/* 4. Buscador */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Buscar
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Nombre, teléfono o ID..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0D2240] placeholder:text-slate-400"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Inputs de fecha personalizada si se seleccionó 'personalizado' */}
        {dateFilter === 'personalizado' && (
          <div className="flex items-center gap-3 pt-2 border-t border-slate-100 animate-in fade-in duration-150">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600">Desde:</span>
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0D2240]"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600">Hasta:</span>
              <input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0D2240]"
              />
            </div>
          </div>
        )}
      </div>

      {/* VISTA 1: LISTA (TABLA) */}
      {viewMode === 'lista' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          {sortedCitas.length === 0 ? (
            <div className="py-16 px-4 text-center">
              <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-700">
                No se encontraron citas con los filtros aplicados
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                Prueba cambiando el rango de fechas o limpiando los filtros para ver otras citas
                agendadas.
              </p>
              {hasActiveFilters && (
                <button
                  onClick={handleClearFilters}
                  className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-extrabold rounded-xl transition-colors"
                >
                  Restablecer filtros
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold text-[11px] uppercase tracking-wider">
                    <th className="py-3 px-4">Fecha</th>
                    <th className="py-3 px-4">Hora</th>
                    <th className="py-3 px-4 min-w-[200px]">Prospecto</th>
                    <th className="py-3 px-4">Telemarketing</th>
                    <th className="py-3 px-4 min-w-[150px]">Asunto</th>
                    <th className="py-3 px-4 min-w-[180px]">Dirección</th>
                    <th className="py-3 px-4">Quién Atiende</th>
                    <th className="py-3 px-4">Invitado</th>
                    <th className="py-3 px-4">Estado</th>
                    <th className="py-3 px-4">Creación</th>
                    <th className="py-3 px-4 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sortedCitas.map((cita) => {
                    const lead = prospectosMap.get(cita.idProspecto);
                    const esVencida = isCitaVencidaSinResultado(cita, todayLA);
                    const esHoy = cita.fechaCita === todayLA;

                    return (
                      <tr
                        key={cita.id}
                        onClick={() => onOpenCitaDetail(cita)}
                        className={`hover:bg-slate-50/80 cursor-pointer transition-colors ${
                          esVencida ? 'bg-rose-50/40' : esHoy ? 'bg-amber-50/30' : ''
                        }`}
                      >
                        {/* Fecha */}
                        <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-[#B8922A]" />
                            <span>{formatDateDisplay(cita.fechaCita)}</span>
                          </div>
                          {esHoy && (
                            <span className="text-[10px] font-extrabold text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded mt-0.5 inline-block">
                              HOY
                            </span>
                          )}
                        </td>

                        {/* Hora */}
                        <td className="py-3 px-4 font-extrabold text-slate-800 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>{cita.horaCita}</span>
                          </div>
                        </td>

                        {/* Prospecto */}
                        <td className="py-3 px-4">
                          <div className="flex items-start gap-2">
                            <div>
                              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                <span>{lead?.nombre || 'Prospecto sin nombre'}</span>
                                {lead?.temperatura && (
                                  <span
                                    className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full border ${getTemperaturaBadgeClass(
                                      lead.temperatura
                                    )}`}
                                  >
                                    {lead.temperatura}
                                  </span>
                                )}
                              </div>
                              {lead?.telefono && (
                                <a
                                  href={`tel:${lead.telefono}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-[11px] text-blue-600 hover:underline flex items-center gap-1 mt-0.5"
                                >
                                  <Phone className="w-3 h-3 text-slate-400" />
                                  <span>{formatPhoneDisplay(lead.telefono)}</span>
                                </a>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Telemarketing */}
                        <td className="py-3 px-4 whitespace-nowrap font-semibold text-slate-700">
                          {cita.telemarketing}
                        </td>

                        {/* Asunto */}
                        <td className="py-3 px-4 text-slate-800 font-medium truncate max-w-[180px]">
                          {cita.asunto || 'Demostración'}
                        </td>

                        {/* Dirección con Google Maps */}
                        <td className="py-3 px-4">
                          <div className="max-w-[200px]">
                            <p className="text-slate-700 truncate text-[11px]">
                              {cita.direccion || '-'}
                            </p>
                            {cita.linkGoogleMaps && (
                              <a
                                href={cita.linkGoogleMaps}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 mt-0.5"
                              >
                                <span>Ver en Google Maps</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        </td>

                        {/* Quién Atiende */}
                        <td className="py-3 px-4 whitespace-nowrap text-slate-700">
                          {cita.quienAtiende || '-'}
                        </td>

                        {/* Invitado */}
                        <td className="py-3 px-4 whitespace-nowrap text-slate-700">
                          {cita.invitado ? (
                            <span className="truncate max-w-[120px] block" title={cita.invitado}>
                              {cita.invitado}
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>

                        {/* Estado de la Cita */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex flex-col gap-1 items-start">
                            <span
                              className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${getEstadoCitaBadgeClass(
                                cita.estadoCita
                              )}`}
                            >
                              {cita.estadoCita}
                            </span>
                            {esVencida && (
                              <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded-full bg-rose-500 text-white animate-pulse shadow-2xs">
                                Pendiente de resultado
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Fecha de Creación */}
                        <td className="py-3 px-4 whitespace-nowrap text-slate-500 text-[11px]">
                          {formatDateDisplay(cita.fechaCreacion ? cita.fechaCreacion.split('T')[0] : '')}
                        </td>

                        {/* Botón Acción */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          {cita.estadoCita !== 'Cancelada' && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenRegistrarResultado(cita);
                              }}
                              className="px-3 py-1.5 bg-[#0D2240] hover:bg-[#14325a] text-white font-extrabold text-[11px] rounded-lg shadow-2xs transition-all flex items-center gap-1.5 ml-auto"
                            >
                              <CalendarCheck className="w-3.5 h-3.5 text-[#B8922A]" />
                              <span>Registrar resultado</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* VISTA 2: CALENDARIO (MENSUAL Y SEMANAL) */}
      {viewMode === 'calendario' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          {/* Navegación y selector de Calendario */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-slate-900">
                {monthNames[calendarAnchorDate.getMonth()]} {calendarAnchorDate.getFullYear()}
              </h2>
              <div className="flex items-center gap-1 border border-slate-200 rounded-lg p-0.5 bg-slate-50">
                <button
                  type="button"
                  onClick={() => navigateCalendar('prev')}
                  className="p-1 rounded text-slate-600 hover:bg-white"
                  title="Anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => navigateCalendar('today')}
                  className="px-2 py-0.5 text-xs font-bold text-slate-700 hover:bg-white rounded"
                >
                  Hoy
                </button>
                <button
                  type="button"
                  onClick={() => navigateCalendar('next')}
                  className="p-1 rounded text-slate-600 hover:bg-white"
                  title="Siguiente"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Sub-selector Mes / Semana */}
            <div className="flex items-center gap-2">
              <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200">
                <button
                  type="button"
                  onClick={() => setCalendarSubMode('mes')}
                  className={`px-3 py-1 rounded-lg text-xs font-extrabold transition-all ${
                    calendarSubMode === 'mes'
                      ? 'bg-white text-[#0D2240] shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Mes
                </button>
                <button
                  type="button"
                  onClick={() => setCalendarSubMode('semana')}
                  className={`px-3 py-1 rounded-lg text-xs font-extrabold transition-all ${
                    calendarSubMode === 'semana'
                      ? 'bg-white text-[#0D2240] shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Semana
                </button>
              </div>
            </div>
          </div>

          {/* Calendario Mensual */}
          {calendarSubMode === 'mes' && (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              {/* Encabezado Días de la Semana */}
              <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200 text-center py-2.5 text-xs font-extrabold text-slate-600">
                <span>Lun</span>
                <span>Mar</span>
                <span>Mié</span>
                <span>Jue</span>
                <span>Vie</span>
                <span>Sáb</span>
                <span>Dom</span>
              </div>

              {/* Matriz de días */}
              {(() => {
                const year = calendarAnchorDate.getFullYear();
                const month = calendarAnchorDate.getMonth();
                const firstDayOfMonth = new Date(year, month, 1);
                const lastDayOfMonth = new Date(year, month + 1, 0);

                let startDay = firstDayOfMonth.getDay(); // 0 is Sunday
                startDay = startDay === 0 ? 6 : startDay - 1; // convert to Monday = 0

                const totalDays = lastDayOfMonth.getDate();

                // Días previos para rellenar semana
                const prevDaysCount = startDay;
                const prevMonthLastDay = new Date(year, month, 0).getDate();

                const calendarCells = [];

                // Celdas del mes anterior
                for (let i = prevDaysCount - 1; i >= 0; i--) {
                  calendarCells.push({
                    dayNumber: prevMonthLastDay - i,
                    currentMonth: false,
                    dateStr: '',
                  });
                }

                // Celdas del mes actual
                for (let i = 1; i <= totalDays; i++) {
                  const mStr = String(month + 1).padStart(2, '0');
                  const dStr = String(i).padStart(2, '0');
                  const dateStr = `${year}-${mStr}-${dStr}`;
                  calendarCells.push({
                    dayNumber: i,
                    currentMonth: true,
                    dateStr,
                  });
                }

                // Celdas del mes siguiente
                const remainder = calendarCells.length % 7;
                if (remainder !== 0) {
                  const nextDaysCount = 7 - remainder;
                  for (let i = 1; i <= nextDaysCount; i++) {
                    calendarCells.push({
                      dayNumber: i,
                      currentMonth: false,
                      dateStr: '',
                    });
                  }
                }

                return (
                  <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 bg-white">
                    {calendarCells.map((cell, idx) => {
                      const dayCitas = cell.dateStr
                        ? filteredCitas.filter((c) => c.fechaCita === cell.dateStr)
                        : [];
                      const isToday = cell.dateStr === todayLA;

                      return (
                        <div
                          key={idx}
                          className={`min-h-[110px] p-2 flex flex-col justify-between transition-colors ${
                            !cell.currentMonth
                              ? 'bg-slate-50/50 text-slate-300'
                              : isToday
                              ? 'bg-amber-50/20'
                              : 'bg-white'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span
                              className={`text-xs font-black w-6 h-6 flex items-center justify-center rounded-full ${
                                isToday
                                  ? 'bg-[#B8922A] text-white shadow-xs'
                                  : cell.currentMonth
                                  ? 'text-slate-800'
                                  : 'text-slate-300'
                              }`}
                            >
                              {cell.dayNumber}
                            </span>
                            {dayCitas.length > 0 && (
                              <span className="text-[10px] font-bold text-slate-400">
                                {dayCitas.length} {dayCitas.length === 1 ? 'cita' : 'citas'}
                              </span>
                            )}
                          </div>

                          {/* Lista de citas en este día */}
                          <div className="space-y-1 overflow-y-auto max-h-[85px]">
                            {dayCitas.slice(0, 3).map((cita) => {
                              const lead = prospectosMap.get(cita.idProspecto);
                              return (
                                <div
                                  key={cita.id}
                                  onClick={() => onOpenCitaDetail(cita)}
                                  className={`p-1.5 rounded-lg border text-[11px] leading-tight cursor-pointer hover:shadow-xs transition-all ${getEstadoCitaBadgeClass(
                                    cita.estadoCita
                                  )}`}
                                  title={`${cita.horaCita} - ${lead?.nombre || 'Prospecto'}`}
                                >
                                  <div className="flex items-center justify-between font-bold">
                                    <span>{cita.horaCita}</span>
                                    <span className="truncate ml-1 font-semibold">
                                      {lead?.nombre || 'Lead'}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                            {dayCitas.length > 3 && (
                              <div
                                onClick={() => {
                                  setDateFilter('personalizado');
                                  setFechaInicio(cell.dateStr);
                                  setFechaFin(cell.dateStr);
                                  setViewMode('lista');
                                }}
                                className="text-[10px] font-bold text-blue-600 hover:underline cursor-pointer text-center"
                              >
                                +{dayCitas.length - 3} más
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}

          {/* Calendario Semanal */}
          {calendarSubMode === 'semana' && (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              {(() => {
                const { startStr, endStr } = getWeekDates(calendarAnchorDate);
                // Array de los 7 días de la semana
                const weekDays = [];
                const curr = new Date(startStr + 'T12:00:00');
                const dayLabels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

                for (let i = 0; i < 7; i++) {
                  const y = curr.getFullYear();
                  const m = String(curr.getMonth() + 1).padStart(2, '0');
                  const d = String(curr.getDate()).padStart(2, '0');
                  const dateStr = `${y}-${m}-${d}`;
                  weekDays.push({
                    label: dayLabels[i],
                    dateStr,
                    dayNumber: curr.getDate(),
                    monthNumber: curr.getMonth() + 1,
                  });
                  curr.setDate(curr.getDate() + 1);
                }

                return (
                  <div>
                    <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200 divide-x divide-slate-200">
                      {weekDays.map((day, idx) => {
                        const isToday = day.dateStr === todayLA;
                        return (
                          <div
                            key={idx}
                            className={`p-3 text-center ${isToday ? 'bg-amber-50/50' : ''}`}
                          >
                            <span className="block text-[11px] font-bold text-slate-500 uppercase">
                              {day.label}
                            </span>
                            <span
                              className={`text-sm font-black inline-block mt-0.5 px-2 py-0.5 rounded-full ${
                                isToday ? 'bg-[#B8922A] text-white' : 'text-slate-800'
                              }`}
                            >
                              {day.dayNumber}/{day.monthNumber}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    <div className="grid grid-cols-7 divide-x divide-slate-100 bg-white min-h-[300px]">
                      {weekDays.map((day, idx) => {
                        const dayCitas = filteredCitas
                          .filter((c) => c.fechaCita === day.dateStr)
                          .sort((a, b) => (a.horaCita || '').localeCompare(b.horaCita || ''));
                        const isToday = day.dateStr === todayLA;

                        return (
                          <div
                            key={idx}
                            className={`p-2 space-y-2 ${isToday ? 'bg-amber-50/20' : ''}`}
                          >
                            {dayCitas.length === 0 ? (
                              <p className="text-[10px] text-slate-300 text-center pt-4">
                                Sin citas
                              </p>
                            ) : (
                              dayCitas.map((cita) => {
                                const lead = prospectosMap.get(cita.idProspecto);
                                return (
                                  <div
                                    key={cita.id}
                                    onClick={() => onOpenCitaDetail(cita)}
                                    className={`p-2 rounded-xl border text-xs cursor-pointer hover:shadow-md transition-all ${getEstadoCitaBadgeClass(
                                      cita.estadoCita
                                    )}`}
                                  >
                                    <div className="flex items-center justify-between font-black text-[11px]">
                                      <span>{cita.horaCita}</span>
                                      <span className="text-[10px]">{cita.telemarketing}</span>
                                    </div>
                                    <div className="font-extrabold text-slate-900 truncate mt-1">
                                      {lead?.nombre || 'Prospecto'}
                                    </div>
                                    <div className="text-[10px] text-slate-600 truncate">
                                      {cita.asunto || 'Demostración'}
                                    </div>
                                    <div className="mt-2 pt-1 border-t border-black/5 flex items-center justify-between">
                                      <span className="text-[10px] font-bold">{cita.estadoCita}</span>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onOpenRegistrarResultado(cita);
                                        }}
                                        className="text-[10px] font-extrabold text-[#0D2240] hover:underline"
                                      >
                                        Resultado &gt;
                                      </button>
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
