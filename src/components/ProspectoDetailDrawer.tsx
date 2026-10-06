import React, { useState } from 'react';
import {
  X,
  Phone,
  PhoneCall,
  Copy,
  Check,
  Calendar,
  User,
  MapPin,
  Clock,
  Archive,
  RotateCcw,
  Edit3,
  Shield,
  Tag,
  Share2,
  AlertTriangle,
  Flame,
  CheckCircle2,
  CalendarCheck,
  ExternalLink,
  MessageSquare,
  FileText,
} from 'lucide-react';
import { Prospecto, Cita } from '../types';
import { useCRM } from '../context/CRMContext';
import { useAuth } from '../context/AuthContext';
import {
  formatPhoneDisplay,
  formatDateTimeLA,
  formatDateDisplay,
  getTemperaturaBadgeClass,
  getEstadoBadgeClass,
  getResultadoBadgeClass,
  SIN_ASIGNAR,
  getDaysDifference,
} from '../businessRules';

interface ProspectoDetailDrawerProps {
  prospecto: Prospecto | null;
  onClose: () => void;
  onEdit: (prospecto: Prospecto) => void;
  onOpenRegistrarLlamada?: (prospecto: Prospecto) => void;
  onOpenCitaDetail?: (cita: Cita) => void;
}

export const ProspectoDetailDrawer: React.FC<ProspectoDetailDrawerProps> = ({
  prospecto,
  onClose,
  onEdit,
  onOpenRegistrarLlamada,
  onOpenCitaDetail,
}) => {
  const { archiveProspecto, updateProspecto, settings, gestiones, citas } = useCRM();
  const { isSupervisor } = useAuth();

  const [activeTab, setActiveTab] = useState<'info' | 'gestiones'>('info');
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [isUpdatingAgent, setIsUpdatingAgent] = useState(false);

  if (!prospecto) return null;

  const daysOld = getDaysDifference(prospecto.fechaRecepcion);

  // Filter gestiones for this prospecto
  const prospectoGestiones = gestiones.filter((g) => g.idProspecto === prospecto.id);
  // Filter citas for this prospecto
  const prospectoCitas = citas.filter((c) => c.idProspecto === prospecto.id);

  const handleCopyPhone = () => {
    navigator.clipboard.writeText(prospecto.telefono);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(prospecto.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleArchiveToggle = async () => {
    await archiveProspecto(prospecto.id, !prospecto.archivado);
    setConfirmArchive(false);
    onClose();
  };

  const handleQuickReassign = async (newAgent: string) => {
    setIsUpdatingAgent(true);
    await updateProspecto(prospecto.id, { telemarketing: newAgent });
    setIsUpdatingAgent(false);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className="relative w-full max-w-xl bg-white shadow-2xl h-full flex flex-col z-10 animate-in slide-in-from-right duration-300 border-l border-slate-200">
        {/* Drawer Header */}
        <div className="p-6 bg-[#0D2240] text-white flex items-start justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${getTemperaturaBadgeClass(
                  prospecto.temperatura
                )}`}
              >
                <Flame className="w-3 h-3" />
                <span>
                  {prospecto.temperatura || 'Sin temp'} ({daysOld}d)
                </span>
              </span>

              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${getEstadoBadgeClass(
                  prospecto.estado
                )}`}
              >
                {prospecto.estado}
              </span>

              {prospecto.archivado && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-400/30">
                  <Archive className="w-3 h-3" />
                  <span>En Papelera</span>
                </span>
              )}
            </div>

            <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              {prospecto.nombre}
            </h2>

            <div className="flex items-center gap-2 mt-1 text-xs text-slate-300 font-mono">
              <span>{prospecto.id}</span>
              <button
                onClick={handleCopyId}
                className="hover:text-[#B8922A] p-0.5 transition-colors cursor-pointer"
                title="Copiar ID"
              >
                {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Cerrar panel"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Quick Call Action Bar */}
        <div className="bg-[#08162b] px-6 py-3 border-b border-white/10 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <a
              href={`tel:${prospecto.telefono}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>{formatPhoneDisplay(prospecto.telefono)}</span>
            </a>
            <button
              onClick={handleCopyPhone}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 transition-colors cursor-pointer"
              title="Copiar teléfono"
            >
              {copiedPhone ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          <div className="flex items-center gap-2">
            {onOpenRegistrarLlamada && (
              <button
                onClick={() => onOpenRegistrarLlamada(prospecto)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#B8922A] hover:bg-[#caa435] text-[#0D2240] font-extrabold text-xs shadow-sm transition-colors cursor-pointer"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>Registrar Llamada</span>
              </button>
            )}

            <button
              onClick={() => onEdit(prospecto)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs transition-colors cursor-pointer"
            >
              <Edit3 className="w-3 h-3" />
              <span>Editar</span>
            </button>
          </div>
        </div>

        {/* Drawer Tabs: Información vs Historial de Gestiones */}
        <div className="flex items-center border-b border-slate-200 bg-slate-50 px-6 shrink-0">
          <button
            onClick={() => setActiveTab('info')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'info'
                ? 'border-[#0D2240] text-[#0D2240]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Detalles del Prospecto</span>
          </button>

          <button
            onClick={() => setActiveTab('gestiones')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'gestiones'
                ? 'border-[#0D2240] text-[#0D2240]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Historial de Gestiones</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                activeTab === 'gestiones' ? 'bg-[#0D2240] text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {prospectoGestiones.length}
            </span>
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'info' ? (
            <>
              {/* Telemarketing Assignment Card */}
              <div className="bg-[#F7F8FA] rounded-2xl p-4 border border-slate-200/80">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Telemarketing Asignada
                  </span>
                  {isSupervisor && (
                    <span className="text-[11px] text-[#B8922A] font-semibold">
                      Editable por supervisor
                    </span>
                  )}
                </div>

                {isSupervisor ? (
                  <div className="flex items-center gap-2">
                    <select
                      value={prospecto.telemarketing}
                      disabled={isUpdatingAgent}
                      onChange={(e) => handleQuickReassign(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold text-sm text-[#0D2240] outline-none focus:border-[#0D2240]"
                    >
                      <option value={SIN_ASIGNAR}>SIN ASIGNAR</option>
                      {settings.telemarketingAgents
                        .filter((a) => a.active)
                        .map((ag) => (
                          <option key={ag.id} value={ag.name}>
                            {ag.name}
                          </option>
                        ))}
                    </select>
                  </div>
                ) : (
                  <div className="text-base font-bold text-[#0D2240]">
                    {prospecto.telemarketing}
                  </div>
                )}
              </div>

              {/* Context Card */}
              <div className="bg-amber-50/60 rounded-2xl p-5 border border-amber-200/80">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900 mb-2 flex items-center gap-1.5">
                  <span>Contexto para Abordar</span>
                </h4>
                <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                  {prospecto.contexto || 'Sin contexto adicional proporcionado por el emprendedor.'}
                </p>
              </div>

              {/* Telemarketing Call Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                    Intentos Realizados
                  </span>
                  <div className="text-lg font-black text-[#0D2240]">{prospecto.intentos || 0}</div>
                  <span className="text-[11px] text-slate-500">
                    Último: {prospecto.ultimoContacto ? formatDateTimeLA(prospecto.ultimoContacto) : 'Sin llamadas'}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200/80 bg-emerald-50/60 border-emerald-200/60">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 block mb-0.5">
                    Contactos Efectivos
                  </span>
                  <div className="text-lg font-black text-emerald-700">
                    {prospecto.contactosEfectivos || 0}
                  </div>
                  <span className="text-[11px] text-emerald-700 font-medium">
                    Resultado: {prospecto.ultimoResultado || 'Ninguno'}
                  </span>
                </div>
              </div>

              {/* Next Scheduled Action if available */}
              {prospecto.proximaAccion && (
                <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200 flex items-start gap-3">
                  <Clock className="w-5 h-5 text-purple-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-purple-900 block">
                      Próxima Acción Programada
                    </span>
                    <p className="text-sm font-bold text-purple-950 mt-0.5">
                      {prospecto.proximaAccion}
                    </p>
                    {prospecto.fechaProximaAccion && (
                      <span className="text-xs text-purple-700 mt-0.5 block">
                        Fecha: {formatDateDisplay(prospecto.fechaProximaAccion)}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Key Details Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3.5 rounded-xl border border-slate-200/80 bg-white">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Propietario / Emprendedor
                  </span>
                  <p className="text-sm font-semibold text-slate-800">
                    {prospecto.propietario || 'No especificado'}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200/80 bg-white">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Ciudad / Zona
                  </span>
                  <p className="text-sm font-semibold text-slate-800">
                    {prospecto.ciudadZona || 'No especificada'}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200/80 bg-white">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Tipo de Prospecto
                  </span>
                  <p className="text-sm font-semibold text-slate-800">
                    {prospecto.tipoProspecto || 'General'}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200/80 bg-white">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Origen del Lead
                  </span>
                  <p className="text-sm font-semibold text-slate-800">
                    {prospecto.origen || 'No especificado'}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200/80 bg-white">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    ¿Llamado por emprendedor?
                  </span>
                  <p className="text-sm font-semibold text-slate-800">
                    {prospecto.llamadoPorEmprendedor}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200/80 bg-white">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Tipo de Carga
                  </span>
                  <p className="text-sm font-semibold text-slate-800">
                    {prospecto.tipoCarga}
                  </p>
                </div>
              </div>

              {/* Dates & Timeline */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 pb-1 border-b border-slate-100 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-[#B8922A]" />
                  <span>Fechas del Prospecto</span>
                </h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60">
                    <span className="text-slate-500 block mb-0.5">Fecha de Recepción</span>
                    <span className="font-bold text-slate-800 text-sm">
                      {formatDateDisplay(prospecto.fechaRecepcion)}
                    </span>
                    <span className="block text-[11px] text-slate-400 mt-0.5">
                      Antigüedad: {daysOld} días ({prospecto.temperatura || 'Sin temperatura'})
                    </span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60">
                    <span className="text-slate-500 block mb-0.5">Fecha de Prospección</span>
                    <span className="font-bold text-slate-800 text-sm">
                      {formatDateDisplay(prospecto.fechaProspeccion) || 'No indicada'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Observations */}
              {prospecto.observacion && (
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Observaciones Generales
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-700 whitespace-pre-wrap">
                    {prospecto.observacion}
                  </p>
                </div>
              )}

              {/* Audit trail */}
              <div className="p-4 rounded-2xl bg-[#0D2240]/5 border border-[#0D2240]/10 text-xs space-y-1.5 text-slate-600">
                <div className="font-bold uppercase tracking-wider text-[10px] text-[#0D2240] mb-1 flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5 text-[#B8922A]" />
                  <span>Auditoría del Registro (Horario Los Ángeles AM/PM)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Tipo de carga:</span>
                  <span className="font-medium text-slate-800">{prospecto.tipoCarga}</span>
                </div>
                {prospecto.idLote && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Lote de Excel:</span>
                    <span className="font-mono font-bold text-[#0D2240]">{prospecto.idLote}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">Creado por:</span>
                  <span className="font-medium text-slate-800">{prospecto.creadoPor}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Fecha de creación:</span>
                  <span className="font-medium text-slate-800">
                    {formatDateTimeLA(prospecto.creadoEn)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Última modificación:</span>
                  <span className="font-medium text-slate-800">
                    {formatDateTimeLA(prospecto.modificadoEn)}
                  </span>
                </div>
              </div>
            </>
          ) : (
            /* Tab: Historial de Gestiones y Citas */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Llamadas y Gestiones ({prospectoGestiones.length})
                </h4>

                {onOpenRegistrarLlamada && (
                  <button
                    onClick={() => onOpenRegistrarLlamada(prospecto)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0D2240] hover:bg-[#153460] text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                  >
                    <PhoneCall className="w-3.5 h-3.5 text-[#B8922A]" />
                    <span>Nueva Gestión</span>
                  </button>
                )}
              </div>

              {prospectoGestiones.length === 0 ? (
                <div className="py-12 px-6 text-center border-2 border-dashed border-slate-200 rounded-2xl space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
                    <PhoneCall className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800">Aún no hay llamadas registradas</h4>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    Registra la primera llamada o intento de contacto para iniciar el historial del prospecto.
                  </p>
                  {onOpenRegistrarLlamada && (
                    <button
                      onClick={() => onOpenRegistrarLlamada(prospecto)}
                      className="px-4 py-2 rounded-xl bg-[#0D2240] text-white text-xs font-bold shadow-xs hover:bg-[#153460] cursor-pointer"
                    >
                      Registrar primera llamada
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {prospectoGestiones.map((g) => {
                    // Check if this gestion created a cita
                    const relatedCita = g.idCita ? citas.find((c) => c.id === g.idCita) : null;

                    return (
                      <div
                        key={g.id}
                        className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs space-y-2.5"
                      >
                        {/* Header line */}
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${getResultadoBadgeClass(
                                  g.resultado
                                )}`}
                              >
                                {g.resultado}
                              </span>

                              <span
                                className={`inline-flex items-center px-2 py-0.2 rounded-full text-[10px] font-bold ${
                                  g.efectivo === 'Sí'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                Efectivo: {g.efectivo}
                              </span>

                              <span className="text-[11px] font-mono text-slate-400">
                                {g.id}
                              </span>
                            </div>
                            <span className="text-xs text-slate-500 font-medium block mt-1">
                              Por: <strong className="text-slate-800">{g.telemarketing}</strong> • {g.fechaHora}
                            </span>
                          </div>
                        </div>

                        {/* Observación */}
                        {g.observacion && (
                          <p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-200/60 whitespace-pre-wrap">
                            {g.observacion}
                          </p>
                        )}

                        {/* Sub-followup if "Llamar luego" */}
                        {g.resultado === 'Llamar luego' && g.fechaSeguimiento && (
                          <div className="flex items-center gap-2 p-2 rounded-xl bg-purple-50 border border-purple-200 text-xs text-purple-900 font-semibold">
                            <Clock className="w-3.5 h-3.5 text-purple-600" />
                            <span>
                              Seguimiento programado: {formatDateDisplay(g.fechaSeguimiento)}{' '}
                              {g.horaSeguimiento ? `a las ${g.horaSeguimiento}` : ''}
                            </span>
                          </div>
                        )}

                        {/* Sub-cita if "Cita" */}
                        {relatedCita && (
                          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-xs space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5 font-extrabold text-amber-950">
                                <CalendarCheck className="w-4 h-4 text-[#B8922A]" />
                                <span>Cita Agendada: {relatedCita.asunto}</span>
                              </div>
                              <span className="px-2 py-0.5 rounded-full bg-amber-200/80 font-bold text-[10px] text-amber-900">
                                {relatedCita.estadoCita}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-slate-800">
                              <div>
                                <span className="text-slate-500 text-[10px] block">Fecha y Hora:</span>
                                <strong>
                                  {formatDateDisplay(relatedCita.fechaCita)} • {relatedCita.horaCita}
                                </strong>
                              </div>
                              <div>
                                <span className="text-slate-500 text-[10px] block">Atiende:</span>
                                <strong>{relatedCita.quienAtiende || 'No asignado'}</strong>
                              </div>
                            </div>

                            {relatedCita.invitado && (
                              <div className="text-slate-700">
                                <span className="text-slate-500 text-[10px] block">Invitado / Cónyuge:</span>
                                <span>{relatedCita.invitado}</span>
                              </div>
                            )}

                            {/* Google Maps link */}
                            {relatedCita.direccion && (
                              <div className="pt-1 flex items-center justify-between flex-wrap gap-2 border-t border-amber-200">
                                <span className="text-slate-700 truncate max-w-[280px]">
                                  📍 {relatedCita.direccion}
                                </span>
                                {relatedCita.linkGoogleMaps && (
                                  <a
                                    href={relatedCita.linkGoogleMaps}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-800 hover:text-sky-950 hover:underline"
                                  >
                                    <span>Abrir en Google Maps</span>
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}
                              </div>
                            )}

                            {onOpenCitaDetail && (
                              <div className="pt-2 border-t border-amber-200/80 flex justify-end">
                                <button
                                  type="button"
                                  onClick={() => onOpenCitaDetail(relatedCita)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#0D2240] hover:bg-[#14325a] text-white text-[11px] font-bold rounded-lg transition-colors shadow-2xs cursor-pointer"
                                >
                                  <span>Ver Cita / Registrar Resultado</span>
                                  <ExternalLink className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Drawer Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 shrink-0 flex items-center justify-between">
          {confirmArchive ? (
            <div className="flex items-center gap-2 w-full justify-between">
              <span className="text-xs font-semibold text-rose-700">
                {prospecto.archivado ? '¿Restaurar prospecto?' : '¿Enviar a papelera?'}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setConfirmArchive(false)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleArchiveToggle}
                  className="px-3 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors cursor-pointer"
                >
                  Confirmar
                </button>
              </div>
            </div>
          ) : (
            <>
              <button
                onClick={() => setConfirmArchive(true)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl transition-colors cursor-pointer ${
                  prospecto.archivado
                    ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200'
                    : 'text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200'
                }`}
              >
                {prospecto.archivado ? (
                  <>
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restaurar de Papelera</span>
                  </>
                ) : (
                  <>
                    <Archive className="w-3.5 h-3.5" />
                    <span>Archivar Prospecto</span>
                  </>
                )}
              </button>

              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cerrar
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

