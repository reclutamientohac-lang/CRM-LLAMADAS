/**
 * Reglas de Negocio Centralizadas para CRM LLAMADAS
 * Etapa 1
 * Zona horaria: America/Los_Angeles
 * Hora: Formato AM/PM
 */

import {
  Temperatura,
  Prospecto,
  AppSettings,
  TelemarketingAgentConfig,
  ResultadoLlamada,
  ResultadoCita,
  EstadoCita,
  Cita,
  Gestion,
  PresetRango,
  DashboardFilters,
  DashboardKPIs,
  DashboardKPIComparison,
  TelemarketingRow,
  Role,
  Venta,
  EstadoVenta,
  LogVenta,
  ReglaComision,
  ReporteIndividualKPIs,
  EvolucionDiariaItem,
  DistribucionResultadoLlamadaItem,
} from './types';

export const TIMEZONE_LA = 'America/Los_Angeles';
export const SIN_ASIGNAR = 'SIN ASIGNAR';
export const ADMIN_EMAIL = 'reclutamientohac@gmail.com';

/**
 * Normaliza cualquier correo a minúsculas y sin espacios
 */
export function normalizeEmail(email: string | null | undefined): string {
  if (!email) return '';
  return email.trim().toLowerCase();
}

/**
 * Verifica si un correo corresponde al administrador único del sistema
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  return normalizeEmail(email) === ADMIN_EMAIL;
}

/**
 * Lista fija de resultados de llamada para telemarketing (Etapa 3)
 */
export const RESULTADOS_LLAMADA: ResultadoLlamada[] = [
  'No contesta',
  'Buzón',
  'No interesado',
  'Llamar luego',
  'Cita',
  'Número desconectado/incorrecto',
];

/**
 * Lista fija de resultados de cita (Etapa 4)
 */
export const RESULTADOS_CITA: ResultadoCita[] = [
  'Venta',
  'No recibió',
  'Reprogramar',
  'Venta futura',
  'No interesada dio referencias',
  'No interesada sin referencias',
];

/**
 * Determina si el resultado de una llamada es un contacto efectivo:
 * Contacto efectivo = No interesado, Llamar luego, Cita.
 * (No contesta, Buzón y Número desconectado/incorrecto NO son efectivos.)
 */
export function isContactoEfectivo(resultado: ResultadoLlamada | string): boolean {
  return resultado === 'No interesado' || resultado === 'Llamar luego' || resultado === 'Cita';
}

/**
 * Determina el nuevo estado del prospecto según el resultado de la llamada:
 * - No contesta o Buzón -> "En gestión"
 * - Llamar luego -> "Seguimiento programado"
 * - Cita -> "Cita agendada"
 * - No interesado -> "No interesado"
 * - Número desconectado/incorrecto -> "Dato inválido"
 */
export function getEstadoByResultado(resultado: ResultadoLlamada | string): string {
  switch (resultado) {
    case 'No contesta':
    case 'Buzón':
      return 'En gestión';
    case 'Llamar luego':
      return 'Seguimiento programado';
    case 'Cita':
      return 'Cita agendada';
    case 'No interesado':
      return 'No interesado';
    case 'Número desconectado/incorrecto':
      return 'Dato inválido';
    default:
      return 'En gestión';
  }
}

/**
 * Determina la temperatura del prospecto tras registrar una llamada:
 * - si el resultado es No interesado o Cita -> sin temperatura (vacía: '')
 * - si el contacto fue efectivo -> "Tibio"
 * - si no -> recalcular por antigüedad de la fecha de recepción (0–14 días Hot, 15–29 Tibio, 30+ Frío)
 */
export function getTemperaturaPostLlamada(
  resultado: ResultadoLlamada | string,
  fechaRecepcion: string
): Temperatura {
  if (resultado === 'No interesado' || resultado === 'Cita') {
    return '';
  }
  if (isContactoEfectivo(resultado)) {
    return 'Tibio';
  }
  return calculateTemperature(fechaRecepcion);
}

/**
 * Recálculo diario de temperatura:
 * - si el último resultado es No interesado o Cita -> vacía ('')
 * - si tiene al menos 1 contacto efectivo -> "Tibio"
 * - si no, por antigüedad de la fecha de recepción
 */
export function calculateDailyProspectoTemperatura(
  fechaRecepcion: string,
  ultimoResultado?: string | null,
  contactosEfectivos: number = 0
): Temperatura {
  if (ultimoResultado === 'No interesado' || ultimoResultado === 'Cita') {
    return '';
  }
  if (contactosEfectivos > 0) {
    return 'Tibio';
  }
  return calculateTemperature(fechaRecepcion);
}

/**
 * Genera el enlace de Google Maps con la dirección codificada:
 * https://www.google.com/maps/search/?api=1&query= + dirección codificada
 */
export function generateGoogleMapsLink(direccion: string): string {
  if (!direccion || !direccion.trim()) return '';
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccion.trim())}`;
}

/**
 * Catálogos iniciales por defecto
 */
export const DEFAULT_TELEMARKETING_AGENTS: TelemarketingAgentConfig[] = [
  { id: 'tm-geral', name: 'GERAL', active: true },
  { id: 'tm-irene', name: 'IRENE', active: true },
  { id: 'tm-mairut', name: 'MAIRUT', active: true },
];

export const DEFAULT_TIPOS_PROSPECTO: string[] = [
  'Personal',
  'Referido',
  'Familiar',
  'Anfitrión',
  'Campaña',
  'Base Fría',
  'Otro',
];

export const DEFAULT_ORIGENES: string[] = [
  'Recomendación',
  'Rifa',
  'Feria / Evento',
  'Redes Sociales',
  'Prospección en frío',
  'Visita presencial',
  'Anfitrión de demostración',
  'Volante / Folleto',
  'Otro',
];

export const DEFAULT_ESTADOS: string[] = [
  'Nuevo',
  'En Gestión',
  'Contactado',
  'Cita Agendada',
  'Reagendado',
  'No Contesta',
  'No Interesado',
  'Número Equivocado',
  'Archivado',
];

export const DEFAULT_REGLAS_COMISION: ReglaComision[] = [
  {
    id: 'regla-comision-2026',
    porcentaje: 0.015, // 1.5%
    vigenteDesde: '2026-01-01',
    vigenteHasta: '2026-12-31',
    nota: 'Comisión base 2026 (1.5%)',
    creadoPor: 'Sistema',
    creadoEn: '2026-01-01T00:00:00.000Z',
  },
];

export const DEFAULT_SETTINGS: AppSettings = {
  telemarketingAgents: DEFAULT_TELEMARKETING_AGENTS,
  tiposProspecto: DEFAULT_TIPOS_PROSPECTO,
  origenes: DEFAULT_ORIGENES,
  estadosDisponibles: DEFAULT_ESTADOS,
  reglasComision: DEFAULT_REGLAS_COMISION,
  updatedAt: new Date().toISOString(),
  updatedBy: 'Sistema',
};

export interface PhoneValidationResult {
  isValid: boolean;
  normalizedPhone: string;
  error?: string;
  duplicate?: {
    id: string;
    nombre: string;
    estado: string;
  };
}

/**
 * Normaliza el número de teléfono:
 * 1. Eliminar todos los caracteres no numéricos.
 * 2. Si el número tiene 11 dígitos y comienza con '1', eliminar el prefijo '1'.
 */
export function normalizePhone(rawPhone: string | null | undefined): string {
  if (!rawPhone) return '';
  // 1. Eliminar todos los caracteres no numéricos
  let digits = String(rawPhone).replace(/\D/g, '');
  // 2. Si el número tiene 11 dígitos y empieza con 1 (código de país US/CAN), quitar el 1
  if (digits.length === 11 && digits.startsWith('1')) {
    digits = digits.slice(1);
  }
  return digits;
}

/**
 * Valida y normaliza el campo 'telefono' siguiendo las 4 reglas del negocio:
 * 1. Eliminar todos los caracteres no numéricos.
 * 2. Si el número tiene 11 dígitos y comienza con '1', eliminar el prefijo '1'.
 * 3. Si el número normalizado ya existe en la base de datos de prospectos, rechazar la entrada como duplicado,
 *    mostrando el nombre, ID y estado del prospecto existente.
 * 4. Considerar un teléfono vacío o sin dígitos como inválido.
 *
 * Esta función centralizada se aplica tanto en la carga manual (formulario) como en la futura carga masiva (Excel/CSV).
 */
export function validateAndNormalizePhone(
  rawPhone: string | null | undefined,
  existingProspectos: Prospecto[] = [],
  excludeProspectoId?: string
): PhoneValidationResult {
  // 4. Considerar un teléfono vacío o sin dígitos como inválido
  if (!rawPhone || String(rawPhone).trim().length === 0) {
    return {
      isValid: false,
      normalizedPhone: '',
      error: 'El teléfono es obligatorio y no puede estar vacío.',
    };
  }

  // 1 & 2. Normalización (solo dígitos, remoción de prefijo 1 si tiene 11 dígitos)
  const normalized = normalizePhone(rawPhone);

  // 4 (cont.). Si tras eliminar caracteres no numéricos no quedaron dígitos
  if (!normalized || normalized.length === 0) {
    return {
      isValid: false,
      normalizedPhone: '',
      error: 'El teléfono ingresado no contiene dígitos numéricos válidos.',
    };
  }

  // Comprobar límites mínimos/máximos de longitud numérica
  if (normalized.length < 7 || normalized.length > 15) {
    return {
      isValid: false,
      normalizedPhone: normalized,
      error: `El teléfono debe tener entre 7 y 15 dígitos numéricos (actual: ${normalized.length}).`,
    };
  }

  // 3. Si el número normalizado ya existe en la base de datos de prospectos, rechazar la entrada como duplicado,
  // mostrando el nombre, ID y estado del prospecto existente.
  const duplicate = existingProspectos.find(
    (p) =>
      p.id !== excludeProspectoId &&
      normalizePhone(p.telefono) === normalized
  );

  if (duplicate) {
    return {
      isValid: false,
      normalizedPhone: normalized,
      duplicate: {
        id: duplicate.id,
        nombre: duplicate.nombre,
        estado: duplicate.estado,
      },
      error: `DUPLICADO: El teléfono normalizado (${normalized}) ya pertenece al prospecto existente "${duplicate.nombre}" (ID: ${duplicate.id}, Estado: "${duplicate.estado}").`,
    };
  }

  return {
    isValid: true,
    normalizedPhone: normalized,
  };
}

/**
 * Valida si un teléfono normalizado es válido (ayudante rápido para UI)
 */
export function isValidPhone(normalizedPhone: string): { valid: boolean; error?: string } {
  if (!normalizedPhone || normalizedPhone.trim().length === 0) {
    return { valid: false, error: 'El teléfono es obligatorio y no puede estar vacío.' };
  }
  if (!/^\d+$/.test(normalizedPhone)) {
    return { valid: false, error: 'El teléfono debe contener únicamente dígitos numéricos.' };
  }
  if (normalizedPhone.length < 7 || normalizedPhone.length > 15) {
    return {
      valid: false,
      error: `El teléfono debe tener entre 7 y 15 dígitos (actual: ${normalizedPhone.length}).`,
    };
  }
  return { valid: true };
}

/**
 * Formatea un teléfono para visualización amigable
 * Ej: 2135551234 -> (213) 555-1234
 */
export function formatPhoneDisplay(phone: string): string {
  const clean = normalizePhone(phone);
  if (clean.length === 10) {
    return `(${clean.slice(0, 3)}) ${clean.slice(3, 6)}-${clean.slice(6)}`;
  }
  return clean || phone;
}

/**
 * Genera un ID con prefijo y fecha/hora actual en America/Los_Angeles
 * Formato: PREFIJO-aaaammddhhmmss-xxxx
 */
export function generateIdWithPrefix(prefix: string): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE_LA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const getPart = (type: string) => parts.find((p) => p.type === type)?.value || '00';

  const year = getPart('year');
  const month = getPart('month');
  const day = getPart('day');
  const hour = getPart('hour');
  const minute = getPart('minute');
  const second = getPart('second');

  const randomSuffix = Math.random().toString(36).substring(2, 6).toLowerCase();

  return `${prefix}-${year}${month}${day}${hour}${minute}${second}-${randomSuffix}`;
}

/**
 * Genera el ID único de prospecto en formato:
 * PROS-aaaammddhhmmss-xxxx
 */
export function generateProspectoId(): string {
  return generateIdWithPrefix('PROS');
}

/**
 * Genera el ID único de gestión en formato:
 * GES-aaaammddhhmmss-xxxx
 */
export function generateGestionId(): string {
  return generateIdWithPrefix('GES');
}

/**
 * Genera el ID único de cita en formato:
 * CITA-aaaammddhhmmss-xxxx
 */
export function generateCitaId(): string {
  return generateIdWithPrefix('CITA');
}

/**
 * Genera el ID único de retroalimentación en formato:
 * RETRO-aaaammddhhmmss-xxxx
 */
export function generateRetroalimentacionId(): string {
  return generateIdWithPrefix('RETRO');
}

/**
 * Genera el ID único de venta en formato:
 * VENTA-aaaammddhhmmss-xxxx
 */
export function generateVentaId(): string {
  return generateIdWithPrefix('VENTA');
}

/**
 * Genera el ID único de log de venta en formato:
 * LOGVEN-aaaammddhhmmss-xxxx
 */
export function generateLogVentaId(): string {
  return generateIdWithPrefix('LOGVEN');
}

/**
 * Genera el ID único de regla de comisión en formato:
 * COM-aaaammddhhmmss-xxxx
 */
export function generateReglaComisionId(): string {
  return generateIdWithPrefix('COM');
}

/**
 * Obtiene la hora actual en America/Los_Angeles en formato AM/PM (ej: 03:30 PM)
 */
export function getCurrentTimeAMPM_LA(date?: Date): string {
  const target = date || new Date();
  try {
    return new Intl.DateTimeFormat('es-MX', {
      timeZone: TIMEZONE_LA,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(target);
  } catch {
    return '';
  }
}

/**
 * Obtiene la fecha actual en America/Los_Angeles en formato YYYY-MM-DD
 */
export function getTodayInLA(): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE_LA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(now); // en-CA da YYYY-MM-DD
}

/**
 * Calcula la diferencia en días calendario entre una fecha YYYY-MM-DD y la fecha actual en LA
 */
export function getDaysDifference(fechaStr: string): number {
  if (!fechaStr) return 0;
  try {
    const todayStr = getTodayInLA();
    const todayParts = todayStr.split('-').map(Number);
    const targetParts = fechaStr.split('-').map(Number);

    if (targetParts.length < 3) return 0;

    const todayDate = new Date(Date.UTC(todayParts[0], todayParts[1] - 1, todayParts[2]));
    const targetDate = new Date(Date.UTC(targetParts[0], targetParts[1] - 1, targetParts[2]));

    const diffTime = todayDate.getTime() - targetDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays < 0 ? 0 : diffDays;
  } catch {
    return 0;
  }
}

/**
 * Regla de Temperatura por antigüedad de la fecha de recepción:
 * - 0 a 14 días = Hot
 * - 15 a 29 días = Tibio
 * - 30 o más = Frío
 * - Un prospecto nuevo manual nace Hot
 */
export function calculateTemperature(fechaRecepcion: string): Temperatura {
  if (!fechaRecepcion) return 'Hot';
  const days = getDaysDifference(fechaRecepcion);
  if (days <= 14) {
    return 'Hot';
  } else if (days <= 29) {
    return 'Tibio';
  } else {
    return 'Frío';
  }
}

/**
 * Verifica si ya existe un prospecto con el mismo teléfono normalizado.
 * Devuelve el prospecto duplicado encontrado o null.
 */
export function findDuplicatePhone(
  normalizedPhone: string,
  prospectos: Prospecto[],
  excludeProspectoId?: string
): Prospecto | null {
  if (!normalizedPhone) return null;
  const match = prospectos.find(
    (p) =>
      p.id !== excludeProspectoId &&
      normalizePhone(p.telefono) === normalizedPhone
  );
  return match || null;
}

/**
 * Formatea fecha y hora en America/Los_Angeles con formato AM/PM
 * Ej: 05/10/2026, 04:15 PM
 */
export function formatDateTimeLA(isoStringOrDate: string | Date | null | undefined): string {
  if (!isoStringOrDate) return '-';
  try {
    const date = typeof isoStringOrDate === 'string' ? new Date(isoStringOrDate) : isoStringOrDate;
    if (isNaN(date.getTime())) return String(isoStringOrDate);

    return new Intl.DateTimeFormat('es-MX', {
      timeZone: TIMEZONE_LA,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  } catch {
    return String(isoStringOrDate);
  }
}

/**
 * Formatea solo fecha en formato dd/mm/aaaa
 */
export function formatDateDisplay(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

/**
 * Devuelve el color badge de Tailwind para la temperatura
 */
export function getTemperaturaBadgeClass(temp: Temperatura): string {
  switch (temp) {
    case 'Hot':
      return 'bg-red-50 text-red-700 border-red-200 ring-1 ring-red-500/20';
    case 'Tibio':
      return 'bg-amber-50 text-amber-700 border-amber-200 ring-1 ring-amber-500/20';
    case 'Frío':
      return 'bg-sky-50 text-sky-700 border-sky-200 ring-1 ring-sky-500/20';
    default:
      return 'bg-slate-50 text-slate-700 border-slate-200';
  }
}

/**
 * Devuelve el color de estado
 */
export function getEstadoBadgeClass(estado: string): string {
  switch (estado) {
    case 'Nuevo':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'En gestión':
    case 'En Gestión':
      return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    case 'Contactado':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'Cita agendada':
    case 'Cita Agendada':
      return 'bg-amber-50 text-amber-800 border-amber-300 font-semibold';
    case 'Seguimiento programado':
      return 'bg-purple-50 text-purple-700 border-purple-200 font-semibold';
    case 'Reagendado':
      return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'No Contesta':
    case 'No contesta':
    case 'Buzón':
      return 'bg-orange-50 text-orange-700 border-orange-200';
    case 'No Interesado':
    case 'No interesado':
      return 'bg-zinc-100 text-zinc-600 border-zinc-200';
    case 'Número Equivocado':
    case 'Dato inválido':
    case 'Número desconectado/incorrecto':
      return 'bg-rose-50 text-rose-600 border-rose-200';
    case 'Archivado':
      return 'bg-gray-100 text-gray-500 border-gray-200';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
}

/**
 * Devuelve el estilo de badge para el resultado de llamada
 */
export function getResultadoBadgeClass(resultado: string): string {
  switch (resultado) {
    case 'Cita':
      return 'bg-amber-100 text-amber-900 border-amber-300 font-bold ring-1 ring-amber-500/20';
    case 'Llamar luego':
      return 'bg-purple-50 text-purple-700 border-purple-200 font-semibold';
    case 'No interesado':
      return 'bg-zinc-100 text-zinc-700 border-zinc-200';
    case 'No contesta':
      return 'bg-orange-50 text-orange-700 border-orange-200';
    case 'Buzón':
      return 'bg-sky-50 text-sky-700 border-sky-200';
    case 'Número desconectado/incorrecto':
      return 'bg-rose-50 text-rose-700 border-rose-200';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
}

/**
 * Parsea una hora en formato AM/PM ("3:30 PM", "10:00 AM") a minutos desde medianoche (0 a 1439)
 */
export function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return 0;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const modifier = match[3] ? match[3].toUpperCase() : null;

  if (modifier === 'PM' && hours < 12) hours += 12;
  if (modifier === 'AM' && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

/**
 * Comprueba si una hora AM/PM ya pasó hoy en horario America/Los_Angeles
 */
export function hasTimePassedLA(horaStr: string): boolean {
  if (!horaStr) return false;
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: TIMEZONE_LA,
      hour: 'numeric',
      minute: '2-digit',
      hour12: false,
    });
    const parts = formatter.formatToParts(now);
    const hour = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10);
    const minute = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10);
    const currentMinutes = hour * 60 + minute;

    const targetMinutes = parseTimeToMinutes(horaStr);
    return currentMinutes > targetMinutes;
  } catch {
    return false;
  }
}

/**
 * Comprueba si una cita está "Pendiente de resultado"
 * (en estado "Agendada" y su fecha y hora ya pasaron)
 */
export function isCitaVencidaSinResultado(cita: Cita, todayLAStr?: string): boolean {
  if (cita.estadoCita !== 'Agendada') return false;
  const todayLA = todayLAStr || getTodayInLA();
  if (cita.fechaCita < todayLA) return true;
  if (cita.fechaCita === todayLA) {
    return hasTimePassedLA(cita.horaCita);
  }
  return false;
}

/**
 * Devuelve el color de badge según el estado de la cita:
 * - Agendada: Azul
 * - Realizada: Verde
 * - Reprogramada: Naranja
 * - Cancelada: Gris
 */
export function getEstadoCitaBadgeClass(estado: EstadoCita | string): string {
  switch (estado) {
    case 'Agendada':
      return 'bg-blue-50 text-blue-700 border-blue-200 ring-1 ring-blue-500/20';
    case 'Realizada':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-1 ring-emerald-500/20';
    case 'Reprogramada':
      return 'bg-amber-50 text-amber-700 border-amber-200 ring-1 ring-amber-500/20';
    case 'Cancelada':
      return 'bg-gray-100 text-gray-500 border-gray-200';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
}

/**
 * Devuelve el estilo de badge para el resultado comercial de la cita
 */
export function getResultadoCitaBadgeClass(resultado: ResultadoCita | string): string {
  switch (resultado) {
    case 'Venta':
      return 'bg-emerald-100 text-emerald-900 border-emerald-300 font-extrabold ring-1 ring-emerald-500/20';
    case 'Reprogramar':
      return 'bg-amber-100 text-amber-900 border-amber-300 font-bold';
    case 'Venta futura':
      return 'bg-purple-100 text-purple-900 border-purple-300 font-bold';
    case 'No recibió':
      return 'bg-orange-50 text-orange-700 border-orange-200';
    case 'No interesada dio referencias':
      return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    case 'No interesada sin referencias':
      return 'bg-zinc-100 text-zinc-700 border-zinc-200';
    case 'Cancelación':
      return 'bg-rose-50 text-rose-700 border-rose-200';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
}

// ============================================================================
// ETAPA 5: REGLAS DE CÁLCULO Y FILTROS PARA EL DASHBOARD
// ============================================================================

/**
 * Agrega o resta días calendario a una fecha en formato YYYY-MM-DD
 */
export function addDaysToDateStr(dateStr: string, days: number): string {
  if (!dateStr) return '';
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
  } catch {
    return dateStr;
  }
}

/**
 * Convierte cualquier fecha, timestamp ISO o texto de fecha a formato YYYY-MM-DD en America/Los_Angeles
 */
export function getDateInLA(dateVal: string | Date | null | undefined): string {
  if (!dateVal) return '';
  if (typeof dateVal === 'string') {
    const trimmed = dateVal.trim();
    // Ya está en YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }
    // Formato DD/MM/YYYY o DD/MM/YYYY, hh:mm
    const dmyMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (dmyMatch) {
      const d = dmyMatch[1].padStart(2, '0');
      const m = dmyMatch[2].padStart(2, '0');
      const y = dmyMatch[3];
      return `${y}-${m}-${d}`;
    }
  }

  try {
    const d = typeof dateVal === 'string' ? new Date(dateVal) : dateVal;
    if (isNaN(d.getTime())) return '';
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: TIMEZONE_LA,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(d);
  } catch {
    return '';
  }
}

/**
 * Comprueba si una fecha o timestamp ISO cae dentro del rango [desde, hasta] en horario LA
 */
export function isInDateRangeLA(
  dateVal: string | Date | null | undefined,
  desde: string,
  hasta: string
): boolean {
  if (!dateVal || !desde || !hasta) return false;
  const dateStr = getDateInLA(dateVal);
  if (!dateStr) return false;
  return dateStr >= desde && dateStr <= hasta;
}

/**
 * Atajos rápidos de fechas según la zona horaria America/Los_Angeles:
 * - Hoy
 * - Ayer
 * - Esta semana (desde el lunes de la semana actual hasta hoy)
 * - Este mes (del día 1 del mes actual a hoy)
 * - Mes anterior (del 1 al último día del mes anterior)
 * - Últimos 30 días
 */
export function getDateRangePreset(preset: PresetRango): { desde: string; hasta: string } {
  const todayStr = getTodayInLA();
  const [y, m, d] = todayStr.split('-').map(Number);

  switch (preset) {
    case 'hoy':
      return { desde: todayStr, hasta: todayStr };

    case 'ayer': {
      const yesterday = addDaysToDateStr(todayStr, -1);
      return { desde: yesterday, hasta: yesterday };
    }

    case 'semana': {
      const date = new Date(Date.UTC(y, m - 1, d));
      const dayOfWeek = date.getUTCDay(); // 0 es domingo, 1 es lunes, ..., 6 sábado
      const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const mondayStr = addDaysToDateStr(todayStr, diffToMonday);
      return { desde: mondayStr, hasta: todayStr };
    }

    case 'mes': {
      const firstDayOfMonth = `${y}-${String(m).padStart(2, '0')}-01`;
      return { desde: firstDayOfMonth, hasta: todayStr };
    }

    case 'mes_anterior': {
      const firstDayCurrent = `${y}-${String(m).padStart(2, '0')}-01`;
      const lastDayPrev = addDaysToDateStr(firstDayCurrent, -1);
      const [prevY, prevM] = lastDayPrev.split('-').map(Number);
      const firstDayPrev = `${prevY}-${String(prevM).padStart(2, '0')}-01`;
      return { desde: firstDayPrev, hasta: lastDayPrev };
    }

    case 'ultimos_30': {
      const thirtyDaysAgo = addDaysToDateStr(todayStr, -29);
      return { desde: thirtyDaysAgo, hasta: todayStr };
    }

    default:
      return { desde: `${y}-${String(m).padStart(2, '0')}-01`, hasta: todayStr };
  }
}

/**
 * Calcula el período anterior de igual duración
 * (ejemplo: si el período actual tiene 6 días, calcula los 6 días inmediatamente anteriores)
 */
export function getPreviousPeriodRange(desde: string, hasta: string): { desde: string; hasta: string } {
  try {
    const [y1, m1, d1] = desde.split('-').map(Number);
    const [y2, m2, d2] = hasta.split('-').map(Number);
    const date1 = new Date(Date.UTC(y1, m1 - 1, d1));
    const date2 = new Date(Date.UTC(y2, m2 - 1, d2));
    const countDays = Math.max(1, Math.round((date2.getTime() - date1.getTime()) / (1000 * 60 * 60 * 24)) + 1);

    const prevHasta = addDaysToDateStr(desde, -1);
    const prevDesde = addDaysToDateStr(prevHasta, -(countDays - 1));
    return { desde: prevDesde, hasta: prevHasta };
  } catch {
    return { desde, hasta };
  }
}

/**
 * Filtra registros según permisos y filtros de Dashboard
 */
export function filterRecordsForDashboard(
  prospectos: Prospecto[],
  gestiones: Gestion[],
  citas: Cita[],
  filters: DashboardFilters,
  userRole: Role,
  userTelemarketingAgent: string
) {
  const isTm = userRole === 'Telemarketing';
  const tmFilter = isTm ? userTelemarketingAgent : filters.telemarketing;
  const propFilter = filters.propietario;

  // Mapa rápido de prospectos para resolver propietario de gestiones y citas si se filtra por lead owner
  const prospectosById = new Map<string, Prospecto>();
  prospectos.forEach((p) => prospectosById.set(p.id, p));

  // 1. Prospectos ingresados en el período
  const filteredProspectos = prospectos.filter((p) => {
    if (p.archivado) return false;
    if (!isInDateRangeLA(p.fechaRecepcion, filters.desde, filters.hasta)) return false;

    if (tmFilter && tmFilter !== 'TODAS') {
      const pTm = (p.telemarketing || '').trim().toLowerCase();
      if (pTm !== tmFilter.trim().toLowerCase()) return false;
    }

    if (propFilter && propFilter !== 'TODOS') {
      if ((p.propietario || '').trim().toLowerCase() !== propFilter.trim().toLowerCase()) return false;
    }

    return true;
  });

  // 2. Gestiones (llamadas registradas) en el período
  const filteredGestiones = gestiones.filter((g) => {
    const gDate = g.creadoEn || g.fechaHora;
    if (!isInDateRangeLA(gDate, filters.desde, filters.hasta)) return false;

    if (tmFilter && tmFilter !== 'TODAS') {
      const gTm = (g.telemarketing || '').trim().toLowerCase();
      if (gTm !== tmFilter.trim().toLowerCase()) return false;
    }

    if (propFilter && propFilter !== 'TODOS') {
      const p = prospectosById.get(g.idProspecto);
      if (!p || (p.propietario || '').trim().toLowerCase() !== propFilter.trim().toLowerCase()) {
        return false;
      }
    }

    return true;
  });

  // 3. Citas cuya FECHA DE CREACIÓN cae en el período
  const filteredCitas = citas.filter((c) => {
    if (!isInDateRangeLA(c.fechaCreacion, filters.desde, filters.hasta)) return false;

    if (tmFilter && tmFilter !== 'TODAS') {
      const cTm = (c.telemarketing || '').trim().toLowerCase();
      if (cTm !== tmFilter.trim().toLowerCase()) return false;
    }

    if (propFilter && propFilter !== 'TODOS') {
      const p = prospectosById.get(c.idProspecto);
      if (!p || (p.propietario || '').trim().toLowerCase() !== propFilter.trim().toLowerCase()) {
        return false;
      }
    }

    return true;
  });

  return {
    filteredProspectos,
    filteredGestiones,
    filteredCitas,
    prospectosById,
  };
}

/**
 * Calcula los 6 KPIs del Dashboard:
 * 1. Prospectos ingresados
 * 2. Contactos (llamadas registradas)
 * 3. Contactos efectivos (efectivo = Sí)
 * 4. Citas agendadas (por fecha de creación)
 * 5. % de efectividad = contactos efectivos / contactos
 * 6. % de conversión a cita = citas / contactos efectivos
 */
export function calculateKPIsFromRecords(
  prospectosList: Prospecto[],
  gestionesList: Gestion[],
  citasList: Cita[]
): DashboardKPIs {
  const prospectosIngresados = prospectosList.length;
  const contactos = gestionesList.length;

  const contactosEfectivos = gestionesList.filter(
    (g) => g.efectivo === 'Sí' || isContactoEfectivo(g.resultado)
  ).length;

  const citasAgendadas = citasList.length;

  const efectividadPct =
    contactos > 0 ? Number(((contactosEfectivos / contactos) * 100).toFixed(1)) : 0;

  const conversionCitaPct =
    contactosEfectivos > 0 ? Number(((citasAgendadas / contactosEfectivos) * 100).toFixed(1)) : 0;

  return {
    prospectosIngresados,
    contactos,
    contactosEfectivos,
    citasAgendadas,
    efectividadPct,
    conversionCitaPct,
  };
}

/**
 * Compara los KPIs actuales con el período anterior de igual duración
 */
export function calculateKPIComparison(
  currentKPIs: DashboardKPIs,
  previousKPIs: DashboardKPIs
): DashboardKPIComparison {
  const diff = {
    prospectosIngresados: currentKPIs.prospectosIngresados - previousKPIs.prospectosIngresados,
    contactos: currentKPIs.contactos - previousKPIs.contactos,
    contactosEfectivos: currentKPIs.contactosEfectivos - previousKPIs.contactosEfectivos,
    citasAgendadas: currentKPIs.citasAgendadas - previousKPIs.citasAgendadas,
    efectividadPct: Number((currentKPIs.efectividadPct - previousKPIs.efectividadPct).toFixed(1)),
    conversionCitaPct: Number((currentKPIs.conversionCitaPct - previousKPIs.conversionCitaPct).toFixed(1)),
  };

  const calcPct = (curr: number, prev: number) => {
    if (prev === 0) return curr > 0 ? 100 : 0;
    return Number((((curr - prev) / prev) * 100).toFixed(1));
  };

  const pctChange = {
    prospectosIngresados: calcPct(currentKPIs.prospectosIngresados, previousKPIs.prospectosIngresados),
    contactos: calcPct(currentKPIs.contactos, previousKPIs.contactos),
    contactosEfectivos: calcPct(currentKPIs.contactosEfectivos, previousKPIs.contactosEfectivos),
    citasAgendadas: calcPct(currentKPIs.citasAgendadas, previousKPIs.citasAgendadas),
  };

  return {
    current: currentKPIs,
    previous: previousKPIs,
    diff,
    pctChange,
  };
}

/**
 * Genera las filas de la tabla por Telemarketing:
 * - Una fila por cada agente configurada (dinámica)
 * - Fila "SIN ASIGNAR" (solo con prospectos)
 * - Fila "TOTAL"
 * - Los porcentajes con un decimal y 0% si el divisor es 0
 */
export function calculateTelemarketingTableData(
  prospectosList: Prospecto[],
  gestionesList: Gestion[],
  citasList: Cita[],
  telemarketingAgentsConfig: TelemarketingAgentConfig[],
  userRole: Role,
  userTelemarketingAgent: string
): { rows: TelemarketingRow[]; totalRow: TelemarketingRow } {
  const isTm = userRole === 'Telemarketing';

  // Lista de nombres de agentes a mostrar
  const agentsToShow = telemarketingAgentsConfig
    .filter((a) => a.active || a.name)
    .map((a) => a.name.toUpperCase());

  // Si el usuario es rol Telemarketing, solo ve su agente
  const targetAgentNames = isTm
    ? [userTelemarketingAgent.toUpperCase()]
    : agentsToShow;

  const rows: TelemarketingRow[] = [];

  targetAgentNames.forEach((agentName) => {
    const tmNorm = agentName.trim().toLowerCase();

    const tmProspectos = prospectosList.filter(
      (p) => (p.telemarketing || '').trim().toLowerCase() === tmNorm
    ).length;

    const tmGestiones = gestionesList.filter(
      (g) => (g.telemarketing || '').trim().toLowerCase() === tmNorm
    );
    const tmContactos = tmGestiones.length;

    const tmEfectivos = tmGestiones.filter(
      (g) => g.efectivo === 'Sí' || isContactoEfectivo(g.resultado)
    ).length;

    const tmCitas = citasList.filter(
      (c) => (c.telemarketing || '').trim().toLowerCase() === tmNorm
    ).length;

    const efectividadPct =
      tmContactos > 0 ? Number(((tmEfectivos / tmContactos) * 100).toFixed(1)) : 0;

    const conversionCitaPct =
      tmEfectivos > 0 ? Number(((tmCitas / tmEfectivos) * 100).toFixed(1)) : 0;

    rows.push({
      telemarketing: agentName,
      prospectos: tmProspectos,
      contactos: tmContactos,
      efectivos: tmEfectivos,
      citas: tmCitas,
      efectividadPct,
      conversionCitaPct,
    });
  });

  // Fila SIN ASIGNAR solo para Supervisor / Administrador
  if (!isTm) {
    const sinAsignarProspectos = prospectosList.filter(
      (p) => !p.telemarketing || p.telemarketing.trim().toUpperCase() === 'SIN ASIGNAR'
    ).length;

    rows.push({
      telemarketing: 'SIN ASIGNAR',
      prospectos: sinAsignarProspectos,
      contactos: 0,
      efectivos: 0,
      citas: 0,
      efectividadPct: 0,
      conversionCitaPct: 0,
    });
  }

  // Fila TOTAL
  const totalProspectos = rows.reduce((acc, r) => acc + r.prospectos, 0);
  const totalContactos = rows.reduce((acc, r) => acc + r.contactos, 0);
  const totalEfectivos = rows.reduce((acc, r) => acc + r.efectivos, 0);
  const totalCitas = rows.reduce((acc, r) => acc + r.citas, 0);

  const totalEfectividadPct =
    totalContactos > 0 ? Number(((totalEfectivos / totalContactos) * 100).toFixed(1)) : 0;

  const totalConversionCitaPct =
    totalEfectivos > 0 ? Number(((totalCitas / totalEfectivos) * 100).toFixed(1)) : 0;

  const totalRow: TelemarketingRow = {
    telemarketing: 'TOTAL',
    prospectos: totalProspectos,
    contactos: totalContactos,
    efectivos: totalEfectivos,
    citas: totalCitas,
    efectividadPct: totalEfectividadPct,
    conversionCitaPct: totalConversionCitaPct,
  };

  return { rows, totalRow };
}

/**
 * Calcula tendencia diaria dentro del rango de fechas
 */
export function calculateDailyTrendData(
  gestionesList: Gestion[],
  citasList: Cita[],
  desde: string,
  hasta: string
): Array<{ date: string; displayDate: string; contactos: number; efectivos: number; citas: number }> {
  const result: Array<{
    date: string;
    displayDate: string;
    contactos: number;
    efectivos: number;
    citas: number;
  }> = [];

  let curr = desde;
  let safetyLimit = 0;

  while (curr <= hasta && safetyLimit < 120) {
    const dayStr = curr;
    const parts = dayStr.split('-');
    const displayDate = parts.length === 3 ? `${parts[2]}/${parts[1]}` : dayStr;

    const dayGestiones = gestionesList.filter((g) => {
      const gDate = getDateInLA(g.creadoEn || g.fechaHora);
      return gDate === dayStr;
    });

    const contactos = dayGestiones.length;
    const efectivos = dayGestiones.filter(
      (g) => g.efectivo === 'Sí' || isContactoEfectivo(g.resultado)
    ).length;

    const citas = citasList.filter((c) => {
      const cDate = getDateInLA(c.fechaCreacion);
      return cDate === dayStr;
    }).length;

    result.push({
      date: dayStr,
      displayDate,
      contactos,
      efectivos,
      citas,
    });

    curr = addDaysToDateStr(curr, 1);
    safetyLimit++;
  }

  return result;
}

/**
 * Calcula distribución de resultados de llamada para gráfico de barras horizontal
 */
export function calculateCallResultsDistributionData(gestionesList: Gestion[]): Array<{
  resultado: string;
  count: number;
  percentage: number;
}> {
  const total = gestionesList.length;
  return RESULTADOS_LLAMADA.map((res) => {
    const count = gestionesList.filter((g) => g.resultado === res).length;
    const percentage = total > 0 ? Number(((count / total) * 100).toFixed(1)) : 0;
    return {
      resultado: res,
      count,
      percentage,
    };
  });
}

/**
 * Calcula conteos de prospectos por temperatura y por estado
 */
export function calculateProspectosBreakdown(prospectosList: Prospecto[]) {
  const tempMap: Record<string, number> = {
    Hot: 0,
    Tibio: 0,
    Frío: 0,
  };

  const estadoMap: Record<string, number> = {};

  prospectosList.forEach((p) => {
    const t = p.temperatura || 'Frío';
    if (tempMap[t] !== undefined) {
      tempMap[t]++;
    }

    const e = p.estado || 'Nuevo';
    estadoMap[e] = (estadoMap[e] || 0) + 1;
  });

  const total = prospectosList.length;

  const temperaturaData = [
    { name: 'Hot', count: tempMap['Hot'], color: '#EF4444', pct: total > 0 ? Number(((tempMap['Hot'] / total) * 100).toFixed(1)) : 0 },
    { name: 'Tibio', count: tempMap['Tibio'], color: '#F59E0B', pct: total > 0 ? Number(((tempMap['Tibio'] / total) * 100).toFixed(1)) : 0 },
    { name: 'Frío', count: tempMap['Frío'], color: '#38BDF8', pct: total > 0 ? Number(((tempMap['Frío'] / total) * 100).toFixed(1)) : 0 },
  ];

  const estadoData = Object.entries(estadoMap).map(([estado, count]) => ({
    name: estado,
    count,
    pct: total > 0 ? Number(((count / total) * 100).toFixed(1)) : 0,
  })).sort((a, b) => b.count - a.count);

  return {
    temperaturaData,
    estadoData,
  };
}

// ============================================================================
// ETAPA 6: REGLAS DE COMISIÓN, VENTAS, BONOS Y REPORTES
// ============================================================================

/**
 * Selecciona la regla de comisión aplicable a una venta según la fecha de la cita:
 * 1. La regla cuya vigencia contenga esa fecha (vigenteDesde <= fechaCita <= vigenteHasta).
 * 2. Si ninguna aplica, usar la última regla definida.
 * 3. Si no hay reglas, 1% (0.01).
 */
export function getSugerenciaComision(
  fechaCita: string,
  reglas: ReglaComision[] = []
): number {
  if (!reglas || reglas.length === 0) {
    return 0.01; // 1% por defecto
  }

  const citaDateStr = getDateInLA(fechaCita) || fechaCita;

  // Buscar regla vigente en la fecha de la cita
  const matchingRule = reglas.find((r) => {
    if (!r.vigenteDesde) return false;
    const desde = r.vigenteDesde;
    const hasta = r.vigenteHasta || '9999-12-31';
    return citaDateStr >= desde && citaDateStr <= hasta;
  });

  if (matchingRule) {
    return matchingRule.porcentaje;
  }

  // Si ninguna aplica, usar la última regla definida en la lista
  const lastRule = reglas[reglas.length - 1];
  return lastRule ? lastRule.porcentaje : 0.01;
}

/**
 * Formatea un número como dinero en dólares ($#,##0.00)
 */
export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '$0.00';
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Formatea un porcentaje guardado como fracción (ej: 0.015 -> "1.5%")
 */
export function formatPercentageDisplay(ratio: number | null | undefined): string {
  if (ratio === null || ratio === undefined || isNaN(ratio)) {
    return '-';
  }
  const pct = Number((ratio * 100).toFixed(2));
  return `${pct}%`;
}

/**
 * Parsea un monto numérico ingresado por el usuario:
 * Acepta comas o puntos decimales, símbolos de $ y espacios.
 * Debe ser un número mayor o igual a 0.
 */
export function parseCurrencyInput(
  raw: string | number | null | undefined
): { valid: boolean; value: number | null; error?: string } {
  if (raw === null || raw === undefined || String(raw).trim() === '') {
    return { valid: true, value: null };
  }
  if (typeof raw === 'number') {
    if (isNaN(raw) || raw < 0) {
      return { valid: false, value: null, error: 'El monto debe ser un número mayor o igual a 0.' };
    }
    return { valid: true, value: Number(raw.toFixed(2)) };
  }

  const cleaned = String(raw).replace(/\$/g, '').replace(/\s+/g, '').replace(/,/g, '.');
  const num = parseFloat(cleaned);

  if (isNaN(num)) {
    return { valid: false, value: null, error: 'El valor ingresado no es un número válido.' };
  }
  if (num < 0) {
    return { valid: false, value: null, error: 'El monto debe ser mayor o igual a 0.' };
  }

  return { valid: true, value: Number(num.toFixed(2)) };
}

/**
 * Parsea un porcentaje de bono ingresado por el usuario:
 * Se escribe como porcentaje (ej: 1.5 significa 1,5% = 0.015 fracción).
 * Acepta signo %, coma o punto decimal.
 */
export function parsePercentageInput(
  raw: string | number | null | undefined
): { valid: boolean; ratio: number | null; error?: string } {
  if (raw === null || raw === undefined || String(raw).trim() === '') {
    return { valid: true, ratio: null };
  }
  if (typeof raw === 'number') {
    if (isNaN(raw) || raw < 0) {
      return { valid: false, ratio: null, error: 'El porcentaje debe ser mayor o igual a 0.' };
    }
    // Si viene como fracción menor a 0.20, por ejemplo 0.015, se mantiene, si viene como número entero ej 1.5 se divide entre 100
    const ratio = raw <= 1 && raw > 0 ? raw : raw / 100;
    return { valid: true, ratio };
  }

  const cleaned = String(raw).replace(/%/g, '').replace(/\s+/g, '').replace(/,/g, '.');
  const num = parseFloat(cleaned);

  if (isNaN(num)) {
    return { valid: false, ratio: null, error: 'El porcentaje ingresado no es un número válido.' };
  }
  if (num < 0) {
    return { valid: false, ratio: null, error: 'El porcentaje debe ser mayor o igual a 0.' };
  }

  // Se interpreta como porcentaje: 1.5 -> 0.015
  const ratio = Number((num / 100).toFixed(5));
  return { valid: true, ratio };
}

/**
 * Cálculos automáticos de bono:
 * bonoGenerado = montoAprobado * porcentajeBono (vacío si falta alguno)
 * bonoPagable = bonoGenerado solo si estado es "Aprobada"; en otro estado es 0
 */
export function calculateBonoGenerado(
  montoAprobado: number | null,
  porcentajeBono: number | null
): number | null {
  if (montoAprobado === null || porcentajeBono === null || isNaN(montoAprobado) || isNaN(porcentajeBono)) {
    return null;
  }
  return Number((montoAprobado * porcentajeBono).toFixed(2));
}

export function calculateBonoPagable(
  estado: EstadoVenta,
  bonoGenerado: number | null
): number {
  if (estado === 'Aprobada' && bonoGenerado !== null && !isNaN(bonoGenerado)) {
    return bonoGenerado;
  }
  return 0;
}

/**
 * Devuelve el estilo de badge para el estado de una venta
 */
export function getEstadoVentaBadgeClass(estado: EstadoVenta | string): string {
  switch (estado) {
    case 'Aprobada':
      return 'bg-emerald-50 text-emerald-800 border-emerald-300 ring-1 ring-emerald-500/20 font-extrabold';
    case 'Pendiente':
      return 'bg-amber-50 text-amber-800 border-amber-300 ring-1 ring-amber-500/20 font-bold';
    case 'Cancelada':
      return 'bg-rose-50 text-rose-700 border-rose-200 font-semibold';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
}

/**
 * Calcula todas las métricas, KPIs, ventas del período y series para el Reporte Individual
 */
export function calculateReporteIndividual({
  telemarketing,
  desde,
  hasta,
  prospectos,
  gestiones,
  citas,
  ventas,
}: {
  telemarketing: string;
  desde: string;
  hasta: string;
  prospectos: Prospecto[];
  gestiones: Gestion[];
  citas: Cita[];
  ventas: Venta[];
}): {
  kpis: ReporteIndividualKPIs;
  ventasPeriodo: Array<{
    venta: Venta;
    cita?: Cita;
    prospecto?: Prospecto;
    fechaCita: string;
    horaCita: string;
    nombreProspecto: string;
    telefonoProspecto: string;
  }>;
  evolucionDiaria: EvolucionDiariaItem[];
  distribucionResultados: DistribucionResultadoLlamadaItem[];
} {
  const normAgent = (telemarketing || '').trim().toLowerCase();

  // 1. Prospectos asignados a la telemarketing en el período
  const prospectosAgente = prospectos.filter(
    (p) => (p.telemarketing || '').trim().toLowerCase() === normAgent
  );
  const prospectosAsignados = prospectosAgente.filter(
    (p) => p.fechaRecepcion && p.fechaRecepcion >= desde && p.fechaRecepcion <= hasta
  ).length;

  // 2. Contactos realizados (gestiones del agente en el período)
  const gestionesPeriodo = gestiones.filter((g) => {
    if ((g.telemarketing || '').trim().toLowerCase() !== normAgent) return false;
    const dateStr = getDateInLA(g.fechaHora || g.creadoEn);
    return dateStr >= desde && dateStr <= hasta;
  });
  const contactosRealizados = gestionesPeriodo.length;

  // 3. Contactos efectivos
  const contactosEfectivos = gestionesPeriodo.filter(
    (g) => g.efectivo === 'Sí' || isContactoEfectivo(g.resultado)
  ).length;

  // 4. Citas agendadas (por fecha de creación en el período)
  const citasAgendadas = citas.filter((c) => {
    if ((c.telemarketing || '').trim().toLowerCase() !== normAgent) return false;
    const dateStr = getDateInLA(c.fechaCreacion);
    return dateStr >= desde && dateStr <= hasta;
  }).length;

  // 5. Citas asistidas (citas del agente cuya fecha de cita cae en el período y fueron Realizadas)
  const citasAsistidas = citas.filter((c) => {
    if ((c.telemarketing || '').trim().toLowerCase() !== normAgent) return false;
    const dateStr = getDateInLA(c.fechaCita) || c.fechaCita;
    return dateStr >= desde && dateStr <= hasta && c.estadoCita === 'Realizada';
  }).length;

  // 6. Ventas del período (el rango se aplica a la FECHA DE LA CITA)
  const citasMap = new Map<string, Cita>();
  citas.forEach((c) => citasMap.set(c.id, c));

  const prospectosMap = new Map<string, Prospecto>();
  prospectos.forEach((p) => prospectosMap.set(p.id, p));

  const ventasAgente = ventas.filter(
    (v) => (v.telemarketing || '').trim().toLowerCase() === normAgent
  );

  const ventasPeriodo: Array<{
    venta: Venta;
    cita?: Cita;
    prospecto?: Prospecto;
    fechaCita: string;
    horaCita: string;
    nombreProspecto: string;
    telefonoProspecto: string;
  }> = [];

  ventasAgente.forEach((v) => {
    const cita = citasMap.get(v.idCita);
    const fechaCita = cita?.fechaCita || v.fechaReporte;
    const dateStr = getDateInLA(fechaCita) || fechaCita;

    if (dateStr >= desde && dateStr <= hasta) {
      const pros = prospectosMap.get(v.idProspecto);
      ventasPeriodo.push({
        venta: v,
        cita,
        prospecto: pros,
        fechaCita: dateStr,
        horaCita: cita?.horaCita || '',
        nombreProspecto: pros?.nombre || `Prospecto #${v.idProspecto.slice(-4)}`,
        telefonoProspecto: pros?.telefono || '',
      });
    }
  });

  // Ventas aprobadas y pendientes
  const ventasAprobadas = ventasPeriodo.filter((item) => item.venta.estado === 'Aprobada');
  const ventasPendientes = ventasPeriodo.filter((item) => item.venta.estado === 'Pendiente');

  const ventasCerradas = ventasAprobadas.length;
  const montoTotalVendido = ventasAprobadas.reduce(
    (acc, item) => acc + (item.venta.montoAprobado || 0),
    0
  );
  const bonosAcumulados = ventasAprobadas.reduce(
    (acc, item) => acc + (item.venta.bonoPagable || 0),
    0
  );
  const bonosPendientes = ventasPendientes.reduce(
    (acc, item) => acc + (item.venta.bonoGenerado || 0),
    0
  );

  // Tasas
  const efectividadPct =
    contactosRealizados > 0 ? Number(((contactosEfectivos / contactosRealizados) * 100).toFixed(1)) : 0;
  const conversionCitaPct =
    contactosEfectivos > 0 ? Number(((citasAgendadas / contactosEfectivos) * 100).toFixed(1)) : 0;
  const cierrePct =
    citasAsistidas > 0 ? Number(((ventasCerradas / citasAsistidas) * 100).toFixed(1)) : 0;
  const ticketPromedio =
    ventasCerradas > 0 ? Number((montoTotalVendido / ventasCerradas).toFixed(2)) : 0;

  const kpis: ReporteIndividualKPIs = {
    prospectosAsignados,
    contactosRealizados,
    contactosEfectivos,
    citasAgendadas,
    citasAsistidas,
    ventasCerradas,
    montoTotalVendido,
    bonosAcumulados,
    bonosPendientes,
    efectividadPct,
    conversionCitaPct,
    cierrePct,
    ticketPromedio,
  };

  // 7. Evolución diaria dentro del período
  const evolucionDiaria: EvolucionDiariaItem[] = [];
  let curr = desde;
  let safety = 0;
  while (curr <= hasta && safety < 120) {
    const thisDay = curr;
    const llamadasDia = gestionesPeriodo.filter((g) => {
      const gDate = getDateInLA(g.fechaHora || g.creadoEn);
      return gDate === thisDay;
    }).length;

    const citasDia = citas.filter((c) => {
      if ((c.telemarketing || '').trim().toLowerCase() !== normAgent) return false;
      const cDate = getDateInLA(c.fechaCreacion);
      return cDate === thisDay;
    }).length;

    const parts = thisDay.split('-');
    const fechaDisplay = parts.length === 3 ? `${parts[2]}/${parts[1]}` : thisDay;

    evolucionDiaria.push({
      fecha: thisDay,
      fechaDisplay,
      llamadas: llamadasDia,
      citas: citasDia,
    });

    curr = addDaysToDateStr(curr, 1);
    safety++;
  }

  // 8. Distribución de resultados de llamada
  const colorsMap: Record<string, string> = {
    'No contesta': '#94A3B8',
    'Buzón': '#64748B',
    'No interesado': '#F87171',
    'Llamar luego': '#FBBF24',
    'Cita': '#34D399',
    'Número desconectado/incorrecto': '#F43F5E',
  };

  const resultMap: Record<string, number> = {};
  RESULTADOS_LLAMADA.forEach((r) => {
    resultMap[r] = 0;
  });

  gestionesPeriodo.forEach((g) => {
    if (resultMap[g.resultado] !== undefined) {
      resultMap[g.resultado]++;
    } else {
      resultMap[g.resultado] = (resultMap[g.resultado] || 0) + 1;
    }
  });

  const distribucionResultados: DistribucionResultadoLlamadaItem[] = Object.entries(resultMap).map(
    ([name, count]) => ({
      name,
      count,
      pct: contactosRealizados > 0 ? Number(((count / contactosRealizados) * 100).toFixed(1)) : 0,
      color: colorsMap[name] || '#60A5FA',
    })
  );

  return {
    kpis,
    ventasPeriodo,
    evolucionDiaria,
    distribucionResultados,
  };
}

