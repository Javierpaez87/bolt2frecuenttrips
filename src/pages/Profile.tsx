import React, { useEffect, useState } from 'react';
import { User } from 'lucide-react';
import Layout from '../components/layout/Layout';
import { useAuthStore } from '../store/authStore';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const Profile: React.FC = () => {
  const { user } = useAuthStore();
  const [profileData, setProfileData] = useState<any>(null);

  useEffect(() => {
    const fetchUserProfile = async () => {
      const uid = getAuth().currentUser?.uid;
      if (!uid) return;

      const userRef = doc(getFirestore(), 'users', uid);
      const snapshot = await getDoc(userRef);
      if (snapshot.exists()) {
        setProfileData(snapshot.data());
      }
    };

    fetchUserProfile();
  }, []);

  return (
    <Layout>
      <div className="bg-white rounded-lg shadow-card p-6 max-w-3xl mx-auto mt-10">
        <div className="flex flex-col md:flex-row">
          <div className="md:w-1/3 flex justify-center mb-6 md:mb-0">
            <div className="h-32 w-32 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
              {user?.profilePicture ? (
                <img src={user.profilePicture} alt={user.name} className="h-full w-full object-cover" />
              ) : (
                <User className="h-16 w-16 text-gray-400" />
              )}
            </div>
          </div>

          <div className="md:w-2/3">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Información Personal</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Nombre</h3>
                <p className="text-base text-gray-900">{user?.name || 'Sin nombre'}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Correo electrónico</h3>
                <p className="text-base text-gray-900">{user?.email}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Teléfono</h3>
                <p className="text-base text-gray-900">{profileData?.phone || 'No cargado'}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Miembro desde</h3>
                <p className="text-base text-gray-900">
                  {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>

            <div className="mt-6">
              <a
                href="/profile/edit"
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Editar Perfil
              </a>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Profile;
