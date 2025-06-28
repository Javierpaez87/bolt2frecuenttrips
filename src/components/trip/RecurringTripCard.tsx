import React from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { MapPin, Calendar, Clock, Users, DollarSign, Car, Repeat } from 'lucide-react';
import { RecurringTripGroup } from '../../types';
import Button from '../ui/Button';
import { useAuthStore } from '../../store/authStore';
import { formatRecurrenceDays } from '../../utils/recurringTrips';

interface RecurringTripCardProps {
  group: RecurringTripGroup;
  onBook?: (group: RecurringTripGroup) => void;
  hideConductorInfo?: boolean;
  showDeleteButton?: boolean;
  onDelete?: (recurrenceId: string) => void;
}

const RecurringTripCard: React.FC<RecurringTripCardProps> = ({
  group,
  onBook,
  hideConductorInfo = false,
  showDeleteButton = false,
  onDelete,
}) => {
  const { isAuthenticated } = useAuthStore();

  const formatDate = (date: Date): string => {
    try {
      return format(date, 'dd/MM/yyyy', { locale: es });
    } catch (error) {
      console.error('Error formateando fecha:', error);
      return 'Fecha inválida';
    }
  };

  const formatDateRange = (): string => {
    const startDate = new Date(group.recurrenceStartDate);
    const endDate = group.recurrenceEndDate ? new Date(group.recurrenceEndDate) : null;
    
    if (endDate) {
      return `${formatDate(startDate)} - ${formatDate(endDate)}`;
    } else {
      return `Desde ${formatDate(startDate)}`;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-card hover:shadow-card-hover transition-shadow p-4 relative border-l-4 border-blue-500">
      {/* Badge de viaje recurrente */}
      <div className="absolute top-3 right-3 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 flex items-center">
        <Repeat className="h-3 w-3 mr-1" />
        Recurrente
      </div>

      <div className="flex items-start space-x-3">
        {!hideConductorInfo && (
          <div className="flex-shrink-0">
            <div className="h-12 w-12 rounded-full overflow-hidden">
              {group.driver.profilePicture ? (
                <img
                  src={group.driver.profilePicture}
                  alt={group.driver.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full bg-blue-100 flex items-center justify-center">
                  <span className="text-blue-600 font-medium">
                    {group.driver.name.substring(0, 2).toUpperCase()}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex-1">
          <h3 className="font-semibold text-lg text-gray-900">
            {group.origin} → {group.destination}
          </h3>

          {!hideConductorInfo && (
            <p className="text-sm text-gray-500 mt-1">
              Conductor: {group.driver.name}
            </p>
          )}

          {/* Información del patrón recurrente */}
          <div className="mt-3 p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center text-sm text-blue-800 mb-2">
              <Calendar className="h-4 w-4 mr-1" />
              <span className="font-medium">
                {formatRecurrenceDays(group.recurrenceDays)} a las {group.departureTime}
              </span>
            </div>
            <div className="text-xs text-blue-600">
              Período: {formatDateRange()}
            </div>
          </div>

          {/* Próximo viaje */}
          <div className="mt-3 p-2 bg-green-50 rounded border border-green-200">
            <div className="text-sm text-green-800">
              <strong>Próximo viaje:</strong> {formatDate(group.nextTripDate)}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-3">
            <div className="flex items-center text-sm text-gray-600">
              <Clock className="h-4 w-4 text-blue-500 mr-1" />
              <span>{group.departureTime}</span>
            </div>

            <div className="flex items-center text-sm text-gray-600">
              <Users className="h-4 w-4 text-green-500 mr-1" />
              <span>
                {group.availableSeats}{' '}
                {group.availableSeats === 1 ? 'asiento' : 'asientos'}
              </span>
            </div>

            <div className="flex items-center text-sm text-gray-600">
              <DollarSign className="h-4 w-4 text-blue-500 mr-1" />
              <span>${group.price}</span>
            </div>
          </div>

          {group.carModel && (
            <div className="flex items-center text-sm text-gray-600 mt-1">
              <Car className="h-4 w-4 text-blue-500 mr-1" />
              <span>
                {group.carModel} • {group.carColor}
              </span>
            </div>
          )}

          {group.description && (
            <div className="mt-4">
              <p className="text-sm text-gray-700 whitespace-pre-line">
                <strong>Comentarios del/a conductor/a:</strong> {group.description}
              </p>
            </div>
          )}

          {!hideConductorInfo && (
            <div className="mt-4 flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-2 sm:space-y-0">
              <div className="flex space-x-2">
                <div className="flex items-center text-sm">
                  <MapPin className="h-4 w-4 text-blue-500 mr-1" />
                  <span className="text-gray-600">{group.origin}</span>
                </div>
                <span className="text-gray-400">→</span>
                <div className="flex items-center text-sm">
                  <MapPin className="h-4 w-4 text-green-500 mr-1" />
                  <span className="text-gray-600">{group.destination}</span>
                </div>
              </div>

              <div className="flex space-x-3">
                {group.driver.phone && (
                  isAuthenticated ? (
                    <a
                      href={`https://wa.me/${group.driver.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
                        `Hola ${group.driver.name}, vi tu viaje recurrente de ${group.origin} a ${group.destination} en BondiCar y me interesa reservar un lugar.`
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
                {onBook && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => onBook(group)}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Reservar
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Botón de eliminar para el dashboard */}
          {showDeleteButton && onDelete && (
            <div className="mt-4">
              <button
                onClick={() => onDelete(group.id)}
                className="text-sm bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded shadow"
              >
                Eliminar Serie Completa
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RecurringTripCard;