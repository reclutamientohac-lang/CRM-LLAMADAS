import React, { useState, useMemo } from 'react';
import {
  Headphones,
  Phone,
  PhoneCall,
  Calendar,
  Clock,
  Flame,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  Users,
  Eye,
  CalendarCheck,
  ChevronRight,
  TrendingUp,
  Award,
  Sparkles,
  ArrowRight,
  Shield,
  RotateCcw,
} from 'lucide-react';
import { Prospecto, Gestion, Cita } from '../types';
import { useCRM } from '../context/CRMContext';
import { useAuth } from '../context/AuthContext';
import {
  getTodayInLA,
  formatPhoneDisplay,
  getTemperaturaBadgeClass,
  getEstadoBadgeClass,
  getDaysDifference,
  formatDateDisplay,
  SIN_ASIGNAR,
} from '../businessRules';

interface MiTrabajoViewProps {
  onOpenLlamadaModal: (prospecto: Prospecto) => void;
  onOpenDetailDrawer: (prospecto: Prospecto) => void;
}

type WorkQueue = 'seguimientos' | 'nuevos' | 'gestion' | 'todos';

export const MiTrabajoView: React.FC<MiTrabajoViewProps> = ({
  onOpenLlamadaModal,
  onOpenDetailDrawer,
}) => {
  const { prospectos, gestiones, citas, settings } = useCRM();
  const { userProfile, isSupervisor, telemarketingAgent } = useAuth();

  const todayLA = getTodayInLA();

  // Agent filter state (Supervisor can select agent; Telemarketing is locked to hers)
  const [selectedAgent, setSelectedAgent] = useState<string>(
    isSupervisor ? '' : telemarketingAgent || ''
  );

  const [activeQueue, setActiveQueue] = useState<WorkQueue>('seguimientos');
  const [searchQuery, setSearchQuery] = useState('');

  // Effective agent to filter
  const currentAgent = isSupervisor ? selectedAgent : telemarketingAgent || '';

  // Filter prospectos by assigned agent
  const agentProspectos = useMemo(() => {
    return prospectos.filter((p) => {
      if (p.archivado) return false;
      if (!currentAgent) return true; // Show all if supervisor hasn't picked one
      return p.telemarketing === currentAgent;
    });
  }, [prospectos, currentAgent]);

  // Today's Gestiones for this agent
  const agentGestionesHoy = useMemo(() => {
    return gestiones.filter((g) => {
      if (currentAgent && g.telemarketing !== currentAgent) return false;
      // Date matching todayLA in format YYYY-MM-DD or start of string
      return g.fechaHora && g.fechaHora.includes(todayLA);
    });
  }, [gestiones, currentAgent, todayLA]);

  // Today's Citas for this agent
  const agentCitasHoy = useMemo(() => {
    return citas.filter((c) => {
      if (currentAgent && c.telemarketing !== currentAgent) return false;
      return (
        (c.fechaCreacion && c.fechaCreacion.startsWith(todayLA)) ||
        (c.fechaCita && c.fechaCita === todayLA)
      );
    });
  }, [citas, currentAgent, todayLA]);

  // Metrics calculation
  const totalLlamadasHoy = agentGestionesHoy.length;
  const contactosEfectivosHoy = agentGestionesHoy.filter((g) => g.efectivo === 'Sí').length;
  const citasHoyCount = agentCitasHoy.length;
  const porcentajeEfectividad =
    totalLlamadasHoy > 0 ? Math.round((contactosEfectivosHoy / totalLlamadasHoy) * 100) : 0;

  // Queues definition
  // 1. Seguimientos vencidos o para hoy
  const seguimientosList = useMemo(() => {
    return agentProspectos
      .filter((p) => {
        if (p.estado !== 'Seguimiento programado') return false;
        if (!p.fechaProximaAccion) return true;
        // Today or past due
        return p.fechaProximaAccion <= todayLA;
      })
      .sort((a, b) => (a.fechaProximaAccion || '').localeCompare(b.fechaProximaAccion || ''));
  }, [agentProspectos, todayLA]);

  // 2. Prospectos Nuevos (por llamar)
  const nuevosList = useMemo(() => {
    return agentProspectos
      .filter((p) => p.estado === 'Nuevo')
      .sort((a, b) => {
        // Hot first, then Tibio, then Frío
        const priority: Record<string, number> = { Hot: 3, Tibio: 2, Frío: 1 };
        const pA = priority[a.temperatura] || 0;
        const pB = priority[b.temperatura] || 0;
        if (pA !== pB) return pB - pA;
        return a.fechaRecepcion.localeCompare(b.fechaRecepcion);
      });
  }, [agentProspectos]);

  // 3. En Gestión / Reintentos (No contesta o Buzón)
  const enGestionList = useMemo(() => {
    return agentProspectos
      .filter((p) => p.estado === 'En gestión' || p.estado === 'En Gestión')
      .sort((a, b) => {
        // Less attempts first to give fair chance
        return (a.intentos || 0) - (b.intentos || 0);
      });
  }, [agentProspectos]);

  // Determine current active list based on selected queue
  const currentQueueList = useMemo(() => {
    let list: Prospecto[] = [];
    switch (activeQueue) {
      case 'seguimientos':
        list = seguimientosList;
        break;
      case 'nuevos':
        list = nuevosList;
        break;
      case 'gestion':
        list = enGestionList;
        break;
      case 'todos':
      default:
        list = agentProspectos;
        break;
    }

    if (!searchQuery.trim()) return list;

    const q = searchQuery.toLowerCase().trim();
    return list.filter(
      (p) =>
        p.nombre.toLowerCase().includes(q) ||
        p.telefono.includes(q) ||
        (p.propietario && p.propietario.toLowerCase().includes(q)) ||
        (p.ciudadZona && p.ciudadZona.toLowerCase().includes(q)) ||
        (p.contexto && p.contexto.toLowerCase().includes(q))
    );
  }, [activeQueue, seguimientosList, nuevosList, enGestionList, agentProspectos, searchQuery]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner / Agent selector */}
      <div className="bg-[#0D2240] rounded-3xl p-6 text-white shadow-xl border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#B8922A] to-[#d4a938] flex items-center justify-center text-[#0D2240] font-black shadow-lg shrink-0">
            <Headphones className="w-7 h-7 text-[#0D2240]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#B8922A]">
                Panel Operativo Diario
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-slate-300">
                Horario LA
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Mi Trabajo de Telemarketing
            </h1>
            <p className="text-xs text-slate-300 mt-0.5">
              {currentAgent
                ? `Operadora activa: ${currentAgent}`
                : 'Todas las agentes (Vista General del Supervisor)'}
            </p>
          </div>
        </div>

        {/* Supervisor agent filter */}
        {isSupervisor && (
          <div className="bg-[#08162b] p-3 rounded-2xl border border-white/10 flex items-center gap-3">
            <Shield className="w-4 h-4 text-[#B8922A] shrink-0" />
            <div className="min-w-0">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                Filtrar por agente
              </label>
              <select
                value={selectedAgent}
                onChange={(e) => setSelectedAgent(e.target.value)}
                className="bg-transparent text-white font-bold text-xs outline-none cursor-pointer pr-4"
              >
                <option value="" className="bg-[#0D2240] text-white">
                  Todas las agentes
                </option>
                <option value={SIN_ASIGNAR} className="bg-[#0D2240] text-white">
                  SIN ASIGNAR
                </option>
                {settings.telemarketingAgents.map((ag) => (
                  <option key={ag.id} value={ag.name} className="bg-[#0D2240] text-white">
                    {ag.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* KPI Cards: Today's Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Metric 1: Total llamadas hoy */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Llamadas Hoy
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold text-[#0D2240]">
              {totalLlamadasHoy}
            </div>
            <span className="text-[11px] text-slate-500 font-medium">gestiones registradas</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <PhoneCall className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 2: Contactos efectivos */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Contactos Efectivos
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600">
              {contactosEfectivosHoy}
            </div>
            <span className="text-[11px] text-emerald-700 font-semibold">
              {porcentajeEfectividad}% efectividad
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 3: Citas agendadas */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Citas Agendadas
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold text-[#B8922A]">
              {citasHoyCount}
            </div>
            <span className="text-[11px] text-amber-800 font-semibold">para vendedores</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-[#B8922A] flex items-center justify-center font-bold">
            <CalendarCheck className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 4: Seguimientos pendientes */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Seguimientos Hoy
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold text-purple-700">
              {seguimientosList.length}
            </div>
            <span className="text-[11px] text-purple-600 font-semibold">pendientes o vencidos</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <Clock className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Work Area */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Queue Switcher Bar */}
        <div className="p-4 sm:p-6 border-b border-slate-200/80 bg-slate-50/50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          {/* Queue Tabs */}
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-200/70 overflow-x-auto">
            <button
              onClick={() => setActiveQueue('seguimientos')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeQueue === 'seguimientos'
                  ? 'bg-[#0D2240] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-purple-400" />
              <span>1. Seguimientos Hoy</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  activeQueue === 'seguimientos'
                    ? 'bg-purple-500 text-white'
                    : 'bg-purple-100 text-purple-800'
                }`}
              >
                {seguimientosList.length}
              </span>
            </button>

            <button
              onClick={() => setActiveQueue('nuevos')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeQueue === 'nuevos'
                  ? 'bg-[#0D2240] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-red-400" />
              <span>2. Nuevos por Llamar</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  activeQueue === 'nuevos'
                    ? 'bg-[#B8922A] text-[#0D2240]'
                    : 'bg-amber-100 text-amber-900'
                }`}
              >
                {nuevosList.length}
              </span>
            </button>

            <button
              onClick={() => setActiveQueue('gestion')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeQueue === 'gestion'
                  ? 'bg-[#0D2240] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5 text-indigo-400" />
              <span>3. En Gestión (Reintentos)</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  activeQueue === 'gestion'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-indigo-100 text-indigo-800'
                }`}
              >
                {enGestionList.length}
              </span>
            </button>

            <button
              onClick={() => setActiveQueue('todos')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeQueue === 'todos'
                  ? 'bg-[#0D2240] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Todos ({agentProspectos.length})</span>
            </button>
          </div>

          {/* Quick Search in Queue */}
          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar en esta lista..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-300 text-xs bg-white focus:border-[#0D2240] outline-none"
            />
          </div>
        </div>

        {/* Queue Description Banner */}
        <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-200/70 text-xs text-slate-600 flex items-center justify-between">
          <span className="font-medium">
            {activeQueue === 'seguimientos' &&
              'Prioridad 1: Prospectos con llamada de seguimiento programada para hoy o días anteriores.'}
            {activeQueue === 'nuevos' &&
              'Prioridad 2: Prospectos que acaban de llegar y aún no tienen ningún intento de llamada (Hot primero).'}
            {activeQueue === 'gestion' &&
              'Prioridad 3: Prospectos donde no contestaron o cayó a buzón de voz y toca reintentar.'}
            {activeQueue === 'todos' &&
              'Listado completo de prospectos asignados para gestión.'}
          </span>
          <span className="text-[11px] font-bold text-slate-500">
            {currentQueueList.length} disponibles
          </span>
        </div>

        {/* Prospect Cards List */}
        {currentQueueList.length === 0 ? (
          <div className="py-20 px-6 text-center max-w-md mx-auto space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-800">
              {searchQuery
                ? 'No se encontraron prospectos con esa búsqueda'
                : '¡Todo al día en esta lista!'}
            </h3>
            <p className="text-xs text-slate-500">
              {searchQuery
                ? 'Prueba modificando el texto de búsqueda.'
                : 'No tienes prospectos pendientes en esta cola de trabajo en este momento.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {currentQueueList.map((p) => {
              const daysOld = getDaysDifference(p.fechaRecepcion);

              return (
                <div
                  key={p.id}
                  className="p-4 sm:p-5 hover:bg-slate-50/70 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  {/* Left Column: Prospect info */}
                  <div className="space-y-2 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3
                        onClick={() => onOpenDetailDrawer(p)}
                        className="text-base font-extrabold text-[#0D2240] hover:text-[#B8922A] cursor-pointer transition-colors"
                      >
                        {p.nombre}
                      </h3>

                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${getTemperaturaBadgeClass(
                          p.temperatura
                        )}`}
                      >
                        <Flame className="w-3 h-3" />
                        <span>{p.temperatura || 'Sin temp'}</span>
                      </span>

                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${getEstadoBadgeClass(
                          p.estado
                        )}`}
                      >
                        {p.estado}
                      </span>

                      {p.telemarketing && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold">
                          Agente: {p.telemarketing}
                        </span>
                      )}
                    </div>

                    {/* Contact & Lead Origin Line */}
                    <div className="flex items-center gap-3 text-xs text-slate-600 flex-wrap">
                      <a
                        href={`tel:${p.telefono}`}
                        className="font-mono font-bold text-slate-900 hover:text-emerald-700 flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-lg"
                      >
                        <Phone className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{formatPhoneDisplay(p.telefono)}</span>
                      </a>

                      <span>
                        Emprendedor: <strong>{p.propietario || 'N/A'}</strong>
                      </span>

                      {p.ciudadZona && (
                        <span className="text-slate-400">• {p.ciudadZona}</span>
                      )}

                      <span className="text-slate-400">
                        • Antigüedad: {daysOld} días ({formatDateDisplay(p.fechaRecepcion)})
                      </span>
                    </div>

                    {/* Stats & Next Action Bar */}
                    <div className="flex items-center gap-2 flex-wrap pt-0.5">
                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
                        Intentos: <strong>{p.intentos || 0}</strong>
                      </span>
                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200">
                        Efectivos: <strong>{p.contactosEfectivos || 0}</strong>
                      </span>

                      {p.ultimoResultado && (
                        <span className="text-[11px] text-slate-500">
                          Último resultado: <strong className="text-slate-700">{p.ultimoResultado}</strong>
                        </span>
                      )}

                      {/* Scheduled Next Action */}
                      {p.proximaAccion && (
                        <span className="text-[11px] px-2.5 py-0.5 rounded-md bg-purple-50 text-purple-800 font-bold border border-purple-200 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-purple-600" />
                          <span>
                            {p.proximaAccion}{' '}
                            {p.fechaProximaAccion ? `(${formatDateDisplay(p.fechaProximaAccion)})` : ''}
                          </span>
                        </span>
                      )}
                    </div>

                    {/* Context Callout */}
                    {p.contexto && (
                      <p className="text-xs text-slate-600 bg-amber-50/60 p-2.5 rounded-xl border border-amber-200/50 line-clamp-2">
                        <strong className="text-amber-900 font-bold">Contexto:</strong> {p.contexto}
                      </p>
                    )}
                  </div>

                  {/* Right Column: Prominent Action Buttons */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0">
                    <button
                      onClick={() => onOpenLlamadaModal(p)}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#0D2240] hover:bg-[#153460] text-white font-extrabold text-xs sm:text-sm shadow-md hover:shadow-lg transition-all cursor-pointer w-full sm:w-auto"
                    >
                      <PhoneCall className="w-4 h-4 text-[#B8922A]" />
                      <span>Registrar Gestión</span>
                    </button>

                    <button
                      onClick={() => onOpenDetailDrawer(p)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Ver historial</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
