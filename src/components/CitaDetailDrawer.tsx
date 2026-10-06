import React, { useState } from 'react';
import {
  X,
  Calendar,
  Clock,
  User,
  Phone,
  MapPin,
  ExternalLink,
  Mail,
  Copy,
  Check,
  AlertTriangle,
  CheckCircle2,
  CalendarCheck,
  ShoppingBag,
  RotateCcw,
  Ban,
  Clock3,
  CalendarClock,
  History,
  FileText,
  Flame,
  ArrowRight,
} from 'lucide-react';
import { Cita, Prospecto, Retroalimentacion, Venta } from '../types';
import { useCRM } from '../context/CRMContext';
import { useAuth } from '../context/AuthContext';
import {
  formatDateDisplay,
  formatPhoneDisplay,
  getEstadoCitaBadgeClass,
  getResultadoCitaBadgeClass,
  isCitaVencidaSinResultado,
  getTemperaturaBadgeClass,
} from '../businessRules';

interface CitaDetailDrawerProps {
  cita: Cita;
  onClose: () => void;
  onOpenProspectoDetail?: (prospecto: Prospecto) => void;
  onOpenRegistrarResultado?: (cita: Cita) => void;
}

export const CitaDetailDrawer: React.FC<CitaDetailDrawerProps> = ({
  cita,
  onClose,
  onOpenProspectoDetail,
  onOpenRegistrarResultado,
}) => {
  const { prospectos, retroalimentaciones, ventas, cancelarCita } = useCRM();
  const { isSupervisor } = useAuth();

  const [copiedPhone, setCopiedPhone] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelMotivo, setCancelMotivo] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  // Prospecto asociado
  const lead = prospectos.find((p) => p.id === cita.idProspecto);

  // Historial de retroalimentaciones para esta cita
  const retrosCita = retroalimentaciones
    .filter((r) => r.idCita === cita.id)
    .sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));

  // Venta asociada si existe
  const ventaAsociada = ventas.find((v) => v.idCita === cita.id);

  const esVencida = isCitaVencidaSinResultado(cita);

  const handleCopyPhone = (phone: string) => {
    navigator.clipboard.writeText(phone);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  const handleConfirmCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelMotivo.trim()) {
      setCancelError('Debes ingresar un motivo para la cancelación.');
      return;
    }

    setCancelLoading(true);
    setCancelError(null);

    const res = await cancelarCita(cita, cancelMotivo.trim());
    setCancelLoading(false);

    if (res.success) {
      setShowCancelModal(false);
      setCancelMotivo('');
    } else {
      setCancelError(res.error || 'Error al cancelar la cita.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-250">
        {/* Header Superior Azul Marino */}
        <div className="bg-[#0D2240] text-white px-6 py-5 flex items-start justify-between border-b border-white/10 shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="text-[11px] font-mono tracking-wider text-slate-300 bg-white/10 px-2 py-0.5 rounded">
                {cita.id}
              </span>
              <span
                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${getEstadoCitaBadgeClass(
                  cita.estadoCita
                )}`}
              >
                {cita.estadoCita}
              </span>
              {esVencida && (
                <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-rose-500 text-white animate-pulse shadow-xs">
                  Pendiente de resultado
                </span>
              )}
            </div>
            <h2 className="text-lg font-black text-white leading-tight">
              {cita.asunto || 'Demostración de Producto'}
            </h2>
            <p className="text-xs text-slate-300 mt-1 flex items-center gap-1.5">
              <span>Agendada por:</span>
              <strong className="text-[#B8922A]">{cita.telemarketing}</strong>
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors shrink-0"
            aria-label="Cerrar detalle"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido con Scroll */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Card: Datos de la Cita */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-[#0D2240]" />
              <span>Programación de la Cita</span>
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <span className="text-[11px] text-slate-400 font-medium block">Fecha</span>
                <span className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5 mt-0.5">
                  <Calendar className="w-4 h-4 text-[#B8922A]" />
                  {formatDateDisplay(cita.fechaCita)}
                </span>
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <span className="text-[11px] text-slate-400 font-medium block">Hora (AM/PM)</span>
                <span className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5 mt-0.5">
                  <Clock className="w-4 h-4 text-[#B8922A]" />
                  {cita.horaCita || '-'}
                </span>
              </div>
            </div>

            {/* Dirección y Google Maps */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[11px] text-slate-400 font-medium block">
                      Dirección de la Cita
                    </span>
                    <p className="text-xs font-semibold text-slate-800 leading-snug">
                      {cita.direccion || 'Sin dirección registrada'}
                    </p>
                  </div>
                </div>

                {cita.linkGoogleMaps && (
                  <a
                    href={cita.linkGoogleMaps}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg border border-blue-200 transition-colors shrink-0 shadow-2xs"
                  >
                    <span>Google Maps</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>

            {/* Quién atiende e Invitado */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <span className="text-[11px] text-slate-400 font-medium block">Quién Atiende</span>
                <span className="font-semibold text-slate-800 mt-0.5 block">
                  {cita.quienAtiende || 'No especificado'}
                </span>
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <span className="text-[11px] text-slate-400 font-medium block">Invitado (Email)</span>
                {cita.invitado ? (
                  <a
                    href={`mailto:${cita.invitado}`}
                    className="font-semibold text-blue-600 hover:underline flex items-center gap-1 mt-0.5 truncate"
                  >
                    <Mail className="w-3 h-3 shrink-0" />
                    <span className="truncate">{cita.invitado}</span>
                  </a>
                ) : (
                  <span className="text-slate-400 mt-0.5 block">Sin invitado</span>
                )}
              </div>
            </div>

            {/* Descripción */}
            {cita.descripcion && (
              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <span className="text-[11px] text-slate-400 font-medium block">
                  Notas de la Cita
                </span>
                <p className="text-xs text-slate-700 mt-1 whitespace-pre-wrap">
                  {cita.descripcion}
                </p>
              </div>
            )}
          </div>

          {/* Card: Prospecto Vinculado */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-4 h-4 text-[#0D2240]" />
                <span>Prospecto Vinculado</span>
              </h3>
              {lead && onOpenProspectoDetail && (
                <button
                  type="button"
                  onClick={() => onOpenProspectoDetail(lead)}
                  className="text-xs font-bold text-[#0D2240] hover:text-[#B8922A] flex items-center gap-1 transition-colors"
                >
                  <span>Ver detalle completo</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {lead ? (
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-base font-extrabold text-slate-900">{lead.nombre}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {lead.ciudadZona || 'Sin ciudad'} • Dueño: {lead.propietario}
                    </p>
                  </div>
                  {lead.temperatura && (
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${getTemperaturaBadgeClass(
                        lead.temperatura
                      )}`}
                    >
                      <Flame className="w-3 h-3 text-red-500" />
                      {lead.temperatura}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  <a
                    href={`tel:${lead.telefono}`}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-extrabold transition-colors shadow-2xs"
                  >
                    <Phone className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Llamar {formatPhoneDisplay(lead.telefono)}</span>
                  </a>

                  <button
                    onClick={() => handleCopyPhone(lead.telefono)}
                    className="p-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors"
                    title="Copiar teléfono"
                  >
                    {copiedPhone ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400">Prospecto no encontrado en el sistema.</p>
            )}
          </div>

          {/* Card: Venta Asociada si existe */}
          {ventaAsociada && (
            <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-emerald-900 flex items-center gap-1.5">
                  <ShoppingBag className="w-4 h-4 text-emerald-700" />
                  <span>Venta Reportada ({ventaAsociada.id})</span>
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-800">
                  Estado: {ventaAsociada.estado}
                </span>
              </div>
              <p className="text-xs text-emerald-800">
                Fecha de reporte: <strong>{formatDateDisplay(ventaAsociada.fechaReporte)}</strong> •
                Telemarketing: <strong>{ventaAsociada.telemarketing}</strong>
              </p>
              {ventaAsociada.observacion && (
                <p className="text-xs text-emerald-700 italic">
                  &quot;{ventaAsociada.observacion}&quot;
                </p>
              )}
            </div>
          )}

          {/* Card: Historial de Resultados de la Cita */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <History className="w-4 h-4 text-[#0D2240]" />
              <span>Historial de Resultados ({retrosCita.length})</span>
            </h3>

            {retrosCita.length === 0 ? (
              <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center">
                <p className="text-xs text-slate-400">
                  Aún no se ha registrado resultado comercial para esta cita.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {retrosCita.map((r) => (
                  <div
                    key={r.id}
                    className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span
                        className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${getResultadoCitaBadgeClass(
                          r.resultado
                        )}`}
                      >
                        {r.resultado}
                      </span>
                      <span className="text-[11px] text-slate-400 font-medium">
                        {r.fecha || formatDateDisplay(r.creadoEn)}
                      </span>
                    </div>

                    {r.observacion && (
                      <p className="text-xs text-slate-700 whitespace-pre-wrap">
                        {r.observacion}
                      </p>
                    )}

                    {r.resultado === 'Reprogramar' && (r.nuevaFecha || r.nuevaHora) && (
                      <div className="text-[11px] text-amber-800 bg-amber-50 p-2 rounded-lg font-medium">
                        Reprogramada para el {formatDateDisplay(r.nuevaFecha)} a las {r.nuevaHora}
                      </div>
                    )}

                    {r.resultado === 'Venta futura' && r.fechaProximoContacto && (
                      <div className="text-[11px] text-purple-800 bg-purple-50 p-2 rounded-lg font-medium">
                        Próximo contacto: {formatDateDisplay(r.fechaProximoContacto)}{' '}
                        {r.horaProximoContacto ? `(${r.horaProximoContacto})` : ''}
                      </div>
                    )}

                    <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-100 flex items-center justify-between">
                      <span>Registrado por: {r.creadoPor}</span>
                      <span className="font-mono">{r.id}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Barra de Acciones Inferior */}
        <div className="p-4 bg-white border-t border-slate-200 shrink-0 flex items-center justify-between gap-3">
          {/* Botón Cancelar Cita */}
          {cita.estadoCita !== 'Cancelada' && (
            <button
              type="button"
              onClick={() => setShowCancelModal(true)}
              className="px-3 py-2 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors border border-rose-200 flex items-center gap-1.5"
            >
              <Ban className="w-3.5 h-3.5" />
              <span>Cancelar Cita</span>
            </button>
          )}

          {/* Botón Registrar Resultado */}
          {cita.estadoCita !== 'Cancelada' && onOpenRegistrarResultado && (
            <button
              type="button"
              onClick={() => onOpenRegistrarResultado(cita)}
              className="ml-auto px-5 py-2.5 bg-[#0D2240] hover:bg-[#14325a] text-white text-xs font-extrabold rounded-xl shadow-md transition-all flex items-center gap-2"
            >
              <CalendarCheck className="w-4 h-4 text-[#B8922A]" />
              <span>Registrar Resultado</span>
            </button>
          )}

          {cita.estadoCita === 'Cancelada' && (
            <div className="text-xs text-slate-500 font-medium italic">
              Esta cita fue cancelada y no permite nuevos registros.
            </div>
          )}
        </div>
      </div>

      {/* Modal Confirmación Cancelación con Motivo Obligatorio */}
      {showCancelModal && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2 bg-rose-100 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-extrabold text-slate-900">¿Cancelar esta cita?</h4>
                <p className="text-xs text-slate-500">
                  La cita pasará a &quot;Cancelada&quot; y el prospecto volverá a &quot;En gestión&quot;.
                </p>
              </div>
            </div>

            {cancelError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
                {cancelError}
              </div>
            )}

            <form onSubmit={handleConfirmCancel} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Motivo de la Cancelación <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={cancelMotivo}
                  onChange={(e) => setCancelMotivo(e.target.value)}
                  placeholder="Ej: El cliente solicitó cancelar por viaje de trabajo..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCancelModal(false);
                    setCancelMotivo('');
                    setCancelError(null);
                  }}
                  disabled={cancelLoading}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  Regresar
                </button>
                <button
                  type="submit"
                  disabled={cancelLoading || !cancelMotivo.trim()}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold rounded-xl shadow-md disabled:opacity-50 flex items-center gap-1.5"
                >
                  {cancelLoading ? 'Cancelando...' : 'Confirmar Cancelación'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
