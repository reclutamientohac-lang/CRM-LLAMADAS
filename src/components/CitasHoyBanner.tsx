import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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
  AlertTriangle,
  Volume2,
} from 'lucide-react';
import { Cita, Prospecto } from '../types';
import { useCRM } from '../context/CRMContext';
import { useAuth } from '../context/AuthContext';
import { getTodayInLA, getMinutesUntilCitaLA, formatPhoneDisplay } from '../businessRules';
import { CitasHoyModal } from './CitasHoyModal';

interface CitasHoyBannerProps {
  onSelectProspecto?: (prospecto: Prospecto) => void;
}

export const CitasHoyBanner: React.FC<CitasHoyBannerProps> = ({ onSelectProspecto }) => {
  const { citas, prospectos } = useCRM();
  const { isSupervisor, userProfile, telemarketingAgent } = useAuth();

  const todayLA = getTodayInLA();
  const [dismissed, setDismissed] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Filter today's active appointments
  const citasHoy = useMemo(() => {
    return citas.filter((c) => {
      // Must be today in LA
      if (c.fechaCita !== todayLA) return false;
      // Must be active
      if (c.estadoCita !== 'Agendada' && c.estadoCita !== 'Reprogramada') return false;
      // Filter by role: supervisor and distribuidor see all; telemarketing sees only their assigned ones
      if (!isSupervisor && userProfile?.role !== 'Distribuidor' && telemarketingAgent && c.telemarketing !== telemarketingAgent) {
        return false;
      }
      return true;
    });
  }, [citas, todayLA, isSupervisor, userProfile?.role, telemarketingAgent]);

  // Find the single next imminent appointment (if any is <= 15 min) for the banner badge
  const imminentCitaInfo = useMemo(() => {
    for (const c of citasHoy) {
      const diff = getMinutesUntilCitaLA(c.fechaCita, c.horaCita);
      if (diff !== null && diff >= 0 && diff <= 15) {
        const p = prospectos.find((pr) => pr.id === c.idProspecto);
        return { cita: c, prospecto: p, minutesLeft: diff };
      }
    }
    return null;
  }, [citasHoy, prospectos]);

  if (citasHoy.length === 0) {
    return null;
  }

  // Next upcoming appointment
  const nextCita = citasHoy[0];
  const nextProspecto = nextCita ? prospectos.find((p) => p.id === nextCita.idProspecto) : undefined;

  return (
    <>
      {dismissed ? (
        // Minimized sticky pill
        <div className="bg-[#0D2240] px-4 py-2 border-b border-[#B8922A]/30 flex items-center justify-between text-xs text-white shadow-md animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#B8922A] animate-ping" />
            <span className="font-extrabold text-[#B8922A]">
              {citasHoy.length} {citasHoy.length === 1 ? 'cita agendada para hoy' : 'citas agendadas para hoy'}
            </span>
            {imminentCitaInfo && (
              <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-[10px] animate-pulse">
                ⏰ Cita en {imminentCitaInfo.minutesLeft} min
              </span>
            )}
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
      ) : (
        // Full banner
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

                  {imminentCitaInfo && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-wider animate-pulse border border-amber-300">
                      <Clock className="w-3 h-3 text-slate-950" />
                      <span>
                        ¡Cita en {imminentCitaInfo.minutesLeft <= 0 ? '0' : imminentCitaInfo.minutesLeft} min!
                      </span>
                    </span>
                  )}
                </div>

                {/* Quick snippet of upcoming appointment */}
                {nextCita && (
                  <div className="text-xs text-slate-300 mt-1 flex items-center gap-2 flex-wrap truncate">
                    <span className="inline-flex items-center gap-1 font-extrabold text-[#B8922A]">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{nextCita.horaCita}</span>
                    </span>
                    <span className="text-slate-200 font-semibold truncate max-w-xs">
                      {nextProspecto?.nombre || nextCita.asunto}
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
      )}

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
