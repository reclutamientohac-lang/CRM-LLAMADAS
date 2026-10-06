import React, { useState } from 'react';
import {
  X,
  Save,
  AlertCircle,
  Phone,
  User,
  MapPin,
  Calendar,
} from 'lucide-react';
import { Prospecto } from '../types';
import { useCRM } from '../context/CRMContext';
import { useAuth } from '../context/AuthContext';
import {
  normalizePhone,
  validateAndNormalizePhone,
  SIN_ASIGNAR,
} from '../businessRules';

interface EditProspectoModalProps {
  prospecto: Prospecto;
  onClose: () => void;
  onSaved: () => void;
}

export const EditProspectoModal: React.FC<EditProspectoModalProps> = ({
  prospecto,
  onClose,
  onSaved,
}) => {
  const { updateProspecto, settings, prospectos } = useCRM();
  const { isSupervisor } = useAuth();

  const [formData, setFormData] = useState({
    nombre: prospecto.nombre,
    telefono: prospecto.telefono,
    ciudadZona: prospecto.ciudadZona || '',
    propietario: prospecto.propietario || '',
    tipoProspecto: prospecto.tipoProspecto || settings.tiposProspecto[0] || 'Personal',
    origen: prospecto.origen || settings.origenes[0] || 'Recomendación',
    telemarketing: prospecto.telemarketing || SIN_ASIGNAR,
    estado: prospecto.estado || 'Nuevo',
    contexto: prospecto.contexto || '',
    llamadoPorEmprendedor: prospecto.llamadoPorEmprendedor || 'No',
    observacion: prospecto.observacion || '',
    fechaRecepcion: prospecto.fechaRecepcion,
    fechaProspeccion: prospecto.fechaProspeccion || '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errorMsg) setErrorMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!formData.nombre.trim()) {
      setErrorMsg('El nombre es requerido.');
      return;
    }

    const phoneRes = validateAndNormalizePhone(formData.telefono, prospectos, prospecto.id);
    if (!phoneRes.isValid) {
      setErrorMsg(phoneRes.error || 'Número de teléfono inválido.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await updateProspecto(prospecto.id, {
        nombre: formData.nombre.trim(),
        telefono: phoneRes.normalizedPhone,
        ciudadZona: formData.ciudadZona.trim(),
        propietario: formData.propietario.trim(),
        tipoProspecto: formData.tipoProspecto,
        origen: formData.origen,
        telemarketing: isSupervisor ? formData.telemarketing : prospecto.telemarketing,
        estado: formData.estado,
        contexto: formData.contexto.trim(),
        llamadoPorEmprendedor: formData.llamadoPorEmprendedor as 'Sí' | 'No',
        observacion: formData.observacion.trim(),
        fechaRecepcion: formData.fechaRecepcion,
        fechaProspeccion: formData.fechaProspeccion,
      });

      if (res.success) {
        onSaved();
        onClose();
      } else {
        setErrorMsg(res.error || 'Error al actualizar el prospecto.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error inesperado.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeAgents = settings.telemarketingAgents.filter((a) => a.active);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col z-10 overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-[#0D2240] text-white flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-lg text-white">Editar Prospecto</h3>
            <p className="text-xs text-slate-300 font-mono">{prospecto.id}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error message */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 text-xs font-semibold">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nombre del Prospecto *
              </label>
              <input
                type="text"
                name="nombre"
                required
                value={formData.nombre}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:border-[#0D2240] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Teléfono *
              </label>
              <input
                type="text"
                name="telefono"
                required
                value={formData.telefono}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:border-[#0D2240] outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Ciudad / Zona
              </label>
              <input
                type="text"
                name="ciudadZona"
                value={formData.ciudadZona}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:border-[#0D2240] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Propietario / Emprendedor
              </label>
              <input
                type="text"
                name="propietario"
                value={formData.propietario}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:border-[#0D2240] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Estado del Prospecto
              </label>
              <select
                name="estado"
                value={formData.estado}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:border-[#0D2240] outline-none bg-white font-medium"
              >
                {settings.estadosDisponibles.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            {isSupervisor && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Telemarketing Asignada
                </label>
                <select
                  name="telemarketing"
                  value={formData.telemarketing}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:border-[#0D2240] outline-none bg-white font-medium"
                >
                  <option value={SIN_ASIGNAR}>SIN ASIGNAR</option>
                  {activeAgents.map((ag) => (
                    <option key={ag.id} value={ag.name}>
                      {ag.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tipo de Prospecto
              </label>
              <select
                name="tipoProspecto"
                value={formData.tipoProspecto}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:border-[#0D2240] outline-none bg-white"
              >
                {settings.tiposProspecto.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {tipo}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Origen del Lead
              </label>
              <select
                name="origen"
                value={formData.origen}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:border-[#0D2240] outline-none bg-white"
              >
                {settings.origenes.map((orig) => (
                  <option key={orig} value={orig}>
                    {orig}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Fecha de Recepción
              </label>
              <input
                type="date"
                name="fechaRecepcion"
                value={formData.fechaRecepcion}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:border-[#0D2240] outline-none bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Fecha de Prospección
              </label>
              <input
                type="date"
                name="fechaProspeccion"
                value={formData.fechaProspeccion}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:border-[#0D2240] outline-none bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Contexto para Abordar
            </label>
            <textarea
              name="contexto"
              rows={2}
              value={formData.contexto}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:border-[#0D2240] outline-none resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Observaciones
            </label>
            <textarea
              name="observacion"
              rows={2}
              value={formData.observacion}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:border-[#0D2240] outline-none resize-none"
            />
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 border border-slate-300 rounded-xl hover:bg-slate-50 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-[#0D2240] hover:bg-[#163665] rounded-xl shadow-sm cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5 text-[#B8922A]" />
              <span>{isSubmitting ? 'Guardando...' : 'Guardar Cambios'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
