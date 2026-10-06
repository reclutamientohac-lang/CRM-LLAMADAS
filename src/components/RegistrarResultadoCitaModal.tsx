import React, { useState } from 'react';
import {
  X,
  Calendar,
  Clock,
  User,
  Phone,
  AlertTriangle,
  CheckCircle2,
  CalendarClock,
  RotateCcw,
  ShoppingBag,
  UserX,
  Users,
  CalendarCheck,
  Check,
  ExternalLink,
} from 'lucide-react';
import { Cita, Prospecto, ResultadoCita } from '../types';
import { useCRM } from '../context/CRMContext';
import {
  RESULTADOS_CITA,
  getTodayInLA,
  getCurrentTimeAMPM_LA,
  getEstadoCitaBadgeClass,
  getResultadoCitaBadgeClass,
  formatDateDisplay,
} from '../businessRules';

interface RegistrarResultadoCitaModalProps {
  cita: Cita;
  prospecto?: Prospecto;
  onClose: () => void;
  onSuccess?: () => void;
}

export const RegistrarResultadoCitaModal: React.FC<RegistrarResultadoCitaModalProps> = ({
  cita,
  prospecto,
  onClose,
  onSuccess,
}) => {
  const { registrarResultadoCita, prospectos } = useCRM();

  // Prospecto asociado si no viene por props
  const lead = prospecto || prospectos.find((p) => p.id === cita.idProspecto);

  const [resultado, setResultado] = useState<ResultadoCita | ''>('');
  const [observacion, setObservacion] = useState('');

  // Para resultado "Reprogramar"
  const [nuevaFecha, setNuevaFecha] = useState('');
  const [nuevaHoraRaw, setNuevaHoraRaw] = useState('15:30'); // 3:30 PM default

  // Para resultado "Venta futura"
  const [fechaProximoContacto, setFechaProximoContacto] = useState('');
  const [horaProximoContactoRaw, setHoraProximoContactoRaw] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Convierte input type="time" (HH:MM) a formato AM/PM
  const formatTimeToAMPM = (time24: string): string => {
    if (!time24) return '';
    try {
      const [h, m] = time24.split(':').map(Number);
      const period = h >= 12 ? 'PM' : 'AM';
      const hours12 = h % 12 || 12;
      const minutesStr = m < 10 ? `0${m}` : `${m}`;
      return `${hours12}:${minutesStr} ${period}`;
    } catch {
      return time24;
    }
  };

  const nuevaHoraAMPM = formatTimeToAMPM(nuevaHoraRaw);
  const horaProximoContactoAMPM = formatTimeToAMPM(horaProximoContactoRaw);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!resultado) {
      setErrorMessage('Debes seleccionar el resultado de la cita.');
      return;
    }

    if (resultado === 'Reprogramar') {
      if (!nuevaFecha) {
        setErrorMessage('Para reprogramar la cita debes indicar la nueva fecha.');
        return;
      }
      if (!nuevaHoraRaw) {
        setErrorMessage('Para reprogramar la cita debes indicar la nueva hora.');
        return;
      }
    }

    if (resultado === 'Venta futura') {
      if (!fechaProximoContacto) {
        setErrorMessage('Para venta futura debes indicar la fecha del próximo contacto.');
        return;
      }
    }

    setSubmitting(true);

    try {
      const res = await registrarResultadoCita(cita, {
        resultado: resultado as ResultadoCita,
        observacion: observacion.trim(),
        nuevaFecha: resultado === 'Reprogramar' ? nuevaFecha : undefined,
        nuevaHora: resultado === 'Reprogramar' ? nuevaHoraAMPM : undefined,
        fechaProximoContacto: resultado === 'Venta futura' ? fechaProximoContacto : undefined,
        horaProximoContacto:
          resultado === 'Venta futura' && horaProximoContactoRaw
            ? horaProximoContactoAMPM
            : undefined,
      });

      if (!res.success) {
        setErrorMessage(res.error || 'Ocurrió un error al registrar el resultado.');
        setSubmitting(false);
        return;
      }

      // Mensaje de éxito específico según regla
      if (resultado === 'Venta') {
        setSuccessMessage('Venta reportada. Quedó pendiente de aprobación de supervisión.');
      } else {
        setSuccessMessage('Retroalimentación registrada correctamente.');
      }

      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 1500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error de conexión.');
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Cabecera Azul Marino */}
        <div className="bg-[#0D2240] text-white p-5 sm:p-6 relative">
          <button
            onClick={onClose}
            disabled={submitting}
            className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 text-xs font-bold text-[#B8922A] tracking-wider uppercase mb-1">
            <CalendarCheck className="w-4 h-4" />
            <span>Resultado de Cita</span>
          </div>

          <h3 className="text-xl font-black text-white">
            {lead?.nombre || 'Prospecto sin nombre'}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3 pt-3 border-t border-white/10 text-xs text-slate-200">
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-[#B8922A]" />
              <span>
                <strong>Fecha & Hora:</strong> {formatDateDisplay(cita.fechaCita)} • {cita.horaCita}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-[#B8922A]" />
              <span>
                <strong>Telemarketing:</strong> {cita.telemarketing}
              </span>
            </div>
            <div className="sm:col-span-2 flex items-center gap-2 text-slate-300 truncate">
              <span className="font-semibold text-white">Asunto:</span>
              <span className="truncate">{cita.asunto || 'Demostración'}</span>
            </div>
          </div>
        </div>

        {/* Mensajes de Alerta */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            <p className="font-medium">{errorMessage}</p>
          </div>
        )}

        {successMessage && (
          <div className="mx-6 mt-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
            <p className="font-semibold">{successMessage}</p>
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Selector de Resultado */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Resultado de la Cita <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <select
                value={resultado}
                onChange={(e) => {
                  setResultado(e.target.value as ResultadoCita);
                  setErrorMessage(null);
                }}
                disabled={submitting || Boolean(successMessage)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0D2240] focus:border-transparent transition-all"
                required
              >
                <option value="">-- Seleccionar resultado comercial --</option>
                {RESULTADOS_CITA.map((res) => (
                  <option key={res} value={res}>
                    {res}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {resultado === 'Venta' &&
                'Genera una venta en estado Pendiente y actualiza el prospecto a Venta.'}
              {resultado === 'Reprogramar' &&
                'Permite fijar una nueva fecha y hora para la cita.'}
              {resultado === 'Venta futura' &&
                'Programa un seguimiento futuro para reintentar la venta en la fecha indicada.'}
              {resultado === 'No recibió' &&
                'Marca la cita como Realizada sin cambiar el estado del prospecto.'}
              {(resultado === 'No interesada dio referencias' ||
                resultado === 'No interesada sin referencias') &&
                'Registra la retroalimentación y marca la cita como Realizada.'}
            </p>
          </div>

          {/* Bloque Condicional: Reprogramar */}
          {resultado === 'Reprogramar' && (
            <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                <RotateCcw className="w-4 h-4 text-amber-600" />
                <span>Datos de la Nueva Fecha y Hora</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nueva Fecha <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    min={getTodayInLA()}
                    value={nuevaFecha}
                    onChange={(e) => setNuevaFecha(e.target.value)}
                    disabled={submitting || Boolean(successMessage)}
                    className="w-full bg-white border border-amber-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nueva Hora <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="time"
                    value={nuevaHoraRaw}
                    onChange={(e) => setNuevaHoraRaw(e.target.value)}
                    disabled={submitting || Boolean(successMessage)}
                    className="w-full bg-white border border-amber-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    required
                  />
                  <div className="mt-1 text-[11px] text-amber-800 font-medium">
                    Hora seleccionada:{' '}
                    <span className="font-bold text-amber-950">{nuevaHoraAMPM || '-'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Bloque Condicional: Venta futura */}
          {resultado === 'Venta futura' && (
            <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-xl space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center gap-2 text-purple-900 font-bold text-xs">
                <CalendarClock className="w-4 h-4 text-purple-600" />
                <span>Próximo Contacto (Venta Futura)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Fecha Próximo Contacto <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    min={getTodayInLA()}
                    value={fechaProximoContacto}
                    onChange={(e) => setFechaProximoContacto(e.target.value)}
                    disabled={submitting || Boolean(successMessage)}
                    className="w-full bg-white border border-purple-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Hora (Opcional)
                  </label>
                  <input
                    type="time"
                    value={horaProximoContactoRaw}
                    onChange={(e) => setHoraProximoContactoRaw(e.target.value)}
                    disabled={submitting || Boolean(successMessage)}
                    className="w-full bg-white border border-purple-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  {horaProximoContactoRaw && (
                    <div className="mt-1 text-[11px] text-purple-800 font-medium">
                      Hora: <span className="font-bold">{horaProximoContactoAMPM}</span>
                    </div>
                  )}
                </div>
              </div>
              <p className="text-[11px] text-purple-700">
                El prospecto se moverá a &quot;Seguimiento programado&quot; y reaparecerá en Mi
                Trabajo al llegar la fecha indicada.
              </p>
            </div>
          )}

          {/* Campo Observación */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Observación de la Cita
            </label>
            <textarea
              rows={3}
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
              disabled={submitting || Boolean(successMessage)}
              placeholder="Detalles de la demostración, productos de interés, objeciones o acuerdos con el cliente..."
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0D2240] focus:border-transparent transition-all placeholder:text-slate-400"
            />
          </div>

          {/* Botones de Acción */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting || Boolean(successMessage)}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-50"
            >
              CANCELAR
            </button>
            <button
              type="submit"
              disabled={submitting || Boolean(successMessage) || !resultado}
              className="px-5 py-2.5 rounded-xl bg-[#0D2240] hover:bg-[#14325a] text-white text-xs font-extrabold tracking-wide shadow-md transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>GUARDANDO...</span>
                </>
              ) : successMessage ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>GUARDADO</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-[#B8922A]" />
                  <span>GUARDAR RESULTADO</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
