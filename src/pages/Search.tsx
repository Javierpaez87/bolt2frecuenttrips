import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import TripFilter from '../components/trip/TripFilter';
import TripCard from '../components/trip/TripCard';
import BookingModal from '../components/trip/BookingModal';
import DriverOfferModal from '../components/trip/DriverOfferModal';
import { useTripStore } from '../store/tripStore';
import { Trip, TripFilters, PassengerRequest } from '../types';
import { useAuthStore } from '../store/authStore';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { Calendar, Clock, DollarSign, MapPin, User as UserIcon, Car } from 'lucide-react';
import Button from '../components/ui/Button';

const Search: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const {
    trips,
    filteredTrips,
    passengerRequests,
    filteredPassengerRequests,
    isLoading,
    error,
    fetchTrips,
    fetchPassengerRequests,
    filterTrips,
    filterPassengerRequests,
    bookTrip,
    createDriverOffer,
  } = useTripStore();

  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<PassengerRequest | null>(null);
  const [searchType, setSearchType] = useState<'driver_offer' | 'passenger_request'>('driver_offer');

  useEffect(() => {
    fetchTrips();
    fetchPassengerRequests();
  }, [fetchTrips, fetchPassengerRequests]);

  useEffect(() => {
    const origin = searchParams.get('origin')?.toLowerCase().trim();
    const destination = searchParams.get('destination')?.toLowerCase().trim();
    const tripType = searchParams.get('tripType') as 'driver_offer' | 'passenger_request';

    // Establecer el tipo de búsqueda desde URL
    if (tripType) {
      setSearchType(tripType);
    }

    if (origin || destination) {
      const initialFilters: TripFilters = {
        origin: origin || undefined,
        destination: destination || undefined,
      };
      
      // Filtrar según el tipo
      if (tripType === 'passenger_request') {
        filterPassengerRequests(initialFilters);
      } else {
        filterTrips(initialFilters);
      }
    }
  }, [searchParams, filterTrips, filterPassengerRequests]);

  const handleFilter = (filters: TripFilters) => {
    if (searchType === 'passenger_request') {
      filterPassengerRequests(filters);
    } else {
      filterTrips(filters);
    }
  };

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
      
      let attempts = 0;
      let userData = null;
      
      while (attempts < 3 && !userData) {
        const snapshot = await getDoc(userRef);
        if (snapshot.exists()) {
          userData = snapshot.data();
          break;
        }
        attempts++;
        if (attempts < 3) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      console.log('📞 Verificando teléfono para usuario:', uid, 'intento:', attempts);
      
      if (userData) {
        const phone = userData.phone;
        
        console.log('📞 Datos del usuario encontrados:', { 
          phone, 
          hasPhone: !!phone,
          phoneType: typeof phone 
        });
        
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
        console.log('📞 No se encontró documento del usuario en Firestore después de múltiples intentos');
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

  const handleOfferToRequest = async (request: PassengerRequest) => {
    if (!isAuthenticated) {
      navigate('/login?scrollToForm=true');
      return;
    }

    console.log('🎯 Iniciando proceso de oferta para solicitud:', request.id);

    const hasValidPhone = await checkUserPhone();
    
    if (!hasValidPhone) {
      const confirmRedirect = window.confirm(
        'Necesitás cargar un número de teléfono válido para poder hacer ofertas. ¿Querés ir a tu perfil ahora?'
      );
      if (confirmRedirect) {
        navigate('/profile/edit?from=booking');
      }
      return;
    }

    console.log('✅ Teléfono válido, procediendo con oferta');
    setSelectedRequest(request);
  };

  const handleConfirmBooking = async (tripId: string, seats: number) => {
    try {
      await bookTrip(tripId, seats);
      alert('Reserva enviada al conductor');
      setSelectedTrip(null);
      fetchTrips();
    } catch (error) {
      console.error('Error al reservar:', error);
      alert('Ocurrió un error al reservar');
    }
  };

  const handleConfirmOffer = async (requestId: string, offerData: any) => {
    try {
      await createDriverOffer(requestId, offerData);
      alert('Oferta enviada al pasajero');
      setSelectedRequest(null);
      // Refrescar datos si es necesario
    } catch (error) {
      console.error('Error al enviar oferta:', error);
      alert('Ocurrió un error al enviar la oferta');
    }
  };

  // Función para formatear fecha
  const formatDate = (date: Date): string => {
    try {
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch (error) {
      return 'Fecha inválida';
    }
  };

  // Determinar qué mostrar según el tipo de búsqueda
  const contentToShow = searchType === 'passenger_request' ? filteredPassengerRequests : filteredTrips;
  const totalCount = searchType === 'passenger_request' ? passengerRequests.length : trips.length;

  return (
    <Layout>
      <div className="bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4 md:mb-0">
              {searchType === 'passenger_request' ? 'Buscar Solicitudes de Pasajeros' : 'Buscar Viajes'}
            </h1>

            {/* Selector de tipo de búsqueda */}
            <div className="flex bg-white rounded-lg border border-gray-300 p-1">
              <button
                onClick={() => setSearchType('driver_offer')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  searchType === 'driver_offer'
                    ? 'bg-primary-500 text-white'
                    : 'text-gray-700 hover:text-primary-600'
                }`}
              >
                Viajes de Conductores
              </button>
              <button
                onClick={() => setSearchType('passenger_request')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  searchType === 'passenger_request'
                    ? 'bg-secondary-500 text-white'
                    : 'text-gray-700 hover:text-secondary-600'
                }`}
              >
                Solicitudes de Pasajeros
              </button>
            </div>
          </div>

          <TripFilter onFilter={handleFilter} />

          <div className="mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              {isLoading
                ? 'Cargando...'
                : `${contentToShow.length} ${searchType === 'passenger_request' ? 'solicitudes' : 'viajes'} encontrados`}
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
              {contentToShow.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {searchType === 'passenger_request' ? (
                    // Mostrar solicitudes de pasajeros
                    (contentToShow as PassengerRequest[]).map((request) => (
                      <div
                        key={request.id}
                        className="bg-white rounded-lg shadow-card hover:shadow-card-hover transition-shadow p-4 border-l-4 border-secondary-500"
                      >
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0">
                            <div className="h-12 w-12 rounded-full overflow-hidden">
                              {request.passenger?.profilePicture ? (
                                <img
                                  src={request.passenger.profilePicture}
                                  alt={request.passenger.name}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="h-full w-full bg-secondary-100 flex items-center justify-center">
                                  <span className="text-secondary-600 font-medium">
                                    {request.passenger?.name?.substring(0, 2).toUpperCase() || 'PA'}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex-1">
                            <h3 className="font-semibold text-lg text-gray-900">
                              {request.origin} → {request.destination}
                            </h3>
                            
                            <p className="text-sm text-gray-500 mt-1">
                              Solicita: {request.passenger?.name || 'Pasajero'}
                            </p>

                            <div className="grid grid-cols-2 gap-2 mt-3">
                              <div className="flex items-center text-sm text-gray-600">
                                <Calendar className="h-4 w-4 text-secondary-500 mr-1" />
                                <span>{formatDate(request.departureDate)}</span>
                              </div>

                              <div className="flex items-center text-sm text-gray-600">
                                <Clock className="h-4 w-4 text-secondary-500 mr-1" />
                                <span>{request.departureTime}</span>
                              </div>
                            </div>

                            {request.maxPrice && (
                              <div className="flex items-center text-sm text-gray-600 mt-1">
                                <DollarSign className="h-4 w-4 text-secondary-500 mr-1" />
                                <span>Hasta ${request.maxPrice}</span>
                              </div>
                            )}

                            {request.description && (
                              <div className="mt-3">
                                <p className="text-sm text-gray-700 line-clamp-2">
                                  <strong>Comentarios:</strong> {request.description}
                                </p>
                              </div>
                            )}

                            <div className="mt-4 flex flex-col space-y-2">
                              <div className="flex space-x-2">
                                <div className="flex items-center text-sm">
                                  <MapPin className="h-4 w-4 text-secondary-500 mr-1" />
                                  <span className="text-gray-600">{request.origin}</span>
                                </div>
                                <span className="text-gray-400">→</span>
                                <div className="flex items-center text-sm">
                                  <MapPin className="h-4 w-4 text-secondary-500 mr-1" />
                                  <span className="text-gray-600">{request.destination}</span>
                                </div>
                              </div>

                              <div className="flex space-x-2">
                                {/* Botón de WhatsApp */}
                                {request.passenger?.phone && (
                                  isAuthenticated ? (
                                    <a
                                      href={`https://wa.me/${request.passenger.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
                                        `Hola ${request.passenger.name}, vi tu solicitud de viaje de ${request.origin} a ${request.destination} en BondiCar y me interesa hacer una oferta como conductor.`
                                      )}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex-1 inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-white bg-green-500 rounded hover:bg-green-600 transition"
                                    >
                                      <svg
                                        className="w-4 h-4 mr-1"
                                        fill="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path d="M16.403 12.675c-.245-.123-1.447-.713-1.672-.793-.225-.082-.39-.123-.555.123s-.637.793-.782.957c-.143.164-.287.184-.532.061-.245-.123-1.034-.381-1.97-1.215-.728-.649-1.219-1.451-1.36-1.696-.143-.246-.015-.379.107-.5.11-.109.245-.287.368-.43.123-.143.164-.245.246-.408.082-.163.041-.307-.02-.43-.061-.123-.555-1.336-.759-1.832-.2-.48-.403-.414-.555-.414h-.472c-.163 0-.429.061-.653.307s-.857.838-.857 2.043c0 1.205.877 2.367 1 .51.123 1.553 2.06 3.064 2.352 3.278.291.215 4.059 2.582 4.98 2.932.697.277 1.243.221 1.711.134.522-.097 1.447-.59 1.652-1.162.204-.572.204-1.062.143-1.162-.061-.1-.225-.163-.47-.286z" />
                                        <path d="M12.005 2C6.487 2 2 6.486 2 12c0 1.995.584 3.842 1.59 5.403L2 22l4.74-1.563A9.956 9.956 0 0 0 12.005 22C17.514 22 22 17.514 22 12S17.514 2 12.005 2zm0 17.931a7.936 7.936 0 0 1-4.256-1.243l-.305-.184-2.815.927.923-2.74-.2-.312A7.932 7.932 0 0 1 4.065 12c0-4.384 3.56-7.937 7.94-7.937 4.374 0 7.933 3.553 7.933 7.937 0 4.379-3.553 7.931-7.933 7.931z" />
                                      </svg>
                                      WhatsApp
                                    </a>
                                  ) : (
                                    <button
                                      onClick={() => alert("Necesitás iniciar sesión para contactar al pasajero.")}
                                      className="flex-1 inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-white bg-gray-400 rounded cursor-not-allowed"
                                    >
                                      <UserIcon className="w-4 h-4 mr-1" />
                                      WhatsApp
                                    </button>
                                  )
                                )}

                                {/* Botón de Ofrecer Viaje */}
                                <Button
                                  variant="primary"
                                  size="sm"
                                  onClick={() => handleOfferToRequest(request)}
                                  className="flex-1 bg-secondary-600 hover:bg-secondary-700"
                                  icon={<Car className="h-4 w-4" />}
                                >
                                  Ofrecer Viaje
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    // Mostrar viajes de conductores
                    (contentToShow as Trip[]).map((trip) => (
                      <TripCard
                        key={trip.id}
                        trip={trip}
                        onBook={handleBookTrip}
                      />
                    ))
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No se encontraron {searchType === 'passenger_request' ? 'solicitudes' : 'viajes'}
                  </h3>
                  <p className="text-gray-600">
                    Intenta con otros filtros o crea {searchType === 'passenger_request' ? 'una nueva solicitud' : 'un nuevo viaje'}.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal para reservar viajes */}
      {selectedTrip && (
        <BookingModal
          trip={selectedTrip}
          onClose={() => setSelectedTrip(null)}
          onConfirm={handleConfirmBooking}
        />
      )}

      {/* Modal para hacer ofertas */}
      {selectedRequest && (
        <DriverOfferModal
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
          onConfirm={handleConfirmOffer}
        />
      )}
    </Layout>
  );
};

export default Search;