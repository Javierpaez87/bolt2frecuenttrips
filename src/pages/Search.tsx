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

  const handleBookTrip = (trip: Trip) => {
    if (!isAuthenticated) {
      navigate('/login?scrollToForm=true');
      return;
    }

    if (!user?.phone || user.phone.trim() === '') {
      const confirmRedirect = window.confirm(
        'Necesitás cargar un número de teléfono para poder reservar. ¿Querés ir a tu perfil ahora?'
      );
      if (confirmRedirect) {
        navigate('/profile/edit?from=booking');
      }
      return;
    }

    setSelectedTrip(trip);
  };

  const handleBookRecurringTrip = (group: RecurringTripGroup) => {
    if (!isAuthenticated) {
      navigate('/login?scrollToForm=true');
      return;
    }

    if (!user?.phone || user.phone.trim() === '') {
      const confirmRedirect = window.confirm(
        'Necesitás cargar un número de teléfono para poder reservar. ¿Querés ir a tu perfil ahora?'
      );
      if (confirmRedirect) {
        navigate('/profile/edit?from=booking');
      }
      return;
    }

    // Para viajes recurrentes, necesitamos encontrar el próximo viaje específico
    const nextTrip = trips.find(trip => 
      trip.recurrenceId === group.id && 
      trip.departureDate.toDateString() === group.nextTripDate.toDateString()
    );

    if (nextTrip) {
      setSelectedTrip(nextTrip);
    } else {
      alert('No se pudo encontrar el próximo viaje disponible para reservar.');
    }
  };

  const handleConfirmBooking = async (tripId: string, seats: number) => {
    try {
      await bookTrip(tripId, seats);
      alert('Reserva enviada al conductor');
      setSelectedTrip(null);
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