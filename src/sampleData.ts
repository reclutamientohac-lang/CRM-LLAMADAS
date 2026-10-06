import { Prospecto, Gestion, Cita } from './types';
import { calculateTemperature, getTodayInLA, generateGoogleMapsLink } from './businessRules';

function subDays(baseDateStr: string, days: number): string {
  const parts = baseDateStr.split('-').map(Number);
  const date = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().split('T')[0];
}

export function generateSampleProspectos(adminEmail: string): Prospecto[] {
  const today = getTodayInLA();

  const rawList = [
    {
      nombre: 'María Elena Morales',
      telefono: '2135550101',
      propietario: 'Maria Perez',
      ciudadZona: 'Los Ángeles (East LA)',
      telemarketing: 'GERAL',
      tipoProspecto: 'Referido',
      origen: 'Recomendación',
      daysAgo: 2,
      contexto: 'Interesada en el sistema de purificación para el hogar. Su prima compró la semana pasada.',
      llamadoPorEmprendedor: 'Sí' as const,
      estado: 'Nuevo',
    },
    {
      nombre: 'Jorge Luis Santana',
      telefono: '3235550102',
      propietario: 'María Pérez ',
      ciudadZona: 'Boyle Heights',
      telemarketing: 'GERAL',
      tipoProspecto: 'Personal',
      origen: 'Rifa',
      daysAgo: 4,
      contexto: 'Ganador de cupón en feria comunitaria. Llamar después de las 4 PM.',
      llamadoPorEmprendedor: 'No' as const,
      estado: 'En Gestión',
    },
    {
      nombre: 'Rosa Angélica Beltrán',
      telefono: '8185550103',
      propietario: 'Ana Karina Pérez',
      ciudadZona: 'San Fernando',
      telemarketing: 'IRENE',
      tipoProspecto: 'Familiar',
      origen: 'Visita presencial',
      daysAgo: 1,
      contexto: 'Hermana de un cliente satisfecho. Quiere demostración para ella y su esposo.',
      llamadoPorEmprendedor: 'Sí' as const,
      estado: 'Nuevo',
    },
    {
      nombre: 'Fernando Castillo',
      telefono: '5625550104',
      propietario: 'Carlos Valladares',
      ciudadZona: 'Long Beach',
      telemarketing: 'MAIRUT',
      tipoProspecto: 'Referido',
      origen: 'Redes Sociales',
      daysAgo: 8,
      contexto: 'Preguntó por costo y planes en Facebook. Solicita detalles antes de agendar.',
      llamadoPorEmprendedor: 'No' as const,
      estado: 'En Gestión',
    },
    {
      nombre: 'Guadalupe Cárdenas',
      telefono: '7145550105',
      propietario: 'Roberto Gómez',
      ciudadZona: 'Santa Ana',
      telemarketing: 'GERAL',
      tipoProspecto: 'Anfitrión',
      origen: 'Anfitrión de demostración',
      daysAgo: 6,
      contexto: 'Fue anfitriona de una demo el sábado. Le interesa el set de utensilios.',
      llamadoPorEmprendedor: 'Sí' as const,
      estado: 'Contactado',
    },
    {
      nombre: 'Víctor Manuel Ríos',
      telefono: '6265550106',
      propietario: 'Diana Méndez',
      ciudadZona: 'Pasadena',
      telemarketing: 'SIN ASIGNAR',
      tipoProspecto: 'Campaña',
      origen: 'Feria / Evento',
      daysAgo: 3,
      contexto: 'Dejó datos en la expo salud. Dueño de negocio de comida.',
      llamadoPorEmprendedor: 'No' as const,
      estado: 'Nuevo',
    },
    {
      nombre: 'Carmen Alicia Flores',
      telefono: '9095550107',
      propietario: 'Carlos Valladares',
      ciudadZona: 'Ontario',
      telemarketing: 'IRENE',
      tipoProspecto: 'Referido',
      origen: 'Recomendación',
      daysAgo: 10,
      contexto: 'Amiga de la iglesia de doña Martha. Muy amable, disponible por las mañanas.',
      llamadoPorEmprendedor: 'Sí' as const,
      estado: 'En Gestión',
    },
    {
      nombre: 'Ernesto Zavala',
      telefono: '9515550108',
      propietario: 'Diana Méndez',
      ciudadZona: 'Riverside',
      telemarketing: 'MAIRUT',
      tipoProspecto: 'Base Fría',
      origen: 'Prospección en frío',
      daysAgo: 12,
      contexto: 'Contacto en centro comercial. Mencionó que tiene problemas de sarro en el agua.',
      llamadoPorEmprendedor: 'No' as const,
      estado: 'Nuevo',
    },
    {
      nombre: 'Leticia Villalobos',
      telefono: '6615550109',
      propietario: 'Ana Karina Pérez',
      ciudadZona: 'Bakersfield',
      telemarketing: 'SIN ASIGNAR',
      tipoProspecto: 'Personal',
      origen: 'Volante / Folleto',
      daysAgo: 5,
      contexto: 'Llamó preguntando por la promoción del volante recibido en el supermercado.',
      llamadoPorEmprendedor: 'No' as const,
      estado: 'Nuevo',
    },
    {
      nombre: 'Héctor Daniel Peña',
      telefono: '8055550110',
      propietario: 'Roberto Gómez',
      ciudadZona: 'Oxnard',
      telemarketing: 'GERAL',
      tipoProspecto: 'Referido',
      origen: 'Recomendación',
      daysAgo: 14,
      contexto: 'Cuñado de Carlos. Pidió que le marquen en fin de semana.',
      llamadoPorEmprendedor: 'Sí' as const,
      estado: 'En Gestión',
    },
    // Tibios (15 a 29 días)
    {
      nombre: 'Silvia Cristina Navarro',
      telefono: '2135550111',
      propietario: 'Roberto Gómez',
      ciudadZona: 'Huntington Park',
      telemarketing: 'GERAL',
      tipoProspecto: 'Referido',
      origen: 'Rifa',
      daysAgo: 16,
      contexto: 'Boleto de rifa #234. No contestó en el primer intento hace dos semanas.',
      llamadoPorEmprendedor: 'No' as const,
      estado: 'No Contesta',
    },
    {
      nombre: 'Arturo Benítez',
      telefono: '3105550112',
      propietario: 'Diana Méndez',
      ciudadZona: 'Inglewood',
      telemarketing: 'IRENE',
      tipoProspecto: 'Personal',
      origen: 'Feria / Evento',
      daysAgo: 19,
      contexto: 'Visitó el stand con su esposa. Les gustó la demostración rápida.',
      llamadoPorEmprendedor: 'Sí' as const,
      estado: 'Contactado',
    },
    {
      nombre: 'Patricia Orozco',
      telefono: '8185550113',
      propietario: 'Carlos Valladares',
      ciudadZona: 'Van Nuys',
      telemarketing: 'MAIRUT',
      tipoProspecto: 'Anfitrión',
      origen: 'Anfitrión de demostración',
      daysAgo: 21,
      contexto: 'Reagendó cita para el próximo mes por viaje familiar.',
      llamadoPorEmprendedor: 'Sí' as const,
      estado: 'Reagendado',
    },
    {
      nombre: 'Raúl Emilio Domínguez',
      telefono: '5625550114',
      propietario: 'Ana Karina Pérez',
      ciudadZona: 'Whittier',
      telemarketing: 'SIN ASIGNAR',
      tipoProspecto: 'Referido',
      origen: 'Recomendación',
      daysAgo: 23,
      contexto: 'Recomendado por su hermano. Trabaja en construcción, llamar después de 6 PM.',
      llamadoPorEmprendedor: 'No' as const,
      estado: 'Nuevo',
    },
    {
      nombre: 'Teresa de Jesús Rangel',
      telefono: '7145550115',
      propietario: 'Roberto Gómez',
      ciudadZona: 'Anaheim',
      telemarketing: 'GERAL',
      tipoProspecto: 'Campaña',
      origen: 'Redes Sociales',
      daysAgo: 25,
      contexto: 'Comentó anuncio de Instagram pidiendo precio de filtros.',
      llamadoPorEmprendedor: 'No' as const,
      estado: 'En Gestión',
    },
    {
      nombre: 'Óscar Alejandro Meza',
      telefono: '6265550116',
      propietario: 'Diana Méndez',
      ciudadZona: 'El Monte',
      telemarketing: 'IRENE',
      tipoProspecto: 'Familiar',
      origen: 'Visita presencial',
      daysAgo: 27,
      contexto: 'Tío del emprendedor. Quiere ver la línea de inducción magnética.',
      llamadoPorEmprendedor: 'Sí' as const,
      estado: 'Cita Agendada',
    },
    {
      nombre: 'Adriana Pineda',
      telefono: '9095550117',
      propietario: 'Carlos Valladares',
      ciudadZona: 'Fontana',
      telemarketing: 'MAIRUT',
      tipoProspecto: 'Referido',
      origen: 'Recomendación',
      daysAgo: 28,
      contexto: 'Vecina de un cliente. Interesada en probar el agua libre de metales pesados.',
      llamadoPorEmprendedor: 'Sí' as const,
      estado: 'En Gestión',
    },
    {
      nombre: 'Gonzalo Estrada',
      telefono: '9515550118',
      propietario: 'Ana Karina Pérez',
      ciudadZona: 'Corona',
      telemarketing: 'SIN ASIGNAR',
      tipoProspecto: 'Base Fría',
      origen: 'Prospección en frío',
      daysAgo: 18,
      contexto: 'Prospectado en el parque. Pidió folleto informativo.',
      llamadoPorEmprendedor: 'No' as const,
      estado: 'Nuevo',
    },
    {
      nombre: 'Esperanza Duarte',
      telefono: '4425550119',
      propietario: 'Roberto Gómez',
      ciudadZona: 'Victorville',
      telemarketing: 'GERAL',
      tipoProspecto: 'Referido',
      origen: 'Rifa',
      daysAgo: 24,
      contexto: 'Dijo que hablaría con su esposo para fijar fecha.',
      llamadoPorEmprendedor: 'Sí' as const,
      estado: 'Contactado',
    },
    {
      nombre: 'Manuel Salvador Tapia',
      telefono: '8055550120',
      propietario: 'Diana Méndez',
      ciudadZona: 'Ventura',
      telemarketing: 'IRENE',
      tipoProspecto: 'Personal',
      origen: 'Volante / Folleto',
      daysAgo: 29,
      contexto: 'Interesado pero ocupado en temporada de cosecha.',
      llamadoPorEmprendedor: 'No' as const,
      estado: 'Reagendado',
    },
    // Fríos (30 días o más)
    {
      nombre: 'Beatriz Adriana Solís',
      telefono: '2135550121',
      propietario: 'Roberto Gómez',
      ciudadZona: 'Lynwood',
      telemarketing: 'GERAL',
      tipoProspecto: 'Referido',
      origen: 'Recomendación',
      daysAgo: 35,
      contexto: 'Recomendación antigua de julio. Reactivar con la nueva promoción de otoño.',
      llamadoPorEmprendedor: 'Sí' as const,
      estado: 'Nuevo',
    },
    {
      nombre: 'Jaime Alberto Quiroz',
      telefono: '3235550122',
      propietario: 'Carlos Valladares',
      ciudadZona: 'South Gate',
      telemarketing: 'MAIRUT',
      tipoProspecto: 'Base Fría',
      origen: 'Prospección en frío',
      daysAgo: 42,
      contexto: 'No contestó en 3 ocasiones previas. Enviar mensaje de seguimiento.',
      llamadoPorEmprendedor: 'No' as const,
      estado: 'No Contesta',
    },
    {
      nombre: 'Verónica Lucía Montes',
      telefono: '8185550123',
      propietario: 'Diana Méndez',
      ciudadZona: 'Glendale',
      telemarketing: 'IRENE',
      tipoProspecto: 'Campaña',
      origen: 'Redes Sociales',
      daysAgo: 38,
      contexto: 'Registro web antiguo. Volver a contactar para ofrecerle el filtro de regalo.',
      llamadoPorEmprendedor: 'No' as const,
      estado: 'En Gestión',
    },
    {
      nombre: 'Francisco Javier Lozano',
      telefono: '5625550124',
      propietario: 'Ana Karina Pérez',
      ciudadZona: 'Norwalk',
      telemarketing: 'SIN ASIGNAR',
      tipoProspecto: 'Referido',
      origen: 'Rifa',
      daysAgo: 45,
      contexto: 'Boleto de rifa de fiesta patronal. Requiere reactivación urgente.',
      llamadoPorEmprendedor: 'No' as const,
      estado: 'Nuevo',
    },
    {
      nombre: 'Mónica Isabel Cordero',
      telefono: '7145550125',
      propietario: 'Roberto Gómez',
      ciudadZona: 'Garden Grove',
      telemarketing: 'GERAL',
      tipoProspecto: 'Anfitrión',
      origen: 'Anfitrión de demostración',
      daysAgo: 50,
      contexto: 'Había dicho que no tenía presupuesto. Dar a conocer nuevo plan a plazos sin intereses.',
      llamadoPorEmprendedor: 'Sí' as const,
      estado: 'No Interesado',
    },
    {
      nombre: 'Rodrigo Camacho',
      telefono: '6265550126',
      propietario: 'Diana Méndez',
      ciudadZona: 'Baldwin Park',
      telemarketing: 'IRENE',
      tipoProspecto: 'Familiar',
      origen: 'Visita presencial',
      daysAgo: 32,
      contexto: 'Primo lejano. Estaba remodelando su cocina.',
      llamadoPorEmprendedor: 'Sí' as const,
      estado: 'En Gestión',
    },
    {
      nombre: 'Lorena Guadalupe Valdés',
      telefono: '9095550127',
      propietario: 'Carlos Valladares',
      ciudadZona: 'Rancho Cucamonga',
      telemarketing: 'MAIRUT',
      tipoProspecto: 'Personal',
      origen: 'Feria / Evento',
      daysAgo: 60,
      contexto: 'Contacto de feria del libro en Pomona. Familia grande con 4 niños.',
      llamadoPorEmprendedor: 'No' as const,
      estado: 'Contactado',
    },
    {
      nombre: 'Javier Alonso Medina',
      telefono: '9515550128',
      propietario: 'Ana Karina Pérez',
      ciudadZona: 'Moreno Valley',
      telemarketing: 'SIN ASIGNAR',
      tipoProspecto: 'Referido',
      origen: 'Recomendación',
      daysAgo: 33,
      contexto: 'Compañero de trabajo de Luis. Pedir referencia al llamar.',
      llamadoPorEmprendedor: 'Sí' as const,
      estado: 'Nuevo',
    },
    {
      nombre: 'Elena Rocío Barajas',
      telefono: '6615550129',
      propietario: 'Roberto Gómez',
      ciudadZona: 'Palmdale',
      telemarketing: 'GERAL',
      tipoProspecto: 'Campaña',
      origen: 'Volante / Folleto',
      daysAgo: 40,
      contexto: 'Dejó mensaje en buzón pidiendo información.',
      llamadoPorEmprendedor: 'No' as const,
      estado: 'Nuevo',
    },
    {
      nombre: 'Gustavo Adolfo Paredes',
      telefono: '8055550130',
      propietario: 'Diana Méndez',
      ciudadZona: 'Santa Paula',
      telemarketing: 'MAIRUT',
      tipoProspecto: 'Base Fría',
      origen: 'Prospección en frío',
      daysAgo: 48,
      contexto: 'Pequeño agricultor local. Muy interesado en purificar agua de pozo.',
      llamadoPorEmprendedor: 'No' as const,
      estado: 'En Gestión',
    },
  ];

  return rawList.map((item, index) => {
    const fechaRecepcion = subDays(today, item.daysAgo);
    const fechaProspeccion = subDays(fechaRecepcion, 1);
    const temp = calculateTemperature(fechaRecepcion);

    // Formato ID: PROS-aaaammddhhmmss-xxxx
    const cleanDate = fechaRecepcion.replace(/-/g, '');
    const id = `PROS-${cleanDate}120000-${String(index + 1).padStart(4, '0')}`;

    return {
      id,
      fechaRecepcion,
      fechaProspeccion,
      propietario: item.propietario,
      tipoCarga: 'Manual' as const,
      tipoProspecto: item.tipoProspecto,
      origen: item.origen,
      nombre: item.nombre,
      telefono: item.telefono,
      ciudadZona: item.ciudadZona,
      telemarketing: item.telemarketing,
      temperatura: temp,
      contexto: item.contexto,
      llamadoPorEmprendedor: item.llamadoPorEmprendedor,
      ultimoContacto: item.daysAgo < 15 ? subDays(today, 1) : null,
      ultimoResultado: item.estado === 'Contactado' ? 'Conversó 5 min, pide volver a llamar' : null,
      intentos: item.estado === 'Nuevo' ? 0 : item.estado === 'No Contesta' ? 3 : 1,
      contactosEfectivos: item.estado === 'Contactado' || item.estado === 'Cita Agendada' ? 1 : 0,
      proximaAccion: item.estado === 'En Gestión' ? 'Llamar para confirmar disponibilidad' : null,
      fechaProximaAccion: null,
      idCita: null,
      estado: item.estado,
      observacion: `Lead cargado como muestra #${index + 1}.`,
      creadoPor: adminEmail || 'supervisor@crmllamadas.local',
      creadoEn: `${fechaRecepcion}T12:00:00.000Z`,
      modificadoEn: new Date().toISOString(),
      archivado: false,
    };
  });
}

/**
 * Genera gestiones y citas de muestra para acompañar a los prospectos
 * para que el dashboard muestre datos coherentes de varias telemarketing y varios días
 */
export function generateSampleGestionesAndCitas(
  prospectos: Prospecto[],
  adminEmail: string
): { gestiones: Gestion[]; citas: Cita[] } {
  const today = getTodayInLA();
  const gestiones: Gestion[] = [];
  const citas: Cita[] = [];

  // Tomamos prospectos de GERAL, IRENE y MAIRUT
  const sampleScenarios = [
    // GERAL
    { prosIndex: 0, daysAgo: 1, hora: '10:30 AM', tm: 'GERAL', res: 'Cita' as const, efectivo: 'Sí' as const, obs: 'Cita confirmada para el viernes con ambos cónyuges.', address: '1240 S Soto St, Los Angeles, CA 90023', attends: 'Carlos Valladares', invitado: 'Esposo Mario' },
    { prosIndex: 1, daysAgo: 2, hora: '11:15 AM', tm: 'GERAL', res: 'Llamar luego' as const, efectivo: 'Sí' as const, obs: 'Ocupado en el taller, pidió llamar a las 5 PM.', address: '', attends: '', invitado: '' },
    { prosIndex: 4, daysAgo: 3, hora: '02:00 PM', tm: 'GERAL', res: 'Cita' as const, efectivo: 'Sí' as const, obs: 'Le entusiasma el purificador, agendamos demo presencial.', address: '1520 W 17th St, Santa Ana, CA 92706', attends: 'Roberto Gómez', invitado: 'Hija Diana' },
    { prosIndex: 6, daysAgo: 4, hora: '03:45 PM', tm: 'GERAL', res: 'No contesta' as const, efectivo: 'No' as const, obs: 'Timbró 5 veces y cortó.', address: '', attends: '', invitado: '' },
    { prosIndex: 7, daysAgo: 1, hora: '04:10 PM', tm: 'GERAL', res: 'No interesado' as const, efectivo: 'Sí' as const, obs: 'Indica que se mudará de estado el próximo mes.', address: '', attends: '', invitado: '' },
    { prosIndex: 8, daysAgo: 0, hora: '09:40 AM', tm: 'GERAL', res: 'Buzón' as const, efectivo: 'No' as const, obs: 'Directo al correo de voz.', address: '', attends: '', invitado: '' },

    // IRENE
    { prosIndex: 2, daysAgo: 0, hora: '10:00 AM', tm: 'IRENE', res: 'Cita' as const, efectivo: 'Sí' as const, obs: 'Agendada cita con la familia para presentación.', address: '840 San Fernando Rd, San Fernando, CA 91340', attends: 'Ana Karina Pérez', invitado: 'Hermana Rosa' },
    { prosIndex: 6, daysAgo: 1, hora: '12:30 PM', tm: 'IRENE', res: 'Llamar luego' as const, efectivo: 'Sí' as const, obs: 'En reunión de trabajo, retomar mañana en la mañana.', address: '', attends: '', invitado: '' },
    { prosIndex: 9, daysAgo: 2, hora: '01:15 PM', tm: 'IRENE', res: 'Cita' as const, efectivo: 'Sí' as const, obs: 'Cita programada en su domicilio en Ontario.', address: '2200 S Archibald Ave, Ontario, CA 91761', attends: 'Carlos Valladares', invitado: 'Esposa Elena' },
    { prosIndex: 11, daysAgo: 3, hora: '03:00 PM', tm: 'IRENE', res: 'No contesta' as const, efectivo: 'No' as const, obs: 'Primer intento sin respuesta.', address: '', attends: '', invitado: '' },
    { prosIndex: 12, daysAgo: 4, hora: '04:20 PM', tm: 'IRENE', res: 'Buzón' as const, efectivo: 'No' as const, obs: 'Se dejó recado breve con número de contacto.', address: '', attends: '', invitado: '' },
    { prosIndex: 13, daysAgo: 1, hora: '05:30 PM', tm: 'IRENE', res: 'Llamar luego' as const, efectivo: 'Sí' as const, obs: 'Solicitó información adicional por mensaje.', address: '', attends: '', invitado: '' },

    // MAIRUT
    { prosIndex: 3, daysAgo: 2, hora: '09:50 AM', tm: 'MAIRUT', res: 'Llamar luego' as const, efectivo: 'Sí' as const, obs: 'Pide hablar primero con su socia de negocio.', address: '', attends: '', invitado: '' },
    { prosIndex: 14, daysAgo: 1, hora: '11:00 AM', tm: 'MAIRUT', res: 'Cita' as const, efectivo: 'Sí' as const, obs: 'Agendada cita demostración para cocina y agua.', address: '350 E Ocean Blvd, Long Beach, CA 90802', attends: 'Diana Méndez', invitado: 'Socio comercial' },
    { prosIndex: 15, daysAgo: 3, hora: '01:45 PM', tm: 'MAIRUT', res: 'No interesado' as const, efectivo: 'Sí' as const, obs: 'Agradeció la llamada, no tiene presupuesto actual.', address: '', attends: '', invitado: '' },
    { prosIndex: 16, daysAgo: 4, hora: '02:30 PM', tm: 'MAIRUT', res: 'No contesta' as const, efectivo: 'No' as const, obs: 'Llamada no atendida.', address: '', attends: '', invitado: '' },
    { prosIndex: 17, daysAgo: 0, hora: '03:15 PM', tm: 'MAIRUT', res: 'Cita' as const, efectivo: 'Sí' as const, obs: 'Demostración presencial confirmada para el fin de semana.', address: '10500 Lakewood Blvd, Downey, CA 90241', attends: 'Carlos Valladares', invitado: 'Madre' },
    { prosIndex: 18, daysAgo: 2, hora: '04:50 PM', tm: 'MAIRUT', res: 'Número desconectado/incorrecto' as const, efectivo: 'No' as const, obs: 'Operadora indica número fuera de servicio.', address: '', attends: '', invitado: '' },
  ];

  sampleScenarios.forEach((sc, idx) => {
    const pros = prospectos[sc.prosIndex] || prospectos[0];
    const fechaGestion = subDays(today, sc.daysAgo);
    const cleanDate = fechaGestion.replace(/-/g, '');
    const cleanToday = today.replace(/-/g, '');
    const idSuffix = String(idx + 1).padStart(4, '0');

    const idGestion = `GES-${cleanDate}120000-${idSuffix}`;
    let idCitaGenerada = '';

    if (sc.res === 'Cita') {
      idCitaGenerada = `CITA-${cleanDate}120000-${idSuffix}`;
      const fechaCita = subDays(today, sc.daysAgo - 3); // cita agendada para 3 días después

      const nuevaCita: Cita = {
        id: idCitaGenerada,
        idProspecto: pros.id,
        fechaCreacion: `${fechaGestion}T12:00:00.000Z`,
        telemarketing: sc.tm,
        fechaCita,
        horaCita: sc.hora,
        asunto: `Demostración de Sistema - ${pros.nombre}`,
        direccion: sc.address || `${pros.ciudadZona || 'Los Ángeles'}, CA`,
        linkGoogleMaps: generateGoogleMapsLink(sc.address || `${pros.ciudadZona}, CA`),
        descripcion: sc.obs,
        quienAtiende: sc.attends || 'Carlos Valladares',
        invitado: sc.invitado || '',
        estadoCita: 'Agendada',
        idEventoCalendar: '',
        enlaceCalendar: '',
        ultimaActualizacion: new Date().toISOString(),
      };
      citas.push(nuevaCita);
    }

    const nuevaGestion: Gestion = {
      id: idGestion,
      idProspecto: pros.id,
      fechaHora: `${fechaGestion}, ${sc.hora}`,
      telemarketing: sc.tm,
      canal: 'Llamada',
      resultado: sc.res,
      efectivo: sc.efectivo,
      observacion: sc.obs,
      fechaSeguimiento: sc.res === 'Llamar luego' ? subDays(today, sc.daysAgo - 2) : '',
      horaSeguimiento: sc.res === 'Llamar luego' ? '11:00 AM' : '',
      idCita: idCitaGenerada,
      creadoPor: adminEmail || 'supervisor@crmllamadas.local',
      creadoEn: `${fechaGestion}T12:00:00.000Z`,
    };

    gestiones.push(nuevaGestion);
  });

  return { gestiones, citas };
}
