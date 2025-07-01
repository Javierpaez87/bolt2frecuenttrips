import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  getFirestore,
  doc,
  updateDoc,
  deleteDoc,
  getDoc,
  setDoc
} from 'firebase/firestore';
import {
  getAuth,
  deleteUser,
  updateEmail,
  EmailAuthProvider,
  reauthenticateWithCredential,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import Layout from '../components/layout/Layout';
import { useAuthStore } from '../store/authStore';

const ProfileEdit: React.FC = () => {
  const { user, logout } = useAuthStore();
  const [searchParams] = useSearchParams();
  const from = searchParams.get('from');
  const navigate = useNavigate();

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState(user?.email || '');
  const [loading, setLoading] = useState(false);

  const formRef = useRef<HTMLDivElement>(null);

  // ✅ CORREGIDO: Cargar teléfono desde Firestore al montar el componente
  useEffect(() => {
    const fetchUserData = async () => {
      const auth = getAuth();
      const uid = auth.currentUser?.uid;
      if (!uid) return;

      try {
        const db = getFirestore();
        const userRef = doc(db, 'users', uid);
        const snapshot = await getDoc(userRef);
        
        if (snapshot.exists()) {
          const userData = snapshot.data();
          console.log('📱 Datos del usuario cargados:', userData);
          
          if (userData.phone) {
            setPhone(userData.phone);
            console.log('📱 Teléfono cargado:', userData.phone);
          }
          if (userData.name) {
            setName(userData.name);
          }
          if (userData.email) {
            setEmail(userData.email);
          }
        } else {
          console.log('📱 No se encontró documento del usuario');
        }
      } catch (error) {
        console.error('Error cargando datos del usuario:', error);
      }
    };

    fetchUserData();
  }, []);

  useEffect(() => {
    if (from === 'booking' && formRef.current) {
      let attempts = 0;

      const scrollToForm = () => {
        const top = formRef.current!.getBoundingClientRect().top + window.scrollY - 60;
        window.scrollTo({ top, behavior: 'smooth' });

        // Reintenta scroll hasta 5 veces para garantizar que el navegador lo respete
        if (attempts < 5) {
          attempts++;
          requestAnimationFrame(scrollToForm);
        }
      };

      setTimeout(() => {
        scrollToForm();
        alert("Necesitás cargar tu teléfono antes de reservar un viaje. Esto solo se te solicita una vez");
      }, 600);
    }
  }, [from]);

  const reauthenticateUser = async () => {
    const auth = getAuth();
    const currentUser = auth.currentUser;
    const providerId = currentUser?.providerData[0]?.providerId;

    if (!currentUser) throw new Error('Usuario no autenticado');

    if (providerId === 'google.com') {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } else if (providerId === 'password') {
      const password = prompt('Por seguridad, ingresá tu contraseña:');
      if (!currentUser.email || !password) throw new Error('Credenciales faltantes');
      const credential = EmailAuthProvider.credential(currentUser.email, password);
      await reauthenticateWithCredential(currentUser, credential);
    } else {
      throw new Error('Proveedor no soportado');
    }
  };

  const handleUpdate = async () => {
    if (!user) return;
    setLoading(true);

    const db = getFirestore();
    const auth = getAuth();
    const uid = auth.currentUser?.uid;
    if (!uid) {
      alert('Error: Usuario no autenticado');
      setLoading(false);
      return;
    }

    const telefonoValido = /^549\d{10}$/.test(phone);
    if (!telefonoValido) {
      alert('El teléfono debe comenzar con 549 y tener 13 dígitos (ej: 5491123456789)');
      setLoading(false);
      return;
    }

    try {
      console.log('💾 Guardando datos del usuario:', { name, phone, email });

      // ✅ CORREGIDO: Actualizar email solo si cambió
      if (auth.currentUser && email !== auth.currentUser.email) {
        await updateEmail(auth.currentUser, email);
        console.log('📧 Email actualizado');
      }

      // ✅ CORREGIDO: Usar setDoc con merge para asegurar que se guarde
      const userRef = doc(db, 'users', uid);
      await setDoc(userRef, { 
        name, 
        phone, 
        email,
        updatedAt: new Date()
      }, { merge: true });

      console.log('💾 Datos guardados en Firestore');

      // ✅ NUEVO: Verificar que se guardó correctamente
      const verifyDoc = await getDoc(userRef);
      if (verifyDoc.exists()) {
        const savedData = verifyDoc.data();
        console.log('✅ Verificación - datos guardados:', savedData);
        
        // ✅ CORREGIDO: Actualizar el store de auth con los datos verificados
        useAuthStore.setState((state) => ({
          user: { 
            ...state.user!, 
            name: savedData.name || name, 
            phone: savedData.phone || phone, 
            email: savedData.email || email 
          },
        }));

        console.log('🔄 Store actualizado con datos verificados');
      }

      alert('Perfil actualizado correctamente.');
      navigate(from === 'search' || from === 'booking' ? '/search' : '/dashboard?tab=profile');
    } catch (error: any) {
      console.error('❌ Error al actualizar perfil:', error);
      
      if (error.code === 'auth/requires-recent-login') {
        try {
          await reauthenticateUser();
          return await handleUpdate();
        } catch {
          alert('La reautenticación falló. Verificá tus credenciales.');
        }
      } else {
        alert('Error al actualizar perfil: ' + (error.message || 'Error desconocido'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm('¿Estás seguro que querés eliminar tu cuenta? Esta acción no se puede deshacer.')) return;

    const auth = getAuth();
    const db = getFirestore();
    const currentUser = auth.currentUser;

    try {
      const providerId = currentUser?.providerData[0]?.providerId;

      if (providerId === 'google.com') {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
      } else if (providerId === 'password') {
        const password = prompt('Por seguridad, ingresá tu contraseña:');
        if (!currentUser?.email || !password) throw new Error('Credenciales faltantes');
        const credential = EmailAuthProvider.credential(currentUser.email, password);
        await reauthenticateWithCredential(currentUser, credential);
      }

      await deleteDoc(doc(db, 'users', currentUser!.uid));
      await deleteUser(currentUser!);
      await logout();

      alert('Tu cuenta ha sido eliminada.');
      navigate('/');
    } catch (error: any) {
      console.error('Error eliminando cuenta:', error);
      alert('No se pudo eliminar la cuenta. Quizás necesites volver a iniciar sesión.');
    }
  };

  return (
    <Layout>
      <div ref={formRef} className="max-w-lg mx-auto mt-10 bg-white p-6 rounded shadow">
        <h2 className="text-2xl font-bold mb-6">Editar Perfil</h2>

        <label className="block mb-2 font-medium">Nombre</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border p-2 rounded mb-4"
        />

        <label className="block mb-2 font-medium">Teléfono</label>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Ej: 5491123456789"
          className="w-full border p-2 rounded mb-1"
        />
        <p className="text-sm text-amber-600 mb-4">
          ⚠️ Ingresá tu número incluyendo el código de país y sin espacios. Por esta vía coordinarás los viajes junto a otros usuarios.
        </p>

        <label className="block mb-2 font-medium">Email</label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border p-2 rounded mb-6"
        />

        <button
          onClick={handleUpdate}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded mr-3 disabled:opacity-50"
        >
          {loading ? 'Guardando...' : 'Guardar Cambios'}
        </button>

        <button
          onClick={handleDeleteAccount}
          disabled={loading}
          className="bg-red-600 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          Eliminar Cuenta
        </button>
      </div>
    </Layout>
  );
};

export default ProfileEdit;