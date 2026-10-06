/**
 * Tipos de datos para el CRM LLAMADAS
 * Etapa 1 & 2: Arquitectura extensible para telemarketing, agendamiento de citas y carga masiva por Excel
 */

export type Role = 'Administrador' | 'Supervisor' | 'Telemarketing';

export type Temperatura = 'Hot' | 'Tibio' | 'Frío' | '';

export type TipoCarga = 'Manual' | 'Formulario' | 'Excel';

export type ResultadoLlamada =
  | 'No contesta'
  | 'Buzón'
  | 'No interesado'
  | 'Llamar luego'
  | 'Cita'
  | 'Número desconectado/incorrecto';

export type EstadoCita = 'Agendada' | 'Realizada' | 'Reprogramada' | 'Cancelada';

export type ResultadoCita =
  | 'Venta'
  | 'No recibió'
  | 'Reprogramar'
  | 'Venta futura'
  | 'No interesada dio referencias'
  | 'No interesada sin referencias'
  | 'Cancelación';

export interface Retroalimentacion {
  id: string; // formato RETRO-aaaammddhhmmss-xxxx
  idCita: string;
  idProspecto: string;
  fecha: string; // momento del registro
  resultado: ResultadoCita;
  observacion: string;
  nuevaFecha?: string;
  nuevaHora?: string;
  fechaProximoContacto?: string;
  horaProximoContacto?: string;
  idVenta?: string;
  creadoPor: string;
  creadoEn?: string;
}

export type EstadoVenta = 'Pendiente' | 'Aprobada' | 'Cancelada';

export interface Venta {
  id: string; // formato VENTA-aaaammddhhmmss-xxxx
  idProspecto: string;
  idCita: string;
  fechaReporte: string;
  telemarketing: string;
  montoAprobado: number | null;
  estado: EstadoVenta;
  porcentajeBono: number | null; // guardado como fracción: 0.015 = 1,5%
  bonoGenerado: number | null;
  bonoPagable: number | null;
  ultimaActualizacion: string;
  observacion: string;
  modificadoPor?: string;
}

export interface LogVenta {
  id: string; // formato LOGVENTA-aaaammddhhmmss-xxxx
  idVenta: string;
  usuario: string;
  fechaHora: string;
  montoAnterior: number | null;
  montoNuevo: number | null;
  porcentajeAnterior: number | null;
  porcentajeNuevo: number | null;
  estadoAnterior: EstadoVenta;
  estadoNuevo: EstadoVenta;
  observacionAnterior?: string;
  observacionNueva?: string;
  tipoCambio?: 'ACTUALIZAR' | 'CANCELAR' | 'CREAR';
}

export interface ReglaComision {
  id: string;
  porcentaje: number; // guardado como fracción: 0.01 = 1%, 0.015 = 1.5%
  vigenteDesde: string; // YYYY-MM-DD
  vigenteHasta?: string; // YYYY-MM-DD opcional
  nota?: string;
  creadoPor?: string;
  creadoEn?: string;
}

export interface Gestion {
  id: string; // formato GES-aaaammddhhmmss-xxxx
  idProspecto: string;
  fechaHora: string; // Fecha y hora de la gestión
  telemarketing: string;
  canal: string; // "Llamada"
  resultado: ResultadoLlamada;
  efectivo: 'Sí' | 'No';
  observacion: string;
  fechaSeguimiento?: string; // YYYY-MM-DD
  horaSeguimiento?: string; // "10:30 AM", etc.
  idCita?: string; // ID de la cita creada o vacío
  creadoPor: string;
  creadoEn?: string; // ISO
}

export interface Cita {
  id: string; // formato CITA-aaaammddhhmmss-xxxx
  idProspecto: string;
  fechaCreacion: string; // ISO
  telemarketing: string;
  fechaCita: string; // YYYY-MM-DD
  horaCita: string; // texto AM/PM, ej. "3:30 PM"
  asunto: string;
  direccion: string;
  linkGoogleMaps: string; // https://www.google.com/maps/search/?api=1&query= + dirección codificada
  descripcion: string;
  quienAtiende: string;
  invitado: string;
  estadoCita: EstadoCita;
  idEventoCalendar: string; // vacío por ahora
  enlaceCalendar: string; // vacío por ahora
  ultimaActualizacion: string; // ISO
}

export interface Prospecto {
  id: string; // formato PROS-aaaammddhhmmss-xxxx
  idLote?: string; // ID del lote de carga masiva si proviene de Excel
  fechaRecepcion: string; // YYYY-MM-DD
  fechaProspeccion?: string; // YYYY-MM-DD opcional
  propietario: string; // dueño del lead / emprendedor
  tipoCarga: TipoCarga;
  tipoProspecto: string; // configurable
  origen: string; // lugar / referido / anfitrión / rifa, etc.
  nombre: string;
  telefono: string; // normalizado solo dígitos (sin 1 inicial si es de 11 dígitos)
  ciudadZona: string;
  telemarketing: string; // nombre de telemarketing o "SIN ASIGNAR"
  temperatura: Temperatura;
  contexto: string;
  llamadoPorEmprendedor: 'Sí' | 'No';
  ultimoContacto: string | null;
  ultimoResultado: string | null;
  intentos: number;
  contactosEfectivos: number;
  proximaAccion: string | null;
  fechaProximaAccion: string | null;
  idCita: string | null;
  estado: string; // "Nuevo", etc.
  observacion: string;
  creadoPor: string;
  creadoEn: string; // ISO
  modificadoEn: string; // ISO
  archivado: boolean;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: Role;
  telemarketingAgent?: string; // Vinculado a la lista de telemarketing si es rol Telemarketing
  photoURL?: string | null;
  activo?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UsuarioAutorizado {
  email: string; // ID del documento (correo en minúsculas)
  nombre: string;
  rol: 'Supervisor' | 'Telemarketing';
  telemarketingVinculada?: string; // Obligatoria si el rol es Telemarketing (ej: GERAL, IRENE, MAIRUT)
  activo: boolean; // true / false
  agregadoPor: string;
  fechaAlta: string;
  ultimoAcceso: string | null;
  desactivadoPor?: string | null;
  fechaDesactivacion?: string | null;
}

export interface SolicitudAcceso {
  id: string; // ID del documento (correo en minúsculas)
  email: string;
  nombre: string;
  fecha: string;
  estado: 'Pendiente' | 'Aprobada' | 'Rechazada';
  revisadoPor?: string;
  fechaRevision?: string;
}

export interface LogAcceso {
  id: string;
  fechaHora: string;
  accion:
    | 'ALTA'
    | 'ACTIVAR'
    | 'DESACTIVAR'
    | 'CAMBIAR_ROL'
    | 'CAMBIAR_TELEMARKETING'
    | 'ELIMINAR'
    | 'APROBAR_SOLICITUD'
    | 'RECHAZAR_SOLICITUD';
  realizadoPor: string;
  usuarioAfectado: string;
  detalles: string;
}

export interface TelemarketingAgentConfig {
  id: string;
  name: string;
  active: boolean;
}

export interface AppSettings {
  telemarketingAgents: TelemarketingAgentConfig[];
  tiposProspecto: string[];
  origenes: string[];
  estadosDisponibles: string[];
  reglasComision?: ReglaComision[];
  updatedAt: string;
  updatedBy?: string;
}

export type TabId =
  | 'trabajo'
  | 'prospectos'
  | 'cargar'
  | 'agenda'
  | 'accesos'
  | 'dashboard'
  | 'ventas'
  | 'individual'
  | 'consulta'
  | 'reportes'
  | 'respaldo'
  | 'configuracion';

export interface FilterState {
  search: string;
  telemarketing: string;
  estado: string;
  temperatura: string;
  propietario: string;
  tipo: string;
  origen: string;
  ciudad: string;
  fechaDesde: string;
  fechaHasta: string;
  lote: string; // Filtro por lote de carga masiva
  mostrarArchivados: boolean;
}

export type SortField =
  | 'fechaRecepcion'
  | 'nombre'
  | 'telefono'
  | 'telemarketing'
  | 'propietario'
  | 'temperatura'
  | 'estado'
  | 'ciudadZona'
  | 'idLote';

export type SortDirection = 'asc' | 'desc';

// --- ETAPA 2: CARGA MASIVA EXCEL & HISTORIAL ---

export interface LogCarga {
  id: string; // idLote
  idLote: string;
  fechaHora: string; // ISO timestamp
  usuario: string; // Email o nombre del usuario que cargó
  nombreArchivo: string;
  filasLeidas: number;
  filasCreadas: number;
  filasDuplicadas: number;
  filasError: number;
  repartoAplicado: string;
  deshecho?: boolean;
  deshechoEn?: string;
  deshechoPor?: string;
}

export type ExcelRowStatus =
  | 'valida'
  | 'advertencia'
  | 'error'
  | 'duplicada_base'
  | 'duplicada_archivo';

export interface ExcelRowItem {
  rowNumber: number;
  raw: Record<string, any>;
  propietario: string;
  fechaProspeccion: string;
  tipoProspecto: string;
  origen: string;
  nombre: string;
  telefono: string;
  telefonoNormalizado: string;
  ciudadZona: string;
  contexto: string;
  llamadoPorEmprendedor: 'Sí' | 'No';
  telemarketing: string;
  status: ExcelRowStatus;
  messages: string[];
  duplicateInfo?: {
    id: string;
    nombre: string;
    estado: string;
    source: 'base' | 'archivo';
    rowFirstSeen?: number;
  };
}

export interface ImportOptions {
  sinTelemarketingModo: 'conservar' | 'asignar_uno' | 'repartir';
  agenteAsignado: string;
  agentesReparto: string[];
  propietarioPorDefecto: string;
  excluirAdvertencias: boolean;
}

// --- ETAPA 5: DASHBOARD ---

export type PresetRango =
  | 'hoy'
  | 'ayer'
  | 'semana'
  | 'mes'
  | 'mes_anterior'
  | 'ultimos_30';

export interface DashboardFilters {
  desde: string; // YYYY-MM-DD en America/Los_Angeles
  hasta: string; // YYYY-MM-DD en America/Los_Angeles
  propietario?: string;
  telemarketing?: string;
}

export interface DashboardKPIs {
  prospectosIngresados: number;
  contactos: number;
  contactosEfectivos: number;
  citasAgendadas: number;
  efectividadPct: number; // (contactosEfectivos / contactos) * 100
  conversionCitaPct: number; // (citasAgendadas / contactosEfectivos) * 100
}

export interface DashboardKPIComparison {
  current: DashboardKPIs;
  previous: DashboardKPIs;
  diff: {
    prospectosIngresados: number;
    contactos: number;
    contactosEfectivos: number;
    citasAgendadas: number;
    efectividadPct: number;
    conversionCitaPct: number;
  };
  pctChange: {
    prospectosIngresados: number;
    contactos: number;
    contactosEfectivos: number;
    citasAgendadas: number;
  };
}

export interface TelemarketingRow {
  telemarketing: string;
  prospectos: number;
  contactos: number;
  efectivos: number;
  citas: number;
  efectividadPct: number;
  conversionCitaPct: number;
}

export type DrillDownType = 'prospectos' | 'contactos' | 'efectivos' | 'citas';

export interface DrillDownItemRecord {
  id: string;
  tipo: DrillDownType;
  fecha: string;
  hora?: string;
  nombreProspecto: string;
  telefonoProspecto: string;
  telemarketing: string;
  detalle: string;
  resultado?: string;
  efectivo?: string;
  estado?: string;
  propietario?: string;
  rawProspecto?: Prospecto;
  rawGestion?: Gestion;
  rawCita?: Cita;
}

// --- ETAPA 6: REPORTE INDIVIDUAL ---

export interface ReporteIndividualKPIs {
  prospectosAsignados: number;
  contactosRealizados: number;
  contactosEfectivos: number;
  citasAgendadas: number;
  citasAsistidas: number;
  ventasCerradas: number;
  montoTotalVendido: number;
  bonosAcumulados: number;
  bonosPendientes: number;
  efectividadPct: number;
  conversionCitaPct: number;
  cierrePct: number;
  ticketPromedio: number;
}

export interface EvolucionDiariaItem {
  fecha: string;
  fechaDisplay: string;
  llamadas: number;
  citas: number;
}

export interface DistribucionResultadoLlamadaItem {
  name: string;
  count: number;
  pct: number;
  color: string;
}

