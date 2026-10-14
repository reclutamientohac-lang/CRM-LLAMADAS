import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
} from 'firebase/auth';
import { doc, onSnapshot, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, googleProvider, db } from '../firebase';
import { UserProfile, Role } from '../types';

export const ADMIN_EMAIL = 'reclutamientohac@gmail.com';

export function normalizeEmail(email?: string | null): string {
  return (email || '').trim().toLowerCase();
}

export function isAdminEmail(email?: string | null): boolean {
  return normalizeEmail(email) === ADMIN_EMAIL;
}

export function formatDateTimeLA(d: Date): string {
  try {
    return new Intl.DateTimeFormat('es-MX', {
      timeZone: 'America/Los_Angeles',
      dateStyle: 'short',
      timeStyle: 'medium',
    }).format(d);
  } catch {
    return d.toISOString();
  }
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isAuthorized: boolean;
  isAdmin: boolean;
  isSupervisor: boolean;
  telemarketingAgent: string;
  authError: string | null;
  clearAuthError: () => void;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  requestAccess: () => Promise<{ success: boolean; message: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const clearAuthError = () => setAuthError(null);

  useEffect(() => {
    getRedirectResult(auth).catch((err) => {
      if (err) console.warn('Aviso getRedirectResult:', err);
    });
  }, []);

  useEffect(() => {
    let unsubscribeAuthorizedDoc: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (unsubscribeAuthorizedDoc) {
        unsubscribeAuthorizedDoc();
        unsubscribeAuthorizedDoc = null;
      }

      setIsAuthorized(false);
      setIsAdmin(false);
      setUserProfile(null);
      setLoading(true);
      setUser(currentUser);

      if (!currentUser) {
        setLoading(false);
        return;
      }

      const emailNorm = normalizeEmail(currentUser.email);

      if (!currentUser.emailVerified) {
        setAuthError('Tu cuenta de Google no tiene el correo verificado.');
        setLoading(false);
        return;
      }

      if (isAdminEmail(emailNorm)) {
        setIsAdmin(true);
        setIsAuthorized(true);
        setUserProfile({
          uid: currentUser.uid,
          email: ADMIN_EMAIL,
          displayName: currentUser.displayName || 'Administrador General',
          role: 'Administrador',
          telemarketingAgent: '',
          photoURL: currentUser.photoURL,
          activo: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        setLoading(false);
        return;
      }

      const userDocRef = doc(db, 'usuariosAutorizados', emailNorm);

      unsubscribeAuthorizedDoc = onSnapshot(
        userDocRef,
        async (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            const rol = data.rol as Role;
            const isRoleValid =
              (rol === 'Telemarketing' && typeof data.telemarketingVinculada === 'string' && data.telemarketingVinculada.trim() !== '' && data.telemarketingVinculada !== 'SIN ASIGNAR') ||
              rol === 'Distribuidor' ||
              rol === 'Supervisor';

            const activo = data.activo === true && isRoleValid;

            if (activo) {
              const role: Role = rol || 'Telemarketing';
              const agent: string = role === 'Telemarketing' ? (data.telemarketingVinculada || '') : '';

              setUserProfile({
                uid: currentUser.uid,
                email: emailNorm,
                displayName: data.nombre || currentUser.displayName || emailNorm,
                role,
                telemarketingAgent: agent,
                photoURL: currentUser.photoURL,
                activo: true,
                createdAt: data.fechaAlta || new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              });
              setIsAuthorized(true);

              const nowLA = formatDateTimeLA(new Date());
              if (!data.ultimoAcceso || data.ultimoAcceso !== nowLA) {
                updateDoc(userDocRef, { ultimoAcceso: nowLA }).catch(() => {});
              }
            } else {
              setUserProfile(null);
              setIsAuthorized(false);
            }
          } else {
            setUserProfile(null);
            setIsAuthorized(false);
          }
          setLoading(false);
        },
        (error) => {
          console.error('Error escuchando permisos de usuario autorizado:', error);
          setUserProfile(null);
          setIsAuthorized(false);
          setLoading(false);
        }
      );
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeAuthorizedDoc) unsubscribeAuthorizedDoc();
    };
  }, []);

  const loginWithGoogle = async () => {
    setAuthError(null);
    setLoading(true);

    try {
      const cred = await signInWithPopup(auth, googleProvider);
      const emailNorm = normalizeEmail(cred.user.email);

      if (!cred.user.emailVerified) {
        await signOut(auth);
        throw new Error('Tu cuenta de Google no tiene el correo electrónico verificado.');
      }
    } catch (err: any) {
      console.warn('Error en signInWithPopup:', err);
      const inIframe = typeof window !== 'undefined' && window.self !== window.top;

      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        const msg = 'Se cerró la ventana de inicio de sesión con Google antes de completar la autenticación.';
        setAuthError(msg);
        throw new Error(msg);
      }

      if (inIframe) {
        const msg =
          'El navegador o el visor embebido bloqueó la ventana de Google. Abre la aplicación en una pestaña nueva para iniciar sesión de forma segura.';
        setAuthError(msg);
        throw new Error(msg);
      }

      if (err.code === 'auth/popup-blocked' || err.code === 'auth/internal-error') {
        try {
          await signInWithRedirect(auth, googleProvider);
          return;
        } catch (redirectErr: any) {
          const msg = 'El navegador bloqueó la redirección con Google. Por favor intenta de nuevo.';
          setAuthError(msg);
          throw new Error(msg);
        }
      }

      if (err.code === 'auth/unauthorized-domain') {
        const msg =
          'Dominio no autorizado en Firebase Authentication. El administrador debe agregar este dominio en la Consola de Firebase > Authentication > Ajustes > Dominios autorizados.';
        setAuthError(msg);
        throw new Error(msg);
      }

      const msg = err.message || 'Error al conectar con Google.';
      setAuthError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setUserProfile(null);
      setIsAuthorized(false);
      setIsAdmin(false);
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  const requestAccess = async (): Promise<{ success: boolean; message: string }> => {
    if (!user || !user.email) {
      return { success: false, message: 'Debes iniciar sesión con Google para solicitar acceso.' };
    }
    const emailNorm = normalizeEmail(user.email);
    try {
      const solRef = doc(db, 'solicitudesAcceso', emailNorm);
      const snap = await getDoc(solRef);
      if (snap.exists() && snap.data().estado === 'Pendiente') {
        return {
          success: true,
          message: 'Ya tienes una solicitud pendiente enviada anteriormente.',
        };
      }
      await setDoc(solRef, {
        id: emailNorm,
        email: emailNorm,
        nombre: user.displayName || emailNorm,
        fecha: formatDateTimeLA(new Date()),
        estado: 'Pendiente',
      });
      return {
        success: true,
        message: 'Solicitud enviada correctamente.',
      };
    } catch (err: any) {
      return { success: false, message: err.message || 'Error al enviar solicitud.' };
    }
  };

  const isSupervisor = isAdmin || userProfile?.role === 'Supervisor';
  const telemarketingAgent = userProfile?.telemarketingAgent || '';

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        loading,
        isAuthorized,
        isAdmin,
        isSupervisor,
        telemarketingAgent,
        authError,
        clearAuthError,
        loginWithGoogle,
        logout,
        requestAccess,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
