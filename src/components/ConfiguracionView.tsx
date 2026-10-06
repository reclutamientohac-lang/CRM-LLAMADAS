import React, { useState } from 'react';
import {
  Settings,
  Users,
  Headset,
  Tag,
  Database,
  Plus,
  Trash2,
  Check,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Shield,
  CheckCircle2,
  Edit2,
  X,
  AlertCircle,
  Lock,
  UserCheck,
  UserX,
  Percent,
  Award,
} from 'lucide-react';
import { useCRM } from '../context/CRMContext';
import { useAuth } from '../context/AuthContext';
import { Role, TelemarketingAgentConfig, ReglaComision } from '../types';
import {
  DEFAULT_TIPOS_PROSPECTO,
  DEFAULT_ORIGENES,
  formatPercentageDisplay,
  parsePercentageInput,
  getTodayInLA,
} from '../businessRules';

export const ConfiguracionView: React.FC = () => {
  const {
    settings,
    usersList,
    updateSettings,
    addTelemarketingAgent,
    editTelemarketingAgent,
    deleteTelemarketingAgent,
    toggleTelemarketingAgent,
    updateUserRole,
    loadSampleData,
    clearSampleData,
    prospectos,
    agregarReglaComision,
    actualizarReglaComision,
    eliminarReglaComision,
  } = useCRM();
  const { userProfile, isSupervisor, isAdmin } = useAuth();

  // Tab navigation inside Configuración
  const [activeTab, setActiveTab] = useState<'telemarketing' | 'usuarios' | 'catalogos' | 'datos' | 'comisiones'>('telemarketing');

  // New telemarketing agent input
  const [newAgentName, setNewAgentName] = useState('');
  const [isAddingAgent, setIsAddingAgent] = useState(false);

  // Editing agent inline
  const [editingAgentId, setEditingAgentId] = useState<string | null>(null);
  const [editingAgentName, setEditingAgentName] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Agent deletion confirmation
  const [agentToDelete, setAgentToDelete] = useState<TelemarketingAgentConfig | null>(null);
  const [isDeletingAgent, setIsDeletingAgent] = useState(false);

  // Reglas de Comisión (Solo Administrador)
  const [newReglaPct, setNewReglaPct] = useState('1.5%');
  const [newReglaDesde, setNewReglaDesde] = useState(getTodayInLA());
  const [newReglaHasta, setNewReglaHasta] = useState('');
  const [newReglaNota, setNewReglaNota] = useState('');
  const [isAddingRegla, setIsAddingRegla] = useState(false);

  const [editingReglaId, setEditingReglaId] = useState<string | null>(null);
  const [editingReglaPct, setEditingReglaPct] = useState('');
  const [editingReglaDesde, setEditingReglaDesde] = useState('');
  const [editingReglaHasta, setEditingReglaHasta] = useState('');
  const [editingReglaNota, setEditingReglaNota] = useState('');
  const [isSavingReglaEdit, setIsSavingReglaEdit] = useState(false);
  const [reglaToDelete, setReglaToDelete] = useState<ReglaComision | null>(null);
  const [isDeletingRegla, setIsDeletingRegla] = useState(false);

  // New catalog item inputs
  const [newTipo, setNewTipo] = useState('');
  const [newOrigen, setNewOrigen] = useState('');

  // Sample data status
  const [sampleLoading, setSampleLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // If not supervisor, prevent access
  if (!isSupervisor) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <Shield className="w-16 h-16 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-800">Acceso Restringido</h2>
        <p className="text-sm text-slate-500">
          Solo los usuarios con rol de <strong>Supervisor</strong> pueden acceder al panel de configuración.
        </p>
      </div>
    );
  }

  // --- Handlers: Telemarketing list ---
  const handleAddAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackMsg(null);
    setIsAddingAgent(true);

    const res = await addTelemarketingAgent(newAgentName);
    setIsAddingAgent(false);

    if (res.success) {
      setFeedbackMsg({
        type: 'success',
        text: `Agente "${newAgentName.trim().toUpperCase()}" agregada exitosamente a la lista.`,
      });
      setNewAgentName('');
    } else {
      setFeedbackMsg({
        type: 'error',
        text: res.error || 'Error al agregar la agente de telemarketing.',
      });
    }
  };

  const handleStartEdit = (agent: TelemarketingAgentConfig) => {
    setEditingAgentId(agent.id);
    setEditingAgentName(agent.name);
    setFeedbackMsg(null);
  };

  const handleCancelEdit = () => {
    setEditingAgentId(null);
    setEditingAgentName('');
  };

  const handleSaveEdit = async (agentId: string) => {
    setFeedbackMsg(null);
    setIsSavingEdit(true);

    const res = await editTelemarketingAgent(agentId, editingAgentName);
    setIsSavingEdit(false);

    if (res.success) {
      setFeedbackMsg({
        type: 'success',
        text: `Nombre de la agente actualizado a "${editingAgentName.trim().toUpperCase()}" correctamente.`,
      });
      setEditingAgentId(null);
      setEditingAgentName('');
    } else {
      setFeedbackMsg({
        type: 'error',
        text: res.error || 'Error al actualizar el nombre de la agente.',
      });
    }
  };

  const handleRequestDelete = (agent: TelemarketingAgentConfig) => {
    setFeedbackMsg(null);
    // Verificar si tiene prospectos activos
    const activeAssigned = prospectos.filter(
      (p) => !p.archivado && p.telemarketing.trim().toUpperCase() === agent.name.trim().toUpperCase()
    );

    if (activeAssigned.length > 0) {
      setFeedbackMsg({
        type: 'error',
        text: `No se puede eliminar la agente "${agent.name}" porque tiene ${activeAssigned.length} prospecto(s) activo(s) asignado(s). Reasigna los prospectos antes de eliminarla.`,
      });
      return;
    }

    setAgentToDelete(agent);
  };

  const handleConfirmDelete = async () => {
    if (!agentToDelete) return;
    setIsDeletingAgent(true);
    setFeedbackMsg(null);

    const res = await deleteTelemarketingAgent(agentToDelete.id);
    setIsDeletingAgent(false);
    const deletedName = agentToDelete.name;
    setAgentToDelete(null);

    if (res.success) {
      setFeedbackMsg({
        type: 'success',
        text: `La agente "${deletedName}" fue eliminada de la lista de telemarketing.`,
      });
    } else {
      setFeedbackMsg({
        type: 'error',
        text: res.error || 'No se pudo eliminar la agente.',
      });
    }
  };

  const handleToggleAgent = async (agentId: string) => {
    setFeedbackMsg(null);
    const res = await toggleTelemarketingAgent(agentId);
    if (!res.success) {
      setFeedbackMsg({
        type: 'error',
        text: res.error || 'Error al cambiar estado de la agente.',
      });
    }
  };

  // --- Handlers: Catálogos ---
  const handleAddTipo = async () => {
    const clean = newTipo.trim();
    if (!clean) return;
    if (settings.tiposProspecto.includes(clean)) return;

    const updated = [...settings.tiposProspecto, clean];
    await updateSettings({ tiposProspecto: updated });
    setNewTipo('');
  };

  const handleRemoveTipo = async (tipo: string) => {
    const updated = settings.tiposProspecto.filter((t) => t !== tipo);
    await updateSettings({ tiposProspecto: updated });
  };

  const handleResetTipos = async () => {
    if (!window.confirm('¿Restablecer tipos de prospecto a valores predeterminados?')) return;
    await updateSettings({ tiposProspecto: DEFAULT_TIPOS_PROSPECTO });
  };

  const handleAddOrigen = async () => {
    const clean = newOrigen.trim();
    if (!clean) return;
    if (settings.origenes.includes(clean)) return;

    const updated = [...settings.origenes, clean];
    await updateSettings({ origenes: updated });
    setNewOrigen('');
  };

  const handleRemoveOrigen = async (origen: string) => {
    const updated = settings.origenes.filter((o) => o !== origen);
    await updateSettings({ origenes: updated });
  };

  const handleResetOrigenes = async () => {
    if (!window.confirm('¿Restablecer orígenes de prospecto a valores predeterminados?')) return;
    await updateSettings({ origenes: DEFAULT_ORIGENES });
  };

  // --- Handlers: User Roles ---
  const handleUserRoleChange = async (uid: string, role: Role, currentAgent = '') => {
    const agentToSet =
      role === 'Telemarketing'
        ? currentAgent || settings.telemarketingAgents[0]?.name || 'GERAL'
        : '';
    await updateUserRole(uid, role, agentToSet);
    setFeedbackMsg({
      type: 'success',
      text: 'Permisos del usuario actualizados.',
    });
  };

  const handleUserAgentChange = async (uid: string, agentName: string) => {
    await updateUserRole(uid, 'Telemarketing', agentName);
    setFeedbackMsg({
      type: 'success',
      text: `Usuario vinculado a la agente ${agentName}.`,
    });
  };

  // --- Handlers: Sample Data ---
  const handleLoadSamples = async () => {
    setSampleLoading(true);
    setFeedbackMsg(null);
    const res = await loadSampleData();
    setSampleLoading(false);
    if (res.success) {
      setFeedbackMsg({
        type: 'success',
        text: `¡Se cargaron ${res.count} prospectos de muestra con éxito!`,
      });
    } else {
      setFeedbackMsg({
        type: 'error',
        text: res.error || 'Error al cargar prospectos de muestra.',
      });
    }
  };

  const handleClearAll = async () => {
    setSampleLoading(true);
    setFeedbackMsg(null);
    const res = await clearSampleData();
    setSampleLoading(false);
    setShowClearConfirm(false);
    if (res.success) {
      setFeedbackMsg({
        type: 'success',
        text: `Se eliminaron ${res.count} prospectos de la base de datos.`,
      });
    } else {
      setFeedbackMsg({
        type: 'error',
        text: res.error || 'Error al limpiar los prospectos.',
      });
    }
  };

  // --- Handlers: Reglas de Comisión (Solo Administrador) ---
  const handleAddRegla = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackMsg(null);

    const parsed = parsePercentageInput(newReglaPct);
    if (!parsed.valid || parsed.ratio === null) {
      setFeedbackMsg({
        type: 'error',
        text: parsed.error || 'Porcentaje de comisión no válido.',
      });
      return;
    }

    if (!newReglaDesde) {
      setFeedbackMsg({
        type: 'error',
        text: 'La fecha "Vigente desde" es requerida.',
      });
      return;
    }

    if (newReglaHasta && newReglaHasta < newReglaDesde) {
      setFeedbackMsg({
        type: 'error',
        text: 'La fecha "Vigente hasta" no puede ser anterior a "Vigente desde".',
      });
      return;
    }

    setIsAddingRegla(true);
    const res = await agregarReglaComision({
      porcentaje: parsed.ratio,
      vigenteDesde: newReglaDesde,
      vigenteHasta: newReglaHasta || undefined,
      nota: newReglaNota.trim() || undefined,
    });
    setIsAddingRegla(false);

    if (res.success) {
      setFeedbackMsg({
        type: 'success',
        text: `Regla de comisión del ${formatPercentageDisplay(parsed.ratio)} agregada exitosamente.`,
      });
      setNewReglaPct('1.5%');
      setNewReglaDesde(getTodayInLA());
      setNewReglaHasta('');
      setNewReglaNota('');
    } else {
      setFeedbackMsg({
        type: 'error',
        text: res.error || 'Error al agregar regla de comisión.',
      });
    }
  };

  const handleStartEditRegla = (regla: ReglaComision) => {
    setEditingReglaId(regla.id);
    setEditingReglaPct(String(Number((regla.porcentaje * 100).toFixed(2))));
    setEditingReglaDesde(regla.vigenteDesde);
    setEditingReglaHasta(regla.vigenteHasta || '');
    setEditingReglaNota(regla.nota || '');
    setFeedbackMsg(null);
  };

  const handleCancelEditRegla = () => {
    setEditingReglaId(null);
    setEditingReglaPct('');
    setEditingReglaDesde('');
    setEditingReglaHasta('');
    setEditingReglaNota('');
  };

  const handleSaveEditRegla = async (id: string) => {
    setFeedbackMsg(null);
    const parsed = parsePercentageInput(editingReglaPct);
    if (!parsed.valid || parsed.ratio === null) {
      setFeedbackMsg({
        type: 'error',
        text: parsed.error || 'Porcentaje de comisión no válido.',
      });
      return;
    }

    if (!editingReglaDesde) {
      setFeedbackMsg({
        type: 'error',
        text: 'La fecha "Vigente desde" es requerida.',
      });
      return;
    }

    if (editingReglaHasta && editingReglaHasta < editingReglaDesde) {
      setFeedbackMsg({
        type: 'error',
        text: 'La fecha "Vigente hasta" no puede ser anterior a "Vigente desde".',
      });
      return;
    }

    setIsSavingReglaEdit(true);
    const res = await actualizarReglaComision(id, {
      porcentaje: parsed.ratio,
      vigenteDesde: editingReglaDesde,
      vigenteHasta: editingReglaHasta || undefined,
      nota: editingReglaNota.trim() || undefined,
    });
    setIsSavingReglaEdit(false);

    if (res.success) {
      setEditingReglaId(null);
      setFeedbackMsg({
        type: 'success',
        text: 'Regla de comisión actualizada con éxito.',
      });
    } else {
      setFeedbackMsg({
        type: 'error',
        text: res.error || 'Error al actualizar regla.',
      });
    }
  };

  const handleDeleteRegla = async (regla: ReglaComision) => {
    setIsDeletingRegla(true);
    setFeedbackMsg(null);
    const res = await eliminarReglaComision(regla.id);
    setIsDeletingRegla(false);
    setReglaToDelete(null);

    if (res.success) {
      setFeedbackMsg({
        type: 'success',
        text: 'Regla de comisión eliminada.',
      });
    } else {
      setFeedbackMsg({
        type: 'error',
        text: res.error || 'Error al eliminar regla de comisión.',
      });
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16">
      {/* Top Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-bold text-[#B8922A] uppercase tracking-wider mb-1">
          <Settings className="w-4 h-4" />
          <span>Panel de Administración</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0D2240] tracking-tight">
          Configuración del CRM
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Administración de la lista de telemarketing, usuarios y roles, catálogos editables y datos de prueba.
        </p>
      </div>

      {/* Feedback Banner */}
      {feedbackMsg && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between gap-3 text-xs sm:text-sm font-semibold animate-in fade-in duration-200 ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-300'
              : 'bg-rose-50 text-rose-900 border border-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackMsg.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMsg(null)}
            className="text-slate-400 hover:text-slate-600 p-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Secondary Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('telemarketing')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-bold transition-all border-b-2 cursor-pointer ${
            activeTab === 'telemarketing'
              ? 'border-[#0D2240] text-[#0D2240] bg-white shadow-xs'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Headset className="w-4 h-4 text-[#B8922A]" />
          <span>Gestión de Telemarketing ({settings.telemarketingAgents.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('usuarios')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-bold transition-all border-b-2 cursor-pointer ${
            activeTab === 'usuarios'
              ? 'border-[#0D2240] text-[#0D2240] bg-white shadow-xs'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4 text-[#B8922A]" />
          <span>Usuarios y Roles</span>
        </button>

        <button
          onClick={() => setActiveTab('catalogos')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-bold transition-all border-b-2 cursor-pointer ${
            activeTab === 'catalogos'
              ? 'border-[#0D2240] text-[#0D2240] bg-white shadow-xs'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Tag className="w-4 h-4 text-[#B8922A]" />
          <span>Catálogos Editables</span>
        </button>

        <button
          onClick={() => setActiveTab('datos')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-bold transition-all border-b-2 cursor-pointer ${
            activeTab === 'datos'
              ? 'border-[#0D2240] text-[#0D2240] bg-white shadow-xs'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Database className="w-4 h-4 text-[#B8922A]" />
          <span>Datos de Muestra (~30)</span>
        </button>

        <button
          onClick={() => setActiveTab('comisiones')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-bold transition-all border-b-2 cursor-pointer ${
            activeTab === 'comisiones'
              ? 'border-[#0D2240] text-[#0D2240] bg-white shadow-xs'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Percent className="w-4 h-4 text-[#B8922A]" />
          <span>Reglas de Comisión ({(settings.reglasComision || []).length})</span>
        </button>
      </div>

      {/* Tab: Gestión de Telemarketing */}
      {activeTab === 'telemarketing' && (
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200/90 space-y-6">
          <div className="pb-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-extrabold text-[#0D2240]">
                Lista y Gestión de Telemarketing
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Permite agregar, editar y eliminar nombres. Cada nombre debe ser <strong>único</strong> y no se puede eliminar si tiene <strong>prospectos activos asignados</strong>.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 shrink-0">
              <Headset className="w-4 h-4 text-[#B8922A]" />
              <span>{settings.telemarketingAgents.filter((a) => a.active).length} activas de {settings.telemarketingAgents.length}</span>
            </div>
          </div>

          {/* Form to add new agent with uniqueness check */}
          <form
            onSubmit={handleAddAgent}
            className="p-5 bg-[#F7F8FA] rounded-2xl border border-slate-200/90 space-y-2"
          >
            <label className="block text-xs font-bold text-slate-700">
              Agregar Nueva Agente de Telemarketing
            </label>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <input
                type="text"
                value={newAgentName}
                onChange={(e) => setNewAgentName(e.target.value.toUpperCase())}
                placeholder="Ingresa el nombre en mayúsculas (ej: SOFÍA, LAURA, DANIELA)..."
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm font-bold uppercase focus:border-[#0D2240] focus:ring-2 focus:ring-[#0D2240]/10 outline-none transition-all"
              />
              <button
                type="submit"
                disabled={isAddingAgent || !newAgentName.trim()}
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#0D2240] hover:bg-[#163665] text-white font-bold text-xs shadow-md shadow-slate-900/10 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Plus className="w-4 h-4 text-[#B8922A]" />
                <span>{isAddingAgent ? 'Verificando...' : 'Agregar Telemarketing'}</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              El sistema validará automáticamente que no exista otra agente con el mismo nombre.
            </p>
          </form>

          {/* Table of Telemarketing Agents */}
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-[#0D2240] text-white uppercase tracking-wider font-bold">
                  <th className="py-3.5 px-4">Nombre de Telemarketing</th>
                  <th className="py-3.5 px-4 text-center">Prospectos Activos</th>
                  <th className="py-3.5 px-4">Usuarios Vinculados</th>
                  <th className="py-3.5 px-4 text-center">Estado</th>
                  <th className="py-3.5 px-4 text-right">Acciones de Gestión</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium bg-white">
                {settings.telemarketingAgents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      No hay agentes configuradas. Agrega al menos una arriba.
                    </td>
                  </tr>
                ) : (
                  settings.telemarketingAgents.map((agent) => {
                    const isEditing = editingAgentId === agent.id;

                    // Calculate active leads assigned
                    const activeLeads = prospectos.filter(
                      (p) => !p.archivado && p.telemarketing.trim().toUpperCase() === agent.name.trim().toUpperCase()
                    );
                    const activeCount = activeLeads.length;

                    // Linked users
                    const linkedUsers = usersList.filter(
                      (u) => u.role === 'Telemarketing' && u.telemarketingAgent?.trim().toUpperCase() === agent.name.trim().toUpperCase()
                    );

                    return (
                      <tr
                        key={agent.id}
                        className={`hover:bg-slate-50 transition-colors ${
                          !agent.active ? 'opacity-70 bg-slate-50/50' : ''
                        }`}
                      >
                        {/* Nombre / Input if editing */}
                        <td className="py-3.5 px-4">
                          {isEditing ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={editingAgentName}
                                onChange={(e) => setEditingAgentName(e.target.value.toUpperCase())}
                                className="px-3 py-1.5 border-2 border-[#0D2240] rounded-lg text-xs font-bold uppercase outline-none bg-white"
                                autoFocus
                              />
                              <button
                                onClick={() => handleSaveEdit(agent.id)}
                                disabled={isSavingEdit || !editingAgentName.trim()}
                                className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer disabled:opacity-50"
                                title="Guardar nombre"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className="p-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 cursor-pointer"
                                title="Cancelar"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-[#0D2240]/5 text-[#0D2240] flex items-center justify-center font-black text-xs">
                                {agent.name.slice(0, 2)}
                              </div>
                              <div>
                                <span className="font-extrabold text-sm text-[#0D2240]">
                                  {agent.name}
                                </span>
                                <span className="block text-[10px] text-slate-400 font-mono">
                                  ID: {agent.id}
                                </span>
                              </div>
                            </div>
                          )}
                        </td>

                        {/* Prospectos Activos Asignados */}
                        <td className="py-3.5 px-4 text-center">
                          {activeCount > 0 ? (
                            <span
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-300"
                              title={`${activeCount} prospectos activos en seguimiento. No se puede eliminar.`}
                            >
                              <Lock className="w-3 h-3 text-amber-700" />
                              <span>{activeCount} activo(s)</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span>0 (Libre)</span>
                            </span>
                          )}
                        </td>

                        {/* Usuarios Vinculados */}
                        <td className="py-3.5 px-4">
                          {linkedUsers.length > 0 ? (
                            <div className="space-y-0.5">
                              {linkedUsers.map((u) => (
                                <div key={u.uid} className="flex items-center gap-1 text-[11px] text-slate-700 font-medium">
                                  <UserCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                                  <span>{u.displayName || u.email}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">
                              Sin usuario vinculado
                            </span>
                          )}
                        </td>

                        {/* Estado */}
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => handleToggleAgent(agent.id)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-colors cursor-pointer ${
                              agent.active
                                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-300'
                            }`}
                            title="Haz clic para activar o desactivar"
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                agent.active ? 'bg-emerald-600' : 'bg-slate-400'
                              }`}
                            />
                            <span>{agent.active ? 'Activa' : 'Inactiva'}</span>
                          </button>
                        </td>

                        {/* Acciones */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center gap-1">
                            {!isEditing && (
                              <button
                                onClick={() => handleStartEdit(agent)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                                title="Editar nombre de la agente"
                              >
                                <Edit2 className="w-3 h-3 text-[#B8922A]" />
                                <span>Editar</span>
                              </button>
                            )}

                            <button
                              onClick={() => handleRequestDelete(agent)}
                              disabled={activeCount > 0}
                              className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                                activeCount > 0
                                  ? 'text-slate-400 bg-slate-100 cursor-not-allowed opacity-60'
                                  : 'text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 cursor-pointer'
                              }`}
                              title={
                                activeCount > 0
                                  ? `No se puede eliminar: tiene ${activeCount} prospecto(s) activo(s) asignado(s)`
                                  : 'Eliminar agente de la lista'
                              }
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Eliminar</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Explanatory callout for Supervisor */}
          <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900 space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-[#B8922A]" />
              <span>Regla de Protección de Integridad</span>
            </div>
            <p className="text-[11px] text-amber-800">
              Para garantizar que ningún prospecto quede huérfano, el sistema impide la eliminación de agentes con leads activos. Si deseas eliminar a una telemarketing, primero reasigna sus prospectos a otra agente desde la pestaña <strong>Prospectos</strong>.
            </p>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Agent Deletion */}
      {agentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs"
            onClick={() => setAgentToDelete(null)}
          />
          <div className="relative bg-white rounded-2xl p-6 shadow-2xl max-w-md w-full border border-slate-200 z-10 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center font-bold mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-lg font-bold text-slate-900">
                ¿Eliminar agente de telemarketing?
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Estás a punto de eliminar a <strong className="text-slate-800">&quot;{agentToDelete.name}&quot;</strong> de la lista de telemarketing. Esta acción no se puede deshacer.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setAgentToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 border border-slate-300 rounded-xl hover:bg-slate-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeletingAgent}
                onClick={handleConfirmDelete}
                className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md transition-colors cursor-pointer"
              >
                {isDeletingAgent ? 'Eliminando...' : 'Sí, eliminar agente'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Gestión de Usuarios y Roles */}
      {activeTab === 'usuarios' && (
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200/90 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-extrabold text-[#0D2240]">
                Control de Usuarios y Roles (RBAC)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                El Supervisor puede ver y editar todos los prospectos. Las Telemarketings solo ven sus leads asignados.
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg">
              {usersList.length} usuarios registrados
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-[#0D2240] text-white uppercase tracking-wider font-bold">
                  <th className="py-3.5 px-4">Usuario</th>
                  <th className="py-3.5 px-4">Correo</th>
                  <th className="py-3.5 px-4">Rol en el CRM</th>
                  <th className="py-3.5 px-4">Vinculación Telemarketing</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {usersList.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400">
                      No hay usuarios registrados adicionales.
                    </td>
                  </tr>
                ) : (
                  usersList.map((u) => {
                    const isCurrentUser = u.uid === userProfile?.uid;

                    return (
                      <tr key={u.uid} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          <div className="flex items-center gap-2">
                            <span>{u.displayName || 'Sin nombre'}</span>
                            {isCurrentUser && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#B8922A]/15 text-[#9a781f] font-bold">
                                Tú
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 font-mono text-slate-600">
                          {u.email}
                        </td>

                        <td className="py-3.5 px-4">
                          <select
                            value={u.role}
                            disabled={isCurrentUser && u.role === 'Supervisor'}
                            onChange={(e) =>
                              handleUserRoleChange(u.uid, e.target.value as Role, u.telemarketingAgent)
                            }
                            className={`px-3 py-1.5 rounded-lg border font-bold text-xs ${
                              u.role === 'Supervisor'
                                ? 'bg-[#0D2240]/10 text-[#0D2240] border-[#0D2240]/30'
                                : 'bg-sky-50 text-sky-800 border-sky-300'
                            }`}
                          >
                            <option value="Supervisor">Supervisor (Control total)</option>
                            <option value="Telemarketing">Telemarketing (Solo lo asignado)</option>
                          </select>
                        </td>

                        <td className="py-3.5 px-4">
                          {u.role === 'Telemarketing' ? (
                            <select
                              value={u.telemarketingAgent || ''}
                              onChange={(e) => handleUserAgentChange(u.uid, e.target.value)}
                              className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-semibold text-xs focus:border-[#0D2240]"
                            >
                              <option value="">Seleccionar agente...</option>
                              {settings.telemarketingAgents
                                .filter((a) => a.active)
                                .map((ag) => (
                                  <option key={ag.id} value={ag.name}>
                                    Agente: {ag.name}
                                  </option>
                                ))}
                            </select>
                          ) : (
                            <span className="text-slate-400 italic">No aplica (Supervisión global)</span>
                          )}
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

      {/* Tab: Catálogos Editables */}
      {activeTab === 'catalogos' && (
        <div className="space-y-6">
          {/* Tipos de prospecto */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200/90 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-extrabold text-[#0D2240]">
                  Tipos de Prospecto
                </h3>
                <p className="text-xs text-slate-500">
                  Categorías para clasificar la relación del prospecto.
                </p>
              </div>
              <button
                onClick={handleResetTipos}
                className="text-xs font-semibold text-slate-500 hover:text-[#0D2240] flex items-center gap-1 self-start sm:self-auto cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Restablecer predeterminados</span>
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {settings.tiposProspecto.map((tipo) => (
                <span
                  key={tipo}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-800 text-xs font-bold border border-slate-200"
                >
                  <span>{tipo}</span>
                  <button
                    onClick={() => handleRemoveTipo(tipo)}
                    className="text-slate-400 hover:text-rose-600 ml-0.5 cursor-pointer"
                    title="Eliminar"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>

            <div className="pt-2 flex items-center gap-2 max-w-md">
              <input
                type="text"
                value={newTipo}
                onChange={(e) => setNewTipo(e.target.value)}
                placeholder="Nuevo tipo de prospecto..."
                className="flex-1 px-3 py-2 rounded-xl border border-slate-300 text-xs outline-none focus:border-[#0D2240]"
              />
              <button
                onClick={handleAddTipo}
                disabled={!newTipo.trim()}
                className="px-4 py-2 rounded-xl bg-[#0D2240] text-white text-xs font-bold hover:bg-[#163665] disabled:opacity-50 cursor-pointer"
              >
                Agregar
              </button>
            </div>
          </div>

          {/* Orígenes */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200/90 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-extrabold text-[#0D2240]">
                  Orígenes del Lead
                </h3>
                <p className="text-xs text-slate-500">
                  Canales o fuentes de captación (rifas, referidos, eventos, etc.).
                </p>
              </div>
              <button
                onClick={handleResetOrigenes}
                className="text-xs font-semibold text-slate-500 hover:text-[#0D2240] flex items-center gap-1 self-start sm:self-auto cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Restablecer predeterminados</span>
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {settings.origenes.map((origen) => (
                <span
                  key={origen}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-900 text-xs font-bold border border-amber-200"
                >
                  <span>{origen}</span>
                  <button
                    onClick={() => handleRemoveOrigen(origen)}
                    className="text-amber-500 hover:text-rose-600 ml-0.5 cursor-pointer"
                    title="Eliminar"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>

            <div className="pt-2 flex items-center gap-2 max-w-md">
              <input
                type="text"
                value={newOrigen}
                onChange={(e) => setNewOrigen(e.target.value)}
                placeholder="Nuevo origen de lead..."
                className="flex-1 px-3 py-2 rounded-xl border border-slate-300 text-xs outline-none focus:border-[#0D2240]"
              />
              <button
                onClick={handleAddOrigen}
                disabled={!newOrigen.trim()}
                className="px-4 py-2 rounded-xl bg-[#0D2240] text-white text-xs font-bold hover:bg-[#163665] disabled:opacity-50 cursor-pointer"
              >
                Agregar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Datos de Muestra y Limpieza */}
      {activeTab === 'datos' && (
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200/90 space-y-6">
          <div className="pb-4 border-b border-slate-100">
            <h2 className="text-lg font-extrabold text-[#0D2240]">
              Datos de Ejemplo y Pruebas
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Carga o limpia rápidamente 30 prospectos reales para verificar filtros, temperaturas calculadas y reasignación.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card Cargar */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-[#0D2240]/5 to-transparent border border-[#0D2240]/15 space-y-4">
              <div className="w-12 h-12 rounded-xl bg-[#0D2240] text-[#B8922A] flex items-center justify-center font-bold">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-[#0D2240]">
                  Cargar ~30 Prospectos de Muestra
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Genera 30 leads con datos realistas (nombres hispanos, teléfonos US de 10 dígitos, ciudades de California/Nevada, diferentes fechas para probar Hot, Tibio y Frío, y asignaciones a GERAL, IRENE, MAIRUT y SIN ASIGNAR).
                </p>
              </div>

              <button
                onClick={handleLoadSamples}
                disabled={sampleLoading}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#0D2240] hover:bg-[#163665] text-white font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                <Plus className="w-4 h-4 text-[#B8922A]" />
                <span>{sampleLoading ? 'Procesando...' : 'Cargar 30 Prospectos de Muestra'}</span>
              </button>
            </div>

            {/* Card Limpiar */}
            <div className="p-6 rounded-2xl bg-rose-50/50 border border-rose-200 space-y-4">
              <div className="w-12 h-12 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-rose-950">
                  Limpiar Todos los Prospectos
                </h3>
                <p className="text-xs text-rose-800 mt-1 leading-relaxed">
                  Elimina todos los registros de la colección de prospectos para dejar la base de datos limpia. Requiere confirmación de supervisor.
                </p>
              </div>

              {showClearConfirm ? (
                <div className="p-3 bg-white rounded-xl border border-rose-300 space-y-2">
                  <p className="text-xs font-bold text-rose-900">
                    ¿Estás seguro de eliminar todos los ({prospectos.length}) prospectos?
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowClearConfirm(false)}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleClearAll}
                      disabled={sampleLoading}
                      className="px-3 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg cursor-pointer"
                    >
                      {sampleLoading ? 'Limpiando...' : 'Sí, eliminar todos'}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowClearConfirm(true)}
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-900/10 transition-all cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Limpiar Todos los Prospectos ({prospectos.length})</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Reglas de Comisión (Solo Administrador) */}
      {activeTab === 'comisiones' && (
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200/90 space-y-6">
          <div className="pb-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-extrabold text-[#0D2240] flex items-center gap-2">
                <Percent className="w-5 h-5 text-[#B8922A]" />
                <span>Reglas de Comisión y Bonos</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Configuración de porcentajes de comisión según la fecha de la cita. Solo editable por el administrador del sistema.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 shrink-0">
              <Award className="w-4 h-4 text-[#B8922A]" />
              <span>Por defecto: 1.0% si ninguna regla aplica</span>
            </div>
          </div>

          {!isAdmin ? (
            <div className="p-6 bg-amber-50 rounded-2xl border border-amber-200 flex items-start gap-4">
              <Shield className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-extrabold text-amber-900">
                  Acceso Restringido a Administrador
                </h3>
                <p className="text-xs text-amber-700 mt-1">
                  Solo el <strong>Administrador</strong> del sistema puede agregar, modificar o eliminar reglas de comisión.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Nota explicativa de cálculo */}
              <div className="p-4 bg-sky-50/70 border border-sky-200/80 rounded-2xl text-xs text-sky-900 space-y-1.5">
                <div className="font-extrabold flex items-center gap-1.5 text-sky-950">
                  <AlertCircle className="w-4 h-4 text-sky-600 shrink-0" />
                  <span>¿Cómo se aplican las reglas de comisión?</span>
                </div>
                <ul className="list-disc pl-5 space-y-1 text-[11px] text-sky-800">
                  <li>
                    La regla aplicable a una venta se elige <strong>según la fecha de la cita</strong>: se toma la regla cuya vigencia (vigente desde ... vigente hasta) contenga esa fecha.
                  </li>
                  <li>
                    Si ninguna regla contiene la fecha de la cita, se utiliza la <strong>última regla definida</strong> en la lista.
                  </li>
                  <li>
                    Si no existe ninguna regla configurada, se aplica el <strong>1% (0.01)</strong> por defecto.
                  </li>
                  <li>
                    Ese porcentaje se usa como <strong>valor sugerido inicial</strong> al crear la venta; el supervisor o administrador puede ajustarlo venta por venta en la pestaña Ventas / Bonos.
                  </li>
                </ul>
              </div>

              {/* Formulario para agregar nueva regla */}
              <form onSubmit={handleAddRegla} className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                <div className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-[#B8922A]" />
                  <span>Agregar Nueva Regla de Comisión</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Porcentaje de Bono *
                    </label>
                    <input
                      type="text"
                      value={newReglaPct}
                      onChange={(e) => setNewReglaPct(e.target.value)}
                      placeholder="Ej: 1.5% o 0.015"
                      className="w-full px-3 py-2 bg-white rounded-xl border border-slate-300 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0D2240]"
                      required
                    />
                    <span className="text-[10px] text-slate-400">Ejemplo: 1.5% o 2%</span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Vigente Desde *
                    </label>
                    <input
                      type="date"
                      value={newReglaDesde}
                      onChange={(e) => setNewReglaDesde(e.target.value)}
                      className="w-full px-3 py-2 bg-white rounded-xl border border-slate-300 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0D2240]"
                      required
                    />
                    <span className="text-[10px] text-slate-400">Fecha inicial de vigencia</span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Vigente Hasta (Opcional)
                    </label>
                    <input
                      type="date"
                      value={newReglaHasta}
                      onChange={(e) => setNewReglaHasta(e.target.value)}
                      className="w-full px-3 py-2 bg-white rounded-xl border border-slate-300 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0D2240]"
                    />
                    <span className="text-[10px] text-slate-400">Dejar vacío si es indefinida</span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Nota o Descripción
                    </label>
                    <input
                      type="text"
                      value={newReglaNota}
                      onChange={(e) => setNewReglaNota(e.target.value)}
                      placeholder="Ej: Campaña Q4 2026..."
                      className="w-full px-3 py-2 bg-white rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0D2240]"
                    />
                    <span className="text-[10px] text-slate-400">Identificador opcional</span>
                  </div>
                </div>

                <div className="text-right pt-1">
                  <button
                    type="submit"
                    disabled={isAddingRegla}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#0D2240] hover:bg-[#14325a] text-white text-xs font-extrabold shadow-sm transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4 text-[#B8922A]" />
                    <span>{isAddingRegla ? 'Guardando...' : 'Agregar Regla de Comisión'}</span>
                  </button>
                </div>
              </form>

              {/* Tabla de reglas configuradas */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-slate-600 uppercase tracking-wider">
                    Reglas Definidas ({(settings.reglasComision || []).length})
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    Orden cronológico de aplicación
                  </span>
                </div>

                {(settings.reglasComision || []).length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300 space-y-2">
                    <Percent className="w-8 h-8 text-slate-300 mx-auto" />
                    <div className="text-xs font-bold text-slate-600">
                      No hay reglas de comisión configuradas actualmente.
                    </div>
                    <p className="text-[11px] text-slate-400">
                      El sistema utilizará automáticamente la tasa sugerida por defecto de <strong>1.0%</strong>.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-slate-200">
                    <table className="w-full text-left text-xs text-slate-700">
                      <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                        <tr>
                          <th className="py-3 px-3">Porcentaje</th>
                          <th className="py-3 px-3">Vigente Desde</th>
                          <th className="py-3 px-3">Vigente Hasta</th>
                          <th className="py-3 px-3">Nota</th>
                          <th className="py-3 px-3 text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(settings.reglasComision || []).map((regla) => {
                          const isEditing = editingReglaId === regla.id;

                          if (isEditing) {
                            return (
                              <tr key={regla.id} className="bg-amber-50/40">
                                <td className="py-2.5 px-3">
                                  <input
                                    type="text"
                                    value={editingReglaPct}
                                    onChange={(e) => setEditingReglaPct(e.target.value)}
                                    className="w-20 px-2 py-1 bg-white border border-slate-300 rounded-lg font-bold text-xs"
                                  />
                                </td>
                                <td className="py-2.5 px-3">
                                  <input
                                    type="date"
                                    value={editingReglaDesde}
                                    onChange={(e) => setEditingReglaDesde(e.target.value)}
                                    className="px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs"
                                  />
                                </td>
                                <td className="py-2.5 px-3">
                                  <input
                                    type="date"
                                    value={editingReglaHasta}
                                    onChange={(e) => setEditingReglaHasta(e.target.value)}
                                    className="px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs"
                                  />
                                </td>
                                <td className="py-2.5 px-3">
                                  <input
                                    type="text"
                                    value={editingReglaNota}
                                    onChange={(e) => setEditingReglaNota(e.target.value)}
                                    placeholder="Nota opcional"
                                    className="w-full px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs"
                                  />
                                </td>
                                <td className="py-2.5 px-3 text-right whitespace-nowrap space-x-1">
                                  <button
                                    type="button"
                                    onClick={() => handleSaveEditRegla(regla.id)}
                                    disabled={isSavingReglaEdit}
                                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer"
                                  >
                                    Guardar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handleCancelEditRegla}
                                    className="px-2.5 py-1 rounded-lg border border-slate-300 text-slate-600 font-bold text-xs hover:bg-slate-50 cursor-pointer"
                                  >
                                    Cancelar
                                  </button>
                                </td>
                              </tr>
                            );
                          }

                          return (
                            <tr key={regla.id} className="hover:bg-slate-50/60 transition-colors">
                              <td className="py-3 px-3 font-extrabold text-[#0D2240]">
                                <span className="px-2.5 py-1 rounded-xl bg-amber-50 text-amber-800 border border-amber-200">
                                  {formatPercentageDisplay(regla.porcentaje)}
                                </span>
                              </td>
                              <td className="py-3 px-3 font-medium text-slate-800">
                                {regla.vigenteDesde}
                              </td>
                              <td className="py-3 px-3 text-slate-600">
                                {regla.vigenteHasta ? (
                                  regla.vigenteHasta
                                ) : (
                                  <span className="text-slate-400 italic">Indefinida</span>
                                )}
                              </td>
                              <td className="py-3 px-3 text-slate-600 max-w-xs truncate">
                                {regla.nota || '-'}
                              </td>
                              <td className="py-3 px-3 text-right whitespace-nowrap space-x-2">
                                <button
                                  type="button"
                                  onClick={() => handleStartEditRegla(regla)}
                                  className="text-slate-500 hover:text-slate-800 font-bold p-1 cursor-pointer"
                                  title="Editar regla"
                                >
                                  <Edit2 className="w-4 h-4 inline" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setReglaToDelete(regla)}
                                  className="text-rose-500 hover:text-rose-700 font-bold p-1 cursor-pointer"
                                  title="Eliminar regla"
                                >
                                  <Trash2 className="w-4 h-4 inline" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Modal de confirmación para eliminar regla de comisión */}
          {reglaToDelete && (
            <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-sm w-full p-6 space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div className="text-center space-y-1">
                  <h3 className="text-base font-bold text-slate-900">
                    ¿Eliminar esta regla de comisión?
                  </h3>
                  <p className="text-xs text-slate-500">
                    Regla: <strong>{formatPercentageDisplay(reglaToDelete.porcentaje)}</strong> (desde {reglaToDelete.vigenteDesde}). Esta acción no afectará ventas ya creadas.
                  </p>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setReglaToDelete(null)}
                    disabled={isDeletingRegla}
                    className="flex-1 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteRegla(reglaToDelete)}
                    disabled={isDeletingRegla}
                    className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    {isDeletingRegla ? 'Eliminando...' : 'Sí, eliminar'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
