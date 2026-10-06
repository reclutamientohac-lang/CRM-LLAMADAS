import React, { useState } from 'react';
import {
  X,
  Phone,
  PhoneCall,
  PhoneMissed,
  Voicemail,
  Ban,
  Clock,
  CalendarCheck,
  AlertTriangle,
  MapPin,
  ExternalLink,
  Copy,
  Check,
  CheckCircle2,
  Calendar,
  User,
  Flame,
  Save,
} from 'lucide-react';
import { Prospecto, ResultadoLlamada } from '../types';
import { useCRM } from '../context/CRMContext';
import { useAuth } from '../context/AuthContext';
import {
  RESULTADOS_LLAMADA,
  isContactoEfectivo,
  getEstadoByResultado,
  getTemperaturaPostLlamada,
  generateGoogleMapsLink,
  formatPhoneDisplay,
  getTodayInLA,
  getCurrentTimeAMPM_LA,
  formatDateTimeLA,
  getTemperaturaBadgeClass,
  getEstadoBadgeClass,
  SIN_ASIGNAR,
} from '../businessRules';

interface RegistrarLlamadaModalProps {
  prospecto: Prospecto | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export const RegistrarLlamadaModal: React.FC<RegistrarLlamadaModalProps> = ({
  prospecto,
  onClose,
  onSuccess,
}) => {
  const { registrarGestion, settings } = useCRM();
  const { userProfile, isSupervisor, telemarketingAgent } = useAuth();

  if (!prospecto) return null;

  // Initial defaults
  const todayLA = getTodayInLA();
  const timeNowAMPM = getCurrentTimeAMPM_LA();
  const defaultAgent =
    telemarketingAgent ||
    (prospecto.telemarketing !== SIN_ASIGNAR ? prospecto.telemarketing : '') ||
    settings.telemarketingAgents[0]?.name ||
    '';

  const [telemarketing, setTelemarketing] = useState(defaultAgent);
  const [fechaGestion, setFechaGestion] = useState(todayLA);
  const [horaGestion, setHoraGestion] = useState(timeNowAMPM);
  const [resultado, setResultado] = useState<ResultadoLlamada>('No contesta');
  const [observacion, setObservacion] = useState('');

  // Fields for "Llamar luego"
  const [fechaSeguimiento, setFechaSeguimiento] = useState(todayLA);
  const [horaSeguimiento, setHoraSeguimiento] = useState('10:00 AM');

  // Fields for "Cita"
  const [fechaCita, setFechaCita] = useState(todayLA);
  const [horaCita, setHoraCita] = useState('03:30 PM');
  const [asuntoCita, setAsuntoCita] = useState(`Demostración - ${prospecto.nombre}`);
  const [direccionCita, setDireccionCita] = useState(prospecto.ciudadZona || '');
  const [quienAtiendeCita, setQuienAtiendeCita] = useState(prospecto.propietario || '');
  const [invitadoCita, setInvitadoCita] = useState('');
  const [descripcionCita, setDescripcionCita] = useState('');

  // UI status
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedPhone, setCopiedPhone] = useState(false);

  const esEfectivo = isContactoEfectivo(resultado);
  const projectedEstado = getEstadoByResultado(resultado);
  const projectedTemp = getTemperaturaPostLlamada(resultado, prospecto.fechaRecepcion);

  const handleCopyPhone = () => {
    navigator.clipboard.writeText(prospecto.telefono);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  const handleQuickHoraSeguimiento = (h: string) => {
    setHoraSeguimiento(h);
  };

  const handleQuickHoraCita = (h: string) => {
    setHoraCita(h);
  };

  const googleMapsUrl = generateGoogleMapsLink(direccionCita);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!telemarketing || telemarketing === SIN_ASIGNAR) {
      setErrorMsg('Debes seleccionar o indicar la operadora de telemarketing que realiza la gestión.');
      return;
    }

    if (resultado === 'Llamar luego' && !fechaSeguimiento) {
      setErrorMsg('Para el resultado "Llamar luego", la fecha de seguimiento es obligatoria.');
      return;
    }

    if (resultado === 'Cita') {
      if (!fechaCita) {
        setErrorMsg('La fecha de la cita es obligatoria.');
        return;
      }
      if (!horaCita) {
        setErrorMsg('La hora de la cita es obligatoria (ej. 3:30 PM).');
        return;
      }
      if (!direccionCita || !direccionCita.trim()) {
        setErrorMsg('La dirección de la cita es obligatoria para generar el enlace de Google Maps.');
        return;
      }
    }

    setSaving(true);

    try {
      const fechaHoraCustom = `${fechaGestion} ${horaGestion}`;

      const res = await registrarGestion(prospecto, {
        fechaHora: fechaHoraCustom,
        telemarketing,
        canal: 'Llamada',
        resultado,
        observacion,
        fechaSeguimiento: resultado === 'Llamar luego' ? fechaSeguimiento : undefined,
        horaSeguimiento: resultado === 'Llamar luego' ? horaSeguimiento : undefined,
        citaData:
          resultado === 'Cita'
            ? {
                fechaCita,
                horaCita,
                asunto: asuntoCita,
                direccion: direccionCita,
                quienAtiende: quienAtiendeCita,
                invitado: invitadoCita,
                descripcion: descripcionCita,
              }
            : undefined,
      });

      if (!res.success) {
        setErrorMsg(res.error || 'Ocurrió un error al registrar la llamada.');
        setSaving(false);
        return;
      }

      setSaving(false);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error inesperado.');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-[#0D2240] text-white p-5 sm:p-6 shrink-0 flex items-start justify-between border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#B8922A] text-[#0D2240] flex items-center justify-center font-black shadow-md shrink-0">
              <PhoneCall className="w-6 h-6 text-[#0D2240]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold uppercase tracking-wider text-[#B8922A]">
                  Registro de Contacto / Llamada
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/10 text-slate-300 font-mono">
                  {prospecto.id}
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-extrabold text-white leading-tight">
                {prospecto.nombre}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Cerrar modal"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Prospect Info Banner */}
        <div className="bg-[#08162b] px-5 sm:px-6 py-3 border-b border-white/5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3 flex-wrap">
            <a
              href={`tel:${prospecto.telefono}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all shadow-xs"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>{formatPhoneDisplay(prospecto.telefono)}</span>
            </a>
            <button
              onClick={handleCopyPhone}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 transition-colors cursor-pointer"
              title="Copiar teléfono"
            >
              {copiedPhone ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <span className="text-slate-400">
              {prospecto.ciudadZona ? `${prospecto.ciudadZona} • ` : ''}
              Emprendedor: <strong className="text-slate-200">{prospecto.propietario || 'N/A'}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full bg-white/10 text-slate-300 text-[11px]">
              Intentos: <strong className="text-white">{prospecto.intentos || 0}</strong>
            </span>
            <span className="px-2 py-0.5 rounded-full bg-white/10 text-slate-300 text-[11px]">
              Efectivos: <strong className="text-emerald-400">{prospecto.contactosEfectivos || 0}</strong>
            </span>
          </div>
        </div>

        {/* Context callout if available */}
        {prospecto.contexto && (
          <div className="bg-amber-50/80 px-6 py-2.5 border-b border-amber-200/60 text-xs text-amber-950 flex items-center gap-2">
            <strong className="shrink-0 text-[#B8922A] uppercase tracking-wider font-bold">Contexto:</strong>
            <span className="truncate">{prospecto.contexto}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-rose-800 text-xs animate-in fade-in">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Meta Information: Telemarketing & Date/Time */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Telemarketing *
              </label>
              <select
                value={telemarketing}
                onChange={(e) => setTelemarketing(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-semibold text-xs text-slate-800 outline-none focus:border-[#0D2240]"
                required
              >
                <option value="">Seleccionar telemarketing</option>
                {settings.telemarketingAgents
                  .filter((a) => a.active)
                  .map((ag) => (
                    <option key={ag.id} value={ag.name}>
                      {ag.name}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Fecha de Gestión (LA)
              </label>
              <input
                type="date"
                value={fechaGestion}
                onChange={(e) => setFechaGestion(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-medium text-xs text-slate-800 outline-none focus:border-[#0D2240]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Hora de Gestión
              </label>
              <input
                type="text"
                value={horaGestion}
                onChange={(e) => setHoraGestion(e.target.value)}
                placeholder="Ej. 10:30 AM"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-medium text-xs text-slate-800 outline-none focus:border-[#0D2240]"
              />
            </div>
          </div>

          {/* 6 Fixed Call Results */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#0D2240]">
                Resultado de la llamada *
              </label>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold transition-colors ${
                    esEfectivo
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-slate-100 text-slate-600 border border-slate-200'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Contacto Efectivo: {esEfectivo ? 'SÍ' : 'NO'}</span>
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {/* 1. No contesta */}
              <button
                type="button"
                onClick={() => setResultado('No contesta')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  resultado === 'No contesta'
                    ? 'border-orange-500 bg-orange-50/70 shadow-sm ring-2 ring-orange-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                      resultado === 'No contesta' ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <PhoneMissed className="w-4 h-4" />
                  </div>
                  <span className="font-bold text-xs text-slate-800">No contesta</span>
                </div>
                <p className="text-[10px] text-slate-500 leading-tight">
                  No efectivo • En gestión
                </p>
              </button>

              {/* 2. Buzón */}
              <button
                type="button"
                onClick={() => setResultado('Buzón')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  resultado === 'Buzón'
                    ? 'border-sky-500 bg-sky-50/70 shadow-sm ring-2 ring-sky-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                      resultado === 'Buzón' ? 'bg-sky-500 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <Voicemail className="w-4 h-4" />
                  </div>
                  <span className="font-bold text-xs text-slate-800">Buzón</span>
                </div>
                <p className="text-[10px] text-slate-500 leading-tight">
                  No efectivo • En gestión
                </p>
              </button>

              {/* 3. No interesado */}
              <button
                type="button"
                onClick={() => setResultado('No interesado')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  resultado === 'No interesado'
                    ? 'border-zinc-600 bg-zinc-100 shadow-sm ring-2 ring-zinc-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                      resultado === 'No interesado' ? 'bg-zinc-700 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <Ban className="w-4 h-4" />
                  </div>
                  <span className="font-bold text-xs text-slate-800">No interesado</span>
                </div>
                <p className="text-[10px] text-slate-500 leading-tight">
                  Efectivo • No interesado
                </p>
              </button>

              {/* 4. Llamar luego */}
              <button
                type="button"
                onClick={() => setResultado('Llamar luego')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  resultado === 'Llamar luego'
                    ? 'border-purple-600 bg-purple-50 shadow-sm ring-2 ring-purple-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                      resultado === 'Llamar luego' ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <Clock className="w-4 h-4" />
                  </div>
                  <span className="font-bold text-xs text-slate-800">Llamar luego</span>
                </div>
                <p className="text-[10px] text-purple-700 font-medium leading-tight">
                  Efectivo • Seguimiento
                </p>
              </button>

              {/* 5. Cita */}
              <button
                type="button"
                onClick={() => setResultado('Cita')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  resultado === 'Cita'
                    ? 'border-[#B8922A] bg-amber-50/80 shadow-sm ring-2 ring-[#B8922A]/30'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                      resultado === 'Cita' ? 'bg-[#B8922A] text-[#0D2240]' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <CalendarCheck className="w-4 h-4 font-bold" />
                  </div>
                  <span className="font-bold text-xs text-[#0D2240]">Cita agendada</span>
                </div>
                <p className="text-[10px] text-amber-800 font-bold leading-tight">
                  Efectivo • Crear cita
                </p>
              </button>

              {/* 6. Número desconectado/incorrecto */}
              <button
                type="button"
                onClick={() => setResultado('Número desconectado/incorrecto')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  resultado === 'Número desconectado/incorrecto'
                    ? 'border-rose-500 bg-rose-50 shadow-sm ring-2 ring-rose-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                      resultado === 'Número desconectado/incorrecto'
                        ? 'bg-rose-600 text-white'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <span className="font-bold text-xs text-slate-800 truncate">Núm. incorrecto</span>
                </div>
                <p className="text-[10px] text-slate-500 leading-tight">
                  No efectivo • Dato inválido
                </p>
              </button>
            </div>
          </div>

          {/* Conditional sub-form: Llamar luego */}
          {resultado === 'Llamar luego' && (
            <div className="bg-purple-50/70 border border-purple-200 rounded-2xl p-4 space-y-3 animate-in fade-in duration-200">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-700" />
                <h4 className="font-bold text-xs uppercase tracking-wider text-purple-900">
                  Programar Llamada de Seguimiento
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Fecha de seguimiento *
                  </label>
                  <input
                    type="date"
                    value={fechaSeguimiento}
                    min={todayLA}
                    onChange={(e) => setFechaSeguimiento(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-purple-200 bg-white text-xs font-semibold text-slate-800 outline-none focus:border-purple-600"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Hora de seguimiento (AM/PM) *
                  </label>
                  <input
                    type="text"
                    value={horaSeguimiento}
                    onChange={(e) => setHoraSeguimiento(e.target.value)}
                    placeholder="Ej. 10:30 AM"
                    className="w-full px-3 py-2 rounded-xl border border-purple-200 bg-white text-xs font-semibold text-slate-800 outline-none focus:border-purple-600"
                    required
                  />
                </div>
              </div>

              {/* Quick Hours pills */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                <span className="text-[10px] text-slate-500 font-bold uppercase mr-1">
                  Atajos de hora:
                </span>
                {['9:30 AM', '11:00 AM', '2:00 PM', '4:30 PM', '6:00 PM'].map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => handleQuickHoraSeguimiento(h)}
                    className={`text-[11px] px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                      horaSeguimiento === h
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'bg-white border border-purple-200 text-purple-800 hover:bg-purple-100/60'
                    }`}
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Conditional sub-form: Cita */}
          {resultado === 'Cita' && (
            <div className="bg-amber-50/70 border border-amber-300 rounded-2xl p-4 sm:p-5 space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between pb-2 border-b border-amber-200/80">
                <div className="flex items-center gap-2">
                  <CalendarCheck className="w-5 h-5 text-[#B8922A]" />
                  <h4 className="font-extrabold text-sm uppercase tracking-wide text-[#0D2240]">
                    Datos de la Cita Agendada
                  </h4>
                </div>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-amber-200/80 font-bold text-amber-900">
                  Estado: Agendada
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Fecha de la cita *
                  </label>
                  <input
                    type="date"
                    value={fechaCita}
                    min={todayLA}
                    onChange={(e) => setFechaCita(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-amber-300 bg-white text-xs font-bold text-slate-800 outline-none focus:border-[#0D2240]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Hora de la cita (AM/PM) *
                  </label>
                  <input
                    type="text"
                    value={horaCita}
                    onChange={(e) => setHoraCita(e.target.value)}
                    placeholder="Ej. 3:30 PM"
                    className="w-full px-3 py-2 rounded-xl border border-amber-300 bg-white text-xs font-bold text-slate-800 outline-none focus:border-[#0D2240]"
                    required
                  />
                </div>
              </div>

              {/* Quick Hours pills for appointment */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] text-slate-500 font-bold uppercase mr-1">
                  Atajos de hora:
                </span>
                {['10:00 AM', '11:30 AM', '1:00 PM', '3:30 PM', '5:00 PM', '6:30 PM'].map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => handleQuickHoraCita(h)}
                    className={`text-[11px] px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                      horaCita === h
                        ? 'bg-[#0D2240] text-white shadow-xs'
                        : 'bg-white border border-amber-300 text-amber-900 hover:bg-amber-100'
                    }`}
                  >
                    {h}
                  </button>
                ))}
              </div>

              {/* Asunto */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Asunto de la cita
                </label>
                <input
                  type="text"
                  value={asuntoCita}
                  onChange={(e) => setAsuntoCita(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-amber-300 bg-white text-xs font-semibold text-slate-800 outline-none focus:border-[#0D2240]"
                />
              </div>

              {/* Dirección & Google Maps */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-slate-700">
                    Dirección del lugar / cliente *
                  </label>
                  {googleMapsUrl && (
                    <a
                      href={googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-700 hover:text-sky-900 hover:underline"
                    >
                      <MapPin className="w-3 h-3 text-red-500" />
                      <span>Ver enlace de Maps</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                </div>
                <input
                  type="text"
                  value={direccionCita}
                  onChange={(e) => setDireccionCita(e.target.value)}
                  placeholder="Ej. 1234 Main St, Los Angeles, CA 90001"
                  className="w-full px-3 py-2 rounded-xl border border-amber-300 bg-white text-xs font-semibold text-slate-800 outline-none focus:border-[#0D2240]"
                  required
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Se generará automáticamente el enlace directo de Google Maps codificado.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Quién atiende */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    ¿Quién atiende? (Vendedor / Emprendedor)
                  </label>
                  <input
                    type="text"
                    value={quienAtiendeCita}
                    onChange={(e) => setQuienAtiendeCita(e.target.value)}
                    placeholder="Nombre del vendedor"
                    className="w-full px-3 py-2 rounded-xl border border-amber-300 bg-white text-xs font-semibold text-slate-800 outline-none focus:border-[#0D2240]"
                  />
                </div>

                {/* Invitado / Cónyuge */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Invitado / Cónyuge que asistirá
                  </label>
                  <input
                    type="text"
                    value={invitadoCita}
                    onChange={(e) => setInvitadoCita(e.target.value)}
                    placeholder="Ej. Esposa María"
                    className="w-full px-3 py-2 rounded-xl border border-amber-300 bg-white text-xs font-semibold text-slate-800 outline-none focus:border-[#0D2240]"
                  />
                </div>
              </div>

              {/* Descripción de la cita */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Instrucciones o notas para el vendedor
                </label>
                <textarea
                  rows={2}
                  value={descripcionCita}
                  onChange={(e) => setDescripcionCita(e.target.value)}
                  placeholder="Detalles sobre cómo llegar, timbre, interés específico del cliente..."
                  className="w-full px-3 py-2 rounded-xl border border-amber-300 bg-white text-xs text-slate-800 outline-none focus:border-[#0D2240]"
                />
              </div>
            </div>
          )}

          {/* Observaciones de la gestión */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Observaciones de la llamada
            </label>
            <textarea
              rows={3}
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
              placeholder="Detalla qué conversaron, objeciones, nivel de interés, motivo de reagendamiento..."
              className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-300 text-xs sm:text-sm text-slate-800 focus:border-[#0D2240] outline-none"
            />
          </div>

          {/* Impact preview */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1">
            <span className="font-bold text-[11px] text-slate-600 uppercase tracking-wider block">
              Actualización prevista del prospecto:
            </span>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-slate-600">
                Nuevo estado:{' '}
                <strong className="text-slate-900 px-2 py-0.5 rounded-md bg-white border border-slate-200">
                  {projectedEstado}
                </strong>
              </span>
              <span className="text-slate-600">
                Temperatura:{' '}
                {projectedTemp ? (
                  <strong className="text-slate-900 px-2 py-0.5 rounded-md bg-white border border-slate-200">
                    {projectedTemp}
                  </strong>
                ) : (
                  <span className="text-slate-400 italic">Sin temperatura</span>
                )}
              </span>
              <span className="text-slate-600">
                Total intentos:{' '}
                <strong className="text-slate-900">{(prospecto.intentos || 0) + 1}</strong>
              </span>
            </div>
          </div>
        </form>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 shrink-0 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={handleSubmit}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0D2240] hover:bg-[#153460] text-white font-extrabold text-xs sm:text-sm shadow-md transition-all cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Guardando gestión...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4 text-[#B8922A]" />
                <span>Registrar Gestión</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
