import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  UserCheck,
  UserX,
  UserPlus,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  History,
  Trash2,
  Power,
  Edit2,
  Mail,
  User,
  Headset,
  Calendar,
  X,
  Check,
  Ban,
  ArrowRight,
  Shield,
  Filter,
} from 'lucide-react';
import { useCRM } from '../context/CRMContext';
import { useAuth } from '../context/AuthContext';
import { UsuarioAutorizado, SolicitudAcceso, Role } from '../types';
import { ADMIN_EMAIL, normalizeEmail, isAdminEmail, formatDateDisplay } from '../businessRules';

type SubTab = 'usuarios' | 'solicitudes' | 'historial';

export const AccesosView: React.FC = () => {
  const {
    usuariosAutorizados,
    solicitudesAcceso,
    logsAccesos,
    settings,
    agregarUsuarioAutorizado,
    actualizarUsuarioAutorizado,
    toggleActivarUsuario,
    eliminarUsuarioAutorizado,
    aprobarSolicitudAcceso,
    rechazarSolicitudAcceso,
  } = useCRM();

  const { isAdmin } = useAuth();

  const [activeTab, setActiveTab] = useState<SubTab>('usuarios');
  const [searchTerm, setSearchTerm] = useState('');

  // Modales
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UsuarioAutorizado | null>(null);
  const [approvingSolicitud, setApprovingSolicitud] = useState<SolicitudAcceso | null>(null);
  const [confirmToggleUser, setConfirmToggleUser] = useState<UsuarioAutorizado | null>(null);
  const [confirmDeleteUser, setConfirmDeleteUser] = useState<UsuarioAutorizado | null>(null);
  const [deleteConfirmationStep, setDeleteConfirmationStep] = useState<1 | 2>(1);

  // Estados de formularios
  const [formEmail, setFormEmail] = useState('');
  const [formNombre, setFormNombre] = useState('');
  const [formRol, setFormRol] = useState<'Supervisor' | 'Telemarketing'>('Telemarketing');
  const [formTelemarketing, setFormTelemarketing] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Lista de agentes de telemarketing activos
  const activeTelemarketingAgents = useMemo(() => {
    return settings.telemarketingAgents.filter((a) => a.active);
  }, [settings.telemarketingAgents]);

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  // Filtrado de usuarios autorizados
  const filteredUsuarios = useMemo(() => {
    let list = usuariosAutorizados;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      list = list.filter(
        (u) => u.nombre.toLowerCase().includes(term) || u.email.toLowerCase().includes(term)
      );
    }
    return list;
  }, [usuariosAutorizados, searchTerm]);

  // Filtrado de solicitudes pendientes
  const pendingSolicitudes = useMemo(() => {
    return solicitudesAcceso.filter((s) => s.estado === 'Pendiente');
  }, [solicitudesAcceso]);

  // Handle agregar usuario
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    if (!formEmail.trim() || !formEmail.includes('@')) {
      setModalError('Por favor ingresa un correo electrónico válido de Google.');
      return;
    }

    if (formRol === 'Telemarketing' && !formTelemarketing) {
      setModalError('Para rol Telemarketing debes asignar a qué agente de telemarketing está vinculada.');
      return;
    }

    setIsSubmitting(true);
    const res = await agregarUsuarioAutorizado({
      email: formEmail.trim(),
      nombre: formNombre.trim(),
      rol: formRol,
      telemarketingVinculada: formRol === 'Telemarketing' ? formTelemarketing : '',
    });
    setIsSubmitting(false);

    if (res.success) {
      setShowAddModal(false);
      setFormEmail('');
      setFormNombre('');
      setFormTelemarketing('');
      showToast('Usuario autorizado agregado con éxito.');
    } else {
      setModalError(res.error || 'Error al guardar usuario.');
    }
  };

  // Handle editar usuario
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setModalError(null);

    if (formRol === 'Telemarketing' && !formTelemarketing) {
      setModalError('Debes seleccionar una telemarketing vinculada para este rol.');
      return;
    }

    setIsSubmitting(true);
    const res = await actualizarUsuarioAutorizado(editingUser.email, {
      nombre: formNombre.trim() || editingUser.nombre,
      rol: formRol,
      telemarketingVinculada: formRol === 'Telemarketing' ? formTelemarketing : '',
    });
    setIsSubmitting(false);

    if (res.success) {
      setEditingUser(null);
      showToast('Permisos y datos del usuario actualizados.');
    } else {
      setModalError(res.error || 'Error al actualizar usuario.');
    }
  };

  // Handle aprobar solicitud
  const handleApproveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!approvingSolicitud) return;
    setModalError(null);

    if (formRol === 'Telemarketing' && !formTelemarketing) {
      setModalError('Debes seleccionar la telemarketing vinculada para este rol.');
      return;
    }

    setIsSubmitting(true);
    const res = await aprobarSolicitudAcceso(approvingSolicitud, {
      rol: formRol,
      telemarketingVinculada: formRol === 'Telemarketing' ? formTelemarketing : '',
    });
    setIsSubmitting(false);

    if (res.success) {
      setApprovingSolicitud(null);
      showToast(`Solicitud de ${approvingSolicitud.email} aprobada.`);
    } else {
      setModalError(res.error || 'Error al aprobar solicitud.');
    }
  };

  // Handle rechazar solicitud
  const handleRejectSolicitud = async (solicitud: SolicitudAcceso) => {
    if (!confirm(`¿Estás seguro de rechazar la solicitud de ${solicitud.email}?`)) {
      return;
    }
    const res = await rechazarSolicitudAcceso(solicitud);
    if (res.success) {
      showToast('Solicitud rechazada.');
    } else {
      alert(res.error || 'Error al rechazar solicitud.');
    }
  };

  // Handle activar/desactivar
  const handleToggleActive = async () => {
    if (!confirmToggleUser) return;
    setIsSubmitting(true);
    const res = await toggleActivarUsuario(confirmToggleUser.email, !confirmToggleUser.activo);
    setIsSubmitting(false);
    if (res.success) {
      const msg = confirmToggleUser.activo
        ? `Acceso de ${confirmToggleUser.email} desactivado inmediatamente.`
        : `Acceso de ${confirmToggleUser.email} reactivado con éxito.`;
      setConfirmToggleUser(null);
      showToast(msg);
    } else {
      alert(res.error || 'Error al cambiar estado.');
    }
  };

  // Handle eliminar usuario con doble confirmación
  const handleDeleteUser = async () => {
    if (!confirmDeleteUser) return;
    setIsSubmitting(true);
    const res = await eliminarUsuarioAutorizado(confirmDeleteUser.email);
    setIsSubmitting(false);
    if (res.success) {
      setConfirmDeleteUser(null);
      setDeleteConfirmationStep(1);
      showToast(`Usuario ${confirmDeleteUser.email} eliminado del sistema.`);
    } else {
      alert(res.error || 'Error al eliminar usuario.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-xs font-bold animate-in fade-in slide-in-from-bottom duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Header Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2.5 rounded-2xl bg-[#0D2240] text-white">
                <ShieldCheck className="w-6 h-6 text-[#B8922A]" />
              </span>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Control de Accesos y Permisos
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Módulo exclusivo del Administrador General (<span className="font-bold text-[#0D2240]">{ADMIN_EMAIL}</span>)
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setFormEmail('');
              setFormNombre('');
              setFormRol('Telemarketing');
              setFormTelemarketing(activeTelemarketingAgents[0]?.name || '');
              setModalError(null);
              setShowAddModal(true);
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0D2240] hover:bg-[#14325a] text-white text-xs font-extrabold rounded-2xl shadow-md transition-all cursor-pointer shrink-0"
          >
            <UserPlus className="w-4 h-4 text-[#B8922A]" />
            <span>Agregar Correo Autorizado</span>
          </button>
        </div>

        {/* Mini Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6">
          <div
            onClick={() => setActiveTab('solicitudes')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              pendingSolicitudes.length > 0
                ? 'bg-amber-50/80 border-amber-300 ring-2 ring-amber-500/20'
                : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">Solicitudes Pendientes</span>
              <Clock
                className={`w-4 h-4 ${
                  pendingSolicitudes.length > 0 ? 'text-amber-600 animate-pulse' : 'text-slate-400'
                }`}
              />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900">
                {pendingSolicitudes.length}
              </span>
              <span className="text-[11px] text-slate-500">por revisar</span>
            </div>
          </div>

          <div
            onClick={() => setActiveTab('usuarios')}
            className="p-4 rounded-2xl bg-slate-50 border border-slate-200 hover:bg-slate-100/70 transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">Usuarios Activos</span>
              <UserCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-emerald-800">
                {usuariosAutorizados.filter((u) => u.activo).length + 1}
              </span>
              <span className="text-[11px] text-slate-500">incluyendo Administrador</span>
            </div>
          </div>

          <div
            onClick={() => setActiveTab('historial')}
            className="p-4 rounded-2xl bg-slate-50 border border-slate-200 hover:bg-slate-100/70 transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">Auditoría de Accesos</span>
              <History className="w-4 h-4 text-slate-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-[#0D2240]">
                {logsAccesos.length}
              </span>
              <span className="text-[11px] text-slate-500">registros guardados</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Bar & Search */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab('usuarios')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'usuarios'
                ? 'bg-white text-[#0D2240] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Usuarios Autorizados ({usuariosAutorizados.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('solicitudes')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'solicitudes'
                ? 'bg-white text-[#0D2240] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Solicitudes</span>
            {pendingSolicitudes.length > 0 && (
              <span className="px-1.5 py-0.2 bg-amber-500 text-white rounded-full text-[10px] font-black animate-pulse">
                {pendingSolicitudes.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('historial')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'historial'
                ? 'bg-white text-[#0D2240] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Historial</span>
          </button>
        </div>

        {/* Search */}
        {activeTab === 'usuarios' && (
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre o correo..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 outline-none focus:bg-white focus:border-[#0D2240] transition-all"
            />
          </div>
        )}
      </div>

      {/* TAB 1: USUARIOS AUTORIZADOS */}
      {activeTab === 'usuarios' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold text-[11px] uppercase tracking-wider">
                  <th className="py-3.5 px-4">Usuario</th>
                  <th className="py-3.5 px-4">Correo Google</th>
                  <th className="py-3.5 px-4">Rol en Sistema</th>
                  <th className="py-3.5 px-4">Telemarketing Vinculada</th>
                  <th className="py-3.5 px-4">Estado</th>
                  <th className="py-3.5 px-4">Fecha Alta</th>
                  <th className="py-3.5 px-4">Último Acceso</th>
                  <th className="py-3.5 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {/* Fila fija inmutable: Administrador General */}
                <tr className="bg-amber-50/20 font-medium">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-[#0D2240] text-[#B8922A] flex items-center justify-center font-bold text-xs">
                        A
                      </div>
                      <div>
                        <span className="font-extrabold text-slate-900 block">
                          Administrador General
                        </span>
                        <span className="text-[10px] text-amber-800 font-bold">
                          Cuenta Principal
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-bold text-slate-900 font-mono">
                    {ADMIN_EMAIL}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-gradient-to-r from-amber-100 to-amber-200 text-amber-900 border border-amber-300">
                      Administrador
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-400 italic">
                    Acceso Total
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                      <Check className="w-3 h-3 text-emerald-600" />
                      Activo Permanente
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-500 font-mono">
                    Sistema
                  </td>
                  <td className="py-3.5 px-4 text-slate-700 font-medium">
                    En uso
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <span className="text-[10px] text-slate-400 font-bold bg-slate-100 px-2 py-1 rounded-lg">
                      Inmutable
                    </span>
                  </td>
                </tr>

                {/* Lista de usuarios autorizados normales */}
                {filteredUsuarios.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      No hay usuarios autorizados registrados aún. Puedes agregar uno arriba con el botón &quot;Agregar Correo Autorizado&quot;.
                    </td>
                  </tr>
                ) : (
                  filteredUsuarios.map((u) => {
                    const isAdminRow = isAdminEmail(u.email);
                    return (
                      <tr key={u.email} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">{u.nombre}</div>
                          <span className="text-[10px] text-slate-400">Por: {u.agregadoPor}</span>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-medium text-slate-800">
                          {u.email}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                              u.rol === 'Supervisor'
                                ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                : 'bg-blue-50 text-blue-700 border-blue-200'
                            }`}
                          >
                            {u.rol}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-700">
                          {u.rol === 'Telemarketing' ? (
                            <span className="px-2 py-0.5 bg-slate-100 rounded-lg text-slate-800 font-mono text-[11px]">
                              {u.telemarketingVinculada || 'Sin vincular'}
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                              u.activo
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-rose-50 text-rose-800 border-rose-200'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                u.activo ? 'bg-emerald-500' : 'bg-rose-500'
                              }`}
                            />
                            {u.activo ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                          {u.fechaAlta || '-'}
                        </td>
                        <td className="py-3.5 px-4 text-slate-700 whitespace-nowrap">
                          {u.ultimoAcceso ? (
                            <span className="font-medium text-slate-800">{u.ultimoAcceso}</span>
                          ) : (
                            <span className="text-slate-400 italic">Sin acceso aún</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          {!isAdminRow ? (
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Editar Rol */}
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingUser(u);
                                  setFormNombre(u.nombre);
                                  setFormRol('Telemarketing');
                                  setFormTelemarketing(u.telemarketingVinculada || '');
                                  setModalError(null);
                                }}
                                className="p-1.5 text-slate-600 hover:text-[#0D2240] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                title="Cambiar rol o telemarketing"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              {/* Activar / Desactivar */}
                              <button
                                type="button"
                                onClick={() => setConfirmToggleUser(u)}
                                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                  u.activo
                                    ? 'text-amber-600 hover:text-amber-800 hover:bg-amber-50'
                                    : 'text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50'
                                }`}
                                title={u.activo ? 'Desactivar acceso' : 'Reactivar acceso'}
                              >
                                <Power className="w-3.5 h-3.5" />
                              </button>

                              {/* Eliminar con confirmación */}
                              <button
                                type="button"
                                onClick={() => {
                                  setConfirmDeleteUser(u);
                                  setDeleteConfirmationStep(1);
                                }}
                                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Eliminar usuario"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: SOLICITUDES PENDIENTES */}
      {activeTab === 'solicitudes' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                Solicitudes de Acceso Pendientes
              </h2>
              <p className="text-xs text-slate-500">
                Personas que intentaron iniciar sesión y solicitaron autorización
              </p>
            </div>
          </div>

          {pendingSolicitudes.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
              <p className="text-xs font-bold text-slate-700">No hay solicitudes pendientes</p>
              <p className="text-[11px]">Todas las solicitudes han sido aprobadas o atendidas.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingSolicitudes.map((sol) => (
                <div
                  key={sol.id}
                  className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="font-extrabold text-slate-900 truncate">{sol.nombre}</div>
                      <div className="text-xs text-slate-600 font-mono truncate">{sol.email}</div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1 pt-1">
                        <Clock className="w-3 h-3 text-amber-500" />
                        <span>Solicitado: {sol.fecha}</span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-full border border-amber-200 shrink-0">
                      Pendiente
                    </span>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => handleRejectSolicitud(sol)}
                      className="px-3 py-1.5 border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                    >
                      Rechazar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setApprovingSolicitud(sol);
                        setFormRol('Telemarketing');
                        setFormTelemarketing(activeTelemarketingAgents[0]?.name || '');
                        setModalError(null);
                      }}
                      className="px-4 py-1.5 bg-[#0D2240] hover:bg-[#14325a] text-white text-xs font-extrabold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <UserCheck className="w-3.5 h-3.5 text-[#B8922A]" />
                      <span>Aprobar Acceso</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: HISTORIAL DE AUDITORÍA */}
      {activeTab === 'historial' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4">
          <div className="pb-3 border-b border-slate-100">
            <h2 className="text-base font-extrabold text-slate-900">
              Historial de Auditoría de Accesos
            </h2>
            <p className="text-xs text-slate-500">
              Registro inmutable de quién autorizó, activó, modificó o eliminó permisos
            </p>
          </div>

          {logsAccesos.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No hay registros de auditoría aún.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold text-[11px] uppercase tracking-wider">
                    <th className="py-3 px-4">Fecha y Hora</th>
                    <th className="py-3 px-4">Acción</th>
                    <th className="py-3 px-4">Usuario Afectado</th>
                    <th className="py-3 px-4">Realizado Por</th>
                    <th className="py-3 px-4">Detalles</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logsAccesos.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">
                        {log.fechaHora}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                            log.accion === 'ALTA' || log.accion === 'ACTIVAR' || log.accion === 'APROBAR_SOLICITUD'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : log.accion === 'DESACTIVAR' || log.accion === 'ELIMINAR'
                              ? 'bg-rose-50 text-rose-800 border border-rose-200'
                              : 'bg-blue-50 text-blue-800 border border-blue-200'
                          }`}
                        >
                          {log.accion}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900 font-mono">
                        {log.usuarioAfectado}
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-medium">
                        {log.realizadoPor}
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        {log.detalles}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: AGREGAR USUARIO MANUAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-[#0D2240] flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[#B8922A]" />
                <span>Agregar Correo Autorizado</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold">
                {modalError}
              </div>
            )}

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Correo de Google (Gmail / Workspace) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="ejemplo@gmail.com"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:bg-white focus:border-[#0D2240]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  value={formNombre}
                  onChange={(e) => setFormNombre(e.target.value)}
                  placeholder="Ej: Geral Martínez"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:bg-white focus:border-[#0D2240]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Rol en el Sistema <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formRol}
                  onChange={(e) => setFormRol(e.target.value as 'Supervisor' | 'Telemarketing')}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs text-slate-800 font-bold outline-none focus:bg-white focus:border-[#0D2240]"
                >
                  <option value="Telemarketing">Telemarketing (Atención de llamadas)</option>
                </select>
              </div>

              {formRol === 'Telemarketing' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Telemarketing Vinculada <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formTelemarketing}
                    onChange={(e) => setFormTelemarketing(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs text-slate-800 font-bold outline-none focus:bg-white focus:border-[#0D2240]"
                  >
                    <option value="">-- Seleccionar agente --</option>
                    {activeTelemarketingAgents.map((ag) => (
                      <option key={ag.id} value={ag.name}>
                        {ag.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Este usuario solo verá prospectos y citas asignados a este nombre.
                  </p>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-[#0D2240] hover:bg-[#14325a] text-white text-xs font-extrabold rounded-xl shadow-md disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {isSubmitting ? 'Guardando...' : 'Autorizar Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDITAR ROL Y TELEMARKETING */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-[#0D2240] flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-[#B8922A]" />
                <span>Modificar Permisos</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
              <span className="font-bold text-slate-900 block">{editingUser.nombre}</span>
              <span className="font-mono text-slate-500 text-[11px]">{editingUser.email}</span>
            </div>

            {modalError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold">
                {modalError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nombre
                </label>
                <input
                  type="text"
                  value={formNombre}
                  onChange={(e) => setFormNombre(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:bg-white focus:border-[#0D2240]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Rol en el Sistema
                </label>
                <select
                  value={formRol}
                  onChange={(e) => setFormRol(e.target.value as 'Supervisor' | 'Telemarketing')}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs text-slate-800 font-bold outline-none focus:bg-white focus:border-[#0D2240]"
                >
                  <option value="Telemarketing">Telemarketing</option>
                </select>
              </div>

              {formRol === 'Telemarketing' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Telemarketing Vinculada
                  </label>
                  <select
                    value={formTelemarketing}
                    onChange={(e) => setFormTelemarketing(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs text-slate-800 font-bold outline-none focus:bg-white focus:border-[#0D2240]"
                  >
                    <option value="">-- Seleccionar agente --</option>
                    {activeTelemarketingAgents.map((ag) => (
                      <option key={ag.id} value={ag.name}>
                        {ag.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  disabled={isSubmitting}
                  className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-[#0D2240] hover:bg-[#14325a] text-white text-xs font-extrabold rounded-xl shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: APROBAR SOLICITUD */}
      {approvingSolicitud && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-[#0D2240] flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-emerald-600" />
                <span>Aprobar Solicitud de Acceso</span>
              </h3>
              <button
                type="button"
                onClick={() => setApprovingSolicitud(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-900 space-y-1">
              <div className="font-black text-sm">{approvingSolicitud.nombre}</div>
              <div className="font-mono">{approvingSolicitud.email}</div>
            </div>

            {modalError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold">
                {modalError}
              </div>
            )}

            <form onSubmit={handleApproveSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Rol para este usuario <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formRol}
                  onChange={(e) => setFormRol(e.target.value as 'Supervisor' | 'Telemarketing')}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs text-slate-800 font-bold outline-none focus:bg-white focus:border-[#0D2240]"
                >
                  <option value="Telemarketing">Telemarketing</option>
                </select>
              </div>

              {formRol === 'Telemarketing' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Telemarketing Vinculada <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formTelemarketing}
                    onChange={(e) => setFormTelemarketing(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs text-slate-800 font-bold outline-none focus:bg-white focus:border-[#0D2240]"
                  >
                    <option value="">-- Seleccionar agente --</option>
                    {activeTelemarketingAgents.map((ag) => (
                      <option key={ag.id} value={ag.name}>
                        {ag.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setApprovingSolicitud(null)}
                  disabled={isSubmitting}
                  className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-extrabold rounded-xl shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Aprobando...' : 'Confirmar y Dar Acceso'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: CONFIRMAR ACTIVAR / DESACTIVAR */}
      {confirmToggleUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-center space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto ${
                confirmToggleUser.activo ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
              }`}
            >
              <Power className="w-7 h-7" />
            </div>

            <div>
              <h4 className="text-base font-black text-slate-900">
                {confirmToggleUser.activo ? '¿Desactivar acceso?' : '¿Reactivar acceso?'}
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                {confirmToggleUser.activo
                  ? `Se revocarán los permisos de ${confirmToggleUser.email}. La aplicación cerrará su sesión de inmediato.`
                  : `Se restituirá el acceso al sistema para ${confirmToggleUser.email}.`}
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmToggleUser(null)}
                disabled={isSubmitting}
                className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleToggleActive}
                disabled={isSubmitting}
                className={`px-5 py-2 text-white text-xs font-extrabold rounded-xl shadow-md cursor-pointer ${
                  confirmToggleUser.activo
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-emerald-700 hover:bg-emerald-800'
                }`}
              >
                {isSubmitting ? 'Procesando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: ELIMINAR CON DOBLE CONFIRMACIÓN */}
      {confirmDeleteUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-center space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-7 h-7" />
            </div>

            {deleteConfirmationStep === 1 ? (
              <div className="space-y-2">
                <h4 className="text-base font-black text-slate-900">
                  ¿Eliminar a {confirmDeleteUser.nombre}?
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Esta acción eliminará a <strong className="font-mono text-slate-800">{confirmDeleteUser.email}</strong> de la lista de usuarios autorizados. Si intenta ingresar, se le bloqueará el acceso.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <h4 className="text-base font-black text-rose-700">
                  Confirmación Final Requerida
                </h4>
                <p className="text-xs text-rose-900 font-semibold leading-relaxed">
                  ¿Estás completamente seguro de eliminar este usuario? No podrá volver a ingresar al CRM a menos que sea dado de alta de nuevo.
                </p>
              </div>
            )}

            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setConfirmDeleteUser(null);
                  setDeleteConfirmationStep(1);
                }}
                disabled={isSubmitting}
                className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50 cursor-pointer"
              >
                Cancelar
              </button>

              {deleteConfirmationStep === 1 ? (
                <button
                  type="button"
                  onClick={() => setDeleteConfirmationStep(2)}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold rounded-xl shadow-md cursor-pointer"
                >
                  Continuar eliminación &gt;
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleDeleteUser}
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-rose-700 hover:bg-rose-800 text-white text-xs font-black rounded-xl shadow-lg cursor-pointer"
                >
                  {isSubmitting ? 'Eliminando...' : 'Sí, Eliminar Definitivamente'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
