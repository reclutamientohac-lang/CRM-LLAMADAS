import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import { UserProfile, Role } from '../types';
import {
  ADMIN_EMAIL,
  normalizeEmail,
  isAdminEmail,
  formatDateTimeLA,
} from '../businessRules';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isAuthorized: boolean;
  isAdmin: boolean;
  isSupervisor: boolean;
  telemarketingAgent: string;
  authError: string | null;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  requestAccess: () => Promise<{ success: boolean; message: string }>;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Escuchar resultado de redirección al cargar la aplicación
  useEffect(() => {
    getRedirectResult(auth).catch((err) => {
      if (err) {
        console.warn('Aviso getRedirectResult:', err);
      }
    });
  }, []);

  // Escuchar estado de autenticación de Firebase
  useEffect(() => {
    let unsubscribeAuthorizedDoc: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      // Limpiar listener anterior de usuario autorizado
      if (unsubscribeAuthorizedDoc) {
        unsubscribeAuthorizedDoc();
        unsubscribeAuthorizedDoc = null;
      }

      setUser(currentUser);

      if (!currentUser) {
        setUserProfile(null);
        setIsAuthorized(false);
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      const emailNorm = normalizeEmail(currentUser.email);

      // Validar si el correo está verificado
      if (!currentUser.emailVerified) {
        console.warn('Cuenta de Google con correo no verificado:', emailNorm);
        setAuthError('Tu cuenta de Google no tiene el correo verificado. Por favor inicia sesión con un correo verificado.');
        setIsAuthorized(false);
        setIsAdmin(false);
        setUserProfile(null);
        setLoading(false);
        return;
      }

      // 1. Caso Administrador Único: reclutamientohac@gmail.com
      if (isAdminEmail(emailNorm)) {
        setIsAdmin(true);
        setIsAuthorized(true);
        const adminProfile: UserProfile = {
          uid: currentUser.uid,
          email: ADMIN_EMAIL,
          displayName: currentUser.displayName || 'Administrador General',
          role: 'Administrador',
          telemarketingAgent: '',
          photoURL: currentUser.photoURL,
          activo: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setUserProfile(adminProfile);
        setLoading(false);
        return;
      }

      // 2. Caso Usuario Normal: Escuchar en tiempo real la colección usuariosAutorizados/{email}
      setIsAdmin(false);
      const userDocRef = doc(db, 'usuariosAutorizados', emailNorm);

      unsubscribeAuthorizedDoc = onSnapshot(
        userDocRef,
        async (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            const activo = Boolean(data.activo);

            if (activo) {
              const role: Role = data.rol === 'Supervisor' ? 'Supervisor' : 'Telemarketing';
              const agent: string = role === 'Telemarketing' ? (data.telemarketingVinculada || '') : '';

              const profile: UserProfile = {
                uid: currentUser.uid,
                email: emailNorm,
                displayName: data.nombre || currentUser.displayName || emailNorm,
                role,
                telemarketingAgent: agent,
                photoURL: currentUser.photoURL,
                activo: true,
                createdAt: data.fechaAlta || new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              };

              setUserProfile(profile);
              setIsAuthorized(true);

              // Registrar último acceso en Firestore
              const nowLA = formatDateTimeLA(new Date());
              if (!data.ultimoAcceso || data.ultimoAcceso !== nowLA) {
                updateDoc(userDocRef, {
                  ultimoAcceso: nowLA,
                }).catch((err) => {
                  console.warn('Aviso registrando ultimoAcceso:', err);
                });
              }
            } else {
              // El usuario existe pero fue desactivado
              console.warn('Usuario desactivado:', emailNorm);
              setUserProfile(null);
              setIsAuthorized(false);
            }
          } else {
            // El usuario no está en la lista de autorizados
            console.warn('Usuario no autorizado:', emailNorm);
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
      if (unsubscribeAuthorizedDoc) {
        unsubscribeAuthorizedDoc();
      }
    };
  }, []);

  // Iniciar sesión exclusivamente con Google
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

      console.log('Sesión iniciada con Google:', emailNorm);
    } catch (err: any) {
      console.warn('signInWithPopup falló, evaluando fallback a signInWithRedirect:', err);

      const isPopupBlockedOrIframe =
        err.code === 'auth/popup-blocked' ||
        err.code === 'auth/popup-closed-by-user' ||
        err.code === 'auth/cancelled-popup-request' ||
        err.code === 'auth/internal-error' ||
        (typeof window !== 'undefined' && window.self !== window.top);

      if (isPopupBlockedOrIframe) {
        try {
          await signInWithRedirect(auth, googleProvider);
          return;
        } catch (redirectErr: any) {
          console.error('signInWithRedirect también falló:', redirectErr);
          const msg =
            'El navegador o el entorno bloqueó la autenticación con Google. Abre la app en una pestaña nueva para continuar.';
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

      const msg =
        err.message ||
        'Error al conectar con Google. Por favor intenta de nuevo o abre la app en una pestaña nueva.';
      setAuthError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  // Cerrar sesión
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

  // Enviar solicitud de acceso (colección solicitudesAcceso)
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
          message: 'Ya tienes una solicitud pendiente enviada anteriormente. El administrador la revisará a la brevedad.',
        };
      }

      const nowLA = formatDateTimeLA(new Date());

      await setDoc(solRef, {
        id: emailNorm,
        email: emailNorm,
        nombre: user.displayName || emailNorm,
        fecha: nowLA,
        estado: 'Pendiente',
      });

      return {
        success: true,
        message: 'Solicitud enviada correctamente. El administrador ha sido notificado.',
      };
    } catch (err: any) {
      console.error('Error al enviar solicitud de acceso:', err);
      return {
        success: false,
        message: err.message || 'Error al enviar la solicitud al servidor.',
      };
    }
  };

  const clearAuthError = () => {
    setAuthError(null);
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
        loginWithGoogle,
        logout,
        requestAccess,
        clearAuthError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser utilizado dentro de un AuthProvider');
  }
  return context;
};
