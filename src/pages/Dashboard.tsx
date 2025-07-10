import React, { useEffect, useState } from 'react';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { Navigate, useSearchParams, Link } from 'react-router-dom';
import { Car, Bookmark, User, Repeat, UserCheck, MessageSquare, Calendar, Clock, DollarSign, MapPin } from 'lucide-react';
import { toast } from 'react-toastify';
import Layout from '../components/layout/Layout';
import TripCard from '../components/trip/TripCard';
import RecurringTripCard from '../components/trip/RecurringTripCard';
import PendingBookings from '../components/PendingBookings';
import DriverOffersList from '../components/DriverOffersList';
import { useTripStore } from '../store/tripStore';
import { useAuthStore } from '../store/authStore';
import { Booking } from '../types';

// Función helper para crear fecha local desde string YYYY-MM-DD
const createLocalDate = (dateString: string): Date => {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const isTodayOrFuture = (date: Date | string) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let tripDate: Date;
  if (typeof date === 'string') {
    tripDate = createLocalDate(date);
  } else {
    tripDate = new Date(date);
  }
  tripDate.setHours(0, 0, 0, 0);

  return tripDate >= today;
};

const isPast = (date: Date | string) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let tripDate: Date;
  if (typeof date === 'string') {
    tripDate = createLocalDate(date);
  } else {
    tripDate = new Date(date);
  }
  tripDate.setHours(0, 0, 0, 0);

  return tripDate < today;
};

const Dashboard: React.FC = () => {
  const { isAuthenticated, user } = useAuthStore();
  const {
    myTrips,
    myBookings,
    myRecurringGroups,
    myPassengerRequests,
    myDriverOffers,
    receivedDriverOffers,
    isLoading,
    error,
    fetchMyTrips,
    fetchMyBookings,
    fetchBookingsForMyTrips,
    fetchMyPassengerRequests,
    fetchMyDriverOffers,
    fetchReceivedDriverOffers,
    deleteTrip,
    deleteRecurringGroup,
    deletePassengerRequest,
  } = useTripStore();

  const [activeTab, setActiveTab] = useState<'trips' | 'bookings' | 'received' | 'offers' | 'profile'>('trips');
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (
      tabParam === 'trips' ||
      tabParam === 'bookings' ||
      tabParam === 'received' ||
      tabParam === 'offers' ||
      tabParam === 'profile'
    ) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  useEffect(() => {
    if (isAuthenticated && user) {
      console.log('🎯 Dashboard: Usuario autenticado, cargando datos...', user.id);
      fetchMyTrips();
      fetchMyBookings();
      fetchBookingsForMyTrips();
      fetchMyPassengerRequests();
      fetchMyDriverOffers();
      fetchReceivedDriverOffers();
    } else {
      console.log('⏳ Dashboard: Esperando autenticación...', { isAuthenticated, hasUser: !!user });
    }
  }, [isAuthenticated, user, fetchMyTrips, fetchMyBookings, fetchBookingsForMyTrips, fetchMyPassengerRequests, fetchMyDriverOffers, fetchReceivedDriverOffers]);

  const handleBookingUpdate = () => {
    fetchMyTrips();
    fetchMyBookings();
    fetchBookingsForMyTrips();
  };

  const handleOfferUpdate = () => {
    fetchMyDriverOffers();
    fetchReceivedDriverOffers();
    fetchMyPassengerRequests();
  };

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  const handleDeleteTrip = async (tripId: string) => {
    const confirmDelete = window.confirm('¿Estás seguro de que querés eliminar este viaje?');
    if (!confirmDelete) return;

    try {
      await deleteTrip(tripId);
      toast.success('Viaje eliminado con éxito');
    } catch (error) {
      toast.error('Ocurrió un error al eliminar el viaje');
    }
  };

  const handleDeletePassengerRequest = async (requestId: string) => {
    const confirmDelete = window.confirm('¿Estás seguro de que querés eliminar esta solicitud?');
    if (!confirmDelete) return;

    try {
      await deletePassengerRequest(requestId);
      toast.success('Solicitud eliminada con éxito');
    } catch (error) {
      toast.error('Ocurrió un error al eliminar la solicitud');
    }
  };

  const handleDeleteRecurringGroup = async (recurrenceId: string) => {
    const confirmDelete = window.confirm(
      '¿Estás seguro de que querés eliminar TODA la serie de viajes recurrentes? Esta acción no se puede deshacer.'
    );
    if (!confirmDelete) return;

    try {
      await deleteRecurringGroup(recurrenceId);
      toast.success('Serie de viajes recurrentes eliminada con éxito');
    } catch (error) {
      toast.error('Ocurrió un error al eliminar la serie de viajes');
    }
  };

  const getReservationStatus = (booking: Booking) => booking.status;

  // Filtrar viajes individuales (no recurrentes)
  const individualTrips = myTrips.filter(trip => !trip.isRecurring);
  const futureIndividualTrips = individualTrips.filter(trip => isTodayOrFuture(trip.departureDate));
  const pastIndividualTrips = individualTrips.filter(trip => isPast(trip.departureDate));

  // Filtrar grupos recurrentes activos
  const activeRecurringGroups = myRecurringGroups.filter(group => group.status === 'active');

  // Separar reservas como pasajero vs reservas recibidas como conductor
  const passengerBookings = myBookings.filter(booking => booking.passengerId === user?.id);
  const receivedBookings = myBookings.filter(booking => booking.passengerId !== user?.id);

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

  return (
    <Layout>
      <div className="bg-gray-50 py-8 min-h-screen">
        <div className="container mx-auto px-4">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">Mi Panel</h1>

          {/* Tabs */}
          <div className="mb-8">
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8 overflow-x-auto">
                <button
                  onClick={() => setActiveTab('trips')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                    activeTab === 'trips'
                      ? 'border-primary-500 text-primary-500'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Car className="inline-block h-5 w-5 mr-2" />
                  Mis Publicaciones
                </button>
                <button
                  onClick={() => setActiveTab('bookings')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                    activeTab === 'bookings'
                      ? 'border-primary-500 text-primary-500'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Bookmark className="inline-block h-5 w-5 mr-2" />
                  Mis Reservas
                </button>
                <button
                  onClick={() => setActiveTab('received')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                    activeTab === 'received'
                      ? 'border-primary-500 text-primary-500'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <UserCheck className="inline-block h-5 w-5 mr-2" />
                  Reservas Recibidas (como conductor)
                </button>
                <button
                  onClick={() => setActiveTab('offers')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                    activeTab === 'offers'
                      ? 'border-primary-500 text-primary-500'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <MessageSquare className="inline-block h-5 w-5 mr-2" />
                  Ofertas Recibidas (como pasajero)
                </button>
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                    activeTab === 'profile'
                      ? 'border-primary-500 text-primary-500'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <User className="inline-block h-5 w-5 mr-2" />
                  Mi Perfil
                </button>
              </nav>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 text-red-700 rounded-lg mb-6">{error}</div>
          )}

          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
            </div>
          ) : (
            <>
              {activeTab === 'trips' && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">
                    Mis Publicaciones
                  </h2>

                  {/* Subtabs para distinguir conductor vs pasajero */}
                  <div className="mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* COMO CONDUCTOR */}
                      <div className="bg-white rounded-lg shadow-card p-6">
                        <div className="flex items-center mb-4">
                          <UserCheck className="h-6 w-6 text-primary-600 mr-3" />
                          <h3 className="text-lg font-semibold text-gray-900">Como Conductor</h3>
                        </div>

                        {/* VIAJES RECURRENTES ACTIVOS */}
                        {activeRecurringGroups.length > 0 && (
                          <>
                            <div className="flex items-center mb-4">
                              <Repeat className="h-5 w-5 text-blue-500 mr-2" />
                              <h4 className="text-md font-semibold text-gray-800">Viajes Recurrentes</h4>
                            </div>
                            <div className="space-y-4 mb-6">
                              {activeRecurringGroups.map(group => (
                                <RecurringTripCard
                                  key={group.id}
                                  group={group}
                                  hideConductorInfo={true}
                                  showDeleteButton={true}
                                  onDelete={handleDeleteRecurringGroup}
                                />
                              ))}
                            </div>
                          </>
                        )}

                        {/* VIAJES INDIVIDUALES FUTUROS */}
                        {futureIndividualTrips.length > 0 && (
                          <>
                            <h4 className="text-md font-semibold mb-3 text-gray-800">Próximos viajes individuales</h4>
                            <div className="space-y-4 mb-6">
                              {futureIndividualTrips.map(trip => (
                                <div key={trip.id} className="relative">
                                  <TripCard
                                    trip={trip}
                                    hideConductorInfo={true}
                                  />
                                  <button
                                    onClick={() => handleDeleteTrip(trip.id)}
                                    className="absolute top-2 right-2 text-sm bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded shadow"
                                  >
                                    Eliminar
                                  </button>
                                </div>
                              ))}
                            </div>
                          </>
                        )}

                        {/* MENSAJE SI NO HAY VIAJES COMO CONDUCTOR */}
                        {futureIndividualTrips.length === 0 && activeRecurringGroups.length === 0 && (
                          <div className="text-center py-8">
                            <Car className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <h4 className="text-lg font-medium text-gray-900 mb-2">
                              No tienes viajes publicados como conductor
                            </h4>
                            <p className="text-gray-600 mb-4">
                              Publicá un viaje para conectar con pasajeros.
                            </p>
                            <Link
                              to="/create-trip"
                              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-500 hover:bg-primary-600"
                            >
                              Publicar Viaje como Conductor
                            </Link>
                          </div>
                        )}
                      </div>

                      {/* COMO PASAJERO */}
                      <div className="bg-white rounded-lg shadow-card p-6">
                        <div className="flex items-center mb-4">
                          <User className="h-6 w-6 text-secondary-600 mr-3" />
                          <h3 className="text-lg font-semibold text-gray-900">Como Pasajero</h3>
                        </div>

                        {myPassengerRequests.length > 0 ? (
                          <div className="space-y-4">
                            {myPassengerRequests.map(request => (
                              <div key={request.id} className="bg-secondary-50 rounded-lg p-4 border border-secondary-200 relative">
                                <button
                                  onClick={() => handleDeletePassengerRequest(request.id)}
                                  className="absolute top-2 right-2 text-sm bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded shadow"
                                >
                                  Eliminar
                                </button>
                                
                                <h4 className="font-semibold text-lg text-gray-900 mb-2">
                                  {request.origin} → {request.destination}
                                </h4>
                                
                                <div className="grid grid-cols-2 gap-2 mb-3">
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
                                  <div className="flex items-center text-sm text-gray-600 mb-2">
                                    <DollarSign className="h-4 w-4 text-secondary-500 mr-1" />
                                    <span>Hasta ${request.maxPrice}</span>
                                  </div>
                                )}

                                {request.description && (
                                  <p className="text-sm text-gray-700 mt-2">
                                    <strong>Comentarios:</strong> {request.description}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <h4 className="text-lg font-medium text-gray-900 mb-2">
                              No tienes solicitudes publicadas como pasajero
                            </h4>
                            <p className="text-gray-600 mb-4">
                              Publicá una solicitud para que los conductores te contacten.
                            </p>
                            <Link
                              to="/create-trip"
                              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-secondary-500 hover:bg-secondary-600"
                            >
                              Publicar Solicitud como Pasajero
                            </Link>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* HISTORIAL DE VIAJES PASADOS */}
                    {pastIndividualTrips.length > 0 && (
                      <div className="mt-8">
                        <h3 className="text-md font-semibold mt-8 mb-4 text-gray-600">Historial de viajes pasados</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {pastIndividualTrips.map(trip => (
                            <div key={trip.id} className="relative">
                              <TripCard
                                trip={trip}
                                hideConductorInfo={true}
                                isPast={true}
                                reservationCount={trip.bookings?.length || 0}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'bookings' && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">
                    Mis Reservas
                  </h2>

                  {/* Subtabs para distinguir reservas como conductor vs pasajero */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* RESERVAS COMO PASAJERO */}
                    <div className="bg-white rounded-lg shadow-card p-6">
                      <div className="flex items-center mb-4">
                        <User className="h-6 w-6 text-secondary-600 mr-3" />
                        <h3 className="text-lg font-semibold text-gray-900">Como Pasajero</h3>
                      </div>

                      {Array.isArray(passengerBookings) && passengerBookings.length > 0 ? (
                        <div className="space-y-4">
                          {passengerBookings.map((booking) => {
                            if (!booking.trip) {
                              return (
                                <div
                                  key={booking.id}
                                  className="p-4 bg-yellow-100 text-yellow-800 rounded shadow"
                                >
                                  Esta reserva no tiene un viaje asociado.
                                </div>
                              );
                            }

                            return (
                              <TripCard
                                key={booking.id}
                                trip={booking.trip}
                                isReserved={true}
                                reservationStatus={getReservationStatus(booking)}
                              />
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <Bookmark className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <h4 className="text-lg font-medium text-gray-900 mb-2">
                            No has reservado ningún viaje
                          </h4>
                          <p className="text-gray-600 mb-4">
                            Busca y reserva viajes para comenzar a disfrutar de los beneficios de viajar compartido.
                          </p>
                          <Link
                            to="/search"
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-secondary-500 hover:bg-secondary-600"
                          >
                            Buscar Viajes
                          </Link>
                        </div>
                      )}
                    </div>

                    {/* OFERTAS REALIZADAS COMO CONDUCTOR */}
                    <div className="bg-white rounded-lg shadow-card p-6">
                      <div className="flex items-center mb-4">
                        <UserCheck className="h-6 w-6 text-primary-600 mr-3" />
                        <h3 className="text-lg font-semibold text-gray-900">Ofertas que Hice (como conductor)</h3>
                      </div>

                      {myDriverOffers.length > 0 ? (
                        <DriverOffersList 
                          offers={myDriverOffers} 
                          onOfferUpdate={handleOfferUpdate}
                          isPassenger={false}
                        />
                      ) : (
                        <div className="text-center py-8">
                          <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <h4 className="text-lg font-medium text-gray-900 mb-2">
                            No has hecho ofertas como conductor
                          </h4>
                          <p className="text-gray-600 mb-4">
                            Busca solicitudes de pasajeros y haz ofertas para conectar.
                          </p>
                          <Link
                            to="/search?tripType=passenger_request"
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-500 hover:bg-primary-600"
                          >
                            Buscar Solicitudes
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'received' && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    Reservas que recibiste como conductor
                  </h2>
                  <PendingBookings 
                    bookings={receivedBookings} 
                    onBookingUpdate={handleBookingUpdate}
                  />
                </div>
              )}

              {activeTab === 'offers' && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">
                    Ofertas que recibiste como pasajero
                  </h2>

                  {receivedDriverOffers.length > 0 ? (
                    <DriverOffersList 
                      offers={receivedDriverOffers} 
                      onOfferUpdate={handleOfferUpdate}
                      isPassenger={true}
                    />
                  ) : (
                    <div className="bg-white rounded-lg shadow-card p-8 text-center">
                      <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        No has recibido ofertas como pasajero
                      </h3>
                      <p className="text-gray-600 mb-4">
                        Publica solicitudes de viaje para que los conductores te hagan ofertas.
                      </p>
                      <Link
                        to="/create-trip"
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-secondary-500 hover:bg-secondary-600"
                      >
                        Publicar Solicitud
                      </Link>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'profile' && <UserProfileSection />}
            </>
          )}
        </div>
      </div>
    </Layout>
  );
};

const UserProfileSection: React.FC = () => {
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
    <div className="bg-white rounded-lg shadow-card p-6">
      <div className="flex flex-col md:flex-row">
        <div className="md:w-1/3 flex justify-center mb-6 md:mb-0">
          <div className="h-32 w-32 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
            {user?.profilePicture ? (
              <img
                src={user.profilePicture}
                alt={user.name}
                className="h-full w-full object-cover"
              />
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
            <Link
              to="/profile/edit"
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Editar Perfil
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;