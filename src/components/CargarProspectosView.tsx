import React, { useState } from 'react';
import {
  UserPlus,
  Phone,
  User,
  MapPin,
  Calendar,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  HelpCircle,
  Clock,
  FileText,
} from 'lucide-react';
import { useCRM } from '../context/CRMContext';
import { useAuth } from '../context/AuthContext';
import {
  normalizePhone,
  validateAndNormalizePhone,
  SIN_ASIGNAR,
  getTodayInLA,
} from '../businessRules';
import { Prospecto } from '../types';
import { CargaMasivaExcelView } from './CargaMasivaExcelView';

export const CargarProspectosView: React.FC = () => {
  const { addProspecto, settings, prospectos } = useCRM();
  const { userProfile, isSupervisor } = useAuth();

  // Internal tab state: "Carga individual" o "Carga masiva por Excel"
  const [activeSubTab, setActiveSubTab] = useState<'individual' | 'masiva'>('individual');

  const todayStr = getTodayInLA();

  // Form state
  const [formData, setFormData] = useState({
    propietario: '',
    fechaRecepcion: todayStr,
    fechaProspeccion: '',
    tipoProspecto: settings.tiposProspecto[0] || 'Personal',
    origen: settings.origenes[0] || 'Recomendación',
    nombre: '',
    telefono: '',
    ciudadZona: '',
    contexto: '',
    llamadoPorEmprendedor: 'No' as 'Sí' | 'No',
    telemarketing: isSupervisor ? SIN_ASIGNAR : userProfile?.telemarketingAgent || SIN_ASIGNAR,
    observacion: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdProspecto, setCreatedProspecto] = useState<Prospecto | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  // Live phone validation preview using the 4 official rules
  const phoneValidation = formData.telefono
    ? validateAndNormalizePhone(formData.telefono, prospectos)
    : { isValid: true, normalizedPhone: '' };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errorMessage) setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setCreatedProspecto(null);

    // Validaciones inmediatas
    if (!formData.nombre.trim()) {
      setErrorMessage('Por favor ingrese el nombre completo del prospecto.');
      return;
    }

    const checkPhone = validateAndNormalizePhone(formData.telefono, prospectos);
    if (!checkPhone.isValid) {
      setErrorMessage(checkPhone.error || 'Número de teléfono inválido.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await addProspecto({
        nombre: formData.nombre,
        telefono: formData.telefono,
        propietario: formData.propietario,
        fechaRecepcion: formData.fechaRecepcion || todayStr,
        fechaProspeccion: formData.fechaProspeccion || '',
        tipoCarga: 'Formulario',
        tipoProspecto: formData.tipoProspecto,
        origen: formData.origen,
        ciudadZona: formData.ciudadZona,
        telemarketing: formData.telemarketing || SIN_ASIGNAR,
        contexto: formData.contexto,
        llamadoPorEmprendedor: formData.llamadoPorEmprendedor,
        observacion: formData.observacion,
      });

      if (res.success && res.prospecto) {
        setCreatedProspecto(res.prospecto);
        // Reset fields preserving owner/propietario for convenience
        setFormData((prev) => ({
          ...prev,
          nombre: '',
          telefono: '',
          ciudadZona: '',
          contexto: '',
          llamadoPorEmprendedor: 'No',
          observacion: '',
        }));
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setErrorMessage(res.error || 'No se pudo guardar el prospecto.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error inesperado al registrar el prospecto.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyId = () => {
    if (!createdProspecto) return;
    navigator.clipboard.writeText(createdProspecto.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleResetForm = () => {
    setFormData({
      propietario: '',
      fechaRecepcion: todayStr,
      fechaProspeccion: '',
      tipoProspecto: settings.tiposProspecto[0] || 'Personal',
      origen: settings.origenes[0] || 'Recomendación',
      nombre: '',
      telefono: '',
      ciudadZona: '',
      contexto: '',
      llamadoPorEmprendedor: 'No',
      telemarketing: isSupervisor ? SIN_ASIGNAR : userProfile?.telemarketingAgent || SIN_ASIGNAR,
      observacion: '',
    });
    setErrorMessage(null);
    setCreatedProspecto(null);
  };

  // Telemarketing active options
  const activeTelemarketers = settings.telemarketingAgents.filter((a) => a.active);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Subtabs Navigation (Supervisor sees both, Telemarketing only sees individual) */}
      {isSupervisor && (
        <div className="flex items-center gap-2 border-b border-slate-200">
          <button
            type="button"
            onClick={() => setActiveSubTab('individual')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-bold transition-all border-b-2 cursor-pointer ${
              activeSubTab === 'individual'
                ? 'border-[#0D2240] text-[#0D2240] bg-white shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <UserPlus className="w-4 h-4 text-[#B8922A]" />
            <span>Carga Individual</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('masiva')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-bold transition-all border-b-2 cursor-pointer ${
              activeSubTab === 'masiva'
                ? 'border-[#0D2240] text-[#0D2240] bg-white shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-[#B8922A]" />
            <span>Carga Masiva por Excel</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#B8922A]/15 text-[#9a781f] font-bold">
              Etapa 2
            </span>
          </button>
        </div>
      )}

      {/* Render Active Subtab */}
      {activeSubTab === 'masiva' && isSupervisor ? (
        <CargaMasivaExcelView />
      ) : (
        <div className="space-y-8">
          {/* Header */}
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-[#B8922A] uppercase tracking-wider mb-1">
              <UserPlus className="w-4 h-4" />
              <span>Ingreso de Leads</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0D2240] tracking-tight">
              Cargar Nuevo Prospecto
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Formulario individual de captura con validación de teléfono único, temperatura automática y asignación de telemarketing.
            </p>
          </div>

          {/* Confirmation Banner in Green */}
          {createdProspecto && (
            <div className="bg-emerald-50 border-2 border-emerald-500/40 rounded-2xl p-6 shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/20">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-emerald-950">
                      ¡Prospecto registrado exitosamente!
                    </h3>
                    <p className="text-sm text-emerald-800 mt-0.5">
                      Nombre:{' '}
                      <span className="font-semibold text-emerald-950">{createdProspecto.nombre}</span>{' '}
                      • Teléfono:{' '}
                      <span className="font-mono font-medium">{createdProspecto.telefono}</span>
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-100/80 border border-emerald-300 text-emerald-900 font-mono text-xs font-semibold">
                        <span>ID: {createdProspecto.id}</span>
                        <button
                          onClick={handleCopyId}
                          className="ml-1 p-0.5 hover:text-emerald-700 transition-colors"
                          title="Copiar ID"
                        >
                          {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
                        🔥 Temperatura: {createdProspecto.temperatura}
                      </span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white text-slate-700 border border-emerald-200">
                        Asignado: {createdProspecto.telemarketing}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex sm:flex-col items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setCreatedProspecto(null)}
                    className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors cursor-pointer"
                  >
                    Ingresar otro prospecto
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Validation Error Banner in Red */}
          {errorMessage && (
            <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-5 shadow-sm animate-in fade-in duration-200">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-rose-900">No se pudo guardar el prospecto</h4>
                  <p className="text-sm text-rose-700 mt-1 font-medium">{errorMessage}</p>
                </div>
              </div>
            </div>
          )}

          {/* Main Form Card */}
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-2xl shadow-sm border border-slate-200/90 overflow-hidden"
          >
            <div className="px-6 py-5 bg-[#0D2240] text-white flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">Datos del Prospecto y Prospección</h2>
                <p className="text-xs text-slate-300">
                  Los campos marcados con asterisco (<span className="text-amber-400 font-bold">*</span>) son obligatorios
                </p>
              </div>
              <button
                type="button"
                onClick={handleResetForm}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Limpiar campos</span>
              </button>
            </div>

            <div className="p-6 sm:p-8 space-y-6">
              {/* Section 1: Contacto Principal */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
                  <User className="w-4 h-4 text-[#B8922A]" />
                  <span>Información Principal de Contacto</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Nombre * */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Nombre completo del Prospecto <span className="text-rose-600 font-bold">*</span>
                    </label>
                    <input
                      type="text"
                      name="nombre"
                      required
                      value={formData.nombre}
                      onChange={handleInputChange}
                      placeholder="Ej: Carmen Gómez de la Riva"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-[#0D2240] focus:ring-2 focus:ring-[#0D2240]/10 outline-none text-sm transition-all bg-white"
                    />
                  </div>

                  {/* Teléfono * */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-slate-700">
                        Teléfono <span className="text-rose-600 font-bold">*</span>
                      </label>
                      <span className="text-[11px] text-slate-500 font-medium">
                        Identificador único normalizado
                      </span>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Phone className="w-4 h-4" />
                      </div>
                      <input
                        type="tel"
                        name="telefono"
                        required
                        value={formData.telefono}
                        onChange={handleInputChange}
                        placeholder="Ej: (213) 555-0199 o 12135550199"
                        className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl border ${
                          formData.telefono && !phoneValidation.isValid
                            ? 'border-rose-400 bg-rose-50/40 text-rose-950 focus:border-rose-500'
                            : 'border-slate-300 focus:border-[#0D2240]'
                        } focus:ring-2 focus:ring-[#0D2240]/10 outline-none text-sm transition-all font-mono`}
                      />
                    </div>

                    {/* Live Normalization & 4 Rules Helper */}
                    {formData.telefono ? (
                      <div className="mt-2 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-600">
                            Normalizado:{' '}
                            <span className="font-mono font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded">
                              {phoneValidation.normalizedPhone || '(sin dígitos)'}
                            </span>{' '}
                            ({phoneValidation.normalizedPhone.length} dígitos)
                          </span>
                          {phoneValidation.isValid && (
                            <span className="text-emerald-700 font-bold inline-flex items-center gap-1">
                              <Check className="w-3.5 h-3.5" />
                              <span>Válido y disponible</span>
                            </span>
                          )}
                        </div>

                        {!phoneValidation.isValid && (
                          <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-300 text-xs text-rose-800 space-y-1">
                            <div className="font-bold flex items-center gap-1.5 text-rose-900">
                              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                              <span>{phoneValidation.error}</span>
                            </div>
                            {phoneValidation.duplicate && (
                              <div className="text-[11px] text-rose-700 pl-5">
                                Prospecto existente: <strong>{phoneValidation.duplicate.nombre}</strong> (ID: {phoneValidation.duplicate.id}, Estado: {phoneValidation.duplicate.estado})
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="mt-1.5 text-[11px] text-slate-400">
                        Reglas: 1. Solo dígitos • 2. Si tiene 11 dígitos y empieza con 1, se remueve el 1 • 3. Unicidad obligatoria • 4. No puede estar vacío.
                      </p>
                    )}
                  </div>

                  {/* Ciudad / Zona */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Ciudad / Zona de Residencia
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        name="ciudadZona"
                        value={formData.ciudadZona}
                        onChange={handleInputChange}
                        placeholder="Ej: Los Ángeles, East LA, Anaheim, San Diego"
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-[#0D2240] focus:ring-2 focus:ring-[#0D2240]/10 outline-none text-sm transition-all"
                      />
                    </div>
                  </div>

                  {/* Propietario / Emprendedor */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Propietario / Emprendedor (Dueño del lead)
                    </label>
                    <input
                      type="text"
                      name="propietario"
                      value={formData.propietario}
                      onChange={handleInputChange}
                      placeholder="Ej: Roberto Gómez, Carlos Mendoza"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-[#0D2240] focus:ring-2 focus:ring-[#0D2240]/10 outline-none text-sm transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Prospección y Clasificación */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#B8922A]" />
                  <span>Detalles de Prospección y Clasificación</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  {/* Fecha de Recepción */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Fecha de Recepción
                    </label>
                    <input
                      type="date"
                      name="fechaRecepcion"
                      value={formData.fechaRecepcion}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-[#0D2240] outline-none text-sm bg-white"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Determina la temperatura (0-14d Hot)
                    </span>
                  </div>

                  {/* Fecha de Prospección (Opcional) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Fecha de Prospección <span className="text-slate-400 font-normal">(Opcional)</span>
                    </label>
                    <input
                      type="date"
                      name="fechaProspeccion"
                      value={formData.fechaProspeccion}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-[#0D2240] outline-none text-sm bg-white"
                    />
                  </div>

                  {/* Tipo de Prospecto */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Tipo de Prospecto
                    </label>
                    <select
                      name="tipoProspecto"
                      value={formData.tipoProspecto}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-[#0D2240] outline-none text-sm bg-white"
                    >
                      {settings.tiposProspecto.map((tipo) => (
                        <option key={tipo} value={tipo}>
                          {tipo}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Origen */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Origen del Lead
                    </label>
                    <select
                      name="origen"
                      value={formData.origen}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-[#0D2240] outline-none text-sm bg-white"
                    >
                      {settings.origenes.map((origen) => (
                        <option key={origen} value={origen}>
                          {origen}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 3: Contexto para Abordar y Asignación */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Contexto para abordar (Notas del emprendedor)
                  </label>
                  <textarea
                    name="contexto"
                    rows={3}
                    value={formData.contexto}
                    onChange={handleInputChange}
                    placeholder="Ej: Interesada en purificación de agua por sarro en grifería. Llamar en las tardes después de las 4 PM."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-[#0D2240] focus:ring-2 focus:ring-[#0D2240]/10 outline-none text-sm transition-all resize-none"
                  />
                </div>

                <div className="space-y-4">
                  {/* ¿Llamado por el emprendedor? */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      ¿Llamado por el emprendedor previamente?
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <label
                        className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-sm font-semibold cursor-pointer transition-all ${
                          formData.llamadoPorEmprendedor === 'No'
                            ? 'bg-[#0D2240]/5 border-[#0D2240] text-[#0D2240]'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="llamadoPorEmprendedor"
                          value="No"
                          checked={formData.llamadoPorEmprendedor === 'No'}
                          onChange={() =>
                            setFormData((p) => ({ ...p, llamadoPorEmprendedor: 'No' }))
                          }
                          className="sr-only"
                        />
                        <span>No (Lead Virgen)</span>
                      </label>
                      <label
                        className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-sm font-semibold cursor-pointer transition-all ${
                          formData.llamadoPorEmprendedor === 'Sí'
                            ? 'bg-[#B8922A]/10 border-[#B8922A] text-[#9a781f]'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="llamadoPorEmprendedor"
                          value="Sí"
                          checked={formData.llamadoPorEmprendedor === 'Sí'}
                          onChange={() =>
                            setFormData((p) => ({ ...p, llamadoPorEmprendedor: 'Sí' }))
                          }
                          className="sr-only"
                        />
                        <span>Sí (Ya conversaron)</span>
                      </label>
                    </div>
                  </div>

                  {/* Asignación de Telemarketing */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-slate-700">
                        Asignar a Telemarketing
                      </label>
                      <span className="text-[11px] text-slate-500">
                        Opcional (por defecto &quot;SIN ASIGNAR&quot;)
                      </span>
                    </div>
                    <select
                      name="telemarketing"
                      value={formData.telemarketing}
                      onChange={handleInputChange}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-[#0D2240] outline-none text-sm bg-white font-medium"
                    >
                      <option value={SIN_ASIGNAR}>SIN ASIGNAR (Bolsa de prospectos)</option>
                      {activeTelemarketers.map((ag) => (
                        <option key={ag.id} value={ag.name}>
                          {ag.name} (Telemarketing)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-2.5 rounded-xl bg-[#0D2240] hover:bg-[#163665] text-white font-bold text-sm shadow-md shadow-slate-900/10 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span>Guardando...</span>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 text-[#B8922A]" />
                      <span>Guardar Prospecto</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
