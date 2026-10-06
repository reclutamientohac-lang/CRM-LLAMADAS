import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  CalendarCheck,
  Clock,
  MapPin,
  Bell,
  BellRing,
  ExternalLink,
  ChevronRight,
  X,
  Eye,
  Sparkles,
  Check,
} from 'lucide-react';
import { Cita, Prospecto } from '../types';
import { useCRM } from '../context/CRMContext';
import { useAuth } from '../context/AuthContext';
import { getTodayInLA, formatPhoneDisplay } from '../businessRules';
import { CitasHoyModal } from './CitasHoyModal';

interface CitasHoyBannerProps {
  onSelectProspecto?: (prospecto: Prospecto) => void;
}

export const CitasHoyBanner: React.FC<CitasHoyBannerProps> = ({ onSelectProspecto }) => {
  const { citas, prospectos } = useCRM();
  const { isSupervisor, telemarketingAgent } = useAuth();

  const todayLA = getTodayInLA();

  // Notification API status
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'denied';
  });

  const [dismissed, setDismissed] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const notifiedCitaIdsRef = useRef<Set<string>>(new Set());

  // Filter today's active appointments
  const citasHoy = useMemo(() => {
    return citas.filter((c) => {
      // Must be today in LA
      if (c.fechaCita !== todayLA) return false;
      // Must be active
      if (c.estadoCita !== 'Agendada' && c.estadoCita !== 'Reprogramada') return false;
      // Filter by role if not supervisor
      if (!isSupervisor && telemarketingAgent && c.telemarketing !== telemarketingAgent) {
        return false;
      }
      return true;
    });
  }, [citas, todayLA, isSupervisor, telemarketingAgent]);

  // Request browser notification permission
  const handleRequestPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      alert('Tu navegador no soporta notificaciones de escritorio.');
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission === 'granted' && citasHoy.length > 0) {
        // Trigger notification for today's citas
        citasHoy.forEach((c) => {
          triggerBrowserNotification(c);
        });
      }
    } catch (err) {
      console.warn('Error al solicitar permiso de notificación:', err);
    }
  };

  // Helper to trigger browser notification
  const triggerBrowserNotification = (c: Cita) => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;
    if (notifiedCitaIdsRef.current.has(c.id)) return;

    notifiedCitaIdsRef.current.add(c.id);

    try {
      const prospecto = prospectos.find((p) => p.id === c.idProspecto);
      const title = `📅 Cita Hoy: ${c.horaCita} - ${c.asunto}`;
      const body = `Cliente: ${prospecto ? prospecto.nombre : 'Prospecto'}\n📍 ${c.direccion || 'Sin dirección'}\nAtiende: ${c.quienAtiende || 'Vendedor'}`;

      const notif = new Notification(title, {
        body,
        icon: '/favicon.ico',
        tag: `cita-${c.id}`,
      });

      notif.onclick = () => {
        window.focus();
        setShowModal(true);
      };
    } catch (err) {
      console.warn('No se pudo emitir la notificación del navegador:', err);
    }
  };

  // Automatically trigger notification when granted and new citas for today are detected
  useEffect(() => {
    if (notificationPermission === 'granted' && citasHoy.length > 0) {
      citasHoy.forEach((c) => {
        triggerBrowserNotification(c);
      });
    }
  }, [citasHoy, notificationPermission]);

  if (citasHoy.length === 0) {
    return null;
  }

  // Next upcoming appointment
  const nextCita = citasHoy[0];
  const nextProspecto = prospectos.find((p) => p.id === nextCita.idProspecto);

  if (dismissed) {
    // Minimized sticky pill
    return (
      <>
        <div className="bg-[#0D2240] px-4 py-2 border-b border-[#B8922A]/30 flex items-center justify-between text-xs text-white shadow-md animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#B8922A] animate-ping" />
            <span className="font-extrabold text-[#B8922A]">
              {citasHoy.length} {citasHoy.length === 1 ? 'cita agendada para hoy' : 'citas agendadas para hoy'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowModal(true)}
              className="px-2.5 py-1 rounded-lg bg-[#B8922A] hover:bg-[#caa435] text-[#0D2240] font-bold text-[11px] transition-colors cursor-pointer"
            >
              Ver citas
            </button>
            <button
              onClick={() => setDismissed(false)}
              className="text-slate-400 hover:text-white text-[11px] underline cursor-pointer"
            >
              Expandir aviso
            </button>
          </div>
        </div>

        {showModal && (
          <CitasHoyModal
            citas={citasHoy}
            todayDateStr={todayLA}
            onClose={() => setShowModal(false)}
            onSelectProspecto={onSelectProspecto}
          />
        )}
      </>
    );
  }

  return (
    <>
      <div className="bg-gradient-to-r from-[#0D2240] via-[#153460] to-[#0D2240] text-white px-4 sm:px-6 py-3 border-b-2 border-[#B8922A] shadow-lg animate-in slide-in-from-top-3 duration-300">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Left section: icon + text */}
          <div className="flex items-start sm:items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#B8922A] to-[#d4a938] text-[#0D2240] flex items-center justify-center font-black shadow-md shrink-0">
              <CalendarCheck className="w-5 h-5 text-[#0D2240]" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#B8922A] text-[#0D2240] text-[10px] font-black uppercase tracking-wider shadow-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0D2240] animate-pulse" />
                  <span>Hoy en Agenda</span>
                </span>
                <span className="text-xs font-bold text-white">
                  Tienes{' '}
                  <strong className="text-[#B8922A] font-black">
                    {citasHoy.length} {citasHoy.length === 1 ? 'cita agendada' : 'citas agendadas'}
                  </strong>{' '}
                  para el día de hoy
                </span>
              </div>

              {/* Quick snippet of upcoming appointment */}
              {nextCita && (
                <div className="text-xs text-slate-300 mt-1 flex items-center gap-2 flex-wrap truncate">
                  <span className="inline-flex items-center gap-1 font-extrabold text-[#B8922A]">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{nextCita.horaCita}</span>
                  </span>
                  <span className="text-slate-200 font-semibold truncate max-w-xs">
                    {nextCita.asunto}
                  </span>
                  {nextCita.direccion && (
                    <span className="text-slate-400 hidden lg:inline truncate max-w-sm">
                      📍 {nextCita.direccion}
                    </span>
                  )}
                  {nextCita.quienAtiende && (
                    <span className="text-slate-400 text-[11px] hidden sm:inline">
                      (Atiende: <strong className="text-slate-200">{nextCita.quienAtiende}</strong>)
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right section: Actions */}
          <div className="flex items-center gap-2.5 shrink-0 justify-end flex-wrap">
            {/* Browser notification button */}
            {notificationPermission !== 'granted' && (
              <button
                onClick={handleRequestPermission}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white text-xs font-semibold transition-colors cursor-pointer border border-white/10"
                title="Activar avisos de escritorio en el navegador"
              >
                <Bell className="w-3.5 h-3.5 text-[#B8922A]" />
                <span className="hidden sm:inline">Activar avisos de navegador</span>
                <span className="sm:hidden">Avisos</span>
              </button>
            )}

            {notificationPermission === 'granted' && (
              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold">
                <BellRing className="w-3 h-3 text-emerald-400" />
                <span>Avisos activos</span>
              </span>
            )}

            {/* View all button */}
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#B8922A] hover:bg-[#caa435] text-[#0D2240] font-extrabold text-xs shadow-md transition-all cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Ver Citas de Hoy ({citasHoy.length})</span>
            </button>

            {/* Dismiss banner */}
            <button
              onClick={() => setDismissed(true)}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Minimizar aviso"
              aria-label="Minimizar aviso"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Full Modal with Today's Appointments */}
      {showModal && (
        <CitasHoyModal
          citas={citasHoy}
          todayDateStr={todayLA}
          onClose={() => setShowModal(false)}
          onSelectProspecto={onSelectProspecto}
        />
      )}
    </>
  );
};
