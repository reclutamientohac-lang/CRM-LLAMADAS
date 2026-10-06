/**
 * Utilidades para Carga Masiva y Exportación con SheetJS (xlsx)
 * Etapa 2 de CRM LLAMADAS
 */

import * as XLSX from 'xlsx';
import { Prospecto, ExcelRowItem, ExcelRowStatus } from './types';
import { normalizePhone, validateAndNormalizePhone, SIN_ASIGNAR } from './businessRules';

// Columnas canónicas esperadas en la plantilla
export const EXCEL_COLUMNS_CANONICAL = [
  'Propietario',
  'Fecha de prospección',
  'Tipo de prospecto',
  'Origen',
  'Nombre',
  'Teléfono',
  'Ciudad / Zona',
  'Contexto',
  '¿Llamado por el emprendedor?',
  'Telemarketing',
] as const;

/**
 * Normaliza nombres de encabezados para reconocimiento flexible
 * Sin importar mayúsculas, tildes, espacios ni puntuación
 */
export function normalizeHeaderKey(key: string): string {
  if (!key) return '';
  return key
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Quitar tildes
    .replace(/[^a-z0-9]/g, ''); // Quitar espacios y símbolos
}

/**
 * Parsea fechas provenientes de Excel (números de serie de Excel, texto DD/MM/AAAA o ISO)
 */
export function parseExcelDate(val: any): { dateStr: string; warning?: string } {
  if (val === null || val === undefined || String(val).trim() === '') {
    return { dateStr: '' };
  }

  // 1. Si es número (Serial date de Excel)
  if (typeof val === 'number') {
    try {
      const parsed = XLSX.SSF.parse_date_code(val);
      if (parsed) {
        const y = String(parsed.y).padStart(4, '0');
        const m = String(parsed.m).padStart(2, '0');
        const d = String(parsed.d).padStart(2, '0');
        return { dateStr: `${y}-${m}-${d}` };
      }
    } catch {
      // continuar
    }
  }

  // 2. Si es objeto Date de JS
  if (val instanceof Date && !isNaN(val.getTime())) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return { dateStr: `${y}-${m}-${d}` };
  }

  // 3. Si es cadena de texto
  const str = String(val).trim();

  // Formato DD/MM/AAAA o D/M/AAAA
  const ddmmyyyy = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (ddmmyyyy) {
    const d = ddmmyyyy[1].padStart(2, '0');
    const m = ddmmyyyy[2].padStart(2, '0');
    const y = ddmmyyyy[3];
    return { dateStr: `${y}-${m}-${d}` };
  }

  // Formato AAAA-MM-DD
  const yyyymmdd = str.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
  if (yyyymmdd) {
    const y = yyyymmdd[1];
    const m = yyyymmdd[2].padStart(2, '0');
    const d = yyyymmdd[3].padStart(2, '0');
    return { dateStr: `${y}-${m}-${d}` };
  }

  return {
    dateStr: '',
    warning: `Fecha "${str}" no reconocida. Se dejará vacía (usa formato DD/MM/AAAA).`,
  };
}

/**
 * Normaliza respuestas de ¿Llamado por el emprendedor?
 * Acepta: Sí, Si, S, Yes, No, N (sin distinguir mayúsculas) y normaliza a "Sí" o "No"
 */
export function normalizeLlamado(val: any): 'Sí' | 'No' {
  if (!val) return 'No';
  const str = String(val).trim().toLowerCase();
  if (['si', 'sí', 's', 'yes', 'y', 'true', '1'].includes(str)) {
    return 'Sí';
  }
  return 'No';
}

/**
 * Genera y descarga la plantilla oficial "plantilla_prospectos.xlsx"
 */
export function downloadExcelTemplate(activeTelemarketers: string[] = ['GERAL', 'IRENE', 'MAIRUT']) {
  const wb = XLSX.utils.book_new();

  // Hoja 1: Prospectos con fila de ejemplo
  const rows = [
    [...EXCEL_COLUMNS_CANONICAL],
    [
      'Roberto Gómez',
      '15/10/2026',
      'Referido',
      'Recomendación',
      'Juan Carlos Domínguez',
      '(213) 555-0199',
      'Los Ángeles, CA',
      'Interesado en sistema de purificación; llamar por la tarde.',
      'No',
      activeTelemarketers[0] || 'GERAL',
    ],
  ];

  const wsProspectos = XLSX.utils.aoa_to_sheet(rows);

  // Anchos de columna agradables
  wsProspectos['!cols'] = [
    { wch: 22 }, // Propietario
    { wch: 22 }, // Fecha de prospección
    { wch: 20 }, // Tipo
    { wch: 22 }, // Origen
    { wch: 28 }, // Nombre
    { wch: 18 }, // Teléfono
    { wch: 24 }, // Ciudad
    { wch: 35 }, // Contexto
    { wch: 28 }, // ¿Llamado?
    { wch: 18 }, // Telemarketing
  ];

  XLSX.utils.book_append_sheet(wb, wsProspectos, 'Prospectos');

  // Hoja 2: Instrucciones detalladas
  const instructions = [
    ['INSTRUCCIONES DE CARGA MASIVA DE PROSPECTOS - CRM LLAMADAS'],
    [''],
    ['1. REGLAS DE LAS COLUMNAS:'],
    ['- Nombre: OBLIGATORIO. Nombre completo del prospecto (mínimo 2 caracteres).'],
    ['- Teléfono: OBLIGATORIO. Se normaliza automáticamente quitando caracteres no numéricos y el 1 inicial si tiene 11 dígitos. Debe ser único.'],
    ['- Propietario: Opcional. Dueño del lead o emprendedor. Si se deja vacío, puedes elegir un propietario por defecto al importar.'],
    ['- Fecha de prospección: Opcional. Formato recomendado DD/MM/AAAA (ejemplo: 15/10/2026).'],
    ['- Tipo de prospecto: Opcional. Ejemplo: Personal, Referido, Familiar, Campaña, Anfitrión, Otro.'],
    ['- Origen: Opcional. Ejemplo: Recomendación, Rifa, Redes Sociales, Feria / Evento, Visita presencial.'],
    ['- Ciudad / Zona: Opcional. Ejemplo: Los Ángeles, East LA, Anaheim, Riverside, San Diego.'],
    ['- Contexto: Opcional. Breve nota o contexto clave para abordar al prospecto en la llamada.'],
    ['- ¿Llamado por el emprendedor?: Opcional. Acepta: "Sí" o "No" (también Si, S, Yes, No, N). Por defecto: No.'],
    [`- Telemarketing: Opcional. Agente asignada. Lista activa actual: ${activeTelemarketers.join(', ')}. Si se deja vacío o no coincide, se asigna como "SIN ASIGNAR" o se puede repartir equitativamente en las opciones de carga.`],
    [''],
    ['2. VALIDACIÓN DE DUPLICADOS:'],
    ['El teléfono normalizado es el identificador único. Si ya existe en el CRM o aparece dos veces en el mismo archivo, la fila duplicada se rechazará y se generará un reporte de exclusión descargable.'],
    [''],
    ['3. LÍMITES:'],
    ['El archivo puede contener hasta 5.000 filas por carga.'],
  ];

  const wsInstrucciones = XLSX.utils.aoa_to_sheet(instructions);
  wsInstrucciones['!cols'] = [{ wch: 100 }];
  XLSX.utils.book_append_sheet(wb, wsInstrucciones, 'Instrucciones');

  XLSX.writeFile(wb, 'plantilla_prospectos.xlsx');
}

/**
 * Genera y descarga el archivo de prueba con 20 filas de datos de ejemplo
 * Incluye a propósito:
 * - 2 teléfonos duplicados (uno que colisiona con otra fila del archivo y otro con la base)
 * - 1 teléfono inválido (sin dígitos / longitud errónea)
 * - 1 telemarketing inexistente (para probar advertencia -> SIN ASIGNAR)
 */
export function downloadSampleTestFile(existingPhones: string[] = []) {
  const wb = XLSX.utils.book_new();

  // Tomamos un teléfono existente si hay, o creamos un patrón conocido
  const duplicateBasePhone = existingPhones[0] || '2135550101';

  const rows = [
    [...EXCEL_COLUMNS_CANONICAL],
    // 1-5 Válidos
    ['Roberto Gómez', '01/10/2026', 'Referido', 'Recomendación', 'Guillermo Ochoa', '3105559001', 'Long Beach', 'Interesado en filtro de agua alcalina', 'No', 'GERAL'],
    ['Carlos Valladares', '02/10/2026', 'Personal', 'Feria / Evento', 'Patricia Montero', '3235559002', 'Boyle Heights', 'Conoció el stand en fiesta comunitaria', 'Sí', 'IRENE'],
    ['Diana Méndez', '03/10/2026', 'Anfitrión', 'Anfitrión de demostración', 'Héctor Lavoe Jr', '8185559003', 'San Fernando', 'Excelente anfitrión de cena demostración', 'Sí', 'MAIRUT'],
    ['Ana Karina Pérez', '04/10/2026', 'Familiar', 'Visita presencial', 'Cecilia Cruz', '5625559004', 'Whittier', 'Prima del emprendedor, agendar en sábado', 'No', 'GERAL'],
    ['Roberto Gómez', '05/10/2026', 'Campaña', 'Redes Sociales', 'Arturo Sandoval', '7145559005', 'Santa Ana', 'Preguntó por el purificador en Facebook', 'No', 'IRENE'],
    
    // 6. ADVERTENCIA: Telemarketing inexistente (debe cargar como SIN ASIGNAR)
    ['Diana Méndez', '06/10/2026', 'Referido', 'Rifa', 'Marisol González', '6265559006', 'Pasadena', 'Boleto de rifa #56. Llamar temprano.', 'No', 'AGENTE_INEXISTENTE'],
    
    // 7. DUPLICADO EN BASE (colisiona con el primer teléfono de la base de datos)
    ['Carlos Valladares', '07/10/2026', 'Personal', 'Recomendación', 'Duplicado Base Prueba', duplicateBasePhone, 'Los Ángeles', 'Teléfono que ya existe en el CRM', 'No', 'MAIRUT'],
    
    // 8. Válido con prefijo 1 de 11 dígitos (debe normalizar removiendo el 1)
    ['Ana Karina Pérez', '08/10/2026', 'Referido', 'Recomendación', 'Esteban Quito', '19095559008', 'Ontario', 'Número con 1 inicial de 11 dígitos', 'Sí', 'GERAL'],
    
    // 9. ERROR: Teléfono inválido (letras y sin dígitos suficientes)
    ['Roberto Gómez', '09/10/2026', 'Personal', 'Volante / Folleto', 'Teléfono Inválido Prueba', 'TELEFONO_FALSO_12', 'Fontana', 'Fila que debe ser rechazada por teléfono inválido', 'No', 'IRENE'],
    
    // 10. ERROR: Nombre vacío
    ['Diana Méndez', '10/10/2026', 'Campaña', 'Redes Sociales', '', '9515559010', 'Riverside', 'Fila con nombre vacío para probar validación en rojo', 'No', 'MAIRUT'],

    // 11. Válido sin telemarketing (para probar reparto o SIN ASIGNAR)
    ['Carlos Valladares', '11/10/2026', 'Referido', 'Recomendación', 'Adrián Marcelo', '6615559011', 'Bakersfield', 'Sin agente especificado', 'No', ''],
    
    // 12. Válido
    ['Roberto Gómez', '12/10/2026', 'Personal', 'Feria / Evento', 'Natalia Lafourcade', '8055559012', 'Oxnard', 'Interesada en los sartenes de titanio', 'Sí', 'GERAL'],

    // 13. DUPLICADO EN ARCHIVO (Mismo teléfono que la fila 1: 3105559001)
    ['Carlos Valladares', '13/10/2026', 'Referido', 'Recomendación', 'Repetido en Archivo Prueba', '310-555-9001', 'Long Beach', 'Mismo teléfono que Guillermo Ochoa (fila 1)', 'No', 'IRENE'],

    // 14. Válido con fecha alternativa DD-MM-AAAA
    ['Diana Méndez', '14-10-2026', 'Anfitrión', 'Anfitrión de demostración', 'Vicente Fernández Jr', '4425559014', 'Victorville', 'Hermano de don Vicente', 'Sí', 'MAIRUT'],

    // 15. ADVERTENCIA: Fecha no parseable
    ['Ana Karina Pérez', 'Fecha Inválida Texto', 'Referido', 'Rifa', 'Leticia Calderón', '2135559015', 'Lynwood', 'Fecha no interpretable; se debe limpiar con advertencia', 'No', 'GERAL'],

    // 16-20 Válidos
    ['Roberto Gómez', '16/10/2026', 'Personal', 'Recomendación', 'Joaquín Sabina', '3235559016', 'South Gate', 'Músico jubilado, siempre en casa', 'No', 'IRENE'],
    ['Carlos Valladares', '17/10/2026', 'Campaña', 'Redes Sociales', 'Celia Giraldo', '8185559017', 'Glendale', 'Madre soltera, necesita financiamiento', 'No', 'MAIRUT'],
    ['Diana Méndez', '18/10/2026', 'Familiar', 'Visita presencial', 'Mario Moreno Cantinflas', '5625559018', 'Norwalk', 'Tío del dueño, muy entusiasta', 'Sí', 'GERAL'],
    ['Ana Karina Pérez', '19/10/2026', 'Anfitrión', 'Feria / Evento', 'Florinda Meza', '7145559019', 'Garden Grove', 'Desea ser anfitriona el fin de semana', 'Sí', 'IRENE'],
    ['Roberto Gómez', '20/10/2026', 'Referido', 'Recomendación', 'Rubén Blades', '6265559020', 'El Monte', 'Abogado y cliente potencial para oficina', 'No', 'MAIRUT'],
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [
    { wch: 20 },
    { wch: 22 },
    { wch: 20 },
    { wch: 22 },
    { wch: 28 },
    { wch: 18 },
    { wch: 22 },
    { wch: 35 },
    { wch: 25 },
    { wch: 20 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'Prospectos');

  XLSX.writeFile(wb, 'ejemplo_20_prospectos_prueba.xlsx');
}

/**
 * Genera el reporte en Excel de filas rechazadas (errores y duplicados)
 */
export function downloadErrorReport(rejectedRows: ExcelRowItem[], filename = 'reporte_errores_duplicados.xlsx') {
  const wb = XLSX.utils.book_new();

  const header = [
    'Fila Excel',
    'Estado',
    'Motivo del Rechazo / Mensajes',
    'Nombre',
    'Teléfono Ingresado',
    'Teléfono Normalizado',
    'Propietario',
    'Ciudad / Zona',
    'Telemarketing',
    'Detalle Duplicado',
  ];

  const dataRows = rejectedRows.map((r) => [
    r.rowNumber,
    r.status === 'duplicada_base'
      ? 'Duplicada en base'
      : r.status === 'duplicada_archivo'
      ? 'Duplicada en archivo'
      : 'Error',
    r.messages.join(' | '),
    r.nombre,
    r.telefono,
    r.telefonoNormalizado,
    r.propietario,
    r.ciudadZona,
    r.telemarketing,
    r.duplicateInfo
      ? `${r.duplicateInfo.nombre} (ID: ${r.duplicateInfo.id}, Estado: ${r.duplicateInfo.estado})`
      : '-',
  ]);

  const ws = XLSX.utils.aoa_to_sheet([header, ...dataRows]);
  ws['!cols'] = [
    { wch: 12 },
    { wch: 20 },
    { wch: 45 },
    { wch: 25 },
    { wch: 20 },
    { wch: 20 },
    { wch: 20 },
    { wch: 20 },
    { wch: 16 },
    { wch: 35 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Rechazados');
  XLSX.writeFile(wb, filename);
}

/**
 * Mapeo de columnas inteligente (insensible a mayúsculas, tildes, símbolos y orden)
 */
export function identifyColumns(headerRow: string[]): {
  mapping: Record<string, number>;
  missingRequired: string[];
} {
  const normalizedHeaders = headerRow.map((h) => normalizeHeaderKey(String(h || '')));

  const columnDictionary: Record<string, string[]> = {
    propietario: ['propietario', 'dueno', 'emprendedor', 'asesor', 'vendedor'],
    fechaProspeccion: ['fechadeprospeccion', 'fechaprospeccion', 'prospeccion', 'fecha'],
    tipoProspecto: ['tipodeprospecto', 'tipoprospecto', 'tipo', 'categoria'],
    origen: ['origen', 'fuente', 'canal', 'mediocaptacion'],
    nombre: ['nombre', 'nombrecompleto', 'prospecto', 'cliente', 'nombreprospecto'],
    telefono: ['telefono', 'tel', 'celular', 'movil', 'telefono1', 'phone'],
    ciudadZona: ['ciudadzona', 'ciudad', 'zona', 'municipio', 'localidad', 'direccion'],
    contexto: ['contexto', 'contextoparaabordar', 'notas', 'observaciones', 'comentarios'],
    llamadoPorEmprendedor: ['llamadoporelemprendedor', 'llamadoporemprendedor', 'llamado', 'llamada'],
    telemarketing: ['telemarketing', 'agente', 'asignadoa', 'operador', 'tm'],
  };

  const mapping: Record<string, number> = {};

  Object.entries(columnDictionary).forEach(([fieldKey, aliases]) => {
    const foundIndex = normalizedHeaders.findIndex((h) => aliases.includes(h));
    if (foundIndex !== -1) {
      mapping[fieldKey] = foundIndex;
    }
  });

  const missingRequired: string[] = [];
  if (mapping['nombre'] === undefined) {
    missingRequired.push('Nombre');
  }
  if (mapping['telefono'] === undefined) {
    missingRequired.push('Teléfono');
  }

  return { mapping, missingRequired };
}

/**
 * Lee y valida el archivo Excel fila por fila en el navegador
 */
export async function parseAndValidateExcel(
  file: File,
  existingProspectos: Prospecto[],
  activeAgents: string[] = []
): Promise<{
  rows: ExcelRowItem[];
  missingColumns?: string[];
  error?: string;
  totalRows: number;
  counts: {
    total: number;
    validas: number;
    advertencias: number;
    duplicadas: number;
    errores: number;
  };
}> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      return {
        rows: [],
        error: 'El archivo Excel no contiene ninguna hoja de cálculo.',
        totalRows: 0,
        counts: { total: 0, validas: 0, advertencias: 0, duplicadas: 0, errores: 0 },
      };
    }

    // Usar la primera hoja ("Prospectos" o la que tenga el archivo)
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    // Convertir a matriz de filas crudas (array de arrays)
    const rawData = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: '' });

    if (!rawData || rawData.length === 0) {
      return {
        rows: [],
        error: 'La hoja seleccionada está vacía.',
        totalRows: 0,
        counts: { total: 0, validas: 0, advertencias: 0, duplicadas: 0, errores: 0 },
      };
    }

    // Identificar fila de encabezados (primera fila no vacía)
    let headerRowIndex = 0;
    while (
      headerRowIndex < rawData.length &&
      (!Array.isArray(rawData[headerRowIndex]) || rawData[headerRowIndex].every((c) => !c))
    ) {
      headerRowIndex++;
    }

    if (headerRowIndex >= rawData.length) {
      return {
        rows: [],
        error: 'No se encontraron encabezados válidos en el archivo.',
        totalRows: 0,
        counts: { total: 0, validas: 0, advertencias: 0, duplicadas: 0, errores: 0 },
      };
    }

    const headerRow = rawData[headerRowIndex];
    const { mapping, missingRequired } = identifyColumns(headerRow);

    if (missingRequired.length > 0) {
      return {
        rows: [],
        missingColumns: missingRequired,
        error: `Faltan columnas obligatorias en el archivo: ${missingRequired.join(', ')}. Verifica que la hoja contenga las columnas "Nombre" y "Teléfono".`,
        totalRows: 0,
        counts: { total: 0, validas: 0, advertencias: 0, duplicadas: 0, errores: 0 },
      };
    }

    const dataRows = rawData.slice(headerRowIndex + 1);

    // Regla de límite máximo de 5.000 filas
    if (dataRows.length > 5000) {
      return {
        rows: [],
        error: `El archivo contiene ${dataRows.length} filas. El límite máximo admitido por carga es de 5.000 filas. Por favor divide el archivo e intenta nuevamente.`,
        totalRows: dataRows.length,
        counts: { total: 0, validas: 0, advertencias: 0, duplicadas: 0, errores: 0 },
      };
    }

    const cleanAgentsUpper = activeAgents.map((a) => a.trim().toUpperCase());
    const seenPhonesInFile = new Map<string, number>(); // normalizedPhone -> rowNumber

    const items: ExcelRowItem[] = [];

    let cValidas = 0;
    let cAdvertencias = 0;
    let cDuplicadas = 0;
    let cErrores = 0;

    dataRows.forEach((row, idx) => {
      // Si la fila está completamente vacía, ignorarla
      if (!row || (Array.isArray(row) && row.every((c) => String(c || '').trim() === ''))) {
        return;
      }

      const rowNumber = headerRowIndex + 2 + idx; // Número de fila real de Excel (1-based)
      const messages: string[] = [];
      let status: ExcelRowStatus = 'valida';

      const getVal = (key: string): string => {
        const colIdx = mapping[key];
        if (colIdx === undefined || colIdx >= row.length) return '';
        return String(row[colIdx] ?? '').trim();
      };

      const nombre = getVal('nombre');
      const rawTelefono = getVal('telefono');
      const propietario = getVal('propietario');
      const rawFecha = row[mapping['fechaProspeccion']] ?? '';
      const tipoProspecto = getVal('tipoProspecto') || 'Personal';
      const origen = getVal('origen') || 'Recomendación';
      const ciudadZona = getVal('ciudadZona');
      const contexto = getVal('contexto');
      const llamadoPorEmprendedor = normalizeLlamado(getVal('llamadoPorEmprendedor'));
      const rawTelemarketing = getVal('telemarketing');

      // 1. Normalizar fecha
      const { dateStr: fechaProspeccion, warning: dateWarning } = parseExcelDate(rawFecha);
      if (dateWarning) {
        messages.push(dateWarning);
      }

      // 2. Validar nombre
      if (!nombre || nombre.length === 0) {
        status = 'error';
        messages.push('El nombre es obligatorio y está vacío.');
      } else if (nombre.length < 2) {
        status = 'error';
        messages.push('El nombre debe tener al menos 2 caracteres.');
      }

      // 3. Validar y normalizar teléfono con las 4 reglas oficiales
      const phoneRes = validateAndNormalizePhone(rawTelefono, existingProspectos);
      const normalizedPhone = phoneRes.normalizedPhone;

      let duplicateInfo: ExcelRowItem['duplicateInfo'];

      if (!phoneRes.isValid) {
        if (phoneRes.duplicate) {
          // Duplicado en base de datos existente
          status = 'duplicada_base';
          duplicateInfo = {
            id: phoneRes.duplicate.id,
            nombre: phoneRes.duplicate.nombre,
            estado: phoneRes.duplicate.estado,
            source: 'base',
          };
          messages.push(
            `El teléfono ${normalizedPhone} ya existe en el CRM en el prospecto "${phoneRes.duplicate.nombre}" (ID: ${phoneRes.duplicate.id}, Estado: ${phoneRes.duplicate.estado}).`
          );
        } else {
          // Error en teléfono (vacío, sin dígitos, longitud errónea)
          status = 'error';
          messages.push(phoneRes.error || 'Teléfono inválido.');
        }
      } else {
        // 4. Comprobar duplicado dentro del mismo archivo Excel
        if (seenPhonesInFile.has(normalizedPhone)) {
          const firstSeenRow = seenPhonesInFile.get(normalizedPhone)!;
          status = 'duplicada_archivo';
          duplicateInfo = {
            id: `Fila-${firstSeenRow}`,
            nombre: `Aparece antes en fila ${firstSeenRow}`,
            estado: 'Duplicado en Excel',
            source: 'archivo',
            rowFirstSeen: firstSeenRow,
          };
          messages.push(
            `El teléfono ${normalizedPhone} ya apareció antes en la fila ${firstSeenRow} de este archivo. Solo se conservará la primera aparición.`
          );
        } else {
          seenPhonesInFile.set(normalizedPhone, rowNumber);
        }
      }

      // 5. Validar Telemarketing contra lista activa
      let finalTelemarketing = SIN_ASIGNAR;
      if (rawTelemarketing) {
        const cleanUpper = rawTelemarketing.trim().toUpperCase();
        if (cleanAgentsUpper.includes(cleanUpper)) {
          finalTelemarketing = cleanUpper;
        } else {
          if (status !== 'error' && !status.startsWith('duplicada')) {
            status = 'advertencia';
          }
          messages.push(
            `Telemarketing "${rawTelemarketing}" no coincide con las agentes activas. Se asignará como SIN ASIGNAR o según la opción seleccionada.`
          );
        }
      }

      // Si no es error ni duplicado, pero tiene mensajes (ej: fecha o telemarketing), queda en advertencia
      if (status === 'valida' && messages.length > 0) {
        status = 'advertencia';
      }

      // Contadores
      if (status === 'valida') cValidas++;
      else if (status === 'advertencia') cAdvertencias++;
      else if (status === 'duplicada_base' || status === 'duplicada_archivo') cDuplicadas++;
      else if (status === 'error') cErrores++;

      items.push({
        rowNumber,
        raw: row,
        propietario,
        fechaProspeccion,
        tipoProspecto,
        origen,
        nombre,
        telefono: rawTelefono,
        telefonoNormalizado: normalizedPhone,
        ciudadZona,
        contexto,
        llamadoPorEmprendedor,
        telemarketing: finalTelemarketing,
        status,
        messages,
        duplicateInfo,
      });
    });

    return {
      rows: items,
      totalRows: items.length,
      counts: {
        total: items.length,
        validas: cValidas,
        advertencias: cAdvertencias,
        duplicadas: cDuplicadas,
        errores: cErrores,
      },
    };
  } catch (err: any) {
    return {
      rows: [],
      error: `Error al procesar el archivo Excel: ${err.message || 'Formato no soportado.'}`,
      totalRows: 0,
      counts: { total: 0, validas: 0, advertencias: 0, duplicadas: 0, errores: 0 },
    };
  }
}

/**
 * Exporta listados detallados del Dashboard a Excel (.xlsx)
 */
export function exportDashboardDrillDownToExcel(
  filenamePrefix: string,
  rows: Record<string, any>[]
) {
  try {
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Métricas CRM');
    const safeName = filenamePrefix.replace(/[^a-zA-Z0-9_-]/g, '_');
    XLSX.writeFile(wb, `${safeName}.xlsx`);
    return { success: true };
  } catch (err: any) {
    console.error('Error exportando detalle a Excel:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Exporta el reporte individual de una telemarketing a Excel (.xlsx) con hojas de resumen y ventas
 */
export function exportReporteIndividualToExcel({
  telemarketing,
  desde,
  hasta,
  kpis,
  ventas,
}: {
  telemarketing: string;
  desde: string;
  hasta: string;
  kpis: any;
  ventas: any[];
}) {
  try {
    const wb = XLSX.utils.book_new();

    // Hoja 1: Resumen de KPIs y Tasas
    const resumenData = [
      { Métrica: 'Agente Telemarketing', Valor: telemarketing },
      { Métrica: 'Período Desde', Valor: desde },
      { Métrica: 'Período Hasta', Valor: hasta },
      { Métrica: '---', Valor: '---' },
      { Métrica: 'Prospectos Asignados', Valor: kpis.prospectosAsignados },
      { Métrica: 'Contactos Realizados', Valor: kpis.contactosRealizados },
      { Métrica: 'Contactos Efectivos', Valor: kpis.contactosEfectivos },
      { Métrica: 'Citas Agendadas', Valor: kpis.citasAgendadas },
      { Métrica: 'Citas Asistidas', Valor: kpis.citasAsistidas },
      { Métrica: 'Ventas Cerradas (Aprobadas)', Valor: kpis.ventasCerradas },
      { Métrica: 'Monto Total Vendido ($)', Valor: kpis.montoTotalVendido },
      { Métrica: 'Bonos Acumulados ($)', Valor: kpis.bonosAcumulados },
      { Métrica: 'Bonos Pendientes ($)', Valor: kpis.bonosPendientes },
      { Métrica: '---', Valor: '---' },
      { Métrica: '% Efectividad', Valor: `${kpis.efectividadPct}%` },
      { Métrica: '% Conversión a Cita', Valor: `${kpis.conversionCitaPct}%` },
      { Métrica: '% Cierre', Valor: `${kpis.cierrePct}%` },
      { Métrica: 'Ticket Promedio ($)', Valor: `$${kpis.ticketPromedio}` },
    ];
    const wsResumen = XLSX.utils.json_to_sheet(resumenData);
    XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen KPIs');

    // Hoja 2: Ventas del período
    const ventasData = ventas.map((v) => ({
      'Fecha Cita': v.fechaCita,
      'Hora Cita': v.horaCita || '-',
      'Prospecto': v.nombreProspecto,
      'Teléfono': v.telefonoProspecto,
      'Monto Aprobado ($)': v.venta.montoAprobado !== null ? v.venta.montoAprobado : '-',
      '% Bono': v.venta.porcentajeBono !== null ? `${(v.venta.porcentajeBono * 100).toFixed(1)}%` : '-',
      'Estado': v.venta.estado,
      'Bono Generado ($)': v.venta.bonoGenerado !== null ? v.venta.bonoGenerado : 0,
      'Bono Pagable ($)': v.venta.bonoPagable !== null ? v.venta.bonoPagable : 0,
      'Observación': v.venta.observacion || '',
    }));
    const wsVentas = XLSX.utils.json_to_sheet(
      ventasData.length > 0 ? ventasData : [{ 'Aviso': 'No hay ventas en este período' }]
    );
    XLSX.utils.book_append_sheet(wb, wsVentas, 'Ventas del Período');

    const safeName = `Reporte_${telemarketing.replace(/[^a-zA-Z0-9_-]/g, '_')}_${desde}_${hasta}`;
    XLSX.writeFile(wb, `${safeName}.xlsx`);
    return { success: true };
  } catch (err: any) {
    console.error('Error exportando reporte individual a Excel:', err);
    return { success: false, error: err.message };
  }
}

