import React, { useState, useMemo } from 'react';
import {
  X,
  Download,
  Search,
  ExternalLink,
  Phone,
  Calendar,
  Clock,
  User,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  MapPin,
  ChevronRight,
} from 'lucide-react';
import {
  Prospecto,
  Gestion,
  Cita,
  DrillDownType,
} from '../types';
import {
  formatPhoneDisplay,
  formatDateDisplay,
  getTemperaturaBadgeClass,
  getEstadoBadgeClass,
  getResultadoBadgeClass,
  getEstadoCitaBadgeClass,
} from '../businessRules';
import { exportDashboardDrillDownToExcel } from '../excelUtils';

interface DashboardDrillDownModalProps {
  title: string;
  type: DrillDownType;
  subtitle: string;
  items: Array<{
    id: string;
    prospecto?: Prospecto;
    gestion?: Gestion;
    cita?: Cita;
  }>;
  onClose: () => void;
  onOpenProspecto?: (prospecto: Prospecto) => void;
  onOpenCita?: (cita: Cita) => void;
}

export const DashboardDrillDownModal: React.FC<DashboardDrillDownModalProps> = ({
  title,
  type,
  subtitle,
  items,
  onClose,
  onOpenProspecto,
  onOpenCita,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [exporting, setExporting] = useState(false);

  // Filtrado rápido local
  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return items;
    const term = searchTerm.toLowerCase().trim();

    return items.filter(({ prospecto, gestion, cita }) => {
      const pName = prospecto?.nombre?.toLowerCase() || '';
      const pPhone = prospecto?.telefono || '';
      const tm = (gestion?.telemarketing || cita?.telemarketing || prospecto?.telemarketing || '').toLowerCase();
      const res = (gestion?.resultado || '').toLowerCase();
      const asunto = (cita?.asunto || '').toLowerCase();

      return (
        pName.includes(term) ||
        pPhone.includes(term) ||
        tm.includes(term) ||
        res.includes(term) ||
        asunto.includes(term)
      );
    });
  }, [items, searchTerm]);

  // Manejar exportación a Excel
  const handleExportExcel = () => {
    setExporting(true);
    try {
      let exportRows: Record<string, any>[] = [];

      if (type === 'prospectos') {
        exportRows = filteredItems.map(({ prospecto }, idx) => ({
          '#': idx + 1,
          ID: prospecto?.id || '',
          'Fecha Recepción': prospecto?.fechaRecepcion || '',
          Nombre: prospecto?.nombre || '',
          Teléfono: prospecto?.telefono || '',
          'Ciudad / Zona': prospecto?.ciudadZona || '',
          Propietario: prospecto?.propietario || '',
          Telemarketing: prospecto?.telemarketing || '',
          Temperatura: prospecto?.temperatura || '',
          Estado: prospecto?.estado || '',
          Origen: prospecto?.origen || '',
          'Intentos de Llamada': prospecto?.intentos || 0,
          'Contactos Efectivos': prospecto?.contactosEfectivos || 0,
        }));
      } else if (type === 'contactos' || type === 'efectivos') {
        exportRows = filteredItems.map(({ gestion, prospecto }, idx) => ({
          '#': idx + 1,
          'ID Gestión': gestion?.id || '',
          'Fecha y Hora': gestion?.fechaHora || '',
          Prospecto: prospecto?.nombre || 'Desconocido',
          Teléfono: prospecto?.telefono || '',
          Telemarketing: gestion?.telemarketing || '',
          Resultado: gestion?.resultado || '',
          '¿Contacto Efectivo?': gestion?.efectivo || '',
          Canal: gestion?.canal || 'Llamada',
          Observación: gestion?.observacion || '',
          'Fecha Seguimiento': gestion?.fechaSeguimiento || '',
          'ID Cita Generada': gestion?.idCita || '',
        }));
      } else if (type === 'citas') {
        exportRows = filteredItems.map(({ cita, prospecto }, idx) => ({
          '#': idx + 1,
          'ID Cita': cita?.id || '',
          'Fecha Creación': cita?.fechaCreacion ? cita.fechaCreacion.slice(0, 10) : '',
          'Fecha de la Cita': cita?.fechaCita || '',
          'Hora de la Cita': cita?.horaCita || '',
          Prospecto: prospecto?.nombre || 'Desconocido',
          Teléfono: prospecto?.telefono || '',
          Telemarketing: cita?.telemarketing || '',
          Asunto: cita?.asunto || '',
          Dirección: cita?.direccion || '',
          'Quién Atiende': cita?.quienAtiende || '',
          Invitado: cita?.invitado || '',
          'Estado Cita': cita?.estadoCita || '',
          Observación: cita?.descripcion || '',
        }));
      }

      const prefix = `Dashboard_${type}_${title.slice(0, 20)}`;
      exportDashboardDrillDownToExcel(prefix, exportRows);
    } catch (err) {
      console.error('Error generando archivo Excel:', err);
    } finally {
      setTimeout(() => setExporting(false), 500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 md:p-6 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-[#0D2240] text-white p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#B8922A] text-[#0D2240]">
                Detalle de Métrica
              </span>
              <span className="text-xs text-slate-300 font-semibold">
                {subtitle}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
              {title}
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Listado con {items.length} registro{items.length === 1 ? '' : 's'} en el período analizado
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={exporting || items.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
              title="Descargar este listado en formato Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
              <span>{exporting ? 'Generando...' : 'Exportar a Excel'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              title="Cerrar ventana"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toolbar de búsqueda */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre, teléfono, telemarketing..."
              className="w-full pl-10 pr-4 py-2 bg-white rounded-xl border border-slate-300 text-xs text-slate-800 placeholder-slate-400 focus:border-[#0D2240] outline-none"
            />
          </div>

          <div className="text-xs font-semibold text-slate-500 self-center">
            Mostrando <strong>{filteredItems.length}</strong> de <strong>{items.length}</strong>
          </div>
        </div>

        {/* Contenido / Tabla */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {filteredItems.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <AlertCircle className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-700">No se encontraron registros</p>
              <p className="text-xs text-slate-400">
                {searchTerm ? 'Intenta modificar el término de búsqueda.' : 'No hay datos para esta métrica.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
              {/* TIPO: PROSPECTOS */}
              {type === 'prospectos' && (
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-[#0D2240] text-white uppercase font-bold text-[11px]">
                      <th className="py-3 px-3.5">Fecha</th>
                      <th className="py-3 px-3.5">Prospecto</th>
                      <th className="py-3 px-3.5">Teléfono</th>
                      <th className="py-3 px-3.5">Ciudad / Zona</th>
                      <th className="py-3 px-3.5">Telemarketing</th>
                      <th className="py-3 px-3.5">Propietario</th>
                      <th className="py-3 px-3.5 text-center">Temp.</th>
                      <th className="py-3 px-3.5">Estado</th>
                      <th className="py-3 px-3.5 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                    {filteredItems.map(({ prospecto }) => {
                      if (!prospecto) return null;
                      return (
                        <tr key={prospecto.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-3.5 whitespace-nowrap text-slate-500 font-mono">
                            {formatDateDisplay(prospecto.fechaRecepcion)}
                          </td>
                          <td className="py-3 px-3.5 font-bold text-slate-900">
                            {prospecto.nombre}
                          </td>
                          <td className="py-3 px-3.5 whitespace-nowrap font-mono">
                            <a
                              href={`tel:${prospecto.telefono}`}
                              className="text-indigo-600 hover:underline font-bold inline-flex items-center gap-1"
                            >
                              <Phone className="w-3 h-3" />
                              <span>{formatPhoneDisplay(prospecto.telefono)}</span>
                            </a>
                          </td>
                          <td className="py-3 px-3.5 text-slate-600">
                            {prospecto.ciudadZona || '-'}
                          </td>
                          <td className="py-3 px-3.5">
                            <span className="font-extrabold text-[#0D2240]">
                              {prospecto.telemarketing || 'SIN ASIGNAR'}
                            </span>
                          </td>
                          <td className="py-3 px-3.5 text-slate-600">
                            {prospecto.propietario || '-'}
                          </td>
                          <td className="py-3 px-3.5 text-center">
                            {prospecto.temperatura ? (
                              <span
                                className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${getTemperaturaBadgeClass(
                                  prospecto.temperatura
                                )}`}
                              >
                                {prospecto.temperatura}
                              </span>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td className="py-3 px-3.5">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${getEstadoBadgeClass(
                                prospecto.estado
                              )}`}
                            >
                              {prospecto.estado}
                            </span>
                          </td>
                          <td className="py-3 px-3.5 text-right">
                            {onOpenProspecto && (
                              <button
                                type="button"
                                onClick={() => onOpenProspecto(prospecto)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#0D2240]/10 hover:bg-[#0D2240] text-[#0D2240] hover:text-white font-bold text-[11px] transition-colors cursor-pointer"
                              >
                                <span>Ver</span>
                                <ExternalLink className="w-3 h-3" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}

              {/* TIPO: CONTACTOS / EFECTIVOS */}
              {(type === 'contactos' || type === 'efectivos') && (
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-[#0D2240] text-white uppercase font-bold text-[11px]">
                      <th className="py-3 px-3.5">Fecha y Hora</th>
                      <th className="py-3 px-3.5">Prospecto</th>
                      <th className="py-3 px-3.5">Teléfono</th>
                      <th className="py-3 px-3.5">Telemarketing</th>
                      <th className="py-3 px-3.5">Resultado</th>
                      <th className="py-3 px-3.5 text-center">¿Efectivo?</th>
                      <th className="py-3 px-3.5">Observación</th>
                      <th className="py-3 px-3.5 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                    {filteredItems.map(({ gestion, prospecto }) => {
                      if (!gestion) return null;
                      return (
                        <tr key={gestion.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-3.5 whitespace-nowrap text-slate-600 font-medium">
                            {gestion.fechaHora}
                          </td>
                          <td className="py-3 px-3.5 font-bold text-slate-900">
                            {prospecto?.nombre || 'Prospecto #' + gestion.idProspecto.slice(-4)}
                          </td>
                          <td className="py-3 px-3.5 whitespace-nowrap font-mono">
                            {prospecto?.telefono ? (
                              <a
                                href={`tel:${prospecto.telefono}`}
                                className="text-indigo-600 hover:underline font-bold inline-flex items-center gap-1"
                              >
                                <Phone className="w-3 h-3" />
                                <span>{formatPhoneDisplay(prospecto.telefono)}</span>
                              </a>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td className="py-3 px-3.5">
                            <span className="font-extrabold text-[#0D2240]">
                              {gestion.telemarketing}
                            </span>
                          </td>
                          <td className="py-3 px-3.5">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${getResultadoBadgeClass(
                                gestion.resultado
                              )}`}
                            >
                              {gestion.resultado}
                            </span>
                          </td>
                          <td className="py-3 px-3.5 text-center">
                            {gestion.efectivo === 'Sí' ? (
                              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                                Sí
                              </span>
                            ) : (
                              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                                No
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3.5 max-w-xs truncate text-slate-500" title={gestion.observacion}>
                            {gestion.observacion || '-'}
                          </td>
                          <td className="py-3 px-3.5 text-right">
                            {prospecto && onOpenProspecto && (
                              <button
                                type="button"
                                onClick={() => onOpenProspecto(prospecto)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#0D2240]/10 hover:bg-[#0D2240] text-[#0D2240] hover:text-white font-bold text-[11px] transition-colors cursor-pointer"
                              >
                                <span>Prospecto</span>
                                <ExternalLink className="w-3 h-3" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}

              {/* TIPO: CITAS AGENDADAS */}
              {type === 'citas' && (
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-[#0D2240] text-white uppercase font-bold text-[11px]">
                      <th className="py-3 px-3.5">F. Creación</th>
                      <th className="py-3 px-3.5">Fecha Cita</th>
                      <th className="py-3 px-3.5">Hora</th>
                      <th className="py-3 px-3.5">Prospecto</th>
                      <th className="py-3 px-3.5">Telemarketing</th>
                      <th className="py-3 px-3.5">Asunto / Dirección</th>
                      <th className="py-3 px-3.5">Atiende</th>
                      <th className="py-3 px-3.5 text-center">Estado</th>
                      <th className="py-3 px-3.5 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                    {filteredItems.map(({ cita, prospecto }) => {
                      if (!cita) return null;
                      return (
                        <tr key={cita.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-3.5 whitespace-nowrap text-slate-500 font-mono">
                            {cita.fechaCreacion ? formatDateDisplay(cita.fechaCreacion.slice(0, 10)) : '-'}
                          </td>
                          <td className="py-3 px-3.5 whitespace-nowrap font-bold text-slate-900">
                            {formatDateDisplay(cita.fechaCita)}
                          </td>
                          <td className="py-3 px-3.5 whitespace-nowrap text-[#0D2240] font-extrabold">
                            {cita.horaCita}
                          </td>
                          <td className="py-3 px-3.5">
                            <div className="font-bold text-slate-900">
                              {prospecto?.nombre || 'Prospecto #' + cita.idProspecto.slice(-4)}
                            </div>
                            {prospecto?.telefono && (
                              <a
                                href={`tel:${prospecto.telefono}`}
                                className="text-[11px] text-indigo-600 hover:underline font-mono inline-flex items-center gap-1"
                              >
                                <Phone className="w-2.5 h-2.5" />
                                <span>{formatPhoneDisplay(prospecto.telefono)}</span>
                              </a>
                            )}
                          </td>
                          <td className="py-3 px-3.5 font-extrabold text-[#0D2240]">
                            {cita.telemarketing}
                          </td>
                          <td className="py-3 px-3.5 max-w-xs">
                            <div className="font-semibold text-slate-800 truncate">{cita.asunto}</div>
                            {cita.direccion && (
                              <div className="text-[11px] text-slate-500 truncate flex items-center gap-1 mt-0.5">
                                <MapPin className="w-3 h-3 shrink-0 text-slate-400" />
                                <span>{cita.direccion}</span>
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-3.5 text-slate-700">
                            {cita.quienAtiende || '-'}
                          </td>
                          <td className="py-3 px-3.5 text-center">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getEstadoCitaBadgeClass(
                                cita.estadoCita
                              )}`}
                            >
                              {cita.estadoCita}
                            </span>
                          </td>
                          <td className="py-3 px-3.5 text-right space-x-1.5 whitespace-nowrap">
                            {onOpenCita && (
                              <button
                                type="button"
                                onClick={() => onOpenCita(cita)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#0D2240] text-white font-bold text-[11px] hover:bg-[#14325a] transition-colors cursor-pointer"
                              >
                                <span>Cita</span>
                                <ChevronRight className="w-3 h-3" />
                              </button>
                            )}
                            {prospecto && onOpenProspecto && (
                              <button
                                type="button"
                                onClick={() => onOpenProspecto(prospecto)}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] transition-colors cursor-pointer"
                                title="Ver prospecto"
                              >
                                <User className="w-3 h-3" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div>
            CRM LLAMADAS &bull; Auditoría y Trazabilidad Comercial
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
