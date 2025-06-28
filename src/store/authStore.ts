import { create } from 'zustand';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { getFirestore, setDoc, doc, serverTimestamp } from 'firebase/firestore';
import { auth } from '../config/firebase';
import { User } from '../types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, phone: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loginWithGoogle: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const { user: firebaseUser } = await signInWithEmailAndPassword(auth, email, password);
      
      set({
        user: {
          id: firebaseUser.uid,
          name: firebaseUser.displayName || '',
          email: firebaseUser.email || '',
          phone: firebaseUser.phoneNumber || '',
          createdAt: new Date(firebaseUser.metadata.creationTime || Date.now()),
        },
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error: any) {
      let errorMessage = 'Error al iniciar sesión';
      
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        errorMessage = 'Email o contraseña incorrectos';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Demasiados intentos fallidos. Por favor, intenta más tarde';
      }
      
      set({
        error: errorMessage,
        isLoading: false,
      });
    }
  },

  register: async (name, email, phone, password) => {
    set({ isLoading: true, error: null });

    // ✅ Sanitización de entradas
    const sanitizedEmail = email.trim();
    const sanitizedPassword = password.trim();
    const sanitizedName = name.trim();
    const sanitizedPhone = phone.trim();

    try {
      const db = getFirestore();

      // ✅ Debug: ver datos antes del fallo
      console.log('Intentando registrar:', {
        sanitizedEmail,
        sanitizedPassword,
        sanitizedName,
        sanitizedPhone,
      });

      const { user: firebaseUser } = await createUserWithEmailAndPassword(auth, sanitizedEmail, sanitizedPassword);

      await updateProfile(firebaseUser, { displayName: sanitizedName });

      await setDoc(doc(db, 'users', firebaseUser.uid), {
        name: sanitizedName,
        email: sanitizedEmail,
        phone: sanitizedPhone,
        createdAt: serverTimestamp(),
      });

      set({
        user: {
          id: firebaseUser.uid,
          name: sanitizedName,
          email: firebaseUser.email || '',
          phone: sanitizedPhone,
          createdAt: new Date(firebaseUser.metadata.creationTime || Date.now()),
        },
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error: any) {
      console.error('Error en Firebase:', error); // ✅ Ver más detalle

      let errorMessage = 'Error al registrarse';
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Este email ya está registrado';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'La contraseña debe tener al menos 6 caracteres';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Email inválido';
      }

      set({
        error: errorMessage,
        isLoading: false,
      });
    }
  },

  logout: async () => {
    try {
      await signOut(auth);
      set({
        user: null,
        isAuthenticated: false,
      });
    } catch (error: any) {
      set({
        error: 'Error al cerrar sesión',
      });
    }
  },

  loginWithGoogle: async () => {
    set({ isLoading: true, error: null });
    try {
      const provider = new GoogleAuthProvider();
      const { user: firebaseUser } = await signInWithPopup(auth, provider);
      const db = getFirestore();

      await setDoc(doc(db, 'users', firebaseUser.uid), {
        name: firebaseUser.displayName || '',
        email: firebaseUser.email || '',
        phone: firebaseUser.phoneNumber || '',
        createdAt: serverTimestamp(),
      }, { merge: true });

      set({
        user: {
          id: firebaseUser.uid,
          name: firebaseUser.displayName || '',
          email: firebaseUser.email || '',
          phone: firebaseUser.phoneNumber || '',
          createdAt: new Date(firebaseUser.metadata.creationTime || Date.now()),
        },
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error: any) {
      set({
        error: 'Error al iniciar sesión con Google',
        isLoading: false,
      });
    }
  },
}));

// ⏱ Escuchar cambios de sesión
onAuthStateChanged(auth, (firebaseUser) => {
  if (firebaseUser) {
    useAuthStore.setState({
      user: {
        id: firebaseUser.uid,
        name: firebaseUser.displayName || '',
        email: firebaseUser.email || '',
        phone: firebaseUser.phoneNumber || '',
        createdAt: new Date(firebaseUser.metadata.creationTime || Date.now()),
      },
      isAuthenticated: true,
      isLoading: false,
    });
  } else {
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
  }
});
