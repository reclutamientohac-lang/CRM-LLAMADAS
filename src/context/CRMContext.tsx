import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, onSnapshot, query, doc, setDoc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './AuthContext';
import {
  Prospecto,
  Gestion,
  Cita,
  Venta,
  Retroalimentacion,
  AppSettings,
  ReglaComision,
} from '../types';

interface CRMContextType {
  prospectos: Prospecto[];
  gestiones: Gestion[];
  citas: Cita[];
  ventas: Venta[];
  retroalimentaciones: Retroalimentacion[];
  settings: AppSettings;
  reglasComision: ReglaComision[];
  loading: boolean;
  error: string | null;
  addProspecto: (p: Omit<Prospecto, 'id'>) => Promise<string>;
  updateProspecto: (id: string, data: Partial<Prospecto>) => Promise<void>;
  addGestion: (g: Omit<Gestion, 'id'>) => Promise<string>;
  addCita: (c: Omit<Cita, 'id'>) => Promise<string>;
  updateCita: (id: string, data: Partial<Cita>) => Promise<void>;
  addVenta: (v: Omit<Venta, 'id'>) => Promise<string>;
  updateVenta: (id: string, data: Partial<Venta>) => Promise<void>;
}

const DEFAULT_SETTINGS: AppSettings = {
  telemarketingAgents: [
    { id: '1', name: 'GERAL', active: true },
    { id: '2', name: 'IRENE', active: true },
    { id: '3', name: 'MARIA', active: true },
  ],
  minutosAlertaCita: 15,
};

const CRMContext = createContext<CRMContextType | undefined>(undefined);

export const CRMProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthorized } = useAuth();
  const [prospectos, setProspectos] = useState<Prospecto[]>([]);
  const [gestiones, setGestiones] = useState<Gestion[]>([]);
  const [citas, setCitas] = useState<Cita[]>([]);
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [retroalimentaciones, setRetroalimentaciones] = useState<Retroalimentacion[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [reglasComision, setReglasComision] = useState<ReglaComision[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthorized) {
      setProspectos([]);
      setGestiones([]);
      setCitas([]);
      setVentas([]);
      setRetroalimentaciones([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const unsubs: (() => void)[] = [];

    try {
      unsubs.push(
        onSnapshot(
          collection(db, 'prospectos'),
          (snap) => {
            const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Prospecto));
            setProspectos(list);
            setLoading(false);
          },
          (err) => {
            console.error('Error prospectos:', err);
            setError(err.message);
            setLoading(false);
          }
        )
      );

      unsubs.push(
        onSnapshot(collection(db, 'gestiones'), (snap) => {
          const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Gestion));
          setGestiones(list);
        })
      );

      unsubs.push(
        onSnapshot(collection(db, 'citas'), (snap) => {
          const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Cita));
          setCitas(list);
        })
      );

      unsubs.push(
        onSnapshot(collection(db, 'ventas'), (snap) => {
          const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Venta));
          setVentas(list);
        })
      );

      unsubs.push(
        onSnapshot(collection(db, 'retroalimentaciones'), (snap) => {
          const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Retroalimentacion));
          setRetroalimentaciones(list);
        })
      );

      unsubs.push(
        onSnapshot(doc(db, 'settings', 'general'), (snap) => {
          if (snap.exists()) {
            setSettings({ ...DEFAULT_SETTINGS, ...snap.data() });
          }
        })
      );
    } catch (e: any) {
      setError(e.message);
      setLoading(false);
    }

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [isAuthorized]);

  const addProspecto = async (data: Omit<Prospecto, 'id'>) => {
    const ref = doc(collection(db, 'prospectos'));
    await setDoc(ref, { id: ref.id, ...data });
    return ref.id;
  };

  const updateProspecto = async (id: string, data: Partial<Prospecto>) => {
    await updateDoc(doc(db, 'prospectos', id), data);
  };

  const addGestion = async (data: Omit<Gestion, 'id'>) => {
    const ref = doc(collection(db, 'gestiones'));
    await setDoc(ref, { id: ref.id, ...data });
    return ref.id;
  };

  const addCita = async (data: Omit<Cita, 'id'>) => {
    const ref = doc(collection(db, 'citas'));
    await setDoc(ref, { id: ref.id, ...data });
    return ref.id;
  };

  const updateCita = async (id: string, data: Partial<Cita>) => {
    await updateDoc(doc(db, 'citas', id), data);
  };

  const addVenta = async (data: Omit<Venta, 'id'>) => {
    const ref = doc(collection(db, 'ventas'));
    await setDoc(ref, { id: ref.id, ...data });
    return ref.id;
  };

  const updateVenta = async (id: string, data: Partial<Venta>) => {
    await updateDoc(doc(db, 'ventas', id), data);
  };

  return (
    <CRMContext.Provider
      value={{
        prospectos,
        gestiones,
        citas,
        ventas,
        retroalimentaciones,
        settings,
        reglasComision,
        loading,
        error,
        addProspecto,
        updateProspecto,
        addGestion,
        addCita,
        updateCita,
        addVenta,
        updateVenta,
      }}
    >
      {children}
    </CRMContext.Provider>
  );
};

export const useCRM = () => {
  const context = useContext(CRMContext);
  if (!context) throw new Error('useCRM must be used within a CRMProvider');
  return context;
};
