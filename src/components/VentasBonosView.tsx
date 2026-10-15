import './VentasBonosView.css';
import { truncateDecimal, sumMoney, percentageNumber } from '../money';
import { PrintReport } from './AgendaView';
import React, { useState, useMemo, useEffect } from 'react';
import {
  Award,
  Calendar,
  Filter,
  Search,
  Save,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  History,
  Ban,
  Clock,
  User,
  Phone,
  DollarSign,
  Percent,
  X,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
  AlertTriangle,
  RotateCcw,
  Check,
} from 'lucide-react';
import { useCRM } from '../context/CRMContext';
import { useAuth } from '../context/AuthContext';
import {
  Venta,
  LogVenta,
  EstadoVenta,
  Prospecto,
  Cita,
  PresetRango,
} from '../types';
import {
  formatDateDisplay,
  formatDateTimeLA,
  formatPhoneDisplay,
  formatCurrency,
  formatPercentageDisplay,
  parseCurrencyInput,
  parsePercentageInput,
  calculateBonoGenerado,
  calculateBonoPagable,
  getEstadoVentaBadgeClass,
  getDateRangePreset,
  isInDateRangeLA,
  getDateInLA,
  getTodayInLA,
} from '../businessRules';
import { exportDashboardDrillDownToExcel } from '../excelUtils';

interface VentasBonosViewProps {
  onOpenProspectoDetail?: (prospecto: Prospecto) => void;
  onOpenCitaDetail?: (cita: Cita) => void;
}

interface VentaEditRow {
  id: string;
  idProspecto: string;
  idCita: string;
  fechaCita: string;
  horaCita: string;
  telemarketing: string;
  nombreProspecto: string;
  telefonoProspecto: string;
  montoAprobadoStr: string;
  porcentajeBonoStr: string;
  estado: EstadoVenta;
  observacion: string;
  bonoGenerado: number | null;
  bonoPagable: number;
  estadoPago: 'Pagada' | 'Pendiente';
  fechaPagoHistorico?: string | null;
  bonoPagadoHistorico?: number | null;
  original: Venta;
  isModified: boolean;
  errors: string[];
}

export const VentasBonosView: React.FC<VentasBonosViewProps> = ({
  onOpenProspectoDetail,
  onOpenCitaDetail,
}) => {
  const { ventas, citas, prospectos, logsVentas, settings, actualizarVentas, cancelarVenta } = useCRM();
  const { isSupervisor, isAdmin } = useAuth();

  // Filtros de fecha (aplicados a la FECHA DE LA CITA)
  const initialPreset = useMemo(() => getDateRangePreset('mes'), []);
  const [desde, setDesde] = useState<string>('');
  const [hasta, setHasta] = useState<string>('');
  const [activePreset, setActivePreset] = useState<PresetRango | 'custom' | 'todos'>('todos');

  const [filtroTelemarketing, setFiltroTelemarketing] = useState<string>('TODAS');
  const [filtroPago, setFiltroPago] = useState('TODOS');
  const [filtroEstado, setFiltroEstado] = useState<string>('TODOS');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Estado local editable de filas
  const [editableRows, setEditableRows] = useState<Record<string, VentaEditRow>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [concurrencyConflicts, setConcurrencyConflicts] = useState<string[]>([]);
  const [globalValidationErrors, setGlobalValidationErrors] = useState<string[]>([]);

  // Modales
  const [historyVentaId, setHistoryVentaId] = useState<string | null>(null);
  const [cancelModalVenta, setCancelModalVenta] = useState<Venta | null>(null);
  const [cancelMotivo, setCancelMotivo] = useState<string>('');
  const [isCanceling, setIsCanceling] = useState(false);

  // Modal Directo de Cambio de Estatus de Comisión (Pendiente <-> Pagada)
  const [pagoModalData, setPagoModalData] = useState<{
    ventaId: string;
    prospectoNombre: string;
    prospectoTelefono: string;
    telemarketing: string;
    fechaCita: string;
    montoAprobado: number | null;
    porcentajeBono: number | null;
    bonoGenerado: number | null;
    estadoPago: 'Pagada' | 'Pendiente';
    fechaPago: string;
    bonoPagado: number | null;
    observacion: string;
    originalVenta: Venta;
  } | null>(null);
  const [isSavingDirectPago, setIsSavingDirectPago] = useState(false);

  // Mapeos rápidos para citas y prospectos
  const citasMap = useMemo(() => {
    const map = new Map<string, Cita>();
    citas.forEach((c) => map.set(c.id, c));
    return map;
  }, [citas]);

  const prospectosMap = useMemo(() => {
    const map = new Map<string, Prospecto>();
    prospectos.forEach((p) => map.set(p.id, p));
    return map;
  }, [prospectos]);

  // Lista de agentes configuradas
  const activeTelemarketings = useMemo(() => {
    return [...new Set([...settings.telemarketingAgents.map(a=>a.name),...ventas.map(v=>v.telemarketing)].filter(Boolean))].sort().map(name=>({id:name,name}));
  }, [settings.telemarketingAgents, ventas]);

  // Sincronizar estado local con ventas remotas si no están modificadas
  useEffect(() => {
    setEditableRows((prev) => {
      const next: Record<string, VentaEditRow> = { ...prev };

      ventas.forEach((v) => {
        const cita = citasMap.get(v.idCita);
        const pros = prospectosMap.get(v.idProspecto);

        const fechaCita = cita?.fechaCita || v.fechaReporte;
        const horaCita = cita?.horaCita || '';
        const nombreProspecto = pros?.nombre || `Prospecto #${v.idProspecto.slice(-4)}`;
        const telefonoProspecto = pros?.telefono || '';

        const montoStr = v.montoAprobado !== null && v.montoAprobado !== undefined ? String(v.montoAprobado) : '';
        const pctStr =
          v.porcentajeBono !== null && v.porcentajeBono !== undefined
            ? String(percentageNumber(v.porcentajeBono))
            : '';

        // Si ya está editándose localmente y fue modificada, preservar cambios del usuario
        if (next[v.id] && next[v.id].isModified) {
          next[v.id].original = v;
          return;
        }

        const estadoPago = v.estadoPagoHistorico === 'Pagada' ? 'Pagada' : 'Pendiente';
        const bGen = calculateBonoGenerado(v.montoAprobado, v.porcentajeBono);
        const bPag = calculateBonoPagable(v.estado, bGen, estadoPago);

        next[v.id] = {
          id: v.id,
          idProspecto: v.idProspecto,
          idCita: v.idCita,
          fechaCita,
          horaCita,
          telemarketing: v.telemarketing,
          nombreProspecto,
          telefonoProspecto,
          montoAprobadoStr: montoStr,
          porcentajeBonoStr: pctStr,
          estado: v.estado,
          observacion: v.observacion || '',
          bonoGenerado: bGen,
          bonoPagable: bPag,
          estadoPago,
          fechaPagoHistorico: v.fechaPagoHistorico || null,
          bonoPagadoHistorico: v.bonoPagadoHistorico ?? null,
          original: v,
          isModified: false,
          errors: [],
        };
      });

      return next;
    });
  }, [ventas, citasMap, prospectosMap]);

  // Manejar presets de fechas
  const handlePresetSelect = (preset: PresetRango) => {
    setActivePreset(preset);
    const range = getDateRangePreset(preset);
    setDesde(range.desde);
    setHasta(range.hasta);
  };

  // Filtrado de ventas según rango por FECHA DE CITA
  const filteredVentasList = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();

    return ventas.filter((v) => {
      const cita = citasMap.get(v.idCita);
      const fechaParaFiltro = cita?.fechaCita || v.fechaReporte;

      // 1. Rango por FECHA DE LA CITA
      const date = getDateInLA(fechaParaFiltro);
      if (activePreset !== 'todos' && ((!date && (desde || hasta)) || (desde && date < desde) || (hasta && date > hasta))) {
        return false;
      }

      if (filtroPago === 'Pagada' && v.estadoPagoHistorico !== 'Pagada') return false;
      if (filtroPago === 'Por pagar' && !(v.estado !== 'Cancelada' && v.estadoPagoHistorico !== 'Pagada' && (editableRows[v.id]?.bonoPagable ?? v.bonoPagable ?? 0) > 0)) return false;

      // 2. Filtro Telemarketing
      if (filtroTelemarketing !== 'TODAS') {
        if ((v.telemarketing || '').trim().toLowerCase() !== filtroTelemarketing.trim().toLowerCase()) {
          return false;
        }
      }

      // 3. Filtro Estado
      if (filtroEstado !== 'TODOS') {
        const rowState = editableRows[v.id]?.estado || v.estado;
        if (rowState !== filtroEstado) {
          return false;
        }
      }

      // 4. Búsqueda por prospecto o ID
      if (term) {
        const pros = prospectosMap.get(v.idProspecto);
        const pName = (pros?.nombre || '').toLowerCase();
        const pPhone = pros?.telefono || '';
        const vId = v.id.toLowerCase();
        const cId = v.idCita.toLowerCase();

        if (!pName.includes(term) && !pPhone.includes(term) && !vId.includes(term) && !cId.includes(term)) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      const cA = citasMap.get(a.idCita);
      const cB = citasMap.get(b.idCita);
      const fA = cA?.fechaCita || a.fechaReporte;
      const fB = cB?.fechaCita || b.fechaReporte;
      return fB.localeCompare(fA);
    });
  }, [ventas, citasMap, prospectosMap, desde, hasta, filtroTelemarketing, filtroEstado, filtroPago, activePreset, searchTerm, editableRows]);

  // Actualizar campo de fila localmente con cálculo reactivo inmediato
  const handleRowChange = (
    id: string,
    field: 'montoAprobadoStr' | 'porcentajeBonoStr' | 'estado' | 'observacion' | 'estadoPago' | 'fechaPagoHistorico',
    value: string
  ) => {
    setSaveSuccessMsg(null);
    setConcurrencyConflicts([]);
    setGlobalValidationErrors([]);

    setEditableRows((prev) => {
      const curr = prev[id];
      if (!curr) return prev;

      const next = { ...curr, [field]: value };

      // Validar montos y porcentajes
      const montoRes = parseCurrencyInput(next.montoAprobadoStr);
      const pctRes = parsePercentageInput(next.porcentajeBonoStr);

      const bGen = calculateBonoGenerado(montoRes.value, pctRes.ratio);

      if (field === 'estadoPago') {
        const estP = value as 'Pagada' | 'Pendiente';
        next.estadoPago = estP;
        if (estP === 'Pagada') {
          // Si la venta está pendiente pero ya tiene monto y porcentaje, facilitamos aprobándola
          if (next.estado === 'Pendiente' && montoRes.value && pctRes.ratio) {
            next.estado = 'Aprobada';
          }
          next.fechaPagoHistorico = next.fechaPagoHistorico || getTodayInLA();
          next.bonoPagadoHistorico = next.bonoPagadoHistorico ?? bGen;
        } else {
          next.fechaPagoHistorico = null;
          next.bonoPagadoHistorico = null;
        }
      }

      const bPag = calculateBonoPagable(next.estado, bGen, next.estadoPago);
      next.bonoGenerado = bGen;
      next.bonoPagable = bPag;

      // Detectar si difiere de original
      const origMonto = curr.original.montoAprobado !== null ? String(curr.original.montoAprobado) : '';
      const origPct =
        curr.original.porcentajeBono !== null
          ? String(percentageNumber(curr.original.porcentajeBono))
          : '';
      const origEstadoPago = curr.original.estadoPagoHistorico || 'Pendiente';
      const origFechaPago = curr.original.fechaPagoHistorico || '';

      const isModified =
        next.montoAprobadoStr !== origMonto ||
        next.porcentajeBonoStr !== origPct ||
        next.estado !== curr.original.estado ||
        next.estadoPago !== origEstadoPago ||
        (next.fechaPagoHistorico || '') !== origFechaPago ||
        next.observacion !== (curr.original.observacion || '');

      next.isModified = isModified;

      // Validación por fila
      const rowErrors: string[] = [];
      if (!montoRes.valid && montoRes.error) rowErrors.push(montoRes.error);
      if (!pctRes.valid && pctRes.error) rowErrors.push(pctRes.error);

      if (montoRes.value !== null && pctRes.ratio === null) {
        rowErrors.push('Si ingresas un monto, el porcentaje de bono es obligatorio.');
      }
      if (next.estado === 'Aprobada') {
        if (montoRes.value === null || montoRes.value <= 0) {
          rowErrors.push('Una venta "Aprobada" exige un monto válido mayor a 0.');
        }
        if (pctRes.ratio === null || pctRes.ratio <= 0) {
          rowErrors.push('Una venta "Aprobada" exige un porcentaje de bono válido.');
        }
      }
      if (next.estadoPago === 'Pagada' && next.estado !== 'Aprobada') {
        rowErrors.push('Para marcar la comisión como "Pagada", la venta debe estar "Aprobada".');
      }

      next.errors = rowErrors;

      return { ...prev, [id]: next };
    });
  };

  // Contar filas modificadas
  const modifiedCount = useMemo(() => {
    return Object.values(editableRows).filter((r) => r.isModified).length;
  }, [editableRows]);

  // Guardar cambios en batch
  const handleSaveChanges = async () => {
    setGlobalValidationErrors([]);
    setConcurrencyConflicts([]);
    setSaveSuccessMsg(null);

    const modifiedRows = Object.values(editableRows).filter((r) => r.isModified);
    if (modifiedRows.length === 0) return;

    // Verificar validaciones de todas las filas modificadas
    const allErrors: string[] = [];
    modifiedRows.forEach((r) => {
      const montoRes = parseCurrencyInput(r.montoAprobadoStr);
      const pctRes = parsePercentageInput(r.porcentajeBonoStr);

      if (!montoRes.valid && montoRes.error) {
        allErrors.push(`Venta de ${r.nombreProspecto}: ${montoRes.error}`);
      }
      if (!pctRes.valid && pctRes.error) {
        allErrors.push(`Venta de ${r.nombreProspecto}: ${pctRes.error}`);
      }
      if (montoRes.value !== null && pctRes.ratio === null) {
        allErrors.push(`Venta de ${r.nombreProspecto}: Si hay monto, el porcentaje es obligatorio.`);
      }
      if (r.estado === 'Aprobada') {
        if (montoRes.value === null || montoRes.value <= 0) {
          allErrors.push(`Venta de ${r.nombreProspecto}: Una venta "Aprobada" exige monto aprobado.`);
        }
        if (pctRes.ratio === null || pctRes.ratio <= 0) {
          allErrors.push(`Venta de ${r.nombreProspecto}: Una venta "Aprobada" exige porcentaje de bono.`);
        }
      }
    });

    if (allErrors.length > 0) {
      setGlobalValidationErrors(allErrors);
      return;
    }

    setIsSaving(true);
    const payload = modifiedRows.map((r) => {
      const montoRes = parseCurrencyInput(r.montoAprobadoStr);
      const pctRes = parsePercentageInput(r.porcentajeBonoStr);
      const bGen = calculateBonoGenerado(montoRes.value, pctRes.ratio);

      return {
        id: r.id,
        montoAprobado: montoRes.value,
        porcentajeBono: pctRes.ratio,
        estado: r.estado,
        observacion: r.observacion.trim(),
        ultimaActualizacionOriginal: r.original.ultimaActualizacion,
        estadoPagoHistorico: r.estadoPago,
        bonoPagadoHistorico: r.estadoPago === 'Pagada' ? (r.bonoPagadoHistorico ?? bGen ?? 0) : null,
        fechaPagoHistorico: r.estadoPago === 'Pagada' ? (r.fechaPagoHistorico || getTodayInLA()) : null,
      };
    });

    const res = await actualizarVentas(payload);
    setIsSaving(false);

    if (res.success) {
      if (res.conflicts && res.conflicts.length > 0) {
        setConcurrencyConflicts(res.conflicts);
      }
      setSaveSuccessMsg(`Se guardaron exitosamente ${res.updatedCount} venta(s).`);
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    } else {
      setGlobalValidationErrors([res.error || 'Error al guardar cambios.']);
    }
  };

  // Descartar cambios locales no guardados
  const handleDiscardChanges = () => {
    setSaveSuccessMsg(null);
    setGlobalValidationErrors([]);
    setConcurrencyConflicts([]);

    setEditableRows((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((id) => {
        const v = next[id].original;
        const bGen = calculateBonoGenerado(v.montoAprobado, v.porcentajeBono);
        const estP = v.estadoPagoHistorico === 'Pagada' ? 'Pagada' : 'Pendiente';
        const bPag = calculateBonoPagable(v.estado, bGen, estP);

        next[id] = {
          ...next[id],
          montoAprobadoStr: v.montoAprobado !== null ? String(v.montoAprobado) : '',
          porcentajeBonoStr:
            v.porcentajeBono !== null ? String(percentageNumber(v.porcentajeBono)) : '',
          estado: v.estado,
          observacion: v.observacion || '',
          bonoGenerado: bGen,
          bonoPagable: bPag,
          estadoPago: estP,
          fechaPagoHistorico: v.fechaPagoHistorico || null,
          bonoPagadoHistorico: v.bonoPagadoHistorico ?? null,
          isModified: false,
          errors: [],
        };
      });
      return next;
    });
  };

  // Manejar confirmación de cancelación de venta
  const handleConfirmCancelVenta = async () => {
    if (!cancelModalVenta) return;
    setIsCanceling(true);

    const res = await cancelarVenta(cancelModalVenta.id, cancelMotivo.trim());
    setIsCanceling(false);

    if (res.success) {
      setCancelModalVenta(null);
      setCancelMotivo('');
      setSaveSuccessMsg('La venta fue cancelada exitosamente.');
      setTimeout(() => setSaveSuccessMsg(null), 3000);
    } else {
      alert(`Error al cancelar venta: ${res.error}`);
    }
  };

  // Abrir Modal de Gestión de Pago de Comisión
  const handleOpenPagoModal = (v: Venta) => {
    const pros = prospectosMap.get(v.idProspecto);
    const cita = citasMap.get(v.idCita);
    const r = editableRows[v.id];

    const montoVal = r ? parseCurrencyInput(r.montoAprobadoStr).value : v.montoAprobado;
    const pctVal = r ? parsePercentageInput(r.porcentajeBonoStr).ratio : v.porcentajeBono;
    const bGen = r?.bonoGenerado ?? calculateBonoGenerado(montoVal, pctVal);
    const estPago = (r?.estadoPago || v.estadoPagoHistorico || 'Pendiente') as 'Pagada' | 'Pendiente';

    setPagoModalData({
      ventaId: v.id,
      prospectoNombre: pros?.nombre || `Prospecto #${v.idProspecto.slice(-4)}`,
      prospectoTelefono: pros?.telefono || '',
      telemarketing: v.telemarketing,
      fechaCita: cita?.fechaCita || v.fechaReporte,
      montoAprobado: montoVal,
      porcentajeBono: pctVal,
      bonoGenerado: bGen,
      estadoPago: estPago,
      fechaPago: r?.fechaPagoHistorico || v.fechaPagoHistorico || getTodayInLA(),
      bonoPagado: r?.bonoPagadoHistorico ?? v.bonoPagadoHistorico ?? bGen ?? 0,
      observacion: r?.observacion || v.observacion || '',
      originalVenta: v,
    });
  };

  // Confirmar y guardar directamente el cambio de estatus de comisión en Firestore
  const handleConfirmDirectPago = async () => {
    if (!pagoModalData) return;
    setIsSavingDirectPago(true);
    setSaveSuccessMsg(null);

    try {
      const v = pagoModalData.originalVenta;
      const targetEstadoPago = pagoModalData.estadoPago;
      const bGen = pagoModalData.bonoGenerado ?? calculateBonoGenerado(pagoModalData.montoAprobado, pagoModalData.porcentajeBono);

      const res = await actualizarVentas([
        {
          id: v.id,
          montoAprobado: pagoModalData.montoAprobado,
          porcentajeBono: pagoModalData.porcentajeBono,
          estado:
            targetEstadoPago === 'Pagada' && v.estado === 'Pendiente' && pagoModalData.montoAprobado
              ? 'Aprobada'
              : v.estado,
          observacion: pagoModalData.observacion.trim(),
          ultimaActualizacionOriginal: v.ultimaActualizacion,
          estadoPagoHistorico: targetEstadoPago,
          bonoPagadoHistorico: targetEstadoPago === 'Pagada' ? (pagoModalData.bonoPagado ?? bGen ?? 0) : null,
          fechaPagoHistorico: targetEstadoPago === 'Pagada' ? (pagoModalData.fechaPago || getTodayInLA()) : null,
        },
      ]);

      if (res.success) {
        setSaveSuccessMsg(
          `¡Comisión de ${pagoModalData.prospectoNombre} actualizada a "${targetEstadoPago}" con éxito!`
        );
        setTimeout(() => setSaveSuccessMsg(null), 4000);

        // Actualizar estado local
        setEditableRows((prev) => {
          const curr = prev[v.id];
          if (!curr) return prev;
          return {
            ...prev,
            [v.id]: {
              ...curr,
              estadoPago: targetEstadoPago,
              fechaPagoHistorico: targetEstadoPago === 'Pagada' ? (pagoModalData.fechaPago || getTodayInLA()) : null,
              bonoPagadoHistorico: targetEstadoPago === 'Pagada' ? (pagoModalData.bonoPagado ?? bGen ?? 0) : null,
              isModified: false,
            },
          };
        });
        setPagoModalData(null);
      } else {
        alert(res.error || 'Error al guardar el estatus de comisión.');
      }
    } catch (err: any) {
      alert(err.message || 'Error al actualizar comisión.');
    } finally {
      setIsSavingDirectPago(false);
    }
  };

  // Totales de las filas filtradas
  const totals = useMemo(() => {
    let countVentas = filteredVentasList.length;
    let totalMonto = 0;
    let totalBonoGen = 0;
    let totalBonoPag = 0;
    let totalComisionesPagadas = 0;
    let countComisionesPagadas = 0;

    filteredVentasList.forEach((v) => {
      const r = editableRows[v.id];
      const monto = r ? parseCurrencyInput(r.montoAprobadoStr).value || 0 : v.montoAprobado || 0;
      const bGen = r ? r.bonoGenerado || 0 : v.bonoGenerado || 0;
      const bPag = r ? r.bonoPagable || 0 : v.bonoPagable || 0;
      const estPago = r ? r.estadoPago : (v.estadoPagoHistorico || 'Pendiente');

      totalMonto = sumMoney([totalMonto, monto]);
      totalBonoGen = sumMoney([totalBonoGen, bGen]);
      totalBonoPag = sumMoney([totalBonoPag, bPag]);

      if (estPago === 'Pagada') {
        countComisionesPagadas++;
        totalComisionesPagadas = sumMoney([totalComisionesPagadas, (r?.bonoPagadoHistorico ?? v.bonoPagadoHistorico ?? bGen ?? 0)]);
      }
    });

    return {
      countVentas,
      totalMonto,
      totalBonoGen,
      totalBonoPag,
      totalComisionesPagadas,
      countComisionesPagadas,
    };
  }, [filteredVentasList, editableRows]);

  // Tarjetas superiores por estado (sobre la totalidad del período analizado)
  const kpisCards = useMemo(() => {
    const list = filteredVentasList;

    const pendientes = list.filter((v) => (editableRows[v.id]?.estado || v.estado) === 'Pendiente');
    const aprobadas = list.filter((v) => (editableRows[v.id]?.estado || v.estado) === 'Aprobada');
    const canceladas = list.filter((v) => (editableRows[v.id]?.estado || v.estado) === 'Cancelada');
    const pagadas = list.filter((v) => (editableRows[v.id]?.estadoPago || v.estadoPagoHistorico) === 'Pagada');

    const montoPend = sumMoney(pendientes.map((v) => {
      const r = editableRows[v.id];
      return (r ? parseCurrencyInput(r.montoAprobadoStr).value || 0 : v.montoAprobado || 0);
    }));

    const montoAprob = sumMoney(aprobadas.map((v) => {
      const r = editableRows[v.id];
      return (r ? parseCurrencyInput(r.montoAprobadoStr).value || 0 : v.montoAprobado || 0);
    }));

    const bonoPagableAprob = sumMoney(aprobadas.map((v) => {
      const r = editableRows[v.id];
      return (r ? r.bonoPagable || 0 : v.bonoPagable || 0);
    }));

    const montoComisionesPagadas = sumMoney(pagadas.map((v) => {
      const r = editableRows[v.id];
      const bGen = r ? r.bonoGenerado || 0 : v.bonoGenerado || 0;
      return (r?.bonoPagadoHistorico ?? v.bonoPagadoHistorico ?? bGen ?? 0);
    }));

    return {
      pendientesCount: pendientes.length,
      montoPend,
      aprobadasCount: aprobadas.length,
      montoAprob,
      bonoPagableAprob,
      canceladasCount: canceladas.length,
      pagadasCount: pagadas.length,
      montoComisionesPagadas,
    };
  }, [filteredVentasList, editableRows]);

  // Exportar a Excel con totales
  const handleExportExcel = () => {
    try {
      const rows: Record<string, any>[] = filteredVentasList.map((v, idx) => {
        const r = editableRows[v.id];
        const pros = prospectosMap.get(v.idProspecto);
        const cita = citasMap.get(v.idCita);

        const monto = r ? parseCurrencyInput(r.montoAprobadoStr).value : v.montoAprobado;
        const pct = r ? parsePercentageInput(r.porcentajeBonoStr).ratio : v.porcentajeBono;
        const bGen = r ? r.bonoGenerado : v.bonoGenerado;
        const bPag = r ? r.bonoPagable : v.bonoPagable;
        const st = r ? r.estado : v.estado;

        return {
          '#': idx + 1,
          'ID Venta': v.id,
          'Fecha Cita': cita?.fechaCita || v.fechaReporte,
          'Hora Cita': cita?.horaCita || '',
          Telemarketing: v.telemarketing,
          Prospecto: pros?.nombre || '',
          Teléfono: pros?.telefono || '',
          'Monto Aprobado ($)': monto !== null ? monto : 0,
          '% Bono': pct !== null ? `${percentageNumber(pct)}%` : '-',
          'Estado Venta': st,
          'Bono Generado ($)': bGen !== null ? bGen : 0,
          'Saldo Por Pagar ($)': bPag,
          'Estatus Comisión': (r?.estadoPago || v.estadoPagoHistorico) === 'Pagada' ? 'Pagada' : 'Pendiente',
          'Fecha de Pago': (r?.estadoPago || v.estadoPagoHistorico) === 'Pagada' ? (r?.fechaPagoHistorico || v.fechaPagoHistorico || 'Registrada') : '-',
          'Bono Pagado ($)': (r?.estadoPago || v.estadoPagoHistorico) === 'Pagada' ? (r?.bonoPagadoHistorico ?? v.bonoPagadoHistorico ?? bGen ?? 0) : 0,
          Observación: r?.observacion || v.observacion || '',
          'Última Actualización': formatDateTimeLA(v.ultimaActualizacion),
        };
      });

      // Fila de resumen total
      rows.push({
        '#': 'TOTALES',
        'ID Venta': `${totals.countVentas} ventas`,
        'Fecha Cita': '',
        'Hora Cita': '',
        Telemarketing: '',
        Prospecto: '',
        Teléfono: '',
        'Monto Aprobado ($)': totals.totalMonto,
        '% Bono': '',
        'Estado Venta': '',
        'Bono Generado ($)': totals.totalBonoGen,
        'Saldo Por Pagar ($)': totals.totalBonoPag,
        'Estatus Comisión': `Pagadas: ${totals.countComisionesPagadas}`,
        'Fecha de Pago': '',
        'Bono Pagado ($)': totals.totalComisionesPagadas,
        Observación: '',
        'Última Actualización': '',
      });

      exportDashboardDrillDownToExcel(
        activePreset === 'todos' ? 'Ventas_Bonos_Todo_el_historial' : `Ventas_Bonos_${desde || 'inicio'}_al_${hasta || 'hoy'}`,
        rows
      );
    } catch (err: any) {
      alert(`Error exportando a Excel: ${err.message}`);
    }
  };

  // Historial de cambios de la venta seleccionada
  const selectedVentaLogs = useMemo(() => {
    if (!historyVentaId) return [];
    return logsVentas.filter((l) => l.idVenta === historyVentaId);
  }, [historyVentaId, logsVentas]);

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <ShieldAlert className="w-16 h-16 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-800">Acceso Restringido</h2>
        <p className="text-sm text-slate-500">
          El módulo de <strong>Ventas y Bonos</strong> es exclusivo para el Administrador.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200 pb-16">
      <PrintReport title="Ventas y bonos"
        filters={`Fecha de cita: ${desde || 'Inicio'} a ${hasta || 'Todo el historial'} · Telemarketing: ${filtroTelemarketing} · Estado: ${filtroEstado} · Pago: ${filtroPago} · Búsqueda: ${searchTerm || 'Todas'}`}
        columns={['Fecha cita', 'Prospecto', 'Telemarketing', 'Monto aprobado', 'Estado venta', 'Bono generado', 'Bono por pagar', 'Pago histórico']}
        rows={filteredVentasList.map(v => [formatDateDisplay(citasMap.get(v.idCita)?.fechaCita || v.fechaReporte), prospectosMap.get(v.idProspecto)?.nombre || v.idProspecto, v.telemarketing, v.montoAprobado == null ? 'No registrado' : formatCurrency(v.montoAprobado), v.estado, v.bonoGenerado == null ? 'No registrado' : formatCurrency(v.bonoGenerado), formatCurrency(v.bonoPagable), v.estadoPagoHistorico === 'Pagada' ? `Pagada · ${formatCurrency(v.bonoPagadoHistorico || 0)}` : 'Sin pago registrado'])}
        summary={`${modifiedCount > 0 ? 'ATENCIÓN: hay cambios sin guardar; este reporte contiene únicamente los datos guardados. ' : ''}Total ventas: ${filteredVentasList.length} · Monto aprobado: ${formatCurrency(sumMoney(filteredVentasList.map(v => v.montoAprobado)))} · Bonos por pagar: ${formatCurrency(sumMoney(filteredVentasList.map(v => v.bonoPagable)))} · Bonos pagados históricos: ${formatCurrency(sumMoney(filteredVentasList.filter(v=>v.estadoPagoHistorico==='Pagada').map(v=>v.bonoPagadoHistorico)))}`}
      />
      <div className="flex flex-wrap items-center gap-3 print:hidden">
        <button type="button" disabled={modifiedCount > 0 || isSaving} onClick={() => window.print()} className="px-4 py-2 rounded-xl bg-[#0D2240] text-white font-bold disabled:opacity-50">Imprimir / PDF</button>
        <span className="text-xs text-slate-500">{modifiedCount > 0 ? 'Guarda o descarta los cambios antes de imprimir.' : 'Incluye todas las ventas filtradas y sus totales. Selecciona Guardar como PDF en el diálogo.'}</span>
      </div>
      {/* HEADER */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200/90 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0D2240] to-[#163665] text-[#B8922A] flex items-center justify-center font-black shadow-md">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-[#0D2240] tracking-tight">
                Ventas / Bonos
              </h1>
              <span className="text-[10px] uppercase font-extrabold px-2.5 py-0.5 rounded-full bg-[#B8922A]/15 text-[#91721e] border border-[#B8922A]/30">
                Gestión y Liquidación
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Control de montos aprobados, cálculo de bonos e historial de auditoría
            </p>
          </div>
        </div>

        {/* Acciones principales: Guardar cambios y Exportar */}
        <div className="flex items-center gap-2.5">
          {modifiedCount > 0 && (
            <button
              type="button"
              onClick={handleDiscardChanges}
              className="px-3.5 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
            >
              Descartar
            </button>
          )}

          <button
            type="button"
            onClick={handleSaveChanges}
            disabled={isSaving || modifiedCount === 0}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-extrabold text-xs shadow-md transition-all cursor-pointer ${
              modifiedCount > 0
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white animate-pulse'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Guardando...' : `Guardar cambios (${modifiedCount})`}</span>
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0D2240] hover:bg-[#163665] text-white font-extrabold text-xs shadow-md transition-colors cursor-pointer"
            title="Exportar a Excel"
          >
            <FileSpreadsheet className="w-4 h-4 text-[#B8922A]" />
            <span className="hidden sm:inline">Exportar a Excel</span>
          </button>
        </div>
      </div>

      {/* AVISOS DE ÉXITO O CONFLICTO */}
      {saveSuccessMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 font-bold text-xs flex items-center gap-2.5 animate-in fade-in duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {concurrencyConflicts.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs space-y-1.5 animate-in fade-in duration-200">
          <div className="flex items-center gap-2 font-bold text-amber-950">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Aviso de Concurrencia (datos actualizados por otro usuario):</span>
          </div>
          <ul className="list-disc pl-6 space-y-0.5 text-amber-800">
            {concurrencyConflicts.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>
      )}

      {globalValidationErrors.length > 0 && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-300 text-rose-900 text-xs space-y-1.5 animate-in fade-in duration-200">
          <div className="flex items-center gap-2 font-bold text-rose-950">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>Por favor corrige las siguientes validaciones antes de guardar:</span>
          </div>
          <ul className="list-disc pl-6 space-y-0.5 text-rose-800">
            {globalValidationErrors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* TARJETAS SUPERIORES POR ESTADO */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pendientes */}
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-amber-200/90 relative overflow-hidden">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-amber-800 uppercase tracking-tight">
              Ventas Pendientes
            </span>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">
              {kpisCards.pendientesCount}
            </span>
          </div>
          <div className="text-2xl font-black text-amber-950">
            {formatCurrency(kpisCards.montoPend)}
          </div>
          <div className="text-[11px] text-amber-700/80 mt-1">
            Pendiente de aprobación de venta
          </div>
        </div>

        {/* Aprobadas */}
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-emerald-200/90 relative overflow-hidden">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-tight">
              Ventas Aprobadas
            </span>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900">
              {kpisCards.aprobadasCount}
            </span>
          </div>
          <div className="text-2xl font-black text-emerald-950">
            {formatCurrency(kpisCards.montoAprob)}
          </div>
          <div className="text-[11px] text-emerald-700 font-bold mt-1">
            Monto aprobado en ventas
          </div>
        </div>

        {/* Comisiones Pagadas */}
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-blue-200/90 relative overflow-hidden">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-blue-800 uppercase tracking-tight">
              Comisiones Pagadas
            </span>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-100 text-blue-900">
              {kpisCards.pagadasCount}
            </span>
          </div>
          <div className="text-2xl font-black text-blue-950">
            {formatCurrency(kpisCards.montoComisionesPagadas)}
          </div>
          <div className="text-[11px] text-blue-700 font-bold mt-1">
            Comisiones marcadas como Pagadas
          </div>
        </div>

        {/* Saldo Por Pagar */}
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-[#B8922A]/40 relative overflow-hidden">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-[#0D2240] uppercase tracking-tight">
              Saldo Por Pagar
            </span>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-[#0D2240]">
              {formatCurrency(kpisCards.bonoPagableAprob)}
            </span>
          </div>
          <div className="text-2xl font-black text-[#0D2240]">
            {formatCurrency(kpisCards.bonoPagableAprob)}
          </div>
          <div className="text-[11px] text-slate-500 font-medium mt-1">
            Bonos aprobados pendientes de pagar
          </div>
        </div>
      </div>

      {/* BANNER GUÍA DE PAGO DE COMISIONES */}
      <div className="rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-300 p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">💰</span>
            <strong className="text-emerald-950 text-sm sm:text-base font-black">
              ¿Cómo cambiar el estatus a una comisión de Pendiente a Pagada?
            </strong>
          </div>
          <p className="text-xs text-emerald-800 mt-1.5 leading-relaxed max-w-2xl">
            Toca el botón <strong>"💰 Gestionar Pago"</strong> o <strong>"Pagar"</strong> en la fila de cualquier venta (o en su tarjeta si estás en celular). En la ventana emergente podrás seleccionar <strong>"Pagada"</strong>, confirmar la fecha de pago y guardar de inmediato con un solo clic.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
            onClick={() => {
              setActivePreset('todos');
              setDesde('');
              setHasta('');
              setFiltroPago('Por pagar');
              setFiltroEstado('TODOS');
              setFiltroTelemarketing('TODAS');
              setSearchTerm('');
            }}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Ver Por Pagar ({kpisCards.aprobadasCount})</span>
          </button>
          <button
            type="button"
            className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-black transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
            onClick={() => {
              setActivePreset('todos');
              setDesde('');
              setHasta('');
              setFiltroPago('Pagada');
              setFiltroEstado('TODOS');
              setFiltroTelemarketing('TODAS');
              setSearchTerm('');
            }}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Ver Ya Pagadas ({kpisCards.pagadasCount})</span>
          </button>
        </div>
      </div>
      {/* FILTROS */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200/90 space-y-4">
        {/* Atajos de fecha */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <Calendar className="w-4 h-4 text-[#B8922A]" />
            <span>Filtro por Período:</span>
            <span className="ml-1 text-[11px] font-extrabold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
              El rango se aplica por fecha de cita
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button type="button" className="px-3 py-1.5 rounded-xl bg-slate-100 text-xs font-bold" aria-pressed={activePreset==='todos'} onClick={()=>{setActivePreset('todos');setDesde('');setHasta('');}}>Todo el historial</button>
            {[
              { id: 'hoy', label: 'Hoy' },
              { id: 'ayer', label: 'Ayer' },
              { id: 'semana', label: 'Esta semana' },
              { id: 'mes', label: 'Este mes' },
              { id: 'mes_anterior', label: 'Mes anterior' },
              { id: 'ultimos_30', label: 'Últimos 30 días' },
            ].map((p) => {
              const active = activePreset === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handlePresetSelect(p.id as PresetRango)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                    active
                      ? 'bg-[#0D2240] text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Inputs de filtros */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Fecha Cita Desde:
            </label>
            <input
              type="date"
              value={desde}
              onChange={(e) => {
                setActivePreset('custom');
                setDesde(e.target.value);
              }}
              className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 focus:border-[#0D2240] outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Fecha Cita Hasta:
            </label>
            <input
              type="date"
              value={hasta}
              onChange={(e) => {
                setActivePreset('custom');
                setHasta(e.target.value);
              }}
              className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 focus:border-[#0D2240] outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Telemarketing:
            </label>
            <select
              value={filtroTelemarketing}
              onChange={(e) => setFiltroTelemarketing(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:border-[#0D2240] outline-none"
            >
              <option value="TODAS">Todo el equipo</option>
              {activeTelemarketings.map((a) => (
                <option key={a.id} value={a.name}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Estado de la Venta:
            </label>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:border-[#0D2240] outline-none"
            >
              <option value="TODOS">Todos los estados</option>
              <option value="Pendiente">Pendiente</option>
              <option value="Aprobada">Aprobada</option>
              <option value="Cancelada">Cancelada</option>
            </select>
          </div>

          <div><label className="block text-[11px] font-bold text-slate-600 mb-1" htmlFor="estado-pago">Pago del bono</label><select id="estado-pago" className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-300 text-xs" value={filtroPago} onChange={e=>setFiltroPago(e.target.value)}><option value="TODOS">Todos los pagos</option><option value="Pagada">Pagados históricos</option><option value="Por pagar">Con saldo por pagar</option></select></div>
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Buscar Prospecto / ID:
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Nombre, tel, ID..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:border-[#0D2240] outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* TABLA EDITABLE DE VENTAS */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200/90 overflow-hidden space-y-0">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="font-extrabold text-[#0D2240]">
            Listado de Ventas ({filteredVentasList.length} registros)
          </div>
          <div className="text-slate-500 text-[11px]">
            * Los cálculos de bono generado y bono pagable se actualizan en vivo al editar los campos.
          </div>
        </div>

        <div className="sales-ledger w-full min-w-0">
          <table className="w-full table-fixed text-left text-xs">
            
            <colgroup><col style={{width: '10%'}} /><col style={{width: '8%'}} /><col style={{width: '16%'}} /><col style={{width: '10%'}} /><col style={{width: '7%'}} /><col style={{width: '10%'}} /><col style={{width: '9%'}} /><col style={{width: '9%'}} /><col style={{width: '11%'}} /><col style={{width: '10%'}} /></colgroup>
            <thead>
              <tr className="bg-[#0D2240] text-white uppercase font-bold text-[11px] tracking-wider">
                <th className="py-3 px-3.5">Fecha Cita</th>
                <th className="py-3 px-3.5">Telemarketing</th>
                <th className="py-3 px-3.5">Prospecto</th>
                <th className="py-3 px-3.5">Monto Aprobado ($)</th>
                <th className="py-3 px-3.5">% Bono</th>
                <th className="py-3 px-3.5">Estado Venta</th>
                <th className="py-3 px-3.5 text-right">Bono Generado</th>
                <th className="py-3 px-3.5 text-right">Saldo Por Pagar</th>
                <th className="py-3 px-3.5">Estatus Comisión</th>
                <th className="py-3 px-3.5 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {filteredVentasList.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    No se encontraron ventas para este rango de fecha de cita y filtros.
                  </td>
                </tr>
              ) : (
                filteredVentasList.map((v) => {
                  const r = editableRows[v.id];
                  if (!r) return null;

                  const pros = prospectosMap.get(v.idProspecto);
                  const cita = citasMap.get(v.idCita);
                  const hasErrors = r.errors.length > 0;

                  return (
                    <tr
                      key={v.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        r.isModified ? 'bg-amber-50/40' : ''
                      } ${hasErrors ? 'bg-rose-50/40' : ''}`}
                    >
                      {/* Fecha Cita */}
                      <td data-label="Fecha Cita" className="py-3 px-3.5 font-bold text-slate-900 font-mono">
                        <div>{formatDateDisplay(r.fechaCita)}</div>
                        {r.horaCita && <div className="text-[10px] text-slate-400">{r.horaCita}</div>}
                      </td>

                      {/* Telemarketing */}
                      <td data-label="Telemarketing" className="py-3 px-3.5 font-extrabold text-[#0D2240]">
                        {v.telemarketing}
                      </td>

                      {/* Prospecto */}
                      <td data-label="Prospecto" className="py-3 px-3.5">
                        <div className="font-bold text-slate-900">{r.nombreProspecto}</div>
                        {r.telefonoProspecto && (
                          <div className="text-[11px] text-slate-400 font-mono">
                            {formatPhoneDisplay(r.telefonoProspecto)}
                          </div>
                        )}
                      </td>

                      {/* Monto Aprobado (Editable) */}
                      <td data-label="Monto Aprobado ($)" className="py-3 px-3.5">
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                          <input
                            type="text"
                            value={r.montoAprobadoStr}
                            onChange={(e) => handleRowChange(v.id, 'montoAprobadoStr', e.target.value)}
                            placeholder="0.00"
                            className="w-full pl-6 pr-2 py-1.5 bg-white rounded-lg border border-slate-300 font-mono font-bold text-xs focus:border-[#0D2240] outline-none"
                          />
                        </div>
                      </td>

                      {/* % Bono (Editable, ej 1.5 significa 1.5%) */}
                      <td data-label="% Bono" className="py-3 px-3.5">
                        <div className="relative">
                          <input
                            type="text"
                            value={r.porcentajeBonoStr}
                            onChange={(e) => handleRowChange(v.id, 'porcentajeBonoStr', e.target.value)}
                            placeholder="1.5"
                            className="w-full pl-2 pr-6 py-1.5 bg-white rounded-lg border border-slate-300 font-mono font-bold text-xs focus:border-[#0D2240] outline-none"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
                        </div>
                      </td>

                      {/* Estado Venta */}
                      <td data-label="Estado Venta" className="py-3 px-3.5">
                        <select
                          value={r.estado}
                          onChange={(e) => handleRowChange(v.id, 'estado', e.target.value as EstadoVenta)}
                          className={`w-full px-2 py-1.5 rounded-lg border font-bold text-xs ${getEstadoVentaBadgeClass(
                            r.estado
                          )}`}
                        >
                          <option value="Pendiente">Pendiente</option>
                          <option value="Aprobada">Aprobada</option>
                          <option value="Cancelada">Cancelada</option>
                        </select>
                      </td>

                      {/* Bono Generado */}
                      <td data-label="Bono Generado" className="py-3 px-3.5 text-right font-mono font-extrabold text-slate-700">
                        {r.bonoGenerado !== null ? formatCurrency(r.bonoGenerado) : '-'}
                      </td>

                      {/* Saldo Por Pagar */}
                      <td data-label="Saldo Por Pagar" className="py-3 px-3.5 text-right font-mono font-black text-emerald-700">
                        {formatCurrency(r.bonoPagable)}
                      </td>

                      {/* Estatus Comisión (Pendiente vs Pagada) */}
                      <td data-label="Estatus Comisión" className="py-3 px-3.5">
                        <div className="space-y-1">
                          <select
                            value={r.estadoPago}
                            onChange={(e) => handleRowChange(v.id, 'estadoPago', e.target.value)}
                            className={`w-full px-2.5 py-1.5 rounded-lg border font-extrabold text-xs cursor-pointer ${
                              r.estadoPago === 'Pagada'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-400 ring-1 ring-emerald-500/20'
                                : r.estado === 'Aprobada'
                                ? 'bg-amber-50 text-amber-900 border-amber-300'
                                : 'bg-slate-50 text-slate-600 border-slate-200'
                            }`}
                          >
                            <option value="Pendiente">Pendiente</option>
                            <option value="Pagada">Pagada</option>
                          </select>
                          {r.estadoPago === 'Pagada' && (
                            <div className="sales-payment-date flex items-center gap-1 text-[10px] text-emerald-800 font-semibold">
                              <span>Fecha:</span>
                              <input
                                type="date"
                                value={r.fechaPagoHistorico || getTodayInLA()}
                                onChange={(e) => handleRowChange(v.id, 'fechaPagoHistorico', e.target.value)}
                                className="px-1 py-0.5 bg-white border border-emerald-300 rounded text-[10px] font-mono outline-none"
                              />
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Acciones */}
                      <td data-label="Acciones" className="sales-actions py-3 px-3.5 text-center">
                        <div className="sales-action-buttons">
                        {/* Botón Rápido Cambiar Estatus Comisión a Pagada o Pendiente */}
                        {r.estadoPago !== 'Pagada' ? (
                          <button
                            type="button"
                            onClick={() => handleRowChange(v.id, 'estadoPago', 'Pagada')}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors cursor-pointer shadow-xs"
                            title="Cambiar estatus de comisión a Pagada"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Pagar</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleRowChange(v.id, 'estadoPago', 'Pendiente')}
                            className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                            title="Revertir comisión a Pendiente de pago"
                          >
                            <span>A Pendiente</span>
                          </button>
                        )}

                        {/* Botón Historial */}
                        <button
                          type="button"
                          onClick={() => setHistoryVentaId(v.id)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                          title="Ver historial de cambios (logVentas)"
                        >
                          <History className="w-3.5 h-3.5" />
                        </button>

                        {/* Botón Ver Prospecto */}
                        {pros && onOpenProspectoDetail && (
                          <button
                            type="button"
                            onClick={() => onOpenProspectoDetail(pros)}
                            className="p-1.5 rounded-lg bg-[#0D2240]/10 hover:bg-[#0D2240] text-[#0D2240] hover:text-white transition-colors cursor-pointer"
                            title="Ver prospecto"
                          >
                            <User className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Botón Cancelar Venta */}
                        {r.estado !== 'Cancelada' && (
                          <button
                            type="button"
                            onClick={() => {
                              setCancelModalVenta(v);
                              setCancelMotivo('');
                            }}
                            className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors cursor-pointer"
                            title="Cancelar esta venta"
                          >
                            <Ban className="w-3.5 h-3.5" />
                          </button>
                        )}
                      
                        </div>
                        {hasErrors && <p role="alert" className="mt-1 text-left text-[11px] font-bold text-rose-600">{r.errors[0]}</p>}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* FILA DE TOTALES FIJA AL PIE */}
            <tfoot>
              <tr className="bg-[#0D2240] text-white font-extrabold border-t-2 border-slate-300">
                <td data-label="Total ventas" colSpan={3} className="py-3.5 px-4 font-black tracking-wide text-white">
                  TOTALES ({totals.countVentas} ventas en período)
                </td>
                <td data-label="Monto aprobado" className="py-3.5 px-3.5 font-mono text-white font-black">
                  {formatCurrency(totals.totalMonto)}
                </td>
                <td data-label="Porcentaje" className="py-3.5 px-3.5 text-white font-mono">-</td>
                <td data-label="Estado" className="py-3.5 px-3.5 text-white font-mono">-</td>
                <td data-label="Bono generado" className="py-3.5 px-3.5 text-right font-mono text-amber-300 font-bold">
                  {formatCurrency(totals.totalBonoGen)}
                </td>
                <td data-label="Saldo por pagar" className="py-3.5 px-3.5 text-right font-mono text-emerald-300 font-black">
                  {formatCurrency(totals.totalBonoPag)}
                </td>
                <td data-label="Comisiones pagadas" className="py-3.5 px-3.5 font-mono text-blue-300 text-xs font-black">
                  Pagadas: {totals.countComisionesPagadas} ({formatCurrency(totals.totalComisionesPagadas)})
                </td>
                <td data-label="Cambios" colSpan={1} className="py-3.5 px-3.5 text-right text-xs text-slate-300">
                  {modifiedCount > 0 ? (
                    <span className="text-amber-300 font-bold">⚠ {modifiedCount} cambios pendientes</span>
                  ) : (
                    'Al día'
                  )}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* MODAL HISTORIAL DE AUDITORÍA (LOGVENTAS) */}
      {historyVentaId && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="bg-[#0D2240] text-white p-5 flex items-center justify-between shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-[#B8922A] text-[#0D2240]">
                    Auditoría
                  </span>
                  <span className="text-xs text-slate-300 font-mono">{historyVentaId}</span>
                </div>
                <h3 className="text-lg font-black text-white mt-1">Historial de Cambios de la Venta</h3>
              </div>
              <button
                type="button"
                onClick={() => setHistoryVentaId(null)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 flex-1 overflow-y-auto space-y-3">
              {selectedVentaLogs.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  No hay registros de cambios para esta venta todavía.
                </div>
              ) : (
                selectedVentaLogs.map((log) => (
                  <div key={log.id} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between font-semibold text-slate-600">
                      <div className="flex items-center gap-1.5 text-[#0D2240] font-bold">
                        <User className="w-3.5 h-3.5 text-[#B8922A]" />
                        <span>{log.usuario}</span>
                      </div>
                      <div className="text-[11px] font-mono text-slate-400">{log.fechaHora}</div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
                      <div className="p-2 bg-white rounded-xl border border-slate-200">
                        <div className="text-slate-400 font-sans text-[10px]">Anterior:</div>
                        <div>Monto: {formatCurrency(log.montoAnterior)}</div>
                        <div>% Bono: {formatPercentageDisplay(log.porcentajeAnterior)}</div>
                        <div>Estado: {log.estadoAnterior}</div>
                      </div>
                      <div className="p-2 bg-emerald-50/50 rounded-xl border border-emerald-200">
                        <div className="text-emerald-700 font-sans text-[10px] font-bold">Nuevo:</div>
                        <div className="font-bold text-slate-900">Monto: {formatCurrency(log.montoNuevo)}</div>
                        <div className="font-bold text-slate-900">% Bono: {formatPercentageDisplay(log.porcentajeNuevo)}</div>
                        <div className="font-bold text-slate-900">Estado: {log.estadoNuevo}</div>
                      </div>
                    </div>

                    {log.observacionNueva && (
                      <div className="text-[11px] text-slate-500 italic pt-0.5">
                        Nota: "{log.observacionNueva}"
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="p-4 bg-slate-100 border-t border-slate-200 text-right shrink-0">
              <button
                type="button"
                onClick={() => setHistoryVentaId(null)}
                className="px-5 py-2 rounded-xl bg-[#0D2240] hover:bg-[#14325a] text-white font-bold text-xs cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMACIÓN DE CANCELACIÓN */}
      {cancelModalVenta && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Ban className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-lg font-black text-slate-900">¿Cancelar esta venta?</h3>
              <p className="text-xs text-slate-500">
                La venta no será eliminada de la base de datos; su estado pasará a <strong>"Cancelada"</strong> y el bono pagable será $0.00.
              </p>
            </div>

            <div className="space-y-1.5 text-left">
              <label className="block text-xs font-bold text-slate-700">
                Motivo de cancelación (opcional):
              </label>
              <textarea
                value={cancelMotivo}
                onChange={(e) => setCancelMotivo(e.target.value)}
                placeholder="Ejemplo: Cliente desistió por temas presupuestales..."
                rows={3}
                className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-300 text-xs text-slate-800 focus:border-rose-600 outline-none"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCancelModalVenta(null)}
                disabled={isCanceling}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 cursor-pointer"
              >
                Volver
              </button>
              <button
                type="button"
                onClick={handleConfirmCancelVenta}
                disabled={isCanceling}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-md transition-colors cursor-pointer disabled:opacity-50"
              >
                {isCanceling ? 'Cancelando...' : 'Sí, cancelar venta'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

