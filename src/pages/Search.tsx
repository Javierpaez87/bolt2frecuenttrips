import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import TripFilter from '../components/trip/TripFilter';
import TripCard from '../components/trip/TripCard';
import BookingModal from '../components/trip/BookingModal';
import { useTripStore } from '../store/tripStore';
import { Trip, TripFilters } from '../types';
import { useAuthStore } from '../store/authStore';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const Search: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const {
    trips,
    filteredTrips,
    isLoading,
    error,
    fetchTrips,
    filterTrips,
    bookTrip,
  } = useTripStore();

  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  useEffect(() => {
    const origin = searchParams.get('origin')?.toLowerCase().trim();
    const destination = searchParams.get('destination')?.toLowerCase().trim();

    if (origin || destination) {
      const initialFilters: TripFilters = {
        origin: origin || undefined,
        destination: destination || undefined,
      };
      filterTrips(initialFilters);
    }
  }, [searchParams, filterTrips]);

  const handleFilter = (filters: TripFilters) => {
    filterTrips(filters);
  };

  // ✅ MEJORADO: Verificar teléfono con más logging y validación robusta
  const checkUserPhone = async (): Promise<boolean> => {
    const auth = getAuth();
    const uid = auth.currentUser?.uid;
    if (!uid) {
      console.log('📞 No hay usuario autenticado');
      return false;
    }

    try {
      const db = getFirestore();
      const userRef = doc(db, 'users', uid);
      const snapshot = await getDoc(userRef);
      
      console.log('📞 Verificando teléfono para usuario:', uid);
      
      if (snapshot.exists()) {
        const userData = snapshot.data();
        const phone = userData.phone;
        
        console.log('📞 Datos del usuario encontrados:', { 
          phone, 
          hasPhone: !!phone,
          phoneType: typeof phone 
        });
        
        // Verificar que el teléfono existe y tiene el formato correcto
        if (phone && typeof phone === 'string' && phone.trim() !== '') {
          const phoneValid = /^549\d{10}$/.test(phone.trim());
          console.log('📞 Validación de teléfono:', { 
            phone: phone.trim(), 
            phoneValid,
            length: phone.trim().length 
          });
          return phoneValid;
        } else {
          console.log('📞 Teléfono no válido o vacío');
          return false;
        }
      } else {
        console.log('📞 No se encontró documento del usuario en Firestore');
        return false;
      }
    } catch (error) {
      console.error('❌ Error verificando teléfono:', error);
      return false;
    }
  };

  const handleBookTrip = async (trip: Trip) => {
    if (!isAuthenticated) {
      navigate('/login?scrollToForm=true');
      return;
    }

    console.log('🎯 Iniciando proceso de reserva para viaje:', trip.id);

    // ✅ MEJORADO: Verificar teléfono con logging detallado
    const hasValidPhone = await checkUserPhone();
    
    console.log('📞 Resultado verificación teléfono:', hasValidPhone);
    
    if (!hasValidPhone) {
      console.log('📞 Redirigiendo a editar perfil por teléfono inválido');
      const confirmRedirect = window.confirm(
        'Necesitás cargar un número de teléfono válido para poder reservar. ¿Querés ir a tu perfil ahora?'
      );
      if (confirmRedirect) {
        navigate('/profile/edit?from=booking');
      }
      return;
    }

    console.log('✅ Teléfono válido, procediendo con reserva');
    setSelectedTrip(trip);
  };

  const handleConfirmBooking = async (tripId: string, seats: number) => {
    try {
      await bookTrip(tripId, seats);
      alert('Reserva enviada al conductor');
      setSelectedTrip(null);
      // Refrescar los datos para actualizar asientos disponibles
      fetchTrips();
    } catch (error) {
      console.error('Error al reservar:', error);
      alert('Ocurrió un error al reservar');
    }
  };

  // 🔧 SIMPLIFICADO: Solo mostrar viajes individuales (sin distinción de recurrentes)
  const tripsToShow = filteredTrips;

  return (
    <Layout>
      <div className="bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">
            Buscar Viajes
          </h1>

          <TripFilter onFilter={handleFilter} />

          <div className="mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              {isLoading
                ? 'Cargando viajes...'
                : `${tripsToShow.length} viajes encontrados`}
            </h2>
          </div>

          {error && (
            <div className="p-4 bg-red-50 text-red-700 rounded-lg mb-6">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* 🔧 SIMPLIFICADO: Todos los viajes se muestran igual */}
              {tripsToShow.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {tripsToShow.map((trip) => (
                    <TripCard
                      key={trip.id}
                      trip={trip}
                      onBook={handleBookTrip}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No se encontraron viajes
                  </h3>
                  <p className="text-gray-600">
                    Intenta con otros filtros o crea un nuevo viaje.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {selectedTrip && (
        <BookingModal
          trip={selectedTrip}
          onClose={() => setSelectedTrip(null)}
          onConfirm={handleConfirmBooking}
        />
      )}
    </Layout>
  );
};

export default Search;