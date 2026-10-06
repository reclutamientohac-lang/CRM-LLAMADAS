import React, { useState } from 'react';
import {
  X,
  CalendarCheck,
  MapPin,
  Clock,
  User,
  ExternalLink,
  Phone,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Bell,
  Sparkles,
} from 'lucide-react';
import { Cita, Prospecto } from '../types';
import { useCRM } from '../context/CRMContext';
import { formatPhoneDisplay, formatDateDisplay } from '../businessRules';

interface CitasHoyModalProps {
  citas: Cita[];
  todayDateStr: string;
  onClose: () => void;
  onSelectProspecto?: (prospecto: Prospecto) => void;
}

export const CitasHoyModal: React.FC<CitasHoyModalProps> = ({
  citas,
  todayDateStr,
  onClose,
  onSelectProspecto,
}) => {
  const { prospectos } = useCRM();

  // Sort citas by horaCita
  const sortedCitas = [...citas].sort((a, b) => a.horaCita.localeCompare(b.horaCita));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-[#0D2240] text-white p-5 sm:p-6 shrink-0 flex items-start justify-between border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#B8922A] to-[#d4a938] text-[#0D2240] flex items-center justify-center font-black shadow-lg shrink-0">
              <CalendarCheck className="w-6 h-6 text-[#0D2240]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#B8922A]">
                  Agenda del Día
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/10 text-slate-300">
                  {citas.length} {citas.length === 1 ? 'cita' : 'citas'}
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-extrabold text-white">
                Citas Agendadas para Hoy
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Fecha: {formatDateDisplay(todayDateStr)} (Zona Horaria Los Ángeles)
              </p>
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

        {/* Citas List */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          {sortedCitas.length === 0 ? (
            <div className="py-12 px-6 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
                <CalendarCheck className="w-7 h-7" />
              </div>
              <h4 className="text-base font-bold text-slate-800">No hay citas para hoy</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Las citas agendadas por telemarketing con fecha de hoy aparecerán aquí automáticamente.
              </p>
            </div>
          ) : (
            sortedCitas.map((cita) => {
              const prospecto = prospectos.find((p) => p.id === cita.idProspecto);

              return (
                <div
                  key={cita.id}
                  className="bg-white rounded-2xl border-2 border-amber-200/90 p-5 shadow-xs hover:shadow-md transition-shadow space-y-3 bg-gradient-to-r from-amber-50/40 via-white to-white"
                >
                  {/* Top Bar of Cita card */}
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#0D2240] text-[#B8922A] font-extrabold text-sm shadow-xs">
                          <Clock className="w-4 h-4 text-[#B8922A]" />
                          <span>{cita.horaCita}</span>
                        </span>

                        <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold">
                          {cita.estadoCita}
                        </span>

                        <span className="text-[11px] font-mono text-slate-400">
                          {cita.id}
                        </span>
                      </div>

                      <h4 className="text-base sm:text-lg font-black text-slate-900 mt-1.5">
                        {cita.asunto}
                      </h4>
                    </div>

                    {/* Prospect action button */}
                    {prospecto && onSelectProspecto && (
                      <button
                        onClick={() => {
                          onClose();
                          onSelectProspecto(prospecto);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-[#0D2240] hover:text-white text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                      >
                        <User className="w-3.5 h-3.5" />
                        <span>Ver Prospecto</span>
                      </button>
                    )}
                  </div>

                  {/* Prospect details line */}
                  {prospecto && (
                    <div className="flex items-center gap-3 text-xs text-slate-700 flex-wrap bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
                      <span className="font-bold text-slate-900">
                        Prospecto: {prospecto.nombre}
                      </span>
                      <a
                        href={`tel:${prospecto.telefono}`}
                        className="inline-flex items-center gap-1 font-mono font-bold text-emerald-700 hover:text-emerald-900"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>{formatPhoneDisplay(prospecto.telefono)}</span>
                      </a>
                      {prospecto.propietario && (
                        <span className="text-slate-500">
                          Dueño/Emprendedor: <strong>{prospecto.propietario}</strong>
                        </span>
                      )}
                    </div>
                  )}

                  {/* Location & Google Maps */}
                  <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-200/80 flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-start gap-2 min-w-0 flex-1">
                      <MapPin className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                          Dirección
                        </span>
                        <p className="text-xs font-bold text-slate-900 leading-snug break-words">
                          {cita.direccion || 'Sin dirección registrada'}
                        </p>
                      </div>
                    </div>

                    {cita.linkGoogleMaps && (
                      <a
                        href={cita.linkGoogleMaps}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-xs transition-colors shrink-0"
                      >
                        <span>Abrir en Google Maps</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>

                  {/* Attendant & Guest */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/60">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        ¿Quién atiende?
                      </span>
                      <strong className="text-slate-800">
                        {cita.quienAtiende || 'Vendedor'}
                      </strong>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/60">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Invitado / Cónyuge
                      </span>
                      <strong className="text-slate-800">
                        {cita.invitado || 'No indicado'}
                      </strong>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/60">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Telemarketing
                      </span>
                      <strong className="text-slate-800">
                        {cita.telemarketing || 'N/A'}
                      </strong>
                    </div>
                  </div>

                  {/* Notes if available */}
                  {cita.descripcion && (
                    <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200/50">
                      <strong className="text-slate-800">Notas para el vendedor:</strong>{' '}
                      {cita.descripcion}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 shrink-0 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Mostrando las citas programadas para hoy
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
