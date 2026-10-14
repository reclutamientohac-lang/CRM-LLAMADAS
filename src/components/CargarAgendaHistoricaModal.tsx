import { sumMoney, commission } from '../money';
import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  FileSpreadsheet,
  Download,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Award,
  DollarSign,
  UserCheck,
  UserPlus,
  Copy,
  Sparkles,
  Info,
  ArrowRight,
  ShieldCheck,
  Clock,
} from 'lucide-react';
import { useCRM } from '../context/CRMContext';
import { AgendaHistoricaImportItem, Prospecto, Cita } from '../types';
import {
  parseAgendaHistoricaExcel,
  downloadPlantillaAgendaHistorica,
} from '../excelUtils';
import { formatCurrency, formatDateDisplay, getTodayInLA } from '../businessRules';

interface CargarAgendaHistoricaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const CargarAgendaHistoricaModal: React.FC<CargarAgendaHistoricaModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { prospectos, citas, importarAgendaHistoricaConVentas } = useCRM();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  // Rows & summary
  const [parsedRows, setParsedRows] = useState<AgendaHistoricaImportItem[]>([]);
  const [resumen, setResumen] = useState<{
    totalLeidas: number;
    validas: number;
    duplicadas: number;
    conVenta: number;
    conBono: number;
    vinculadasProspectoExistente: number;
    nuevosProspectos: number;
    montoTotalVentas: number;
    montoTotalBonos: number;
  } | null>(null);

  // Filters inside preview
  const [previewFilter, setPreviewFilter] = useState<'todas' | 'validas' | 'duplicadas' | 'ventas'>('todas');
  const [searchTerm, setSearchTerm] = useState('');

  // Import execution state
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    citasCreadas: number;
    ventasCreadas: number;
    prospectosCreados: number;
    duplicadosOmitidos: number;
  } | null>(null);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setIsParsing(true);
    setParseError(null);
    setImportResult(null);

    try {
      const result = await parseAgendaHistoricaExcel(file, prospectos, citas);
      setParsedRows(result.rows);
      setResumen(result.resumen);
    } catch (err: any) {
      console.error('Error procesando archivo de agenda histórica:', err);
      setParseError(err.message || 'Error al leer el archivo Excel.');
      setParsedRows([]);
      setResumen(null);
    } finally {
      setIsParsing(false);
    }
  };

  const handleLoadSamplePackage = () => {
    // Genera datos de muestra históricos realistas de citas con ventas y bonos
    const sampleRows: AgendaHistoricaImportItem[] = [
      {
        fechaCita: '2026-08-14',
        horaCita: '10:30 AM',
        nombreProspecto: 'María Elena Morales',
        telefono: '2135550101',
        telemarketing: 'GERAL',
        quienAtiende: 'Carlos Valladares',
        asunto: 'Demostración de Sistema de Purificación',
        direccion: '1240 S Soto St, Los Angeles, CA 90023',
        invitado: 'Esposo Mario',
        estadoCita: 'Realizada',
        resultado: 'Venta',
        montoAprobado: 2800,
        porcentajeBono: 0.015,
        bonoGenerado: 42,
        bonoPagable: 0,
        estadoVenta: 'Aprobada',
        estadoPago: 'Pagada',
        fechaPago: '2026-08-20',
        observaciones: 'Demostración presencial cerrada con paquete completo familiar',
      },
      {
        fechaCita: '2026-08-22',
        horaCita: '02:00 PM',
        nombreProspecto: 'Jorge Luis Santana',
        telefono: '3235550102',
        telemarketing: 'GERAL',
        quienAtiende: 'Carlos Valladares',
        asunto: 'Presentación en Taller Automotriz',
        direccion: '2100 E 7th St, Boyle Heights, CA 90023',
        invitado: '',
        estadoCita: 'Realizada',
        resultado: 'Recibió sin compra',
        montoAprobado: null,
        porcentajeBono: null,
        bonoGenerado: null,
        bonoPagable: 0,
        observaciones: 'Muy amable pero necesita consultar con su socio el próximo mes',
      },
      {
        fechaCita: '2026-09-02',
        horaCita: '11:00 AM',
        nombreProspecto: 'Rosa Angélica Beltrán',
        telefono: '8185550103',
        telemarketing: 'IRENE',
        quienAtiende: 'Ana Karina Pérez',
        asunto: 'Demostración Set de Cocina y Filtro',
        direccion: '840 San Fernando Rd, San Fernando, CA 91340',
        invitado: 'Hermana Rosa',
        estadoCita: 'Realizada',
        resultado: 'Venta',
        montoAprobado: 3500,
        porcentajeBono: 0.015,
        bonoGenerado: 52.5,
        bonoPagable: 52.5,
        estadoVenta: 'Aprobada',
        estadoPago: 'Pendiente',
        observaciones: 'Aprobación bancaria completada, comisión pendiente de liquidación',
      },
      {
        fechaCita: '2026-09-10',
        horaCita: '03:30 PM',
        nombreProspecto: 'Fernando Castillo',
        telefono: '5625550104',
        telemarketing: 'MAIRUT',
        quienAtiende: 'Diana Méndez',
        asunto: 'Demostración Agua de Pozo y Cocina',
        direccion: '350 E Ocean Blvd, Long Beach, CA 90802',
        invitado: 'Socio comercial',
        estadoCita: 'Realizada',
        resultado: 'No se visitó',
        montoAprobado: null,
        porcentajeBono: null,
        bonoGenerado: null,
        bonoPagable: 0,
        observaciones: 'El prospecto avisó de emergencia familiar 1 hora antes de la cita',
      },
      {
        fechaCita: '2026-09-18',
        horaCita: '01:15 PM',
        nombreProspecto: 'Guadalupe Cárdenas',
        telefono: '7145550105',
        telemarketing: 'GERAL',
        quienAtiende: 'Roberto Gómez',
        asunto: 'Demo Presencial en Santa Ana',
        direccion: '1520 W 17th St, Santa Ana, CA 92706',
        invitado: 'Hija Diana',
        estadoCita: 'Realizada',
        resultado: 'Venta',
        montoAprobado: 4200,
        porcentajeBono: 0.015,
        bonoGenerado: 63,
        bonoPagable: 63,
        estadoVenta: 'Aprobada',
        estadoPago: 'Pendiente',
        observaciones: 'Venta cerrada con sistema purificador premium y utensilios',
      },
      {
        fechaCita: '2026-09-25',
        horaCita: '04:00 PM',
        nombreProspecto: 'Carmen Alicia Flores',
        telefono: '9095550107',
        telemarketing: 'IRENE',
        quienAtiende: 'Carlos Valladares',
        asunto: 'Demostración Hogar Ontario',
        direccion: '2200 S Archibald Ave, Ontario, CA 91761',
        invitado: 'Esposa Elena',
        estadoCita: 'Realizada',
        resultado: 'No recibió',
        montoAprobado: null,
        porcentajeBono: null,
        bonoGenerado: null,
        bonoPagable: 0,
        observaciones: 'Nadie abrió la puerta en el domicilio acordado',
      },
    ];

    // Check duplicates against current state
    const phoneToLead = new Map<string, Prospecto>();
    prospectos.forEach((p) => phoneToLead.set(p.telefono, p));
    const existingCitaKeys = new Set(
      citas.map((c) => `${c.idProspecto}_${c.fechaCita}_${(c.horaCita || '').trim().toLowerCase()}`)
    );

    let dupes = 0;
    let validas = 0;
    let totalM = 0;
    let totalB = 0;
    let vinculadas = 0;
    let nuevos = 0;

    const enriched = sampleRows.map((r) => {
      const matched = phoneToLead.get(r.telefono);
      const isDup = matched ? existingCitaKeys.has(`${matched.id}_${r.fechaCita}_${(r.horaCita || '').trim().toLowerCase()}`) : false;
      if (isDup) dupes++;
      else validas++;

      if (matched) vinculadas++;
      else nuevos++;

      if (r.montoAprobado) totalM = sumMoney([totalM, r.montoAprobado]);
      if (r.bonoGenerado) totalB = sumMoney([totalB, r.bonoGenerado]);

      return {
        ...r,
        prospectoExistenteId: matched?.id,
        esDuplicada: isDup,
        motivoDuplicada: isDup ? 'Ya existe en el CRM con esta fecha y hora.' : undefined,
        esNuevoProspecto: !matched,
      };
    });

    setParsedRows(enriched);
    setResumen({
      totalLeidas: sampleRows.length,
      validas,
      duplicadas: dupes,
      conVenta: enriched.filter((r) => r.resultado === 'Venta').length,
      conBono: enriched.filter((r) => (r.bonoGenerado || 0) > 0).length,
      vinculadasProspectoExistente: vinculadas,
      nuevosProspectos: nuevos,
      montoTotalVentas: totalM,
      montoTotalBonos: totalB,
    });
    setSelectedFile(new File([''], 'Paquete_Historico_Ejemplo.xlsx'));
    setParseError(null);
  };

  const handleExecuteImport = async () => {
    if (!parsedRows.length) return;

    setIsImporting(true);
    try {
      const res = await importarAgendaHistoricaConVentas(parsedRows);
      if (res.success) {
        setImportResult({
          citasCreadas: res.citasCreadas,
          ventasCreadas: res.ventasCreadas,
          prospectosCreados: res.prospectosCreados,
          duplicadosOmitidos: res.duplicadosOmitidos,
        });
        if (onSuccess) onSuccess();
      } else {
        setParseError(res.error || 'Error al importar datos históricos.');
      }
    } catch (err: any) {
      setParseError(err.message || 'Error ejecutando la carga.');
    } finally {
      setIsImporting(false);
    }
  };

  const filteredPreviewRows = parsedRows.filter((row) => {
    if (previewFilter === 'validas' && row.esDuplicada) return false;
    if (previewFilter === 'duplicadas' && !row.esDuplicada) return false;
    if (previewFilter === 'ventas' && row.resultado !== 'Venta' && !row.montoAprobado) return false;

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchName = row.nombreProspecto.toLowerCase().includes(term);
      const matchPhone = row.telefono.includes(term);
      const matchTM = (row.telemarketing || '').toLowerCase().includes(term);
      const matchAttends = (row.quienAtiende || '').toLowerCase().includes(term);
      return matchName || matchPhone || matchTM || matchAttends;
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="relative bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 bg-[#0D2240] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#B8922A] text-[#0D2240] font-black">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-white tracking-tight flex items-center gap-2">
                <span>Cargar Agenda Histórica con Ventas y Bonos</span>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  Sin Duplicados
                </span>
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                Importa citas históricas vinculándolas al prospecto correspondiente y registrando ventas y comisiones
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Success Banner if already imported */}
          {importResult ? (
            <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-black text-emerald-950">
                  ¡Carga Histórica Completada Exitosamente!
                </h3>
                <p className="text-xs text-emerald-800 max-w-md mx-auto mt-1">
                  La información faltante fue incorporada evitando duplicados. Todas las citas y ventas quedaron vinculadas a sus prospectos para el histórico de contactos.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto pt-2">
                <div className="bg-white p-3.5 rounded-xl border border-emerald-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Citas Nuevas</span>
                  <span className="text-2xl font-black text-emerald-700">{importResult.citasCreadas}</span>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-emerald-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Ventas y Bonos</span>
                  <span className="text-2xl font-black text-amber-700">{importResult.ventasCreadas}</span>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-emerald-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Prospectos Creados</span>
                  <span className="text-2xl font-black text-sky-700">{importResult.prospectosCreados}</span>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-emerald-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Duplicadas Omitidas</span>
                  <span className="text-2xl font-black text-slate-600">{importResult.duplicadosOmitidos}</span>
                </div>
              </div>

              <div className="pt-2 flex justify-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl bg-[#0D2240] text-white text-xs font-bold hover:bg-[#14325a] shadow-xs cursor-pointer"
                >
                  Ver Agenda Actualizada
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Dropzone & Action Bar */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 border-2 border-dashed border-slate-300 hover:border-[#0D2240] rounded-2xl p-6 text-center transition-colors bg-slate-50/50 flex flex-col items-center justify-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 text-[#B8922A] flex items-center justify-center">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-slate-800 block">
                      {selectedFile ? selectedFile.name : 'Selecciona o arrastra el archivo Excel (.xlsx, .xls)'}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Compatible con columnas de Fecha Cita, Prospecto, Teléfono, Telemarketing, Resultado, Monto y Bonos
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isParsing}
                      className="px-4 py-2 rounded-xl bg-[#0D2240] hover:bg-[#14325a] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                    >
                      {isParsing ? 'Procesando archivo...' : 'Examinar archivo'}
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </div>
                </div>

                {/* Side Tools: Template & Quick Sample Package */}
                <div className="flex flex-col justify-between gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <div>
                    <span className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5 mb-2">
                      <Download className="w-3.5 h-3.5 text-[#B8922A]" />
                      <span>Plantilla Oficial</span>
                    </span>
                    <p className="text-[11px] text-slate-500 leading-snug">
                      Descarga el formato estructurado con encabezados canónicos para asegurar reconocimiento automático de citas, ventas y bonos.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={downloadPlantillaAgendaHistorica}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                  >
                    <Download className="w-4 h-4 text-emerald-600" />
                    <span>Descargar Plantilla (.xlsx)</span>
                  </button>

                  <div className="pt-2 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={handleLoadSamplePackage}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-amber-100/70 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold transition-colors cursor-pointer"
                      title="Cargar registros históricos de muestra con ventas y bonos para probar"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-[#B8922A]" />
                      <span>Cargar paquete demo histórico</span>
                    </button>
                  </div>
                </div>
              </div>

              {parseError && (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{parseError}</span>
                </div>
              )}

              {/* KPI Summary Cards */}
              {resumen && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5">
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Total en Archivo</span>
                      <span className="text-xl font-black text-slate-900">{resumen.totalLeidas}</span>
                    </div>

                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                      <span className="text-[10px] uppercase font-bold text-emerald-700 block">Nuevas a Cargar</span>
                      <span className="text-xl font-black text-emerald-800">{resumen.validas}</span>
                    </div>

                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200">
                      <span className="text-[10px] uppercase font-bold text-rose-700 block">Duplicadas (Omitir)</span>
                      <span className="text-xl font-black text-rose-800">{resumen.duplicadas}</span>
                    </div>

                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                      <span className="text-[10px] uppercase font-bold text-amber-800 block">Citas con Venta</span>
                      <span className="text-xl font-black text-amber-900">{resumen.conVenta}</span>
                    </div>

                    <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
                      <span className="text-[10px] uppercase font-bold text-blue-700 block">Monto Ventas</span>
                      <span className="text-xl font-black text-blue-900">{formatCurrency(resumen.montoTotalVentas)}</span>
                    </div>

                    <div className="p-3 rounded-xl bg-purple-50 border border-purple-200">
                      <span className="text-[10px] uppercase font-bold text-purple-700 block">Bonos Totales</span>
                      <span className="text-xl font-black text-purple-900">{formatCurrency(resumen.montoTotalBonos)}</span>
                    </div>
                  </div>

                  {/* Filter Toolbar for Preview Table */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="text-slate-400 font-bold mr-1">Mostrar:</span>
                      {[
                        { id: 'todas', label: `Todas (${parsedRows.length})` },
                        { id: 'validas', label: `Nuevas (${resumen.validas})` },
                        { id: 'duplicadas', label: `Duplicadas (${resumen.duplicadas})` },
                        { id: 'ventas', label: `Con Venta (${resumen.conVenta})` },
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setPreviewFilter(tab.id as any)}
                          className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                            previewFilter === tab.id
                              ? 'bg-[#0D2240] text-white shadow-2xs'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Filtrar por prospecto, teléfono..."
                      className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0D2240]"
                    />
                  </div>

                  {/* Preview Table */}
                  <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-72 overflow-y-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="sticky top-0 bg-slate-100 border-b border-slate-200 text-slate-600 font-bold text-[11px]">
                        <tr>
                          <th className="py-2.5 px-3">Estado / Acción</th>
                          <th className="py-2.5 px-3">Fecha</th>
                          <th className="py-2.5 px-3">Hora</th>
                          <th className="py-2.5 px-3">Prospecto</th>
                          <th className="py-2.5 px-3">Teléfono</th>
                          <th className="py-2.5 px-3">Telemarketing</th>
                          <th className="py-2.5 px-3">Resultado</th>
                          <th className="py-2.5 px-3">Venta ($)</th>
                          <th className="py-2.5 px-3">Bono ($)</th>
                          <th className="py-2.5 px-3">Comisión</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {filteredPreviewRows.slice(0, 50).map((row, idx) => (
                          <tr
                            key={idx}
                            className={`hover:bg-slate-50 transition-colors ${
                              row.esDuplicada ? 'bg-rose-50/40 text-slate-500' : ''
                            }`}
                          >
                            <td className="py-2 px-3">
                              {row.esDuplicada ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800">
                                  <AlertTriangle className="w-3 h-3" />
                                  <span>Duplicada (Omitir)</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>{row.esNuevoProspecto ? 'Nuevo Lead' : 'Lead Vinculado'}</span>
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3 font-semibold text-slate-800">{formatDateDisplay(row.fechaCita)}</td>
                            <td className="py-2 px-3 text-slate-600">{row.horaCita || '-'}</td>
                            <td className="py-2 px-3 font-bold text-slate-900">{row.nombreProspecto}</td>
                            <td className="py-2 px-3 font-mono text-slate-600">{row.telefono}</td>
                            <td className="py-2 px-3 font-medium text-slate-700">{row.telemarketing || 'SIN ASIGNAR'}</td>
                            <td className="py-2 px-3">
                              {row.resultado ? (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-slate-100 text-slate-800 border border-slate-200">
                                  {row.resultado}
                                </span>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>
                            <td className="py-2 px-3 font-bold text-emerald-700">
                              {row.montoAprobado ? formatCurrency(row.montoAprobado) : '-'}
                            </td>
                            <td className="py-2 px-3 font-bold text-purple-700">
                              {row.bonoGenerado ? formatCurrency(row.bonoGenerado) : '-'}
                            </td>
                            <td className="py-2 px-3">
                              {row.montoAprobado ? (
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                    row.estadoPago === 'Pagada'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}
                                >
                                  {row.estadoPago || 'Pendiente'}
                                </span>
                              ) : (
                                '-'
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {filteredPreviewRows.length > 50 && (
                    <p className="text-[11px] text-slate-400 text-right">
                      Mostrando las primeras 50 filas de {filteredPreviewRows.length} en vista previa.
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!importResult && (
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isImporting}
              className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            {resumen && resumen.validas > 0 && (
              <button
                type="button"
                onClick={handleExecuteImport}
                disabled={isImporting}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#0D2240] hover:bg-[#14325a] text-white text-xs font-bold shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                {isImporting ? (
                  <>
                    <Clock className="w-4 h-4 animate-spin text-[#B8922A]" />
                    <span>Guardando registros en la base de datos...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-[#B8922A]" />
                    <span>Incorporar {resumen.validas} Citas Nuevas</span>
                    {resumen.duplicadas > 0 && (
                      <span className="text-[10px] text-slate-300 font-normal">
                        ({resumen.duplicadas} duplicadas se omitirán)
                      </span>
                    )}
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
