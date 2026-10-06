import React, { useState } from 'react';
import { PhoneCall, AlertCircle, ExternalLink, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const AuthView: React.FC = () => {
  const { loginWithGoogle, authError, clearAuthError, loading } = useAuth();
  const [inProgress, setInProgress] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setLocalError(null);
    clearAuthError();
    setInProgress(true);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      setLocalError(err.message || 'Error al iniciar sesión con Google.');
    } finally {
      setInProgress(false);
    }
  };

  const errorMessage = localError || authError;

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Decorative Brand Header Background */}
      <div className="absolute top-0 inset-x-0 h-72 bg-[#0D2240] pointer-events-none" />
      <div className="absolute top-32 left-1/2 -translate-x-1/2 w-96 h-48 bg-[#B8922A]/20 blur-3xl rounded-full pointer-events-none" />

      <div className="relative sm:mx-auto sm:w-full sm:max-w-md z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#B8922A] to-[#d4a938] text-[#0D2240] shadow-xl shadow-slate-950/20 mb-4 font-black">
            <PhoneCall className="w-8 h-8 text-[#0D2240]" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center justify-center gap-2">
            <span>CRM</span>
            <span className="text-[#B8922A]">LLAMADAS</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 font-medium">
            Telemarketing & Agendamiento de Citas
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-900/10 border border-slate-200/80 p-8 sm:p-10 space-y-6">
          <div className="text-center space-y-1.5 pb-2 border-b border-slate-100">
            <h2 className="text-xl font-extrabold text-[#0D2240]">
              Iniciar Sesión
            </h2>
            <p className="text-xs text-slate-500">
              Acceso exclusivo mediante tu cuenta de Google autorizada
            </p>
          </div>

          {/* Mensaje de error / Instrucciones */}
          {errorMessage && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl space-y-2 text-xs text-rose-800 animate-in fade-in duration-200">
              <div className="flex items-start gap-2.5 font-bold">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
              <div className="pl-6.5 text-[11px] text-rose-700 space-y-1">
                <p>
                  Si la ventana emergente fue bloqueada o te encuentras dentro de un visor web:
                </p>
                <div className="font-semibold text-rose-900">
                  👉 Abre la app en una pestaña nueva o en tu navegador directamente.
                </div>
              </div>
            </div>
          )}

          {/* Botón único: Continuar con Google */}
          <div className="space-y-4 pt-1">
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={inProgress || loading}
              className="w-full flex items-center justify-center gap-3 px-5 py-3.5 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 font-extrabold text-sm rounded-2xl border-2 border-slate-300 hover:border-slate-400 shadow-sm transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed group cursor-pointer"
            >
              {inProgress || loading ? (
                <div className="w-5 h-5 border-2 border-slate-400 border-t-[#0D2240] rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              )}
              <span>{inProgress || loading ? 'Conectando con Google...' : 'Continuar con Google'}</span>
            </button>

            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-center space-y-1">
              <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-slate-700">
                <ShieldCheck className="w-4 h-4 text-[#B8922A]" />
                <span>Acceso Seguro y Verificado</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Solo se admiten cuentas de Google previamente autorizadas por la administración del sistema.
              </p>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-8 text-center text-xs text-slate-400">
          CRM LLAMADAS &bull; Sistema Interno de Telemarketing
        </div>
      </div>
    </div>
  );
};
