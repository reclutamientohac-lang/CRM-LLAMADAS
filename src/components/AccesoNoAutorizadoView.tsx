import React, { useState } from 'react';
import {
  ShieldAlert,
  LogOut,
  Send,
  CheckCircle2,
  AlertCircle,
  PhoneCall,
  Clock,
  User,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const AccesoNoAutorizadoView: React.FC = () => {
  const { user, logout, requestAccess } = useAuth();
  const [requesting, setRequesting] = useState(false);
  const [requestResult, setRequestResult] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const handleRequest = async () => {
    setRequesting(true);
    setRequestResult(null);

    const res = await requestAccess();
    setRequesting(false);

    if (res.success) {
      setRequestResult({
        type: 'success',
        text: res.message,
      });
    } else {
      setRequestResult({
        type: 'error',
        text: res.message,
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Brand Header Background */}
      <div className="absolute top-0 inset-x-0 h-64 bg-[#0D2240] pointer-events-none" />
      <div className="absolute top-28 left-1/2 -translate-x-1/2 w-96 h-48 bg-rose-500/15 blur-3xl rounded-full pointer-events-none" />

      <div className="relative sm:mx-auto sm:w-full sm:max-w-md z-10">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-[#B8922A] to-[#d4a938] text-[#0D2240] shadow-lg mb-3 font-black">
            <PhoneCall className="w-7 h-7 text-[#0D2240]" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center justify-center gap-2">
            <span>CRM</span>
            <span className="text-[#B8922A]">LLAMADAS</span>
          </h1>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-900/10 border border-slate-200/80 p-8 sm:p-10 text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto shadow-sm">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              Acceso no autorizado
            </h2>
            <p className="text-sm font-semibold text-rose-700">
              Tu cuenta no tiene permiso para usar este sistema
            </p>
          </div>

          {/* User Profile Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center gap-3.5 text-left">
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt="Foto de perfil"
                className="w-12 h-12 rounded-full border-2 border-white shadow-xs shrink-0 object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-[#0D2240] text-white flex items-center justify-center font-bold text-base shrink-0">
                <User className="w-6 h-6 text-slate-300" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold text-slate-900 truncate">
                {user?.displayName || 'Usuario de Google'}
              </div>
              <div className="text-xs text-slate-500 font-medium truncate">
                {user?.email || 'Sin correo'}
              </div>
              <div className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                <span>Estado: No autorizado o inactivo</span>
              </div>
            </div>
          </div>

          {/* Resultado de solicitud */}
          {requestResult && (
            <div
              className={`p-4 rounded-2xl text-xs font-semibold flex items-start gap-2.5 text-left animate-in fade-in duration-200 ${
                requestResult.type === 'success'
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border border-rose-200 text-rose-800'
              }`}
            >
              {requestResult.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <span>{requestResult.text}</span>
            </div>
          )}

          {/* Explicación */}
          <p className="text-xs text-slate-500 leading-relaxed">
            Para proteger la información confidencial de clientes y llamadas, este sistema requiere
            que un administrador apruebe previamente tu correo electrónico de Google.
          </p>

          {/* Botones requeridos: Solicitar acceso y Cerrar sesión */}
          <div className="space-y-3 pt-2">
            <button
              type="button"
              onClick={handleRequest}
              disabled={requesting}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-[#0D2240] hover:bg-[#14325a] text-white text-xs font-extrabold tracking-wide shadow-md transition-all disabled:opacity-50 cursor-pointer"
            >
              {requesting ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Send className="w-4 h-4 text-[#B8922A]" />
              )}
              <span>{requesting ? 'Enviando solicitud...' : 'Solicitar acceso'}</span>
            </button>

            <button
              type="button"
              onClick={logout}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-2xl border border-slate-300 hover:bg-slate-50 text-slate-700 hover:text-slate-900 text-xs font-bold transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-slate-500" />
              <span>Cerrar sesión</span>
            </button>
          </div>
        </div>

        <div className="mt-8 text-center text-xs text-slate-400">
          CRM LLAMADAS &bull; Control de Acceso
        </div>
      </div>
    </div>
  );
};
