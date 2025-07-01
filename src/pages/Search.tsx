import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import TripFilter from '../components/trip/TripFilter';
import TripCard from '../components/trip/TripCard';
import RecurringTripCard from '../components/trip/RecurringTripCard';
import BookingModal from '../components/trip/BookingModal';
import { useTripStore } from '../store/tripStore';
import { Trip, TripFilters, RecurringTripGroup } from '../types';
import { useAuthStore } from '../store/authStore';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const Search: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();
  const {
    trips,
    filteredTrips,
    recurringGroups,
    isLoading,
    error,
    fetchTrips,
    filterTrips,
    bookTrip,
  } = useTripStore();

  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [selectedRecurringGroup, setSelectedRecurringGroup] = useState<RecurringTripGroup | null>(null);

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

  const handleBookRecurringTrip = async (group: RecurringTripGroup) => {
    if (!isAuthenticated) {
      navigate('/login?scrollToForm=true');
      return;
    }

    console.log('🎯 Iniciando proceso de reserva para grupo recurrente:', group.id);

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

    console.log('✅ Teléfono válido, buscando próximo viaje del grupo');

    // ✅ CORREGIDO: Buscar el próximo viaje específico del grupo recurrente
    console.log('🔍 Buscando próximo viaje para grupo:', group.id);
    console.log('📅 Fecha del próximo viaje:', group.nextTripDate);
    console.log('🗂️ Total de viajes disponibles:', trips.length);
    
    // Convertir nextTripDate a string para comparar (formato YYYY-MM-DD)
    const nextTripDateString = group.nextTripDate.toISOString().split('T')[0];
    
    // ✅ CORREGIDO: Buscar viajes que coincidan exactamente
    const availableTrips = trips.filter(trip => {
      // Verificar que el viaje pertenece al grupo recurrente
      if (trip.recurrenceId !== group.id) {
        return false;
      }
      
      // Verificar que tiene asientos disponibles
      if (trip.availableSeats <= 0) {
        return false;
      }
      
      // Convertir fecha del viaje a string para comparar
      const tripDateString = trip.departureDate.toISOString().split('T')[0];
      
      // Verificar que la fecha coincide
      const matchesDate = tripDateString === nextTripDateString;
      
      console.log('🔍 Evaluando viaje:', {
        tripId: trip.id,
        tripDate: tripDateString,
        nextTripDate: nextTripDateString,
        matchesDate,
        hasSeats: trip.availableSeats > 0,
        recurrenceId: trip.recurrenceId,
        origin: trip.origin,
        destination: trip.destination
      });
      
      return matchesDate;
    });

    console.log('✅ Viajes disponibles encontrados:', availableTrips.length);

    if (availableTrips.length > 0) {
      // Tomar el primer viaje disponible
      const nextTrip = availableTrips[0];
      console.log('🎯 Seleccionando viaje:', nextTrip.id, 'para fecha:', nextTrip.departureDate);
      setSelectedTrip(nextTrip);
    } else {
      console.error('❌ No se encontró viaje disponible para reservar');
      console.log('🔍 Debug - Todos los viajes del sistema:', trips.map(t => ({
        id: t.id,
        recurrenceId: t.recurrenceId,
        date: t.departureDate.toISOString().split('T')[0],
        seats: t.availableSeats,
        origin: t.origin,
        destination: t.destination,
        isRecurring: t.isRecurring
      })));
      
      // ✅ MEJORADO: Mensaje más específico
      alert(`No se pudo encontrar el viaje del ${group.nextTripDate.toLocaleDateString()} disponible para reservar. Puede que ya esté completo o haya sido eliminado.`);
    }
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

  // Separar viajes individuales y recurrentes para mostrar
  const individualTrips = filteredTrips.filter(trip => !trip.isRecurring);
  const recurringTripsToShow = recurringGroups.filter(group => {
    // Aplicar filtros a los grupos recurrentes
    const matchesOrigin = searchParams.get('origin') 
      ? group.origin.toLowerCase().includes(searchParams.get('origin')!.toLowerCase())
      : true;
    const matchesDestination = searchParams.get('destination')
      ? group.destination.toLowerCase().includes(searchParams.get('destination')!.toLowerCase())
      : true;
    
    return matchesOrigin && matchesDestination && group.status === 'active';
  });

  const totalResults = individualTrips.length + recurringTripsToShow.length;

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
                : `${totalResults} viajes encontrados`}
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
              {/* Viajes Recurrentes */}
              {recurringTripsToShow.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm mr-2">
                      Recurrentes
                    </span>
                    Viajes que se repiten semanalmente
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {recurringTripsToShow.map((group) => (
                      <RecurringTripCard
                        key={group.id}
                        group={group}
                        onBook={handleBookRecurringTrip}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Viajes Individuales */}
              {individualTrips.length > 0 && (
                <div>
                  {recurringTripsToShow.length > 0 && (
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm mr-2">
                        Individuales
                      </span>
                      Viajes de una sola vez
                    </h3>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {individualTrips.map((trip) => (
                      <TripCard
                        key={trip.id}
                        trip={trip}
                        onBook={handleBookTrip}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Mensaje cuando no hay resultados */}
              {totalResults === 0 && (
                <div className="col-span-3 text-center py-12">
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