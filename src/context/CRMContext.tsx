import { subscribeCRMRecords } from '../stage78/scopedSubscription';
import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  getDocs,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from './AuthContext';
import {
  Prospecto,
  AppSettings,
  UserProfile,
  Role,
  TelemarketingAgentConfig,
  LogCarga,
  ExcelRowItem,
  ImportOptions,
  Gestion,
  Cita,
  ResultadoLlamada,
  Retroalimentacion,
  Venta,
  ResultadoCita,
  EstadoCita,
  EstadoVenta,
  LogVenta,
  ReglaComision,
  UsuarioAutorizado,
  SolicitudAcceso,
  LogAcceso,
} from '../types';
import {
  DEFAULT_SETTINGS,
  SIN_ASIGNAR,
  ADMIN_EMAIL,
  normalizeEmail,
  isAdminEmail,
  generateIdWithPrefix,
  generateProspectoId,
  generateGestionId,
  generateCitaId,
  generateRetroalimentacionId,
  generateVentaId,
  generateLogVentaId,
  generateReglaComisionId,
  calculateBonoGenerado,
  calculateBonoPagable,
  getSugerenciaComision,
  normalizePhone,
  validateAndNormalizePhone,
  calculateTemperature,
  findDuplicatePhone,
  getTodayInLA,
  isContactoEfectivo,
  getEstadoByResultado,
  getTemperaturaPostLlamada,
  calculateDailyProspectoTemperatura,
  generateGoogleMapsLink,
  formatDateTimeLA,
} from '../businessRules';
import { generateSampleProspectos, generateSampleGestionesAndCitas } from '../sampleData';

interface CRMContextType {
  prospectos: Prospecto[];
  gestiones: Gestion[];
  citas: Cita[];
  retroalimentaciones: Retroalimentacion[];
  ventas: Venta[];
  logsVentas: LogVenta[];
  usuariosAutorizados: UsuarioAutorizado[];
  solicitudesAcceso: SolicitudAcceso[];
  logsAccesos: LogAcceso[];
  settings: AppSettings;
  usersList: UserProfile[];
  logsCargas: LogCarga[];
  loading: boolean;
  error: string | null;
  actualizarVentas: (ventasActualizadas: Array<{
    id: string;
    montoAprobado: number | null;
    porcentajeBono: number | null;
    estado: EstadoVenta;
    observacion: string;
    ultimaActualizacionOriginal?: string;
  }>) => Promise<{ success: boolean; updatedCount: number; conflicts?: string[]; error?: string }>;
  cancelarVenta: (idVenta: string, motivo: string) => Promise<{ success: boolean; error?: string }>;
  agregarReglaComision: (regla: Omit<ReglaComision, 'id'>) => Promise<{ success: boolean; error?: string }>;
  actualizarReglaComision: (id: string, updates: Partial<ReglaComision>) => Promise<{ success: boolean; error?: string }>;
  eliminarReglaComision: (id: string) => Promise<{ success: boolean; error?: string }>;
  agregarUsuarioAutorizado: (datos: {
    email: string;
    nombre: string;
    rol: 'Supervisor' | 'Telemarketing';
    telemarketingVinculada?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  actualizarUsuarioAutorizado: (
    email: string,
    updates: Partial<UsuarioAutorizado>
  ) => Promise<{ success: boolean; error?: string }>;
  toggleActivarUsuario: (
    email: string,
    nuevoEstado: boolean
  ) => Promise<{ success: boolean; error?: string }>;
  eliminarUsuarioAutorizado: (email: string) => Promise<{ success: boolean; error?: string }>;
  aprobarSolicitudAcceso: (
    solicitud: SolicitudAcceso,
    config: { rol: 'Supervisor' | 'Telemarketing'; telemarketingVinculada?: string }
  ) => Promise<{ success: boolean; error?: string }>;
  rechazarSolicitudAcceso: (solicitud: SolicitudAcceso) => Promise<{ success: boolean; error?: string }>;
  registrarResultadoCita: (
    cita: Cita,
    resultadoData: {
      resultado: ResultadoCita;
      observacion: string;
      nuevaFecha?: string;
      nuevaHora?: string;
      fechaProximoContacto?: string;
      horaProximoContacto?: string;
    }
  ) => Promise<{ success: boolean; idRetro?: string; idVenta?: string; error?: string }>;
  cancelarCita: (cita: Cita, motivo: string) => Promise<{ success: boolean; error?: string }>;
  registrarGestion: (
    prospecto: Prospecto,
    gestionData: {
      fechaHora?: string;
      telemarketing: string;
      canal?: string;
      resultado: ResultadoLlamada;
      observacion: string;
      fechaSeguimiento?: string;
      horaSeguimiento?: string;
      citaData?: {
        fechaCita: string;
        horaCita: string;
        asunto: string;
        direccion: string;
        quienAtiende: string;
        invitado?: string;
        descripcion?: string;
      };
    }
  ) => Promise<{ success: boolean; idGestion?: string; idCita?: string; error?: string }>;
  addProspecto: (
    data: Omit<
      Prospecto,
      | 'id'
      | 'temperatura'
      | 'intentos'
      | 'contactosEfectivos'
      | 'creadoPor'
      | 'creadoEn'
      | 'modificadoEn'
      | 'archivado'
      | 'estado'
      | 'ultimoContacto'
      | 'ultimoResultado'
      | 'proximaAccion'
      | 'fechaProximaAccion'
      | 'idCita'
    > & {
      estado?: string;
      archivado?: boolean;
    }
  ) => Promise<{ success: boolean; prospecto?: Prospecto; error?: string }>;
  updateProspecto: (
    id: string,
    updates: Partial<Prospecto>
  ) => Promise<{ success: boolean; error?: string }>;
  archiveProspecto: (id: string, archivado: boolean) => Promise<{ success: boolean; error?: string }>;
  reassignTelemarketingBulk: (
    ids: string[],
    newAgent: string
  ) => Promise<{ success: boolean; error?: string }>;
  updateSettings: (newSettings: Partial<AppSettings>) => Promise<{ success: boolean; error?: string }>;
  addTelemarketingAgent: (name: string) => Promise<{ success: boolean; error?: string }>;
  editTelemarketingAgent: (agentId: string, newName: string) => Promise<{ success: boolean; error?: string }>;
  deleteTelemarketingAgent: (agentId: string) => Promise<{ success: boolean; error?: string }>;
  toggleTelemarketingAgent: (agentId: string) => Promise<{ success: boolean; error?: string }>;
  updateUserRole: (
    uid: string,
    role: Role,
    telemarketingAgent?: string
  ) => Promise<{ success: boolean; error?: string }>;
  loadSampleData: () => Promise<{ success: boolean; count: number; error?: string }>;
  clearSampleData: () => Promise<{ success: boolean; count: number; error?: string }>;
  importExcelBatch: (
    rows: ExcelRowItem[],
    options: ImportOptions,
    metadata: {
      filename: string;
      totalRead: number;
      totalDuplicates: number;
      totalErrors: number;
    },
    onProgress?: (progressPercent: number, savedCount: number) => void
  ) => Promise<{ success: boolean; idLote: string; savedCount: number; error?: string }>;
  undoBatch: (idLote: string) => Promise<{ success: boolean; count: number; error?: string }>;
  refreshData: () => void;
}

const CRMContext = createContext<CRMContextType | undefined>(undefined);

export const CRMProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, userProfile, isSupervisor, isAdmin, isAuthorized } = useAuth();

  const [prospectos, setProspectos] = useState<Prospecto[]>([]);
  const [gestiones, setGestiones] = useState<Gestion[]>([]);
  const [citas, setCitas] = useState<Cita[]>([]);
  const [retroalimentaciones, setRetroalimentaciones] = useState<Retroalimentacion[]>([]);
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [logsVentas, setLogsVentas] = useState<LogVenta[]>([]);
  const [usuariosAutorizados, setUsuariosAutorizados] = useState<UsuarioAutorizado[]>([]);
  const [solicitudesAcceso, setSolicitudesAcceso] = useState<SolicitudAcceso[]>([]);
  const [logsAccesos, setLogsAccesos] = useState<LogAcceso[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [logsCargas, setLogsCargas] = useState<LogCarga[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const assignedProspectIds = useMemo(() => prospectos.filter(p => !!userProfile?.telemarketingAgent && p.telemarketing === userProfile.telemarketingAgent).map(p => p.id).sort().join('|'), [prospectos, userProfile?.telemarketingAgent]);

  // Helper para registrar auditoría de accesos
  const registrarLogAcceso = async (
    accion: LogAcceso['accion'],
    usuarioAfectado: string,
    detalles: string
  ) => {
    try {
      const logId = generateIdWithPrefix('LOGACC');
      const nowLA = formatDateTimeLA(new Date());
      const logRef = doc(db, 'logAccesos', logId);
      await setDoc(logRef, {
        id: logId,
        fechaHora: nowLA,
        accion,
        realizadoPor: user?.email || 'Administrador',
        usuarioAfectado,
        detalles,
      });
    } catch (e) {
      console.warn('Aviso registrando logAcceso:', e);
    }
  };

  // 1. Escuchar configuraciones del sistema (requiere usuario autorizado)
  useEffect(() => {
    if (!user || !isAuthorized) {
      setSettings(DEFAULT_SETTINGS);
      return;
    }
    const settingsDocRef = doc(db, 'settings', 'catalogs');
    const unsub = onSnapshot(
      settingsDocRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as AppSettings;
          setSettings({
            ...DEFAULT_SETTINGS,
            ...data,
          });
        } else {
          // Inicializar catálogo por defecto en Firestore
          setDoc(settingsDocRef, DEFAULT_SETTINGS).catch((err) => {
            console.warn('No se pudo inicializar settings en Firestore:', err);
          });
        }
      },
      (err) => {
        console.error('Error cargando configuraciones:', err);
      }
    );
    return () => unsub();
  }, [user, isAuthorized]);

  // 2. Escuchar lista de usuarios autorizados (solo Administrador)
  useEffect(() => {
    if (!user || !isAdmin) {
      setUsuariosAutorizados([]);
      return;
    }
    const colRef = collection(db, 'usuariosAutorizados');
    const unsub = onSnapshot(
      colRef,
      (snap) => {
        const list: UsuarioAutorizado[] = [];
        snap.forEach((d) => list.push(d.data() as UsuarioAutorizado));
        list.sort((a, b) => a.nombre.localeCompare(b.nombre));
        setUsuariosAutorizados(list);
      },
      (err) => {
        console.error('Error escuchando usuariosAutorizados:', err);
      }
    );
    return () => unsub();
  }, [user, isAdmin]);

  // 3. Escuchar solicitudes de acceso pendientes (solo Administrador)
  useEffect(() => {
    if (!user || !isAdmin) {
      setSolicitudesAcceso([]);
      return;
    }
    const colRef = collection(db, 'solicitudesAcceso');
    const unsub = onSnapshot(
      colRef,
      (snap) => {
        const list: SolicitudAcceso[] = [];
        snap.forEach((d) => list.push(d.data() as SolicitudAcceso));
        list.sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
        setSolicitudesAcceso(list);
      },
      (err) => {
        console.error('Error escuchando solicitudesAcceso:', err);
      }
    );
    return () => unsub();
  }, [user, isAdmin]);

  // 4. Escuchar historial de logs de acceso (solo Administrador)
  useEffect(() => {
    if (!user || !isAdmin) {
      setLogsAccesos([]);
      return;
    }
    const colRef = collection(db, 'logAccesos');
    const unsub = onSnapshot(
      colRef,
      (snap) => {
        const list: LogAcceso[] = [];
        snap.forEach((d) => list.push(d.data() as LogAcceso));
        list.sort((a, b) => (b.fechaHora || '').localeCompare(a.fechaHora || ''));
        setLogsAccesos(list);
      },
      (err) => {
        console.error('Error escuchando logAccesos:', err);
      }
    );
    return () => unsub();
  }, [user, isAdmin]);

  // 5. Escuchar lista de usuarios legacy (si es supervisor)
  useEffect(() => {
    if (!user || !isAuthorized || !isSupervisor) {
      setUsersList([]);
      return;
    }
    const usersColRef = collection(db, 'users');
    const unsub = onSnapshot(
      usersColRef,
      (snap) => {
        const list: UserProfile[] = [];
        snap.forEach((docSnap) => {
          list.push(docSnap.data() as UserProfile);
        });
        setUsersList(list);
      },
      (err) => {
        console.error('Error escuchando usuarios legacy:', err);
      }
    );
    return () => unsub();
  }, [user, isAuthorized, isSupervisor]);

  // 6. Escuchar historial de cargas masivas (logCargas)
  useEffect(() => {
    if (!user || !isAuthorized || !isSupervisor) {
      setLogsCargas([]);
      return;
    }
    const logsColRef = collection(db, 'logCargas');
    const unsub = onSnapshot(
      logsColRef,
      (snap) => {
        const list: LogCarga[] = [];
        snap.forEach((docSnap) => {
          list.push(docSnap.data() as LogCarga);
        });
        list.sort((a, b) => (b.fechaHora || '').localeCompare(a.fechaHora || ''));
        setLogsCargas(list);
      },
      (err) => {
        console.error('Error escuchando historial de cargas:', err);
      }
    );
    return () => unsub();
  }, [user, isAuthorized, isSupervisor]);

  // 7. Escuchar gestiones, con permisos por prospecto actualmente asignado.
  useEffect(() => {
    if (!user || !isAuthorized) { setGestiones([]); return; }
    return subscribeCRMRecords('gestiones', isSupervisor, assignedProspectIds ? assignedProspectIds.split('|') : [], rows => {
      const list = rows as any[];
      list.sort((a,b) => (b.fechaHora || '').localeCompare(a.fechaHora || ''));
      setGestiones(list);
    }, err => { console.error('Error cargando gestiones:', err); setError('Error al consultar gestiones.'); });
  }, [user, isAuthorized, isSupervisor, isSupervisor ? '' : assignedProspectIds]);

  // 8. Escuchar citas, con permisos por prospecto actualmente asignado.
  useEffect(() => {
    if (!user || !isAuthorized) { setCitas([]); return; }
    return subscribeCRMRecords('citas', isSupervisor, assignedProspectIds ? assignedProspectIds.split('|') : [], rows => {
      const list = rows as any[];
      list.sort((a,b) => (b.fechaCita || '').localeCompare(a.fechaCita || ''));
      setCitas(list);
    }, err => { console.error('Error cargando citas:', err); setError('Error al consultar citas.'); });
  }, [user, isAuthorized, isSupervisor, isSupervisor ? '' : assignedProspectIds]);

  // 9. Escuchar retroalimentaciones, con permisos por prospecto actualmente asignado.
  useEffect(() => {
    if (!user || !isAuthorized) { setRetroalimentaciones([]); return; }
    return subscribeCRMRecords('retroalimentaciones', isSupervisor, assignedProspectIds ? assignedProspectIds.split('|') : [], rows => {
      const list = rows as any[];
      list.sort((a,b) => (b.fecha || '').localeCompare(a.fecha || ''));
      setRetroalimentaciones(list);
    }, err => { console.error('Error cargando retroalimentaciones:', err); setError('Error al consultar retroalimentaciones.'); });
  }, [user, isAuthorized, isSupervisor, isSupervisor ? '' : assignedProspectIds]);

  // 10. Escuchar ventas, con permisos por prospecto actualmente asignado.
  useEffect(() => {
    if (!user || !isAuthorized) { setVentas([]); return; }
    return subscribeCRMRecords('ventas', isSupervisor, assignedProspectIds ? assignedProspectIds.split('|') : [], rows => {
      const list = rows as any[];
      list.sort((a,b) => (b.fechaReporte || '').localeCompare(a.fechaReporte || ''));
      setVentas(list);
    }, err => { console.error('Error cargando ventas:', err); setError('Error al consultar ventas.'); });
  }, [user, isAuthorized, isSupervisor, isSupervisor ? '' : assignedProspectIds]);

  // 10.1 Escuchar logVentas (solo Supervisor y Administrador)
  useEffect(() => {
    if (!user || !isAuthorized || !isSupervisor) {
      setLogsVentas([]);
      return;
    }
    const logsColRef = collection(db, 'logVentas');
    const unsub = onSnapshot(
      logsColRef,
      (snap) => {
        const list: LogVenta[] = [];
        snap.forEach((docSnap) => {
          list.push(docSnap.data() as LogVenta);
        });
        list.sort((a, b) => (b.fechaHora || '').localeCompare(a.fechaHora || ''));
        setLogsVentas(list);
      },
      (err) => {
        console.warn('Aviso escuchando logVentas:', err);
      }
    );
    return () => unsub();
  }, [user, isAuthorized, isSupervisor]);

  // 11. Escuchar prospectos según rol
  useEffect(() => {
    if (!user || !isAuthorized) {
      setProspectos([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const prospectosColRef = collection(db, 'prospectos');

    // Supervisor y Administrador ven todos los prospectos
    // Telemarketing solo ve los asignados a su nombre de agente
    let q = query(prospectosColRef);
    if (!isSupervisor) {
      q = query(prospectosColRef, where('telemarketing', '==', userProfile?.telemarketingAgent || '__SIN_VINCULO__'));
    }

    const unsub = onSnapshot(
      q,
      async (snap) => {
        const loaded: Prospecto[] = [];
        const toUpdateTemperaturas: { id: string; newTemp: Prospecto['temperatura'] }[] = [];

        snap.forEach((docSnap) => {
          const item = docSnap.data() as Prospecto;
          const currentCalculatedTemp = calculateDailyProspectoTemperatura(
            item.fechaRecepcion,
            item.ultimoResultado,
            item.contactosEfectivos || 0
          );
          if (item.temperatura !== currentCalculatedTemp) {
            toUpdateTemperaturas.push({ id: item.id, newTemp: currentCalculatedTemp });
            item.temperatura = currentCalculatedTemp;
          }
          loaded.push(item);
        });

        loaded.sort((a, b) => b.fechaRecepcion.localeCompare(a.fechaRecepcion));
        setProspectos(loaded);
        setLoading(false);

        if (toUpdateTemperaturas.length > 0 && isSupervisor) {
          try {
            const batch = writeBatch(db);
            toUpdateTemperaturas.slice(0, 50).forEach((u) => {
              const docRef = doc(db, 'prospectos', u.id);
              batch.update(docRef, {
                temperatura: u.newTemp,
                modificadoEn: new Date().toISOString(),
              });
            });
            await batch.commit();
          } catch (syncErr) {
            console.warn('Aviso: recalculo de temperatura en batch:', syncErr);
          }
        }
      },
      (err) => {
        console.error('Error cargando prospectos:', err);
        setError('Error al consultar prospectos en la base de datos.');
        setLoading(false);
      }
    );

    return () => unsub();
  }, [user, isAuthorized, isSupervisor, userProfile?.telemarketingAgent]);

  // Agregar un prospecto nuevo aplicando las 4 reglas oficiales de teléfono
  const addProspecto = async (
    data: Omit<
      Prospecto,
      | 'id'
      | 'temperatura'
      | 'intentos'
      | 'contactosEfectivos'
      | 'creadoPor'
      | 'creadoEn'
      | 'modificadoEn'
      | 'archivado'
      | 'estado'
      | 'ultimoContacto'
      | 'ultimoResultado'
      | 'proximaAccion'
      | 'fechaProximaAccion'
      | 'idCita'
    > & {
      estado?: string;
      archivado?: boolean;
      idLote?: string;
    }
  ) => {
    // 1. Validar y normalizar teléfono con las 4 reglas de negocio
    const phoneRes = validateAndNormalizePhone(data.telefono, prospectos);
    if (!phoneRes.isValid) {
      return { success: false, error: phoneRes.error };
    }
    const normalizedPhone = phoneRes.normalizedPhone;

    // 2. Validación defensiva en Firestore completo
    try {
      const dupQuery = query(collection(db, 'prospectos'), where('telefono', '==', normalizedPhone));
      const dupSnap = await getDocs(dupQuery);
      if (!dupSnap.empty) {
        const remoteDup = dupSnap.docs[0].data() as Prospecto;
        return {
          success: false,
          error: `DUPLICADO: El teléfono normalizado (${normalizedPhone}) ya pertenece al prospecto existente "${remoteDup.nombre}" (ID: ${remoteDup.id}, Estado: "${remoteDup.estado}").`,
        };
      }
    } catch (checkErr) {
      console.warn('Verificación remota de duplicado en Firestore:', checkErr);
    }

    // 3. Validar nombre
    if (!data.nombre || data.nombre.trim().length === 0) {
      return { success: false, error: 'El nombre del prospecto es obligatorio.' };
    }

    // 4. Fechas y temperatura
    const fechaRecepcion = data.fechaRecepcion || getTodayInLA();
    const temperatura = calculateTemperature(fechaRecepcion);

    // 5. Telemarketing por defecto
    const telemarketing =
      data.telemarketing && data.telemarketing.trim().length > 0
        ? data.telemarketing.trim()
        : SIN_ASIGNAR;

    // 6. Generar ID PROS-aaaammddhhmmss-xxxx
    const id = generateProspectoId();
    const nowIso = new Date().toISOString();
    const userIdentifier = user?.email || userProfile?.displayName || 'Sistema';

    const newProspecto: Prospecto = {
      id,
      idLote: data.idLote || undefined,
      fechaRecepcion,
      fechaProspeccion: data.fechaProspeccion || '',
      propietario: (data.propietario || '').trim(),
      tipoCarga: data.tipoCarga || 'Manual',
      tipoProspecto: (data.tipoProspecto || 'Personal').trim(),
      origen: (data.origen || 'Recomendación').trim(),
      nombre: data.nombre.trim(),
      telefono: normalizedPhone,
      ciudadZona: (data.ciudadZona || '').trim(),
      telemarketing,
      temperatura,
      contexto: (data.contexto || '').trim(),
      llamadoPorEmprendedor: data.llamadoPorEmprendedor || 'No',
      ultimoContacto: null,
      ultimoResultado: null,
      intentos: 0,
      contactosEfectivos: 0,
      proximaAccion: null,
      fechaProximaAccion: null,
      idCita: null,
      estado: data.estado || 'Nuevo',
      observacion: (data.observacion || '').trim(),
      creadoPor: userIdentifier,
      creadoEn: nowIso,
      modificadoEn: nowIso,
      archivado: !!data.archivado,
    };

    try {
      await setDoc(doc(db, 'prospectos', id), newProspecto);
      return { success: true, prospecto: newProspecto };
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `prospectos/${id}`);
      return { success: false, error: 'Error al guardar el prospecto en Firestore.' };
    }
  };

  // Actualizar prospecto
  const updateProspecto = async (id: string, updates: Partial<Prospecto>) => {
    try {
      // Si se actualiza el teléfono, aplicar las 4 reglas oficiales
      if (updates.telefono !== undefined) {
        const phoneRes = validateAndNormalizePhone(updates.telefono, prospectos, id);
        if (!phoneRes.isValid) {
          return { success: false, error: phoneRes.error };
        }
        updates.telefono = phoneRes.normalizedPhone;
      }

      // Si se actualiza fechaRecepcion, recalcular temperatura
      if (updates.fechaRecepcion) {
        updates.temperatura = calculateTemperature(updates.fechaRecepcion);
      }

      const userIdentifier = user?.email || userProfile?.displayName || 'Sistema';
      const payload = {
        ...updates,
        modificadoEn: new Date().toISOString(),
        modificadoPor: userIdentifier,
      };

      const batch = writeBatch(db);
      batch.update(doc(db, 'prospectos', id), payload);
      const previous = prospectos.find(p => p.id === id);
      if (updates.telemarketing !== undefined && previous?.telemarketing !== updates.telemarketing) {
        batch.set(doc(collection(db, 'logAsignaciones')), {idProspecto: id, anterior: previous?.telemarketing || '', nueva: updates.telemarketing, usuario: userIdentifier, fecha: new Date().toISOString()});
      }
      await batch.commit();
      return { success: true };
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `prospectos/${id}`);
      return { success: false, error: 'Error al actualizar el prospecto.' };
    }
  };

  // Archivar o restaurar prospecto (papelera recuperable)
  const archiveProspecto = async (id: string, archivado: boolean) => {
    try {
      await updateDoc(doc(db, 'prospectos', id), {
        archivado,
        ...(archivado ? {archivadoEn: new Date().toISOString(), archivadoPor: user?.email || 'Sistema', motivoArchivo: prospectos.find(p => p.id === id)?.observacion || 'Archivado por el usuario'} : {}),
        modificadoEn: new Date().toISOString(),
        modificadoPor: user?.email || 'Sistema',
      });
      return { success: true };
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `prospectos/${id}`);
      return { success: false, error: 'Error al archivar/restaurar el prospecto.' };
    }
  };

  // Reasignación masiva o individual de telemarketing
  const reassignTelemarketingBulk = async (ids: string[], newAgent: string) => {
    if (!ids || ids.length === 0) {
      return { success: false, error: 'No se seleccionaron prospectos para reasignar.' };
    }

    try {
      const nowIso = new Date().toISOString();
      const userIdentifier = user?.email || 'Sistema';
      for (let offset=0; offset<ids.length; offset+=199) {
        const batch = writeBatch(db);
        for (const id of ids.slice(offset,offset+199)) {
          batch.update(doc(db, 'prospectos', id), {telemarketing:newAgent || SIN_ASIGNAR,modificadoEn:nowIso,modificadoPor:userIdentifier});
          batch.set(doc(collection(db,'logAsignaciones')), {idProspecto:id,anterior:prospectos.find(p=>p.id===id)?.telemarketing || '',nueva:newAgent || SIN_ASIGNAR,usuario:userIdentifier,fecha:nowIso});
        }
        await batch.commit();
      }
      return { success: true };
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'prospectos');
      return { success: false, error: 'Error en la reasignación de telemarketing.' };
    }
  };

  // Actualizar configuraciones del sistema (solo supervisor)
  const updateSettings = async (newSettings: Partial<AppSettings>) => {
    try {
      const settingsDocRef = doc(db, 'settings', 'catalogs');
      const payload: AppSettings = {
        ...settings,
        ...newSettings,
        updatedAt: new Date().toISOString(),
        updatedBy: user?.email || 'Supervisor',
      };
      await setDoc(settingsDocRef, payload);
      setSettings(payload);
      return { success: true };
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'settings/catalogs');
      return { success: false, error: 'Error al guardar configuraciones.' };
    }
  };

  // --- GESTIÓN DE TELEMARKETING EN CONFIGURACIÓN ---

  const addTelemarketingAgent = async (name: string) => {
    const clean = name.trim().toUpperCase();
    if (!clean) {
      return { success: false, error: 'El nombre de la agente es obligatorio y no puede estar vacío.' };
    }

    const exists = settings.telemarketingAgents.some(
      (a) => a.name.trim().toUpperCase() === clean
    );
    if (exists) {
      return {
        success: false,
        error: `Ya existe una agente de telemarketing registrada con el nombre "${clean}". Los nombres deben ser únicos.`,
      };
    }

    const newAgent: TelemarketingAgentConfig = {
      id: `tm-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: clean,
      active: true,
    };

    const updatedAgents = [...settings.telemarketingAgents, newAgent];
    return await updateSettings({ telemarketingAgents: updatedAgents });
  };

  const editTelemarketingAgent = async (agentId: string, newName: string) => {
    const clean = newName.trim().toUpperCase();
    if (!clean) {
      return { success: false, error: 'El nombre de la agente no puede estar vacío.' };
    }

    const currentAgent = settings.telemarketingAgents.find((a) => a.id === agentId);
    if (!currentAgent) {
      return { success: false, error: 'La agente de telemarketing no fue encontrada.' };
    }

    const existsOther = settings.telemarketingAgents.some(
      (a) => a.id !== agentId && a.name.trim().toUpperCase() === clean
    );
    if (existsOther) {
      return {
        success: false,
        error: `El nombre "${clean}" ya está en uso por otra agente. Elige un nombre único.`,
      };
    }

    const oldName = currentAgent.name;

    const updatedAgents = settings.telemarketingAgents.map((a) =>
      a.id === agentId ? { ...a, name: clean } : a
    );
    const saveRes = await updateSettings({ telemarketingAgents: updatedAgents });
    if (!saveRes.success) return saveRes;

    // Sincronizar prospectos que tenían el nombre antiguo
    if (oldName !== clean) {
      try {
        const batch = writeBatch(db);
        let count = 0;
        prospectos.forEach((p) => {
          if (p.telemarketing === oldName) {
            const pRef = doc(db, 'prospectos', p.id);
            batch.update(pRef, {
              telemarketing: clean,
              modificadoEn: new Date().toISOString(),
            });
            count++;
          }
        });
        if (count > 0) {
          await batch.commit();
        }

        // Sincronizar usuarios vinculados
        for (const u of usersList) {
          if (u.telemarketingAgent === oldName) {
            await updateUserRole(u.uid, 'Telemarketing', clean);
          }
        }
      } catch (syncErr) {
        console.warn('Aviso sincronizando prospectos al renombrar agente:', syncErr);
      }
    }

    return { success: true };
  };

  const deleteTelemarketingAgent = async (agentId: string) => {
    const agent = settings.telemarketingAgents.find((a) => a.id === agentId);
    if (!agent) {
      return { success: false, error: 'Agente no encontrada.' };
    }

    const activeAssigned = prospectos.filter(
      (p) => !p.archivado && p.telemarketing.trim().toUpperCase() === agent.name.trim().toUpperCase()
    );

    if (activeAssigned.length > 0) {
      return {
        success: false,
        error: `No se puede eliminar la agente "${agent.name}" porque tiene ${activeAssigned.length} prospecto(s) activo(s) asignado(s). Reasigna los prospectos a otra agente antes de eliminarla.`,
      };
    }

    const updatedAgents = settings.telemarketingAgents.filter((a) => a.id !== agentId);
    return await updateSettings({ telemarketingAgents: updatedAgents });
  };

  const toggleTelemarketingAgent = async (agentId: string) => {
    const updatedAgents = settings.telemarketingAgents.map((a) =>
      a.id === agentId ? { ...a, active: !a.active } : a
    );
    return await updateSettings({ telemarketingAgents: updatedAgents });
  };

  const updateUserRole = async (uid: string, role: Role, telemarketingAgent = '') => {
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        role,
        telemarketingAgent: role === 'Telemarketing' ? telemarketingAgent : '',
        updatedAt: new Date().toISOString(),
      });
      return { success: true };
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${uid}`);
      return { success: false, error: 'Error al actualizar usuario.' };
    }
  };

  // --- ETAPA 2: IMPORTACIÓN POR LOTES DE EXCEL ---

  const importExcelBatch = async (
    rows: ExcelRowItem[],
    options: ImportOptions,
    metadata: {
      filename: string;
      totalRead: number;
      totalDuplicates: number;
      totalErrors: number;
    },
    onProgress?: (progressPercent: number, savedCount: number) => void
  ) => {
    if (!rows || rows.length === 0) {
      return { success: false, idLote: '', savedCount: 0, error: 'No hay filas válidas para importar.' };
    }

    const today = getTodayInLA();
    const nowIso = new Date().toISOString();
    const userIdentifier = user?.email || userProfile?.displayName || 'Supervisor';

    // Generar ID de lote único
    const nowParts = today.replace(/-/g, '');
    const timeParts = new Date().toTimeString().slice(0, 8).replace(/:/g, '');
    const randomSuffix = Math.random().toString(36).substring(2, 6).toLowerCase();
    const idLote = `LOTE-${nowParts}${timeParts}-${randomSuffix}`;

    // Preparar lista de agentes para round-robin
    const roundRobinAgents =
      options.sinTelemarketingModo === 'repartir' && options.agentesReparto.length > 0
        ? options.agentesReparto
        : [];

    let roundRobinIndex = 0;
    const prospectosToSave: Prospecto[] = [];

    rows.forEach((row, idx) => {
      // Asignación de telemarketing según opciones
      let assignedTm = row.telemarketing;

      if (!assignedTm || assignedTm === SIN_ASIGNAR) {
        if (options.sinTelemarketingModo === 'asignar_uno' && options.agenteAsignado) {
          assignedTm = options.agenteAsignado;
        } else if (options.sinTelemarketingModo === 'repartir' && roundRobinAgents.length > 0) {
          assignedTm = roundRobinAgents[roundRobinIndex % roundRobinAgents.length];
          roundRobinIndex++;
        } else {
          assignedTm = SIN_ASIGNAR;
        }
      }

      // Propietario por defecto si viene vacío
      const propietario = row.propietario || options.propietarioPorDefecto || '';

      // ID único con sufijo secuencial
      const uniqueSuffix = (idx + 1).toString().padStart(4, '0');
      const prospectoId = `PROS-${nowParts}${timeParts}-${uniqueSuffix}`;

      const lead: Prospecto = {
        id: prospectoId,
        idLote,
        fechaRecepcion: today,
        fechaProspeccion: row.fechaProspeccion || '',
        propietario: propietario.trim(),
        tipoCarga: 'Excel',
        tipoProspecto: row.tipoProspecto || 'Personal',
        origen: row.origen || 'Recomendación',
        nombre: row.nombre.trim(),
        telefono: row.telefonoNormalizado,
        ciudadZona: (row.ciudadZona || '').trim(),
        telemarketing: assignedTm,
        temperatura: 'Hot', // Nace Hot porque fechaRecepcion es hoy
        contexto: (row.contexto || '').trim(),
        llamadoPorEmprendedor: row.llamadoPorEmprendedor || 'No',
        ultimoContacto: null,
        ultimoResultado: null,
        intentos: 0,
        contactosEfectivos: 0,
        proximaAccion: null,
        fechaProximaAccion: null,
        idCita: null,
        estado: 'Nuevo',
        observacion: `Importado en lote ${idLote} desde ${metadata.filename}.`,
        creadoPor: userIdentifier,
        creadoEn: nowIso,
        modificadoEn: nowIso,
        archivado: false,
      };

      prospectosToSave.push(lead);
    });

    // Guardado por lotes (máximo 400 por writeBatch de Firestore)
    const BATCH_SIZE = 400;
    let savedTotal = 0;

    try {
      for (let i = 0; i < prospectosToSave.length; i += BATCH_SIZE) {
        const chunk = prospectosToSave.slice(i, i + BATCH_SIZE);
        const batch = writeBatch(db);

        chunk.forEach((item) => {
          const docRef = doc(db, 'prospectos', item.id);
          batch.set(docRef, item);
        });

        await batch.commit();
        savedTotal += chunk.length;

        if (onProgress) {
          const percent = Math.round((savedTotal / prospectosToSave.length) * 100);
          onProgress(percent, savedTotal);
        }
      }

      // Guardar registro de carga en logCargas
      let repartoDesc = 'Asignación directa del archivo';
      if (options.sinTelemarketingModo === 'asignar_uno' && options.agenteAsignado) {
        repartoDesc = `Asignación fija a ${options.agenteAsignado}`;
      } else if (options.sinTelemarketingModo === 'repartir' && roundRobinAgents.length > 0) {
        repartoDesc = `Reparto equitativo entre: ${roundRobinAgents.join(', ')}`;
      }

      const logDoc: LogCarga = {
        id: idLote,
        idLote,
        fechaHora: nowIso,
        usuario: userIdentifier,
        nombreArchivo: metadata.filename,
        filasLeidas: metadata.totalRead,
        filasCreadas: savedTotal,
        filasDuplicadas: metadata.totalDuplicates,
        filasError: metadata.totalErrors,
        repartoAplicado: repartoDesc,
        deshecho: false,
      };

      await setDoc(doc(db, 'logCargas', idLote), logDoc);

      return { success: true, idLote, savedCount: savedTotal };
    } catch (err: any) {
      console.error('Error durante importación por lotes:', err);
      return {
        success: false,
        idLote,
        savedCount: savedTotal,
        error: `Fallo durante el guardado de lotes. Se guardaron ${savedTotal} prospectos antes del error: ${err.message}`,
      };
    }
  };

  // Deshacer lote de carga: archiva prospectos de ese lote que sigan en estado "Nuevo" y sin gestiones (intentos === 0)
  const undoBatch = async (idLote: string) => {
    try {
      const leadsToArchive = prospectos.filter(
        (p) =>
          p.idLote === idLote &&
          p.estado === 'Nuevo' &&
          p.intentos === 0 &&
          !p.archivado
      );

      if (leadsToArchive.length === 0) {
        return {
          success: false,
          count: 0,
          error: 'No se encontraron prospectos en estado "Nuevo" y sin llamadas para archivar en este lote.',
        };
      }

      const nowIso = new Date().toISOString();
      const userIdentifier = user?.email || 'Supervisor';

      const BATCH_SIZE = 400;
      let archivedCount = 0;

      for (let i = 0; i < leadsToArchive.length; i += BATCH_SIZE) {
        const chunk = leadsToArchive.slice(i, i + BATCH_SIZE);
        const batch = writeBatch(db);

        chunk.forEach((item) => {
          const docRef = doc(db, 'prospectos', item.id);
          batch.update(docRef, {
            archivado: true,
            estado: 'Archivado',
            observacion: `Archivado por reversión del lote ${idLote}.`,
            modificadoEn: nowIso,
            modificadoPor: userIdentifier,
          });
        });

        await batch.commit();
        archivedCount += chunk.length;
      }

      // Marcar log como deshecho
      const logRef = doc(db, 'logCargas', idLote);
      await updateDoc(logRef, {
        deshecho: true,
        deshechoEn: nowIso,
        deshechoPor: userIdentifier,
      }).catch((e) => console.warn('Aviso actualizando log:', e));

      return { success: true, count: archivedCount };
    } catch (err: any) {
      return { success: false, count: 0, error: err.message || 'Error al deshacer lote.' };
    }
  };

  // Cargar ~30 prospectos de muestra con gestiones y citas coherentes para el Dashboard
  const loadSampleData = async () => {
    try {
      const email = user?.email || 'supervisor@crmllamadas.local';
      const sampleList = generateSampleProspectos(email);
      const { gestiones: sampleGestiones, citas: sampleCitas } = generateSampleGestionesAndCitas(sampleList, email);

      const batch = writeBatch(db);

      sampleList.forEach((lead) => {
        const ref = doc(db, 'prospectos', lead.id);
        batch.set(ref, lead);
      });

      sampleGestiones.forEach((g) => {
        const ref = doc(db, 'gestiones', g.id);
        batch.set(ref, g);
      });

      sampleCitas.forEach((c) => {
        const ref = doc(db, 'citas', c.id);
        batch.set(ref, c);
      });

      // Crear un par de ventas de muestra vinculadas a las citas
      if (sampleCitas.length > 0) {
        const cita1 = sampleCitas[0];
        const v1Id = generateVentaId();
        const v1: Venta = {
          id: v1Id,
          idProspecto: cita1.idProspecto,
          idCita: cita1.id,
          fechaReporte: getTodayInLA(),
          telemarketing: cita1.telemarketing,
          montoAprobado: 2500,
          estado: 'Aprobada',
          porcentajeBono: 0.015,
          bonoGenerado: 37.5,
          bonoPagable: 37.5,
          ultimaActualizacion: new Date().toISOString(),
          observacion: 'Venta cerrada con paquete inicial estándar',
          modificadoPor: email,
        };
        batch.set(doc(db, 'ventas', v1Id), v1);

        if (sampleCitas.length > 1) {
          const cita2 = sampleCitas[1];
          const v2Id = generateVentaId();
          const v2: Venta = {
            id: v2Id,
            idProspecto: cita2.idProspecto,
            idCita: cita2.id,
            fechaReporte: getTodayInLA(),
            telemarketing: cita2.telemarketing,
            montoAprobado: 3200,
            estado: 'Pendiente',
            porcentajeBono: 0.015,
            bonoGenerado: 48,
            bonoPagable: 0,
            ultimaActualizacion: new Date().toISOString(),
            observacion: 'En revisión de documentación financiera',
            modificadoPor: email,
          };
          batch.set(doc(db, 'ventas', v2Id), v2);
        }
      }

      await batch.commit();
      return { success: true, count: sampleList.length };
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'prospectos');
      return { success: false, count: 0, error: 'Error al cargar datos de muestra.' };
    }
  };

  // Limpiar datos de muestra o todos los prospectos, gestiones y citas
  const clearSampleData = async () => {
    try {
      const prosSnap = await getDocs(collection(db, 'prospectos'));
      const gestSnap = await getDocs(collection(db, 'gestiones'));
      const citSnap = await getDocs(collection(db, 'citas'));
      const venSnap = await getDocs(collection(db, 'ventas'));

      const batch = writeBatch(db);
      let count = 0;
      prosSnap.forEach((docSnap) => {
        batch.delete(docSnap.ref);
        count++;
      });
      gestSnap.forEach((docSnap) => {
        batch.delete(docSnap.ref);
      });
      citSnap.forEach((docSnap) => {
        batch.delete(docSnap.ref);
      });
      venSnap.forEach((docSnap) => {
        batch.delete(docSnap.ref);
      });

      await batch.commit();
      return { success: true, count };
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'prospectos');
      return { success: false, count: 0, error: 'Error al limpiar datos.' };
    }
  };

  // Registrar gestión (llamada) y opcionalmente crear cita vinculada
  const registrarGestion = async (
    prospecto: Prospecto,
    gestionData: {
      fechaHora?: string;
      telemarketing: string;
      canal?: string;
      resultado: ResultadoLlamada;
      observacion: string;
      fechaSeguimiento?: string;
      horaSeguimiento?: string;
      citaData?: {
        fechaCita: string;
        horaCita: string;
        asunto: string;
        direccion: string;
        quienAtiende: string;
        invitado?: string;
        descripcion?: string;
      };
    }
  ): Promise<{ success: boolean; idGestion?: string; idCita?: string; error?: string }> => {
    try {
      const nowISO = new Date().toISOString();
      const nowLA = formatDateTimeLA(new Date());
      const fechaHoraGestion = gestionData.fechaHora || nowLA;

      const esEfectivoBool = isContactoEfectivo(gestionData.resultado);
      const efectivoStr: 'Sí' | 'No' = esEfectivoBool ? 'Sí' : 'No';

      const idGestion = generateGestionId();
      let idCitaGenerada = '';

      const batch = writeBatch(db);

      // Si el resultado es Cita, crear registro en colección "citas"
      if (gestionData.resultado === 'Cita' && gestionData.citaData) {
        idCitaGenerada = generateCitaId();
        const citaRef = doc(db, 'citas', idCitaGenerada);
        const mapsLink = generateGoogleMapsLink(gestionData.citaData.direccion);
        const nuevaCita: Cita = {
          id: idCitaGenerada,
          idProspecto: prospecto.id,
          fechaCreacion: nowISO,
          telemarketing: gestionData.telemarketing || prospecto.telemarketing,
          fechaCita: gestionData.citaData.fechaCita,
          horaCita: gestionData.citaData.horaCita,
          asunto: gestionData.citaData.asunto || `Cita con ${prospecto.nombre}`,
          direccion: gestionData.citaData.direccion,
          linkGoogleMaps: mapsLink,
          descripcion: gestionData.citaData.descripcion || '',
          quienAtiende: gestionData.citaData.quienAtiende || '',
          invitado: gestionData.citaData.invitado || '',
          estadoCita: 'Agendada',
          idEventoCalendar: '',
          enlaceCalendar: '',
          ultimaActualizacion: nowISO,
        };
        batch.set(citaRef, nuevaCita);
      }

      // Crear registro en colección "gestiones"
      const gestionRef = doc(db, 'gestiones', idGestion);
      const nuevaGestion: Gestion = {
        id: idGestion,
        idProspecto: prospecto.id,
        fechaHora: fechaHoraGestion,
        telemarketing: gestionData.telemarketing || prospecto.telemarketing,
        canal: gestionData.canal || 'Llamada',
        resultado: gestionData.resultado,
        efectivo: efectivoStr,
        observacion: gestionData.observacion || '',
        fechaSeguimiento: gestionData.fechaSeguimiento || '',
        horaSeguimiento: gestionData.horaSeguimiento || '',
        idCita: idCitaGenerada || '',
        creadoPor: user?.email || userProfile?.displayName || gestionData.telemarketing,
        creadoEn: nowISO,
      };
      batch.set(gestionRef, nuevaGestion);

      // Reglas de negocio para actualizar prospecto
      const nuevoEstado = getEstadoByResultado(gestionData.resultado);
      const nuevaTemperatura = getTemperaturaPostLlamada(
        gestionData.resultado,
        prospecto.fechaRecepcion
      );

      let proximaAccionTexto: string | null = null;
      let fechaProximaAccionVal: string | null = null;

      if (gestionData.resultado === 'Llamar luego') {
        const horaTxt = gestionData.horaSeguimiento ? ` a las ${gestionData.horaSeguimiento}` : '';
        proximaAccionTexto = `Seguimiento${horaTxt}`;
        fechaProximaAccionVal = gestionData.fechaSeguimiento || null;
      } else if (gestionData.resultado === 'Cita') {
        proximaAccionTexto = `Cita: ${gestionData.citaData?.asunto || 'Demostración'}`;
        fechaProximaAccionVal = gestionData.citaData?.fechaCita || null;
      } else if (gestionData.resultado === 'No contesta' || gestionData.resultado === 'Buzón') {
        proximaAccionTexto = 'Reintentar llamada';
        fechaProximaAccionVal = null;
      } else {
        proximaAccionTexto = null;
        fechaProximaAccionVal = null;
      }

      const prospectoRef = doc(db, 'prospectos', prospecto.id);
      batch.update(prospectoRef, {
        intentos: (prospecto.intentos || 0) + 1,
        contactosEfectivos: (prospecto.contactosEfectivos || 0) + (esEfectivoBool ? 1 : 0),
        ultimoContacto: fechaHoraGestion,
        ultimoResultado: gestionData.resultado,
        estado: nuevoEstado,
        temperatura: nuevaTemperatura,
        proximaAccion: proximaAccionTexto,
        fechaProximaAccion: fechaProximaAccionVal,
        idCita: idCitaGenerada || prospecto.idCita || null,
        observacion: gestionData.observacion ? `${gestionData.observacion}` : prospecto.observacion,
        modificadoEn: nowISO,
      });

      await batch.commit();

      return {
        success: true,
        idGestion,
        idCita: idCitaGenerada,
      };
    } catch (err: any) {
      console.error('Error registrando gestión:', err);
      handleFirestoreError(err, OperationType.WRITE, 'gestiones');
      return {
        success: false,
        error: err.message || 'Error al guardar la llamada en la base de datos.',
      };
    }
  };

  // Registrar resultado de cita (Retroalimentación, Venta si aplica, y actualización de cita y prospecto)
  const registrarResultadoCita = async (
    cita: Cita,
    resultadoData: {
      resultado: ResultadoCita;
      observacion: string;
      nuevaFecha?: string;
      nuevaHora?: string;
      fechaProximoContacto?: string;
      horaProximoContacto?: string;
    }
  ): Promise<{ success: boolean; idRetro?: string; idVenta?: string; error?: string }> => {
    try {
      const nowISO = new Date().toISOString();
      const nowLA = formatDateTimeLA(new Date());
      const batch = writeBatch(db);

      const idRetro = generateRetroalimentacionId();
      let idVentaGenerada: string | undefined = undefined;

      // 1. Si es Venta, buscar venta existente para esta cita o crear una nueva (evita duplicados)
      if (resultadoData.resultado === 'Venta') {
        const ventaExistente = ventas.find((v) => v.idCita === cita.id);
        if (ventaExistente) {
          idVentaGenerada = ventaExistente.id;
          const ventaRef = doc(db, 'ventas', ventaExistente.id);
          batch.update(ventaRef, {
            observacion: resultadoData.observacion || ventaExistente.observacion || '',
            ultimaActualizacion: nowISO,
          });
        } else {
          idVentaGenerada = generateVentaId();
          const ventaRef = doc(db, 'ventas', idVentaGenerada);
          const sugerenciaComision = getSugerenciaComision(cita.fechaCita, settings.reglasComision || []);
          const nuevaVenta: Venta = {
            id: idVentaGenerada,
            idProspecto: cita.idProspecto,
            idCita: cita.id,
            fechaReporte: getTodayInLA(),
            telemarketing: cita.telemarketing,
            montoAprobado: null,
            estado: 'Pendiente',
            porcentajeBono: sugerenciaComision,
            bonoGenerado: null,
            bonoPagable: 0,
            ultimaActualizacion: nowISO,
            observacion: resultadoData.observacion || '',
            modificadoPor: user?.email || 'Sistema',
          };
          batch.set(ventaRef, nuevaVenta);
        }
      }

      // 2. Crear documento en 'retroalimentaciones'
      const retroRef = doc(db, 'retroalimentaciones', idRetro);
      const nuevaRetro: Retroalimentacion = {
        id: idRetro,
        idCita: cita.id,
        idProspecto: cita.idProspecto,
        fecha: nowLA,
        resultado: resultadoData.resultado,
        observacion: resultadoData.observacion || '',
        nuevaFecha: resultadoData.nuevaFecha || '',
        nuevaHora: resultadoData.nuevaHora || '',
        fechaProximoContacto: resultadoData.fechaProximoContacto || '',
        horaProximoContacto: resultadoData.horaProximoContacto || '',
        idVenta: idVentaGenerada || '',
        creadoPor: user?.email || userProfile?.displayName || cita.telemarketing,
        creadoEn: nowISO,
      };
      batch.set(retroRef, nuevaRetro);

      // 3. Actualizar la cita según el resultado
      const citaRef = doc(db, 'citas', cita.id);
      if (resultadoData.resultado === 'Reprogramar') {
        batch.update(citaRef, {
          estadoCita: 'Reprogramada',
          fechaCita: resultadoData.nuevaFecha,
          horaCita: resultadoData.nuevaHora,
          idEventoCalendar: '',
          enlaceCalendar: '',
          ultimaActualizacion: nowISO,
        });
      } else {
        // Venta, No recibió, Venta futura, No interesada dio/sin referencias
        batch.update(citaRef, {
          estadoCita: 'Realizada',
          ultimaActualizacion: nowISO,
        });
      }

      // 4. Actualizar el prospecto asociado según la regla de negocio
      const prospectoActual = prospectos.find((p) => p.id === cita.idProspecto);
      const prospectoRef = doc(db, 'prospectos', cita.idProspecto);

      if (resultadoData.resultado === 'Venta') {
        // Prospecto pasa a estado "Venta" y conserva idCita
        batch.update(prospectoRef, {
          estado: 'Venta',
          idCita: cita.id,
          modificadoEn: nowISO,
        });
      } else if (resultadoData.resultado === 'Reprogramar') {
        // Prospecto pasa a "Cita agendada" con el mismo idCita y nueva fecha
        batch.update(prospectoRef, {
          estado: 'Cita agendada',
          idCita: cita.id,
          fechaProximaAccion: resultadoData.nuevaFecha || null,
          proximaAccion: `Cita: ${cita.asunto || 'Demostración'} (${resultadoData.nuevaHora || ''})`,
          modificadoEn: nowISO,
        });
      } else if (resultadoData.resultado === 'Venta futura') {
        // proximaAccion = "Venta futura", fechaProximaAccion = esa fecha, estado "Seguimiento programado",
        // y si hay hora, anotarla en la observación del prospecto como "Hora: 3:30 PM".
        const horaNota = resultadoData.horaProximoContacto
          ? `Hora: ${resultadoData.horaProximoContacto}`
          : '';
        let nuevaObs = prospectoActual?.observacion || '';
        if (horaNota) {
          nuevaObs = nuevaObs ? `${nuevaObs} | ${horaNota}` : horaNota;
        }
        if (resultadoData.observacion) {
          nuevaObs = nuevaObs ? `${nuevaObs} | ${resultadoData.observacion}` : resultadoData.observacion;
        }

        batch.update(prospectoRef, {
          estado: 'Seguimiento programado',
          proximaAccion: 'Venta futura',
          fechaProximaAccion: resultadoData.fechaProximoContacto || null,
          observacion: nuevaObs,
          modificadoEn: nowISO,
        });
      }
      // Para No recibió y las dos No interesada: NO se modifica el estado del prospecto.

      await batch.commit();

      return {
        success: true,
        idRetro,
        idVenta: idVentaGenerada,
      };
    } catch (err: any) {
      console.error('Error registrando resultado de cita:', err);
      handleFirestoreError(err, OperationType.WRITE, 'retroalimentaciones');
      return {
        success: false,
        error: err.message || 'Error al guardar el resultado de la cita.',
      };
    }
  };

  // Cancelar cita: estadoCita -> "Cancelada", se registra motivo en retroalimentaciones,
  // y prospecto vuelve a "En gestión" con proximaAccion vacía
  const cancelarCita = async (
    cita: Cita,
    motivo: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const nowISO = new Date().toISOString();
      const nowLA = formatDateTimeLA(new Date());
      const batch = writeBatch(db);

      // 1. Registro en retroalimentaciones
      const idRetro = generateRetroalimentacionId();
      const retroRef = doc(db, 'retroalimentaciones', idRetro);
      const nuevaRetro: Retroalimentacion = {
        id: idRetro,
        idCita: cita.id,
        idProspecto: cita.idProspecto,
        fecha: nowLA,
        resultado: 'Cancelación',
        observacion: motivo,
        creadoPor: user?.email || userProfile?.displayName || cita.telemarketing,
        creadoEn: nowISO,
      };
      batch.set(retroRef, nuevaRetro);

      // 2. Cita -> Cancelada
      const citaRef = doc(db, 'citas', cita.id);
      batch.update(citaRef, {
        estadoCita: 'Cancelada',
        ultimaActualizacion: nowISO,
      });

      // 3. Prospecto vuelve a "En gestión" con próxima acción vacía
      const prospectoActual = prospectos.find((p) => p.id === cita.idProspecto);
      const prospectoRef = doc(db, 'prospectos', cita.idProspecto);
      const obsAdicional = `Cita cancelada: ${motivo}`;
      const nuevaObs = prospectoActual?.observacion
        ? `${prospectoActual.observacion} | ${obsAdicional}`
        : obsAdicional;

      batch.update(prospectoRef, {
        estado: 'En gestión',
        proximaAccion: null,
        fechaProximaAccion: null,
        observacion: nuevaObs,
        modificadoEn: nowISO,
      });

      await batch.commit();
      return { success: true };
    } catch (err: any) {
      console.error('Error cancelando cita:', err);
      handleFirestoreError(err, OperationType.WRITE, 'citas');
      return {
        success: false,
        error: err.message || 'Error al cancelar la cita.',
      };
    }
  };

  // Guardar ventas modificadas en batch con registro en logVentas y detección de concurrencia
  const actualizarVentas = async (
    ventasActualizadas: Array<{
      id: string;
      montoAprobado: number | null;
      porcentajeBono: number | null;
      estado: EstadoVenta;
      observacion: string;
      ultimaActualizacionOriginal?: string;
    }>
  ): Promise<{ success: boolean; updatedCount: number; conflicts?: string[]; error?: string }> => {
    if (!ventasActualizadas || ventasActualizadas.length === 0) {
      return { success: true, updatedCount: 0 };
    }

    try {
      const userEmail = user?.email || userProfile?.displayName || 'Supervisor';
      const nowIso = new Date().toISOString();
      const nowLA = formatDateTimeLA(new Date());

      const batch = writeBatch(db);
      const conflicts: string[] = [];
      let updatedCount = 0;

      for (const vMod of ventasActualizadas) {
        const ventaActual = ventas.find((v) => v.id === vMod.id);
        if (!ventaActual) continue;

        // Detección de concurrencia: si otra persona modificó la venta mientras se editaba
        if (
          vMod.ultimaActualizacionOriginal &&
          ventaActual.ultimaActualizacion &&
          vMod.ultimaActualizacionOriginal !== ventaActual.ultimaActualizacion
        ) {
          conflicts.push(
            `Venta ${vMod.id}: fue modificada por ${ventaActual.modificadoPor || 'otro usuario'} a las ${formatDateTimeLA(
              ventaActual.ultimaActualizacion
            )}.`
          );
          continue;
        }

        const bonoGenerado = calculateBonoGenerado(vMod.montoAprobado, vMod.porcentajeBono);
        const bonoPagable = calculateBonoPagable(vMod.estado, bonoGenerado, ventaActual.estadoPagoHistorico);

        // Registrar en logVentas
        const idLog = generateLogVentaId();
        const logDoc: LogVenta = {
          id: idLog,
          idVenta: vMod.id,
          usuario: userEmail,
          fechaHora: nowLA,
          montoAnterior: ventaActual.montoAprobado,
          montoNuevo: vMod.montoAprobado,
          porcentajeAnterior: ventaActual.porcentajeBono,
          porcentajeNuevo: vMod.porcentajeBono,
          estadoAnterior: ventaActual.estado,
          estadoNuevo: vMod.estado,
          observacionAnterior: ventaActual.observacion,
          observacionNueva: vMod.observacion,
          tipoCambio: vMod.estado === 'Cancelada' ? 'CANCELAR' : 'ACTUALIZAR',
        };
        batch.set(doc(db, 'logVentas', idLog), logDoc);

        // Actualizar documento venta
        const ventaRef = doc(db, 'ventas', vMod.id);
        batch.update(ventaRef, {
          montoAprobado: vMod.montoAprobado,
          porcentajeBono: vMod.porcentajeBono,
          estado: vMod.estado,
          bonoGenerado,
          bonoPagable,
          observacion: vMod.observacion,
          ultimaActualizacion: nowIso,
          modificadoPor: userEmail,
        });

        updatedCount++;
      }

      if (updatedCount > 0) {
        await batch.commit();
      }

      return {
        success: true,
        updatedCount,
        conflicts: conflicts.length > 0 ? conflicts : undefined,
      };
    } catch (err: any) {
      console.error('Error actualizando ventas:', err);
      handleFirestoreError(err, OperationType.WRITE, 'ventas');
      return {
        success: false,
        updatedCount: 0,
        error: err.message || 'Error al actualizar ventas.',
      };
    }
  };

  // Cancelar una venta individual con confirmación y motivo
  const cancelarVenta = async (
    idVenta: string,
    motivo: string
  ): Promise<{ success: boolean; error?: string }> => {
    const ventaActual = ventas.find((v) => v.id === idVenta);
    if (!ventaActual) return { success: false, error: 'Venta no encontrada.' };

    const obsFinal = motivo
      ? `${ventaActual.observacion ? ventaActual.observacion + ' | ' : ''}Cancelada: ${motivo}`
      : ventaActual.observacion;

    const res = await actualizarVentas([
      {
        id: idVenta,
        montoAprobado: ventaActual.montoAprobado,
        porcentajeBono: ventaActual.porcentajeBono,
        estado: 'Cancelada',
        observacion: obsFinal,
        ultimaActualizacionOriginal: ventaActual.ultimaActualizacion,
      },
    ]);

    if (!res.success) return { success: false, error: res.error };
    return { success: true };
  };

  // Gestión de Reglas de Comisión en Configuración (solo Administrador)
  const agregarReglaComision = async (regla: Omit<ReglaComision, 'id'>) => {
    try {
      const id = generateReglaComisionId();
      const nuevaRegla: ReglaComision = {
        ...regla,
        id,
        creadoPor: user?.email || 'Administrador',
        creadoEn: new Date().toISOString(),
      };
      const listaActual = settings.reglasComision || [];
      const nuevaLista = [...listaActual, nuevaRegla];
      await updateSettings({ reglasComision: nuevaLista });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Error al guardar regla de comisión.' };
    }
  };

  const actualizarReglaComision = async (id: string, updates: Partial<ReglaComision>) => {
    try {
      const listaActual = settings.reglasComision || [];
      const nuevaLista = listaActual.map((r) => (r.id === id ? { ...r, ...updates } : r));
      await updateSettings({ reglasComision: nuevaLista });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Error al actualizar regla de comisión.' };
    }
  };

  const eliminarReglaComision = async (id: string) => {
    try {
      const listaActual = settings.reglasComision || [];
      const nuevaLista = listaActual.filter((r) => r.id !== id);
      await updateSettings({ reglasComision: nuevaLista });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Error al eliminar regla de comisión.' };
    }
  };

  // 1. Agregar usuario autorizado manualmente
  const agregarUsuarioAutorizado = async (datos: {
    email: string;
    nombre: string;
    rol: 'Supervisor' | 'Telemarketing';
    telemarketingVinculada?: string;
  }): Promise<{ success: boolean; error?: string }> => {
    try {
      const emailNorm = normalizeEmail(datos.email);
      if (!emailNorm || !emailNorm.includes('@')) {
        return { success: false, error: 'Ingresa un correo electrónico válido.' };
      }
      if (isAdminEmail(emailNorm)) {
        return { success: false, error: 'El administrador no requiere ser agregado a la lista.' };
      }
      if (usuariosAutorizados.some((u) => u.email === emailNorm)) {
        return { success: false, error: 'Este correo ya se encuentra en la lista de usuarios autorizados.' };
      }
      if (datos.rol === 'Telemarketing' && !datos.telemarketingVinculada?.trim()) {
        return { success: false, error: 'Debes seleccionar una telemarketing vinculada para este rol.' };
      }

      const nowLA = formatDateTimeLA(new Date());
      const nuevoUsuario: UsuarioAutorizado = {
        email: emailNorm,
        nombre: datos.nombre.trim() || emailNorm.split('@')[0],
        rol: datos.rol,
        telemarketingVinculada: datos.rol === 'Telemarketing' ? (datos.telemarketingVinculada || '') : '',
        activo: true,
        agregadoPor: user?.email || 'Administrador',
        fechaAlta: nowLA,
        ultimoAcceso: null,
        desactivadoPor: null,
        fechaDesactivacion: null,
      };

      await setDoc(doc(db, 'usuariosAutorizados', emailNorm), nuevoUsuario);
      await registrarLogAcceso(
        'ALTA',
        emailNorm,
        `Usuario dado de alta con rol ${datos.rol}${datos.rol === 'Telemarketing' ? ` (${datos.telemarketingVinculada})` : ''}`
      );

      return { success: true };
    } catch (err: any) {
      console.error('Error agregando usuario autorizado:', err);
      handleFirestoreError(err, OperationType.WRITE, 'usuariosAutorizados');
      return { success: false, error: err.message || 'Error al guardar usuario autorizado.' };
    }
  };

  // 2. Actualizar rol o telemarketing vinculada
  const actualizarUsuarioAutorizado = async (
    email: string,
    updates: Partial<UsuarioAutorizado>
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const emailNorm = normalizeEmail(email);
      if (isAdminEmail(emailNorm)) {
        return { success: false, error: 'No se puede modificar la cuenta del administrador.' };
      }

      const ref = doc(db, 'usuariosAutorizados', emailNorm);
      await updateDoc(ref, updates);

      let detalles = 'Actualización de usuario:';
      if (updates.rol) detalles += ` rol ${updates.rol};`;
      if (updates.telemarketingVinculada) detalles += ` telemarketing ${updates.telemarketingVinculada};`;

      await registrarLogAcceso('CAMBIAR_ROL', emailNorm, detalles);
      return { success: true };
    } catch (err: any) {
      console.error('Error actualizando usuario autorizado:', err);
      handleFirestoreError(err, OperationType.WRITE, 'usuariosAutorizados');
      return { success: false, error: err.message || 'Error al actualizar usuario.' };
    }
  };

  // 3. Activar o desactivar usuario
  const toggleActivarUsuario = async (
    email: string,
    nuevoEstado: boolean
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const emailNorm = normalizeEmail(email);
      if (isAdminEmail(emailNorm)) {
        return { success: false, error: 'No se puede desactivar la cuenta del administrador.' };
      }

      const nowLA = formatDateTimeLA(new Date());
      const ref = doc(db, 'usuariosAutorizados', emailNorm);
      const updates: Partial<UsuarioAutorizado> = {
        activo: nuevoEstado,
        desactivadoPor: nuevoEstado ? null : user?.email || 'Administrador',
        fechaDesactivacion: nuevoEstado ? null : nowLA,
      };

      await updateDoc(ref, updates);
      await registrarLogAcceso(
        nuevoEstado ? 'ACTIVAR' : 'DESACTIVAR',
        emailNorm,
        nuevoEstado ? 'Acceso reactivado' : 'Acceso revocado/desactivado'
      );

      return { success: true };
    } catch (err: any) {
      console.error('Error cambiando estado de usuario:', err);
      handleFirestoreError(err, OperationType.WRITE, 'usuariosAutorizados');
      return { success: false, error: err.message || 'Error al cambiar estado.' };
    }
  };

  // 4. Eliminar usuario autorizado
  const eliminarUsuarioAutorizado = async (
    email: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const emailNorm = normalizeEmail(email);
      if (isAdminEmail(emailNorm)) {
        return { success: false, error: 'No se puede eliminar la cuenta del administrador.' };
      }

      await deleteDoc(doc(db, 'usuariosAutorizados', emailNorm));
      await registrarLogAcceso('ELIMINAR', emailNorm, 'Usuario eliminado de usuarios autorizados');

      return { success: true };
    } catch (err: any) {
      console.error('Error eliminando usuario autorizado:', err);
      handleFirestoreError(err, OperationType.WRITE, 'usuariosAutorizados');
      return { success: false, error: err.message || 'Error al eliminar usuario.' };
    }
  };

  // 5. Aprobar solicitud de acceso
  const aprobarSolicitudAcceso = async (
    solicitud: SolicitudAcceso,
    config: { rol: 'Supervisor' | 'Telemarketing'; telemarketingVinculada?: string }
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const emailNorm = normalizeEmail(solicitud.email);
      const nowLA = formatDateTimeLA(new Date());

      const batch = writeBatch(db);

      const userRef = doc(db, 'usuariosAutorizados', emailNorm);
      const nuevoUsuario: UsuarioAutorizado = {
        email: emailNorm,
        nombre: solicitud.nombre || emailNorm.split('@')[0],
        rol: config.rol,
        telemarketingVinculada: config.rol === 'Telemarketing' ? (config.telemarketingVinculada || '') : '',
        activo: true,
        agregadoPor: user?.email || 'Administrador',
        fechaAlta: nowLA,
        ultimoAcceso: null,
        desactivadoPor: null,
        fechaDesactivacion: null,
      };
      batch.set(userRef, nuevoUsuario);

      const solRef = doc(db, 'solicitudesAcceso', emailNorm);
      batch.update(solRef, {
        estado: 'Aprobada',
        revisadoPor: user?.email || 'Administrador',
        fechaRevision: nowLA,
      });

      await batch.commit();

      await registrarLogAcceso(
        'APROBAR_SOLICITUD',
        emailNorm,
        `Solicitud aprobada con rol ${config.rol}${config.rol === 'Telemarketing' ? ` (${config.telemarketingVinculada})` : ''}`
      );

      return { success: true };
    } catch (err: any) {
      console.error('Error aprobando solicitud:', err);
      handleFirestoreError(err, OperationType.WRITE, 'usuariosAutorizados');
      return { success: false, error: err.message || 'Error al aprobar solicitud.' };
    }
  };

  // 6. Rechazar solicitud de acceso
  const rechazarSolicitudAcceso = async (
    solicitud: SolicitudAcceso
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const emailNorm = normalizeEmail(solicitud.email);
      const nowLA = formatDateTimeLA(new Date());

      const solRef = doc(db, 'solicitudesAcceso', emailNorm);
      await updateDoc(solRef, {
        estado: 'Rechazada',
        revisadoPor: user?.email || 'Administrador',
        fechaRevision: nowLA,
      });

      await registrarLogAcceso('RECHAZAR_SOLICITUD', emailNorm, 'Solicitud de acceso rechazada');

      return { success: true };
    } catch (err: any) {
      console.error('Error rechazando solicitud:', err);
      handleFirestoreError(err, OperationType.WRITE, 'solicitudesAcceso');
      return { success: false, error: err.message || 'Error al rechazar solicitud.' };
    }
  };

  const refreshData = () => {
    setProspectos([...prospectos]);
  };

  return (
    <CRMContext.Provider
      value={{
        prospectos,
        gestiones,
        citas,
        retroalimentaciones,
        ventas,
        logsVentas,
        usuariosAutorizados,
        solicitudesAcceso,
        logsAccesos,
        settings,
        usersList,
        logsCargas,
        loading,
        error,
        actualizarVentas,
        cancelarVenta,
        agregarReglaComision,
        actualizarReglaComision,
        eliminarReglaComision,
        agregarUsuarioAutorizado,
        actualizarUsuarioAutorizado,
        toggleActivarUsuario,
        eliminarUsuarioAutorizado,
        aprobarSolicitudAcceso,
        rechazarSolicitudAcceso,
        registrarGestion,
        registrarResultadoCita,
        cancelarCita,
        addProspecto,
        updateProspecto,
        archiveProspecto,
        reassignTelemarketingBulk,
        updateSettings,
        addTelemarketingAgent,
        editTelemarketingAgent,
        deleteTelemarketingAgent,
        toggleTelemarketingAgent,
        updateUserRole,
        loadSampleData,
        clearSampleData,
        importExcelBatch,
        undoBatch,
        refreshData,
      }}
    >
      {children}
    </CRMContext.Provider>
  );
};

export const useCRM = () => {
  const context = useContext(CRMContext);
  if (!context) {
    throw new Error('useCRM must be used within a CRMProvider');
  }
  return context;
};
