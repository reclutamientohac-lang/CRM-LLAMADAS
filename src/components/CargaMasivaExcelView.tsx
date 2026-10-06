import React, { useState, useRef, useMemo } from 'react';
import {
  FileSpreadsheet,
  Upload,
  Download,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  Users,
  ChevronRight,
  Filter,
  ArrowRight,
  Shield,
  Clock,
  Undo2,
  FileCheck,
  FileX,
  FileQuestion,
  HelpCircle,
} from 'lucide-react';
import { useCRM } from '../context/CRMContext';
import { useAuth } from '../context/AuthContext';
import {
  ExcelRowItem,
  ExcelRowStatus,
  ImportOptions,
  LogCarga,
} from '../types';
import {
  downloadExcelTemplate,
  downloadSampleTestFile,
  downloadErrorReport,
  parseAndValidateExcel,
} from '../excelUtils';
import { formatDateTimeLA, SIN_ASIGNAR } from '../businessRules';

export const CargaMasivaExcelView: React.FC = () => {
  const {
    prospectos,
    settings,
    importExcelBatch,
    undoBatch,
    logsCargas,
  } = useCRM();
  const { isSupervisor, userProfile, user } = useAuth();

  const fileInputRef = useRef<HTMLInputElement>(null);

  // File loading state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  // Validated rows from Excel
  const [parsedRows, setParsedRows] = useState<ExcelRowItem[]>([]);
  const [counts, setCounts] = useState({
    total: 0,
    validas: 0,
    advertencias: 0,
    duplicadas: 0,
    errores: 0,
  });

  // Table status filter
  const [statusFilter, setStatusFilter] = useState<'todos' | 'validas' | 'advertencias' | 'duplicadas' | 'errores'>('todos');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Import options
  const activeAgents = useMemo(
    () => settings.telemarketingAgents.filter((a) => a.active).map((a) => a.name),
    [settings.telemarketingAgents]
  );

  const [importOptions, setImportOptions] = useState<ImportOptions>({
    sinTelemarketingModo: 'conservar',
    agenteAsignado: activeAgents[0] || 'GERAL',
    agentesReparto: activeAgents,
    propietarioPorDefecto: '',
    excluirAdvertencias: false,
  });

  // Import execution state
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [importResult, setImportResult] = useState<{
    idLote: string;
    savedCount: number;
    duplicateCount: number;
    errorCount: number;
    rejectedRows: ExcelRowItem[];
  } | null>(null);

  // Undo confirmation state
  const [undoLoteId, setUndoLoteId] = useState<string | null>(null);
  const [isUndoing, setIsUndoing] = useState(false);
  const [undoFeedback, setUndoFeedback] = useState<{ success: boolean; text: string } | null>(null);

  // Drag and drop state
  const [isDragOver, setIsDragOver] = useState(false);

  // Rows that qualify for import
  const rowsToImport = useMemo(() => {
    return parsedRows.filter((r) => {
      if (r.status === 'error' || r.status === 'duplicada_base' || r.status === 'duplicada_archivo') {
        return false;
      }
      if (importOptions.excluirAdvertencias && r.status === 'advertencia') {
        return false;
      }
      return true;
    });
  }, [parsedRows, importOptions.excluirAdvertencias]);

  // Rows rejected (for export report)
  const rejectedRows = useMemo(() => {
    return parsedRows.filter((r) => {
      if (r.status === 'error' || r.status === 'duplicada_base' || r.status === 'duplicada_archivo') {
        return true;
      }
      if (importOptions.excluirAdvertencias && r.status === 'advertencia') {
        return true;
      }
      return false;
    });
  }, [parsedRows, importOptions.excluirAdvertencias]);

  // Filtered rows for the preview table
  const displayedRows = useMemo(() => {
    return parsedRows.filter((r) => {
      if (statusFilter === 'todos') return true;
      if (statusFilter === 'validas') return r.status === 'valida';
      if (statusFilter === 'advertencias') return r.status === 'advertencia';
      if (statusFilter === 'duplicadas') return r.status === 'duplicada_base' || r.status === 'duplicada_archivo';
      if (statusFilter === 'errores') return r.status === 'error';
      return true;
    });
  }, [parsedRows, statusFilter]);

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return displayedRows.slice(start, start + pageSize);
  }, [displayedRows, page]);

  const totalPages = Math.ceil(displayedRows.length / pageSize) || 1;

  // File selection or drop handler
  const handleFileProcess = async (file: File) => {
    setParseError(null);
    setSelectedFile(file);
    setIsParsing(true);
    setImportResult(null);

    const activeList = settings.telemarketingAgents.filter((a) => a.active).map((a) => a.name);
    const res = await parseAndValidateExcel(file, prospectos, activeList);

    setIsParsing(false);

    if (res.error) {
      setParseError(res.error);
      setParsedRows([]);
      setCounts({ total: 0, validas: 0, advertencias: 0, duplicadas: 0, errores: 0 });
    } else {
      setParsedRows(res.rows);
      setCounts(res.counts);
      setPage(1);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileProcess(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileProcess(file);
    }
  };

  const handleResetFile = () => {
    setSelectedFile(null);
    setParsedRows([]);
    setParseError(null);
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Execution of the import
  const handleExecuteImport = async () => {
    if (rowsToImport.length === 0) return;
    setIsImporting(true);
    setImportProgress(5);
    setShowConfirmModal(false);

    const metadata = {
      filename: selectedFile?.name || 'archivo_prospectos.xlsx',
      totalRead: counts.total,
      totalDuplicates: counts.duplicadas,
      totalErrors: counts.errores + (importOptions.excluirAdvertencias ? counts.advertencias : 0),
    };

    const res = await importExcelBatch(
      rowsToImport,
      importOptions,
      metadata,
      (progress) => {
        setImportProgress(progress);
      }
    );

    setIsImporting(false);

    if (res.success) {
      setImportResult({
        idLote: res.idLote,
        savedCount: res.savedCount,
        duplicateCount: counts.duplicadas,
        errorCount: counts.errores,
        rejectedRows,
      });
      // Limpiar archivo actual para evitar re-importación accidental
      setParsedRows([]);
    } else {
      setParseError(res.error || 'Error al completar la importación.');
    }
  };

  // Handle undo batch
  const handleConfirmUndo = async (idLote: string) => {
    setIsUndoing(true);
    setUndoFeedback(null);
    const res = await undoBatch(idLote);
    setIsUndoing(false);
    setUndoLoteId(null);

    if (res.success) {
      setUndoFeedback({
        success: true,
        text: `Lote ${idLote} revertido exitosamente: se archivaron ${res.count} prospecto(s) en estado "Nuevo".`,
      });
    } else {
      setUndoFeedback({
        success: false,
        text: res.error || 'No se pudo revertir el lote.',
      });
    }
  };

  const getStatusBadge = (status: ExcelRowStatus) => {
    switch (status) {
      case 'valida':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>Válida</span>
          </span>
        );
      case 'advertencia':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            <span>Advertencia</span>
          </span>
        );
      case 'duplicada_base':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-800 border border-orange-300">
            <span>Duplicada en base</span>
          </span>
        );
      case 'duplicada_archivo':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-800 border border-orange-300">
            <span>Duplicada en archivo</span>
          </span>
        );
      case 'error':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
            <AlertCircle className="w-3 h-3 text-rose-600" />
            <span>Error</span>
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header and Download Buttons */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#B8922A] uppercase tracking-wider mb-1">
            <FileSpreadsheet className="w-4 h-4" />
            <span>Etapa 2: Importación Masiva</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0D2240] tracking-tight">
            Carga Masiva por Excel
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Importa hasta 5.000 prospectos por archivo con validación fila por fila, detección de duplicados, asignación de telemarketing y registro de auditoría.
          </p>
        </div>

        {/* Template and Test Sample Download Actions */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => downloadExcelTemplate(activeAgents)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-[#0D2240] border border-slate-300 font-bold text-xs shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-[#B8922A]" />
            <span>Descargar Plantilla Oficial (.xlsx)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const existingPhones = prospectos.map((p) => p.telefono).filter(Boolean);
              downloadSampleTestFile(existingPhones);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0D2240] hover:bg-[#163665] text-white font-bold text-xs shadow-md shadow-slate-900/10 transition-colors cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-[#B8922A]" />
            <span>Descargar Ejemplo de Prueba (20 filas)</span>
          </button>
        </div>
      </div>

      {/* Undo Feedback Message */}
      {undoFeedback && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between gap-3 text-xs sm:text-sm font-semibold animate-in fade-in duration-200 ${
            undoFeedback.success
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-300'
              : 'bg-rose-50 text-rose-900 border border-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {undoFeedback.success ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span>{undoFeedback.text}</span>
          </div>
          <button
            onClick={() => setUndoFeedback(null)}
            className="text-slate-400 hover:text-slate-600 p-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Final Success Screen After Import */}
      {importResult && (
        <div className="bg-emerald-50 border-2 border-emerald-500/40 rounded-2xl p-6 sm:p-8 shadow-sm space-y-4 animate-in fade-in duration-300">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/20">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 mb-1">
                <span>Lote: {importResult.idLote}</span>
              </div>
              <h2 className="text-xl font-extrabold text-emerald-950">
                ¡Importación masiva completada con éxito!
              </h2>
              <p className="text-sm text-emerald-800">
                Se crearon <strong className="text-emerald-950 font-black">{importResult.savedCount}</strong> nuevos prospectos en el sistema en estado <strong>&quot;Nuevo&quot;</strong> y temperatura <strong>&quot;Hot&quot;</strong>.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="p-3.5 bg-white rounded-xl border border-emerald-200">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Prospectos Creados
              </span>
              <div className="text-2xl font-black text-emerald-600">{importResult.savedCount}</div>
            </div>

            <div className="p-3.5 bg-white rounded-xl border border-emerald-200">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Duplicados Omitidos
              </span>
              <div className="text-2xl font-black text-orange-600">{importResult.duplicateCount}</div>
            </div>

            <div className="p-3.5 bg-white rounded-xl border border-emerald-200">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Errores Omitidos
              </span>
              <div className="text-2xl font-black text-rose-600">{importResult.errorCount}</div>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-emerald-200/80">
            {importResult.rejectedRows.length > 0 ? (
              <button
                type="button"
                onClick={() =>
                  downloadErrorReport(
                    importResult.rejectedRows,
                    `reporte_rechazados_${importResult.idLote}.xlsx`
                  )
                }
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-sm transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Descargar reporte de errores y duplicados ({importResult.rejectedRows.length})</span>
              </button>
            ) : (
              <span className="text-xs text-emerald-800 font-semibold">
                ✓ 100% de las filas del archivo fueron válidas. No hubo rechazos.
              </span>
            )}

            <button
              type="button"
              onClick={handleResetFile}
              className="px-5 py-2.5 rounded-xl bg-[#0D2240] hover:bg-[#163665] text-white font-bold text-xs shadow-sm transition-colors cursor-pointer"
            >
              Cargar otro archivo Excel
            </button>
          </div>
        </div>
      )}

      {/* Parse Error Banner */}
      {parseError && (
        <div className="p-5 bg-rose-50 border-2 border-rose-300 rounded-2xl flex items-start gap-3 text-rose-900 shadow-sm animate-in fade-in duration-200">
          <AlertCircle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-rose-950">No se pudo procesar el archivo</h4>
            <p className="text-xs sm:text-sm font-medium text-rose-800">{parseError}</p>
          </div>
        </div>
      )}

      {/* Step 1: Upload Dropzone if no parsed rows */}
      {!parsedRows.length && !importResult && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`bg-white rounded-3xl border-2 border-dashed p-10 sm:p-14 text-center transition-all cursor-pointer shadow-sm ${
            isDragOver
              ? 'border-[#B8922A] bg-amber-50/50 scale-[1.005]'
              : 'border-slate-300 hover:border-[#0D2240] hover:bg-slate-50/50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx, .xls, .csv"
            onChange={handleFileInputChange}
            className="hidden"
          />

          <div className="max-w-md mx-auto space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-[#0D2240]/5 text-[#0D2240] flex items-center justify-center mx-auto shadow-xs">
              <Upload className="w-8 h-8 text-[#B8922A]" />
            </div>

            <div>
              <h3 className="text-lg font-extrabold text-[#0D2240]">
                Arrastra tu archivo Excel aquí o haz clic para buscar
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Admite formatos <strong>.xlsx</strong>, <strong>.xls</strong> y <strong>.csv</strong> (hasta 5.000 filas).
              </p>
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
              <span>Reconocimiento inteligente de columnas sin importar mayúsculas ni orden</span>
            </div>

            {isParsing && (
              <div className="pt-2 flex items-center justify-center gap-2 text-xs font-bold text-[#0D2240]">
                <div className="w-4 h-4 border-2 border-[#0D2240] border-t-transparent rounded-full animate-spin" />
                <span>Analizando y validando filas en el navegador...</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 2: Preview & Validation Table */}
      {parsedRows.length > 0 && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* File Header and Reset */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#0D2240] text-[#B8922A] flex items-center justify-center font-bold">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#0D2240] truncate max-w-sm">
                  {selectedFile?.name}
                </h3>
                <p className="text-xs text-slate-400">
                  {counts.total} filas leídas • Vista previa antes de confirmar
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleResetFile}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold cursor-pointer self-start sm:self-auto"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Cambiar archivo</span>
            </button>
          </div>

          {/* Counters Summary Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {/* Total */}
            <button
              onClick={() => {
                setStatusFilter('todos');
                setPage(1);
              }}
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                statusFilter === 'todos'
                  ? 'bg-[#0D2240] text-white border-[#0D2240] shadow-sm'
                  : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-800'
              }`}
            >
              <span className={`text-[10px] font-bold uppercase tracking-wider ${statusFilter === 'todos' ? 'text-slate-300' : 'text-slate-400'}`}>
                Total Leídas
              </span>
              <div className="text-xl sm:text-2xl font-black mt-0.5">{counts.total}</div>
            </button>

            {/* Válidas */}
            <button
              onClick={() => {
                setStatusFilter('validas');
                setPage(1);
              }}
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                statusFilter === 'validas'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-emerald-50/70 border-emerald-200 hover:bg-emerald-100 text-emerald-900'
              }`}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider">
                ✓ Válidas
              </span>
              <div className="text-xl sm:text-2xl font-black mt-0.5">{counts.validas}</div>
            </button>

            {/* Advertencias */}
            <button
              onClick={() => {
                setStatusFilter('advertencias');
                setPage(1);
              }}
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                statusFilter === 'advertencias'
                  ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                  : 'bg-amber-50/70 border-amber-200 hover:bg-amber-100 text-amber-900'
              }`}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider">
                ⚠️ Advertencias
              </span>
              <div className="text-xl sm:text-2xl font-black mt-0.5">{counts.advertencias}</div>
            </button>

            {/* Duplicadas */}
            <button
              onClick={() => {
                setStatusFilter('duplicadas');
                setPage(1);
              }}
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                statusFilter === 'duplicadas'
                  ? 'bg-orange-600 text-white border-orange-600 shadow-sm'
                  : 'bg-orange-50/70 border-orange-200 hover:bg-orange-100 text-orange-900'
              }`}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider">
                🚫 Duplicadas
              </span>
              <div className="text-xl sm:text-2xl font-black mt-0.5">{counts.duplicadas}</div>
            </button>

            {/* Errores */}
            <button
              onClick={() => {
                setStatusFilter('errores');
                setPage(1);
              }}
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer col-span-2 sm:col-span-1 ${
                statusFilter === 'errores'
                  ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                  : 'bg-rose-50/70 border-rose-200 hover:bg-rose-100 text-rose-900'
              }`}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider">
                ✕ Errores
              </span>
              <div className="text-xl sm:text-2xl font-black mt-0.5">{counts.errores}</div>
            </button>
          </div>

          {/* Options Before Importing (Supervisor Only) */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/90 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <Shield className="w-4 h-4 text-[#B8922A]" />
              <h3 className="text-sm font-extrabold text-[#0D2240] uppercase tracking-wider">
                Opciones de Importación
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Telemarketing assignment rule */}
              <div className="space-y-2 md:col-span-2">
                <label className="block text-xs font-bold text-slate-700">
                  Regla para filas sin telemarketing o con agente inexistente:
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="sinTelemarketingModo"
                      value="conservar"
                      checked={importOptions.sinTelemarketingModo === 'conservar'}
                      onChange={() =>
                        setImportOptions((p) => ({ ...p, sinTelemarketingModo: 'conservar' }))
                      }
                      className="text-[#0D2240]"
                    />
                    <span>Conservar como <strong>&quot;SIN ASIGNAR&quot;</strong></span>
                  </label>

                  <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="sinTelemarketingModo"
                      value="asignar_uno"
                      checked={importOptions.sinTelemarketingModo === 'asignar_uno'}
                      onChange={() =>
                        setImportOptions((p) => ({ ...p, sinTelemarketingModo: 'asignar_uno' }))
                      }
                      className="text-[#0D2240]"
                    />
                    <span>Asignar todas las filas sin telemarketing a una agente elegida:</span>
                  </label>

                  {importOptions.sinTelemarketingModo === 'asignar_uno' && (
                    <div className="pl-6 pt-1">
                      <select
                        value={importOptions.agenteAsignado}
                        onChange={(e) =>
                          setImportOptions((p) => ({ ...p, agenteAsignado: e.target.value }))
                        }
                        className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold bg-white text-[#0D2240]"
                      >
                        {activeAgents.map((ag) => (
                          <option key={ag} value={ag}>
                            Agente: {ag}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="sinTelemarketingModo"
                      value="repartir"
                      checked={importOptions.sinTelemarketingModo === 'repartir'}
                      onChange={() =>
                        setImportOptions((p) => ({ ...p, sinTelemarketingModo: 'repartir' }))
                      }
                      className="text-[#0D2240]"
                    />
                    <span>Repartir equitativamente (round-robin) entre las siguientes agentes:</span>
                  </label>

                  {importOptions.sinTelemarketingModo === 'repartir' && (
                    <div className="pl-6 pt-1 flex flex-wrap gap-2">
                      {activeAgents.map((ag) => {
                        const isChecked = importOptions.agentesReparto.includes(ag);
                        return (
                          <label
                            key={ag}
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border cursor-pointer transition-all ${
                              isChecked
                                ? 'bg-[#0D2240] text-white border-[#0D2240]'
                                : 'bg-slate-50 text-slate-600 border-slate-200'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setImportOptions((p) => ({
                                    ...p,
                                    agentesReparto: [...p.agentesReparto, ag],
                                  }));
                                } else {
                                  setImportOptions((p) => ({
                                    ...p,
                                    agentesReparto: p.agentesReparto.filter((item) => item !== ag),
                                  }));
                                }
                              }}
                              className="sr-only"
                            />
                            <span>{ag}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Default owner & warning exclusion */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Propietario por defecto (si viene vacío):
                  </label>
                  <input
                    type="text"
                    value={importOptions.propietarioPorDefecto}
                    onChange={(e) =>
                      setImportOptions((p) => ({ ...p, propietarioPorDefecto: e.target.value }))
                    }
                    placeholder="Ej: Emprendedor Principal"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs outline-none focus:border-[#0D2240]"
                  />
                </div>

                <div className="pt-1">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={importOptions.excluirAdvertencias}
                      onChange={(e) =>
                        setImportOptions((p) => ({
                          ...p,
                          excluirAdvertencias: e.target.checked,
                        }))
                      }
                      className="rounded text-[#0D2240]"
                    />
                    <span>Excluir filas con advertencias (por defecto se incluyen)</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Action Button & Confirmation */}
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-slate-500">
                Se importarán <strong className="text-slate-900 font-bold">{rowsToImport.length}</strong> prospectos. Las {counts.duplicadas} filas duplicadas y {counts.errores} con errores nunca se importan.
              </div>

              <div className="flex items-center gap-2.5">
                {rejectedRows.length > 0 && (
                  <button
                    type="button"
                    onClick={() => downloadErrorReport(rejectedRows, `reporte_previo_${selectedFile?.name || 'excel'}.xlsx`)}
                    className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-bold text-xs transition-colors cursor-pointer"
                  >
                    Descargar Rechazados ({rejectedRows.length})
                  </button>
                )}

                <button
                  type="button"
                  disabled={rowsToImport.length === 0 || isImporting}
                  onClick={() => setShowConfirmModal(true)}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#0D2240] hover:bg-[#163665] text-white font-extrabold text-xs shadow-md shadow-slate-900/10 transition-all cursor-pointer disabled:opacity-40"
                >
                  <FileCheck className="w-4 h-4 text-[#B8922A]" />
                  <span>Confirmar Importación ({rowsToImport.length})</span>
                </button>
              </div>
            </div>
          </div>

          {/* Preview Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/90 overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600">
              <div className="font-bold text-slate-800">
                Vista previa: Mostrando {paginatedRows.length} de {displayedRows.length} filas
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px]">Filtro:</span>
                <span className="font-bold capitalize text-[#0D2240]">{statusFilter}</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#0D2240] text-white uppercase tracking-wider font-bold text-[11px]">
                    <th className="py-3 px-3 w-16 text-center">Fila</th>
                    <th className="py-3 px-4">Estado</th>
                    <th className="py-3 px-4">Nombre</th>
                    <th className="py-3 px-4">Teléfono (Normalizado)</th>
                    <th className="py-3 px-4">Propietario</th>
                    <th className="py-3 px-4">Telemarketing</th>
                    <th className="py-3 px-4">Ciudad</th>
                    <th className="py-3 px-4">Mensajes / Motivo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                  {paginatedRows.map((r) => {
                    return (
                      <tr
                        key={r.rowNumber}
                        className={`hover:bg-slate-50 transition-colors ${
                          r.status === 'error'
                            ? 'bg-rose-50/30'
                            : r.status.startsWith('duplicada')
                            ? 'bg-orange-50/30'
                            : r.status === 'advertencia'
                            ? 'bg-amber-50/30'
                            : ''
                        }`}
                      >
                        <td className="py-3 px-3 text-center font-mono font-bold text-slate-500">
                          {r.rowNumber}
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          {getStatusBadge(r.status)}
                        </td>

                        <td className="py-3 px-4 font-bold text-slate-900">
                          {r.nombre || <span className="text-rose-500 italic">Vacío</span>}
                        </td>

                        <td className="py-3 px-4 font-mono">
                          <div>{r.telefonoNormalizado || <span className="text-rose-500 italic">Inválido</span>}</div>
                          {r.telefono !== r.telefonoNormalizado && (
                            <span className="text-[10px] text-slate-400 block">
                              Orig: {r.telefono}
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          {r.propietario || <span className="text-slate-400 italic">Sin dueño</span>}
                        </td>

                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded font-bold text-[11px] bg-slate-100 text-slate-700">
                            {r.telemarketing || SIN_ASIGNAR}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          {r.ciudadZona || <span className="text-slate-400">-</span>}
                        </td>

                        <td className="py-3 px-4 text-[11px]">
                          {r.messages.length > 0 ? (
                            <ul className="space-y-0.5">
                              {r.messages.map((m, idx) => (
                                <li
                                  key={idx}
                                  className={
                                    r.status === 'error'
                                      ? 'text-rose-700 font-semibold'
                                      : r.status.startsWith('duplicada')
                                      ? 'text-orange-800 font-semibold'
                                      : 'text-amber-800'
                                  }
                                >
                                  • {m}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <span className="text-emerald-700 font-semibold">Listo para importar</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
                <span>
                  Página <strong>{page}</strong> de <strong>{totalPages}</strong>
                </span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-semibold disabled:opacity-40 hover:bg-slate-50 cursor-pointer"
                  >
                    Anterior
                  </button>
                  <button
                    disabled={page === totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-semibold disabled:opacity-40 hover:bg-slate-50 cursor-pointer"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Modal Before Batch Import */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs"
            onClick={() => !isImporting && setShowConfirmModal(false)}
          />
          <div className="relative bg-white rounded-3xl p-6 sm:p-8 shadow-2xl max-w-lg w-full border border-slate-200 z-10 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-12 h-12 rounded-2xl bg-[#0D2240] text-[#B8922A] flex items-center justify-center font-bold">
                <FileCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-[#0D2240]">
                  Confirmar Importación Masiva
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedFile?.name}
                </p>
              </div>
            </div>

            <div className="space-y-2.5 text-xs text-slate-700 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className="flex justify-between font-bold text-slate-900 text-sm">
                <span>Prospectos válidos que se crearán:</span>
                <span className="text-emerald-700">{rowsToImport.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Filas duplicadas que se omitirán:</span>
                <span className="text-orange-700 font-bold">{counts.duplicadas}</span>
              </div>
              <div className="flex justify-between">
                <span>Filas con errores que se omitirán:</span>
                <span className="text-rose-700 font-bold">
                  {counts.errores + (importOptions.excluirAdvertencias ? counts.advertencias : 0)}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-200">
                <span>Estado asignado:</span>
                <span className="font-semibold text-slate-800">Nuevo (Temperatura: Hot)</span>
              </div>
              <div className="flex justify-between">
                <span>Tipo de carga:</span>
                <span className="font-semibold text-slate-800">Excel</span>
              </div>
            </div>

            {isImporting && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-[#0D2240]">
                  <span>Guardando en base de datos...</span>
                  <span>{importProgress}%</span>
                </div>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                  <div
                    className="h-full bg-gradient-to-r from-[#0D2240] to-[#B8922A] transition-all duration-300"
                    style={{ width: `${importProgress}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isImporting}
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 border border-slate-300 rounded-xl hover:bg-slate-50 cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isImporting}
                onClick={handleExecuteImport}
                className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-[#0D2240] hover:bg-[#163665] rounded-xl shadow-md cursor-pointer disabled:opacity-50"
              >
                <span>{isImporting ? 'Importando Lotes...' : 'Sí, Importar Ahora'}</span>
                <ArrowRight className="w-4 h-4 text-[#B8922A]" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SECTION: Historial de Cargas (Supervisor Only) */}
      {isSupervisor && (
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200/90 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-extrabold text-[#0D2240] flex items-center gap-2">
                <Clock className="w-5 h-5 text-[#B8922A]" />
                <span>Historial de Cargas Masivas</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Registro de auditoría de cada importación. Permite verificar lotes y deshacer cargas sin alterar leads ya gestionados.
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg">
              {logsCargas.length} lote(s) registrados
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-[#0D2240] text-white uppercase tracking-wider font-bold text-[11px]">
                  <th className="py-3 px-4">Fecha y Hora</th>
                  <th className="py-3 px-4">ID de Lote</th>
                  <th className="py-3 px-4">Archivo / Usuario</th>
                  <th className="py-3 px-4 text-center">Filas Creadas</th>
                  <th className="py-3 px-4">Reparto / Asignación</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium bg-white">
                {logsCargas.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      Aún no hay importaciones masivas registradas en el historial.
                    </td>
                  </tr>
                ) : (
                  logsCargas.map((log) => {
                    const isReverting = isUndoing && undoLoteId === log.idLote;

                    return (
                      <tr
                        key={log.id}
                        className={`hover:bg-slate-50 transition-colors ${
                          log.deshecho ? 'opacity-65 bg-slate-50/50' : ''
                        }`}
                      >
                        <td className="py-3.5 px-4 font-semibold text-slate-800 whitespace-nowrap">
                          {formatDateTimeLA(log.fechaHora)}
                        </td>

                        <td className="py-3.5 px-4 font-mono font-bold text-[#0D2240]">
                          {log.idLote}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 truncate max-w-[180px]">
                            {log.nombreArchivo}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            {log.usuario}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800">
                            {log.filasCreadas}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-slate-600 text-[11px] max-w-[200px] truncate" title={log.repartoAplicado}>
                          {log.repartoAplicado}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          {log.deshecho ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-200 text-slate-700">
                              <span>Revertido</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                              <span>Activo</span>
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          {!log.deshecho ? (
                            <button
                              type="button"
                              onClick={() => setUndoLoteId(log.idLote)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer"
                              title="Deshacer carga: archiva prospectos que sigan en estado Nuevo"
                            >
                              <Undo2 className="w-3.5 h-3.5" />
                              <span>Deshacer</span>
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">Sin acciones</span>
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

      {/* Undo Batch Modal with Double Confirmation */}
      {undoLoteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs"
            onClick={() => !isUndoing && setUndoLoteId(null)}
          />
          <div className="relative bg-white rounded-3xl p-6 sm:p-8 shadow-2xl max-w-md w-full border border-slate-200 z-10 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center font-bold mx-auto">
              <Undo2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-lg font-extrabold text-slate-900">
                ¿Deshacer carga masiva de este lote?
              </h3>
              <p className="text-xs text-slate-500 font-mono">
                Lote: {undoLoteId}
              </p>
            </div>

            <div className="p-3.5 bg-rose-50 rounded-2xl border border-rose-200 text-xs text-rose-800 space-y-1">
              <p className="font-bold text-rose-900">Regla de seguridad:</p>
              <p>
                Solo se archivarán los prospectos de este lote que se encuentren en estado <strong>&quot;Nuevo&quot;</strong> y que <strong>no hayan tenido ningún intento de llamada</strong>. Los prospectos ya contactados o agendados se conservarán intactos.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-center gap-3">
              <button
                type="button"
                disabled={isUndoing}
                onClick={() => setUndoLoteId(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 border border-slate-300 rounded-xl hover:bg-slate-50 cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isUndoing}
                onClick={() => handleConfirmUndo(undoLoteId)}
                className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md transition-colors cursor-pointer disabled:opacity-50"
              >
                {isUndoing ? 'Revirtiendo...' : 'Confirmar Reversión'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
