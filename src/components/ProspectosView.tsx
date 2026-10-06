import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  RotateCcw,
  Users,
  Flame,
  Archive,
  Phone,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  CheckSquare,
  Square,
  Eye,
  Edit,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  AlertCircle,
  Copy,
  Check,
  PhoneCall,
} from 'lucide-react';
import { useCRM } from '../context/CRMContext';
import { useAuth } from '../context/AuthContext';
import { Prospecto, SortField, SortDirection, FilterState } from '../types';
import {
  formatPhoneDisplay,
  formatDateDisplay,
  getTemperaturaBadgeClass,
  getEstadoBadgeClass,
  SIN_ASIGNAR,
  getDaysDifference,
} from '../businessRules';
import { ProspectoDetailDrawer } from './ProspectoDetailDrawer';
import { EditProspectoModal } from './EditProspectoModal';
import { RegistrarLlamadaModal } from './RegistrarLlamadaModal';

const INITIAL_FILTERS: FilterState = {
  search: '',
  telemarketing: '',
  estado: '',
  temperatura: '',
  propietario: '',
  tipo: '',
  origen: '',
  ciudad: '',
  fechaDesde: '',
  fechaHasta: '',
  lote: '',
  mostrarArchivados: false,
};

export const ProspectosView: React.FC = () => {
  const {
    prospectos,
    settings,
    logsCargas,
    loading,
    error,
    reassignTelemarketingBulk,
    archiveProspecto,
  } = useCRM();
  const { isSupervisor } = useAuth();

  // Filters & Search
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  // Sorting
  const [sortField, setSortField] = useState<SortField>('fechaRecepcion');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Selection for bulk actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkReassignAgent, setBulkReassignAgent] = useState('');
  const [showBulkReassignModal, setShowBulkReassignModal] = useState(false);
  const [bulkProcessing, setBulkProcessing] = useState(false);

  // Detail Drawer & Edit Modal & Llamada Modal
  const [selectedProspecto, setSelectedProspecto] = useState<Prospecto | null>(null);
  const [editingProspecto, setEditingProspecto] = useState<Prospecto | null>(null);
  const [llamadaProspecto, setLlamadaProspecto] = useState<Prospecto | null>(null);

  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Distinct values for filter dropdowns
  const filterOptions = useMemo(() => {
    const propietarios = Array.from(
      new Set(prospectos.map((p) => p.propietario).filter(Boolean))
    ).sort();
    const ciudades = Array.from(
      new Set(prospectos.map((p) => p.ciudadZona).filter(Boolean))
    ).sort();
    const lotesDisponibles = Array.from(
      new Set([
        ...logsCargas.map((l) => l.idLote),
        ...(prospectos.map((p) => p.idLote).filter(Boolean) as string[]),
      ])
    ).filter(Boolean).sort().reverse();

    return {
      propietarios,
      ciudades,
      lotesDisponibles,
    };
  }, [prospectos, logsCargas]);

  // Statistics counters
  const counters = useMemo(() => {
    const active = prospectos.filter((p) => !p.archivado);
    return {
      totalActivos: active.length,
      hot: active.filter((p) => p.temperatura === 'Hot').length,
      tibio: active.filter((p) => p.temperatura === 'Tibio').length,
      frio: active.filter((p) => p.temperatura === 'Frío').length,
      sinAsignar: active.filter((p) => p.telemarketing === SIN_ASIGNAR).length,
      archivados: prospectos.filter((p) => p.archivado).length,
    };
  }, [prospectos]);

  // Filtering logic
  const filteredProspectos = useMemo(() => {
    return prospectos.filter((p) => {
      // 1. Archivado / Papelera
      if (filters.mostrarArchivados) {
        if (!p.archivado) return false;
      } else {
        if (p.archivado) return false;
      }

      // 2. Búsqueda por texto (nombre, teléfono o ID)
      if (filters.search.trim()) {
        const query = filters.search.toLowerCase().trim();
        const matchName = p.nombre.toLowerCase().includes(query);
        const matchPhone = p.telefono.includes(query);
        const matchId = p.id.toLowerCase().includes(query);
        const matchProp = p.propietario.toLowerCase().includes(query);
        const matchLote = (p.idLote || '').toLowerCase().includes(query);
        if (!matchName && !matchPhone && !matchId && !matchProp && !matchLote) {
          return false;
        }
      }

      // 3. Telemarketing
      if (filters.telemarketing && p.telemarketing !== filters.telemarketing) {
        return false;
      }

      // 4. Estado
      if (filters.estado && p.estado !== filters.estado) {
        return false;
      }

      // 5. Temperatura
      if (filters.temperatura && p.temperatura !== filters.temperatura) {
        return false;
      }

      // 6. Propietario
      if (filters.propietario && p.propietario !== filters.propietario) {
        return false;
      }

      // 7. Tipo
      if (filters.tipo && p.tipoProspecto !== filters.tipo) {
        return false;
      }

      // 8. Origen
      if (filters.origen && p.origen !== filters.origen) {
        return false;
      }

      // 9. Ciudad
      if (filters.ciudad && p.ciudadZona !== filters.ciudad) {
        return false;
      }

      // 10. Rango de fechas de recepción
      if (filters.fechaDesde && p.fechaRecepcion < filters.fechaDesde) {
        return false;
      }
      if (filters.fechaHasta && p.fechaRecepcion > filters.fechaHasta) {
        return false;
      }

      // 11. Filtro por lote de carga masiva
      if (filters.lote && p.idLote !== filters.lote) {
        return false;
      }

      return true;
    });
  }, [prospectos, filters]);

  // Sorting logic
  const sortedProspectos = useMemo(() => {
    const list = [...filteredProspectos];
    list.sort((a, b) => {
      let valA: string = a[sortField] || '';
      let valB: string = b[sortField] || '';

      if (sortField === 'temperatura') {
        const priority: Record<string, number> = { Hot: 3, Tibio: 2, Frío: 1 };
        const numA = priority[a.temperatura] || 0;
        const numB = priority[b.temperatura] || 0;
        return sortDirection === 'asc' ? numA - numB : numB - numA;
      }

      const cmp = valA.localeCompare(valB, undefined, { numeric: true });
      return sortDirection === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [filteredProspectos, sortField, sortDirection]);

  // Paginated slice
  const paginatedProspectos = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedProspectos.slice(start, start + pageSize);
  }, [sortedProspectos, currentPage, pageSize]);

  const totalPages = Math.ceil(sortedProspectos.length / pageSize) || 1;

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleClearFilters = () => {
    setFilters(INITIAL_FILTERS);
    setCurrentPage(1);
  };

  const hasActiveFilters =
    filters.search ||
    filters.telemarketing ||
    filters.estado ||
    filters.temperatura ||
    filters.propietario ||
    filters.tipo ||
    filters.origen ||
    filters.ciudad ||
    filters.fechaDesde ||
    filters.fechaHasta ||
    filters.lote ||
    filters.mostrarArchivados;

  // Selection handlers
  const toggleSelectAll = () => {
    if (selectedIds.length === paginatedProspectos.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedProspectos.map((p) => p.id));
    }
  };

  const toggleSelectOne = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Bulk actions
  const handleBulkReassign = async () => {
    if (!bulkReassignAgent) return;
    setBulkProcessing(true);
    await reassignTelemarketingBulk(selectedIds, bulkReassignAgent);
    setBulkProcessing(false);
    setShowBulkReassignModal(false);
    setSelectedIds([]);
  };

  const handleBulkArchive = async (archive: boolean) => {
    if (!window.confirm(`¿Confirmas ${archive ? 'archivar' : 'restaurar'} los ${selectedIds.length} prospectos seleccionados?`)) {
      return;
    }
    setBulkProcessing(true);
    for (const id of selectedIds) {
      await archiveProspecto(id, archive);
    }
    setBulkProcessing(false);
    setSelectedIds([]);
  };

  const handleCopyId = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Top Banner & Quick Counters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#B8922A] uppercase tracking-wider mb-1">
            <Users className="w-4 h-4" />
            <span>Gestión de Prospectos</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0D2240] tracking-tight">
            Base de Prospectos
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {counters.totalActivos} prospectos activos en seguimiento • Consulta, reasignación y auditoría
          </p>
        </div>

        {/* Status Mini Chips */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setFilters((p) => ({ ...p, temperatura: 'Hot', mostrarArchivados: false }))}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filters.temperatura === 'Hot' && !filters.mostrarArchivados
                ? 'bg-red-600 text-white shadow-sm'
                : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Hot: {counters.hot}</span>
          </button>

          <button
            onClick={() => setFilters((p) => ({ ...p, temperatura: 'Tibio', mostrarArchivados: false }))}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filters.temperatura === 'Tibio' && !filters.mostrarArchivados
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
            }`}
          >
            <span>⏳ Tibio: {counters.tibio}</span>
          </button>

          <button
            onClick={() => setFilters((p) => ({ ...p, temperatura: 'Frío', mostrarArchivados: false }))}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filters.temperatura === 'Frío' && !filters.mostrarArchivados
                ? 'bg-sky-600 text-white shadow-sm'
                : 'bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200'
            }`}
          >
            <span>❄️ Frío: {counters.frio}</span>
          </button>

          {counters.sinAsignar > 0 && (
            <button
              onClick={() =>
                setFilters((p) => ({ ...p, telemarketing: SIN_ASIGNAR, mostrarArchivados: false }))
              }
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filters.telemarketing === SIN_ASIGNAR && !filters.mostrarArchivados
                  ? 'bg-orange-600 text-white shadow-sm'
                  : 'bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200'
              }`}
            >
              <span>⚠️ Sin Asignar: {counters.sinAsignar}</span>
            </button>
          )}

          <button
            onClick={() =>
              setFilters((p) => ({ ...p, mostrarArchivados: !p.mostrarArchivados }))
            }
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              filters.mostrarArchivados
                ? 'bg-slate-800 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            <Archive className="w-3.5 h-3.5" />
            <span>Papelera ({counters.archivados})</span>
          </button>
        </div>
      </div>

      {/* Search and Filters Control Panel */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-200/90 space-y-4">
        {/* Search Bar + Toggle */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => {
                setFilters((p) => ({ ...p, search: e.target.value }));
                setCurrentPage(1);
              }}
              placeholder="Buscar por nombre, teléfono o ID (ej: PROS-2026...)..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:border-[#0D2240] focus:ring-2 focus:ring-[#0D2240]/10 text-sm outline-none transition-all"
            />
            {filters.search && (
              <button
                onClick={() => setFilters((p) => ({ ...p, search: '' }))}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setFiltersExpanded(!filtersExpanded)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                filtersExpanded || hasActiveFilters
                  ? 'bg-[#0D2240] text-white border-[#0D2240]'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Filtros avanzados</span>
              {hasActiveFilters && (
                <span className="w-2 h-2 rounded-full bg-[#B8922A] animate-pulse" />
              )}
            </button>

            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer"
                title="Limpiar todos los filtros"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Limpiar</span>
              </button>
            )}
          </div>
        </div>

        {/* Collapsible Detailed Filters */}
        {filtersExpanded && (
          <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 animate-in fade-in duration-200">
            {/* Filter Telemarketing */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Telemarketing
              </label>
              <select
                value={filters.telemarketing}
                onChange={(e) => {
                  setFilters((p) => ({ ...p, telemarketing: e.target.value }));
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium bg-white focus:border-[#0D2240] outline-none"
              >
                <option value="">Todas las agentes</option>
                <option value={SIN_ASIGNAR}>SIN ASIGNAR</option>
                {settings.telemarketingAgents.map((ag) => (
                  <option key={ag.id} value={ag.name}>
                    {ag.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Estado */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Estado
              </label>
              <select
                value={filters.estado}
                onChange={(e) => {
                  setFilters((p) => ({ ...p, estado: e.target.value }));
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium bg-white focus:border-[#0D2240] outline-none"
              >
                <option value="">Todos los estados</option>
                {settings.estadosDisponibles.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Temperatura */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Temperatura
              </label>
              <select
                value={filters.temperatura}
                onChange={(e) => {
                  setFilters((p) => ({ ...p, temperatura: e.target.value }));
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium bg-white focus:border-[#0D2240] outline-none"
              >
                <option value="">Todas las temperaturas</option>
                <option value="Hot">🔥 Hot (0 - 14 días)</option>
                <option value="Tibio">⏳ Tibio (15 - 29 días)</option>
                <option value="Frío">❄️ Frío (30+ días)</option>
              </select>
            </div>

            {/* Filter Propietario */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Propietario / Emprendedor
              </label>
              <select
                value={filters.propietario}
                onChange={(e) => {
                  setFilters((p) => ({ ...p, propietario: e.target.value }));
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium bg-white focus:border-[#0D2240] outline-none"
              >
                <option value="">Todos los propietarios</option>
                {filterOptions.propietarios.map((prop) => (
                  <option key={prop} value={prop}>
                    {prop}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Tipo */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Tipo de Prospecto
              </label>
              <select
                value={filters.tipo}
                onChange={(e) => {
                  setFilters((p) => ({ ...p, tipo: e.target.value }));
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium bg-white focus:border-[#0D2240] outline-none"
              >
                <option value="">Todos los tipos</option>
                {settings.tiposProspecto.map((tp) => (
                  <option key={tp} value={tp}>
                    {tp}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Origen */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Origen
              </label>
              <select
                value={filters.origen}
                onChange={(e) => {
                  setFilters((p) => ({ ...p, origen: e.target.value }));
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium bg-white focus:border-[#0D2240] outline-none"
              >
                <option value="">Todos los orígenes</option>
                {settings.origenes.map((or) => (
                  <option key={or} value={or}>
                    {or}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Ciudad */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Ciudad / Zona
              </label>
              <select
                value={filters.ciudad}
                onChange={(e) => {
                  setFilters((p) => ({ ...p, ciudad: e.target.value }));
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium bg-white focus:border-[#0D2240] outline-none"
              >
                <option value="">Todas las ciudades</option>
                {filterOptions.ciudades.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Range: Desde - Hasta */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Recepción Desde
                </label>
                <input
                  type="date"
                  value={filters.fechaDesde}
                  onChange={(e) => {
                    setFilters((p) => ({ ...p, fechaDesde: e.target.value }));
                    setCurrentPage(1);
                  }}
                  className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 text-xs bg-white focus:border-[#0D2240] outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Recepción Hasta
                </label>
                <input
                  type="date"
                  value={filters.fechaHasta}
                  onChange={(e) => {
                    setFilters((p) => ({ ...p, fechaHasta: e.target.value }));
                    setCurrentPage(1);
                  }}
                  className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 text-xs bg-white focus:border-[#0D2240] outline-none"
                />
              </div>
            </div>

            {/* Filter Lote de Carga Masiva */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Lote de Carga (Excel)
              </label>
              <select
                value={filters.lote}
                onChange={(e) => {
                  setFilters((p) => ({ ...p, lote: e.target.value }));
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium bg-white focus:border-[#0D2240] outline-none"
              >
                <option value="">Todos los lotes (Manual + Excel)</option>
                {filterOptions.lotesDisponibles.map((lt) => (
                  <option key={lt} value={lt}>
                    {lt}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Filter Summary & Result Count */}
        <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 pt-1">
          <div className="flex items-center gap-2">
            <span>
              Mostrando <strong className="text-slate-800">{sortedProspectos.length}</strong> de{' '}
              <strong className="text-slate-800">{prospectos.length}</strong> prospectos
            </span>
            {filters.mostrarArchivados && (
              <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 font-bold text-[10px]">
                Modo Papelera Activo
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px]">Por página:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2 py-1 rounded-lg border border-slate-300 text-xs bg-white font-medium"
            >
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bulk Action Floating Bar (Supervisor only) */}
      {isSupervisor && selectedIds.length > 0 && (
        <div className="bg-[#0D2240] text-white rounded-2xl p-4 shadow-xl border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in slide-in-from-bottom-3 duration-200">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-[#B8922A] text-[#0D2240] font-black text-xs">
              {selectedIds.length}
            </span>
            <span className="text-sm font-semibold">
              prospectos seleccionados para acciones masivas
            </span>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => {
                setBulkReassignAgent(settings.telemarketingAgents[0]?.name || SIN_ASIGNAR);
                setShowBulkReassignModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#B8922A] hover:bg-[#caa435] text-[#0D2240] font-bold text-xs shadow-sm transition-colors cursor-pointer"
            >
              <UserCheck className="w-4 h-4" />
              <span>Reasignar Telemarketing</span>
            </button>

            <button
              onClick={() => handleBulkArchive(!filters.mostrarArchivados)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs transition-colors cursor-pointer"
            >
              <Archive className="w-4 h-4" />
              <span>{filters.mostrarArchivados ? 'Restaurar' : 'Archivar'}</span>
            </button>

            <button
              onClick={() => setSelectedIds([])}
              className="px-3 py-2 rounded-xl text-xs text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              Deseleccionar
            </button>
          </div>
        </div>
      )}

      {/* Table Container */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/90 overflow-hidden">
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-10 h-10 border-4 border-[#0D2240]/20 border-t-[#0D2240] rounded-full animate-spin mx-auto" />
            <p className="text-sm text-slate-500 font-medium">Cargando base de prospectos...</p>
          </div>
        ) : error ? (
          <div className="py-16 px-6 text-center max-w-md mx-auto space-y-3">
            <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
            <h3 className="text-base font-bold text-slate-800">Error al consultar datos</h3>
            <p className="text-xs text-slate-500">{error}</p>
          </div>
        ) : paginatedProspectos.length === 0 ? (
          <div className="py-20 px-6 text-center max-w-md mx-auto space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
              <Users className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">No se encontraron prospectos</h3>
              <p className="text-xs text-slate-500 mt-1">
                {hasActiveFilters
                  ? 'No hay registros que coincidan con los filtros aplicados. Intenta restablecer la búsqueda.'
                  : 'Aún no hay prospectos registrados en el sistema. Puedes agregar uno en la pestaña "Cargar prospectos" o generar datos de muestra en Configuración.'}
              </p>
            </div>
            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="px-4 py-2 rounded-xl bg-[#0D2240] text-white text-xs font-semibold cursor-pointer"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#0D2240] text-white text-[11px] font-bold uppercase tracking-wider select-none">
                  {/* Select All Checkbox */}
                  {isSupervisor && (
                    <th className="py-3.5 px-4 w-10">
                      <button
                        onClick={toggleSelectAll}
                        className="text-slate-300 hover:text-white"
                        aria-label="Seleccionar todos"
                      >
                        {selectedIds.length === paginatedProspectos.length &&
                        paginatedProspectos.length > 0 ? (
                          <CheckSquare className="w-4 h-4 text-[#B8922A]" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </th>
                  )}

                  {/* ID */}
                  <th
                    onClick={() => handleSort('nombre')}
                    className="py-3.5 px-4 cursor-pointer hover:bg-white/5"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Prospecto</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>

                  {/* Teléfono */}
                  <th
                    onClick={() => handleSort('telefono')}
                    className="py-3.5 px-4 cursor-pointer hover:bg-white/5"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Teléfono</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>

                  {/* Propietario */}
                  <th
                    onClick={() => handleSort('propietario')}
                    className="py-3.5 px-4 cursor-pointer hover:bg-white/5 hidden md:table-cell"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Propietario / Zona</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>

                  {/* Telemarketing */}
                  <th
                    onClick={() => handleSort('telemarketing')}
                    className="py-3.5 px-4 cursor-pointer hover:bg-white/5"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Telemarketing</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>

                  {/* Temperatura */}
                  <th
                    onClick={() => handleSort('temperatura')}
                    className="py-3.5 px-4 cursor-pointer hover:bg-white/5 text-center"
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <span>Temperatura</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>

                  {/* Estado */}
                  <th
                    onClick={() => handleSort('estado')}
                    className="py-3.5 px-4 cursor-pointer hover:bg-white/5 text-center"
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <span>Estado</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>

                  {/* Fecha Recepción */}
                  <th
                    onClick={() => handleSort('fechaRecepcion')}
                    className="py-3.5 px-4 cursor-pointer hover:bg-white/5 hidden lg:table-cell"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Fecha Recep.</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>

                  {/* Acciones */}
                  <th className="py-3.5 px-4 text-right">Acciones</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {paginatedProspectos.map((p) => {
                  const isSelected = selectedIds.includes(p.id);
                  const daysOld = getDaysDifference(p.fechaRecepcion);

                  return (
                    <tr
                      key={p.id}
                      onClick={() => setSelectedProspecto(p)}
                      className={`hover:bg-slate-50/80 transition-colors cursor-pointer ${
                        isSelected ? 'bg-amber-50/50' : ''
                      } ${p.archivado ? 'opacity-70 bg-slate-50/40' : ''}`}
                    >
                      {/* Checkbox */}
                      {isSupervisor && (
                        <td
                          className="py-3 px-4 w-10"
                          onClick={(e) => toggleSelectOne(p.id, e)}
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-[#B8922A]" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-300 hover:text-slate-500" />
                          )}
                        </td>
                      )}

                      {/* Nombre & ID */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 text-sm hover:text-[#0D2240]">
                          {p.nombre}
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono mt-0.5">
                          <span>{p.id}</span>
                          <button
                            onClick={(e) => handleCopyId(p.id, e)}
                            className="hover:text-slate-700"
                            title="Copiar ID"
                          >
                            {copiedId === p.id ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                        {p.idLote && (
                          <div className="mt-0.5">
                            <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold bg-[#B8922A]/10 text-[#9a781f] border border-[#B8922A]/20">
                              {p.idLote}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Teléfono */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <a
                            href={`tel:${p.telefono}`}
                            onClick={(e) => e.stopPropagation()}
                            className="font-mono font-semibold text-slate-800 hover:text-emerald-700 flex items-center gap-1"
                          >
                            <Phone className="w-3 h-3 text-slate-400 hover:text-emerald-600" />
                            <span>{formatPhoneDisplay(p.telefono)}</span>
                          </a>
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {p.tipoProspecto} • {p.origen}
                        </span>
                      </td>

                      {/* Propietario / Zona */}
                      <td className="py-3 px-4 hidden md:table-cell">
                        <div className="font-semibold text-slate-800">
                          {p.propietario || '-'}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate max-w-[180px]">
                          {p.ciudadZona || 'Sin ciudad'}
                        </div>
                      </td>

                      {/* Telemarketing */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-bold ${
                            p.telemarketing === SIN_ASIGNAR
                              ? 'bg-orange-100 text-orange-800 border border-orange-200'
                              : 'bg-[#0D2240]/10 text-[#0D2240] border border-[#0D2240]/20'
                          }`}
                        >
                          {p.telemarketing}
                        </span>
                      </td>

                      {/* Temperatura */}
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${getTemperaturaBadgeClass(
                            p.temperatura
                          )}`}
                        >
                          <Flame className="w-3 h-3" />
                          <span>{p.temperatura}</span>
                        </span>
                        <span className="block text-[10px] text-slate-400 mt-0.5">
                          {daysOld}d
                        </span>
                      </td>

                      {/* Estado */}
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${getEstadoBadgeClass(
                            p.estado
                          )}`}
                        >
                          {p.estado}
                        </span>
                      </td>

                      {/* Fecha Recepción */}
                      <td className="py-3 px-4 hidden lg:table-cell text-slate-600 font-medium">
                        {formatDateDisplay(p.fechaRecepcion)}
                      </td>

                      {/* Acciones */}
                      <td className="py-3 px-4 text-right">
                        <div
                          className="flex items-center justify-end gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => setLlamadaProspecto(p)}
                            className="p-1.5 rounded-lg text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 transition-colors cursor-pointer"
                            title="Registrar llamada"
                          >
                            <PhoneCall className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setSelectedProspecto(p)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-[#0D2240] hover:bg-slate-100 transition-colors cursor-pointer"
                            title="Ver detalles"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingProspecto(p)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-[#B8922A] hover:bg-slate-100 transition-colors cursor-pointer"
                            title="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {sortedProspectos.length > 0 && (
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
            <div>
              Página <strong className="text-slate-800">{currentPage}</strong> de{' '}
              <strong className="text-slate-800">{totalPages}</strong>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-300 bg-white font-semibold disabled:opacity-40 hover:bg-slate-50 transition-colors cursor-pointer disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Anterior</span>
              </button>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-300 bg-white font-semibold disabled:opacity-40 hover:bg-slate-50 transition-colors cursor-pointer disabled:cursor-not-allowed"
              >
                <span>Siguiente</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Side Drawer Detail Panel */}
      {selectedProspecto && (
        <ProspectoDetailDrawer
          prospecto={selectedProspecto}
          onClose={() => setSelectedProspecto(null)}
          onEdit={(pros) => {
            setSelectedProspecto(null);
            setEditingProspecto(pros);
          }}
          onOpenRegistrarLlamada={(pros) => {
            setLlamadaProspecto(pros);
          }}
        />
      )}

      {/* Registrar Llamada Modal */}
      {llamadaProspecto && (
        <RegistrarLlamadaModal
          prospecto={llamadaProspecto}
          onClose={() => setLlamadaProspecto(null)}
          onSuccess={() => {
            setLlamadaProspecto(null);
          }}
        />
      )}

      {/* Edit Modal */}
      {editingProspecto && (
        <EditProspectoModal
          prospecto={editingProspecto}
          onClose={() => setEditingProspecto(null)}
          onSaved={() => {
            setEditingProspecto(null);
          }}
        />
      )}

      {/* Bulk Reassign Modal */}
      {showBulkReassignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs"
            onClick={() => setShowBulkReassignModal(false)}
          />
          <div className="relative bg-white rounded-2xl p-6 shadow-2xl max-w-md w-full border border-slate-200 z-10 space-y-4">
            <h3 className="text-lg font-bold text-[#0D2240]">
              Reasignar Telemarketing Masivamente
            </h3>
            <p className="text-xs text-slate-500">
              Se reasignarán los <strong className="text-slate-800">{selectedIds.length}</strong>{' '}
              prospectos seleccionados a la siguiente agente de telemarketing:
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Seleccionar Agente
              </label>
              <select
                value={bulkReassignAgent}
                onChange={(e) => setBulkReassignAgent(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold bg-white outline-none focus:border-[#0D2240]"
              >
                <option value={SIN_ASIGNAR}>SIN ASIGNAR</option>
                {settings.telemarketingAgents
                  .filter((a) => a.active)
                  .map((ag) => (
                    <option key={ag.id} value={ag.name}>
                      {ag.name} (Telemarketing)
                    </option>
                  ))}
              </select>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowBulkReassignModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={bulkProcessing}
                onClick={handleBulkReassign}
                className="px-5 py-2 text-xs font-bold text-[#0D2240] bg-[#B8922A] hover:bg-[#caa435] rounded-xl shadow-sm transition-colors cursor-pointer"
              >
                {bulkProcessing ? 'Reasignando...' : 'Confirmar Reasignación'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
