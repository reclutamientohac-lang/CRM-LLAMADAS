export type Role = 'Telemarketing' | 'Supervisor' | 'Distribuidor' | 'Administrador';

export type TabId =
  | 'trabajo'
  | 'prospectos'
  | 'pipeline'
  | 'cargar'
  | 'agenda'
  | 'dashboard'
  | 'accesos'
  | 'ventas'
  | 'reporteIndividual'
  | 'consulta'
  | 'configuracion';

export type EstadoProspecto =
  | 'Nuevo'
  | 'En gestión'
  | 'Contacto efectivo'
  | 'Cita agendada'
  | 'No interesado'
  | 'Buzón / No contesta'
  | 'Número equivocado'
  | 'Archivado';

export type TemperaturaProspecto = 'Hot' | 'Warm' | 'Cold';

export type EstadoCita = 'Agendada' | 'Realizada' | 'Cancelada' | 'Reprogramada';

export type ResultadoCita =
  | 'Venta'
  | 'No se visitó'
  | 'No recibió'
  | 'Recibió sin compra'
  | 'Reprogramar'
  | 'Venta futura'
  | 'Cancelación';

export type EstadoVenta = 'Aprobada' | 'Pendiente' | 'Cancelada';

export interface Prospecto {
  id: string;
  nombre: string;
  telefono: string;
  telefonoSecundario?: string;
  ciudadZona?: string;
  propietario?: string;
  telemarketing?: string;
  estado: EstadoProspecto;
  temperatura: TemperaturaProspecto;
  intentos: number;
  intentosHistoricos?: number;
  contactosEfectivos?: number;
  contactosEfectivosHistoricos?: number;
  ultimoContacto?: string | null;
  proximoSeguimiento?: string | null;
  notasSeguimiento?: string;
  fechaRecepcion?: string;
  idCita?: string;
  notas?: string;
  creadoPor?: string;
  creadoEn?: string;
  modificadoEn?: string;
  archivado?: boolean;
}

export interface Gestion {
  id: string;
  idProspecto: string;
  fechaHora: string;
  canal?: string;
  resultado?: string;
  efectivo?: 'Sí' | 'No' | boolean;
  observaciones?: string;
  telemarketing?: string;
  idCita?: string;
  proximoSeguimiento?: string | null;
  usuario?: string;
}

export interface Cita {
  id: string;
  idProspecto: string;
  fechaCreacion: string;
  telemarketing: string;
  fechaCita: string;
  horaCita: string;
  asunto: string;
  direccion: string;
  linkGoogleMaps?: string;
  descripcion?: string;
  quienAtiende?: string;
  invitado?: string;
  estadoCita: EstadoCita;
  idEventoCalendar?: string;
  enlaceCalendar?: string;
  ultimaActualizacion?: string;
}

export interface Venta {
  id: string;
  idProspecto: string;
  idCita: string;
  fechaReporte: string;
  telemarketing: string;
  montoAprobado: number | null;
  estado: EstadoVenta;
  porcentajeBono?: number | null;
  bonoGenerado?: number | null;
  bonoPagable: number;
  estadoPagoHistorico?: 'Pagada' | 'Pendiente';
  fechaPagoHistorico?: string | null;
  bonoPagadoHistorico?: number;
  ultimaActualizacion?: string;
  observacion?: string;
  modificadoPor?: string;
}

export interface Retroalimentacion {
  id: string;
  idCita: string;
  idProspecto: string;
  fecha: string;
  resultado: ResultadoCita;
  observacion?: string;
  idVenta?: string;
  creadoPor?: string;
  creadoEn?: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: Role;
  telemarketingAgent?: string;
  photoURL?: string | null;
  activo: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface TelemarketingAgent {
  id: string;
  name: string;
  active: boolean;
}

export interface AppSettings {
  telemarketingAgents: TelemarketingAgent[];
  minutosAlertaCita?: number;
}

export interface ReglaComision {
  id: string;
  minimo: number;
  maximo: number | null;
  porcentaje: number;
}

export interface LogVenta {
  id: string;
  idVenta: string;
  fecha: string;
  accion: string;
  detalle: string;
  usuario: string;
}

export interface AgendaHistoricaImportItem {
  id?: string;
  fechaCita: string;
  horaCita?: string;
  nombreProspecto: string;
  telefono: string;
  telemarketing?: string;
  quienAtiende?: string;
  asunto?: string;
  direccion?: string;
  invitado?: string;
  estadoCita?: EstadoCita;
  resultado?: ResultadoCita;
  montoAprobado?: number | null;
  porcentajeBono?: number | null;
  bonoGenerado?: number | null;
  bonoPagable?: number;
  estadoVenta?: EstadoVenta;
  estadoPago?: 'Pagada' | 'Pendiente';
  fechaPago?: string | null;
  observaciones?: string;
  prospectoExistenteId?: string;
  esDuplicada?: boolean;
  motivoDuplicada?: string;
  esNuevoProspecto?: boolean;
}
