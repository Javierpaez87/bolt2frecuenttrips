import React from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { MapPin, Calendar, Clock, Users, DollarSign, Car } from 'lucide-react';
import { Trip } from '../../types';
import Button from '../ui/Button';
import { useAuthStore } from '../../store/authStore';

interface TripCardProps {
  trip: Trip;
  onBook?: (trip: Trip) => void;
  isReserved?: boolean;
  reservationStatus?: string;
  hideConductorInfo?: boolean;
  isPast?: boolean;
  reservationCount?: number;
}

const TripCard: React.FC<TripCardProps> = ({
  trip,
  onBook,
  isReserved = false,
  reservationStatus,
  hideConductorInfo = false,
  isPast = false,
  reservationCount = 0,
}) => {
  // Función mejorada para formatear fecha SIN problemas de timezone
  const formatDate = (date: Date | string): string => {
    try {
      let dateObj: Date;
      
      if (typeof date === 'string') {
        // Si es string en formato YYYY-MM-DD, parsearlo como fecha local
        const parts = date.split('-');
        if (parts.length === 3) {
          const [year, month, day] = parts.map(Number);
          dateObj = new Date(year, month - 1, day); // month - 1 porque Date usa 0-indexado
        } else {
          console.warn('Formato de fecha string no reconocido:', date);
          return 'Fecha inválida';
        }
      } else if (date instanceof Date) {
        dateObj = date;
      } else {
        console.warn('Tipo de fecha no reconocido:', typeof date, date);
        return 'Fecha inválida';
      }

      // Verificar que la fecha sea válida
      if (isNaN(dateObj.getTime())) {
        console.warn('Fecha inválida:', date);
        return 'Fecha inválida';
      }

      // Formatear la fecha
      return format(dateObj, 'dd/MM/yyyy', { locale: es });
    } catch (error) {
      console.error('Error formateando fecha:', error, date);
      return 'Fecha inválida';
    }
  };

  const formattedDate = formatDate(trip.departureDate);
  const { isAuthenticated } = useAuthStore();

  const statusBadge = () => {
    if (!isReserved && !isPast) return null;

    if (isPast) {
      return (
        <div className="absolute top-3 right-3 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          Finalizado
        </div>
      );
    }

    const badgeStyles = {
      pending: 'bg-teal-100 text-teal-800',
      confirmed: 'bg-emerald-100 text-emerald-800',
      rejected: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800',
    };

    const status = reservationStatus || 'pending';
    const badgeStyle =
      badgeStyles[status as keyof typeof badgeStyles] || badgeStyles.pending;

    return (
      <div
        className={`absolute top-3 right-3 px-2 py-1 rounded-full text-xs font-medium ${badgeStyle}`}
      >
        {status === 'pending' && 'Pendiente'}
        {status === 'confirmed' && 'Confirmado'}
        {status === 'rejected' && 'Rechazado'}
        {status === 'cancelled' && 'Cancelado'}
      </div>
    );
  };

  return (
    <div className={`bg-white rounded-lg shadow-card hover:shadow-card-hover transition-shadow p-4 relative ${isPast ? 'opacity-75' : ''}`}>
      {statusBadge()}

      <div className="flex items-start space-x-3">
        {!hideConductorInfo && (
          <div className="flex-shrink-0">
            <div className="h-12 w-12 rounded-full overflow-hidden">
              {trip.driver.profilePicture ? (
                <img
                  src={trip.driver.profilePicture}
                  alt={trip.driver.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full bg-emerald-100 flex items-center justify-center">
                  <span className="text-emerald-600 font-medium">
                    {trip.driver.name.substring(0, 2).toUpperCase()}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex-1">
          <h3 className="font-semibold text-lg text-gray-900">
            {trip.origin} → {trip.destination}
          </h3>

          {!hideConductorInfo && (
            <p className="text-sm text-gray-500 mt-1">
              Conductor: {trip.driver.name}
            </p>
          )}

          <div className="grid grid-cols-2 gap-2 mt-3">
            <div className="flex items-center text-sm text-gray-600">
              <Calendar className="h-4 w-4 text-emerald-500 mr-1" />
              <span>{formattedDate}</span>
            </div>

            <div className="flex items-center text-sm text-gray-600">
              <Clock className="h-4 w-4 text-teal-500 mr-1" />
              <span>{trip.departureTime}</span>
            </div>

            <div className="flex items-center text-sm text-gray-600">
              <Users className="h-4 w-4 text-lime-500 mr-1" />
              <span>
                {trip.availableSeats}{' '}
                {trip.availableSeats === 1 ? 'asiento' : 'asientos'}
              </span>
            </div>

            <div className="flex items-center text-sm text-gray-600">
              <DollarSign className="h-4 w-4 text-emerald-500 mr-1" />
              <span>${trip.price}</span>
            </div>
          </div>

          {trip.carModel && (
            <div className="flex items-center text-sm text-gray-600 mt-1">
              <Car className="h-4 w-4 text-teal-500 mr-1" />
              <span>
                {trip.carModel} • {trip.carColor}
              </span>
            </div>
          )}

          {trip.description && (
            <div className="mt-4">
              <p className="text-sm text-gray-700 whitespace-pre-line">
                <strong>Comentarios del/a conductor/a:</strong> {trip.description}
              </p>
            </div>
          )}

          {isPast && reservationCount > 0 && (
            <div className="mt-2 text-sm text-gray-600">
              <strong>Reservas recibidas:</strong> {reservationCount}
            </div>
          )}

          {!hideConductorInfo && !isPast && (
            <div className="mt-4 flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-2 sm:space-y-0">
              <div className="flex space-x-2">
                <div className="flex items-center text-sm">
                  <MapPin className="h-4 w-4 text-emerald-500 mr-1" />
                  <span className="text-gray-600">{trip.origin}</span>
                </div>
                <span className="text-gray-400">→</span>
                <div className="flex items-center text-sm">
                  <MapPin className="h-4 w-4 text-teal-500 mr-1" />
                  <span className="text-gray-600">{trip.destination}</span>
                </div>
              </div>

              <div className="flex space-x-3">
                {trip.driver.phone && (
                  isAuthenticated ? (
                    <a
                      href={`https://wa.me/${trip.driver.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
                        `Hola ${trip.driver.name}, vi tu viaje de ${trip.origin} a ${trip.destination} en BondiCar y me interesa reservar un lugar.`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-green-500 rounded hover:bg-green-600 transition"
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
                      onClick={() => alert("Necesitás iniciar sesión para contactar al conductor.")}
                      className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-gray-400 rounded cursor-not-allowed"
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
                    </button>
                  )
                )}
                {!isReserved && onBook && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => onBook(trip)}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    Reservar
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TripCard;