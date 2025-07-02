import React from 'react';
import { Calendar, Clock, DollarSign, Car, Users, Check, X, Phone } from 'lucide-react';
import { DriverOffer } from '../types';
import { getFirestore, updateDoc, doc } from 'firebase/firestore';

interface Props {
  offers: DriverOffer[];
  onOfferUpdate?: () => void;
  isPassenger?: boolean; // true si es el pasajero viendo ofertas recibidas
}

const DriverOffersList: React.FC<Props> = ({ offers, onOfferUpdate, isPassenger = false }) => {
  const updateOfferStatus = async (
    offerId: string,
    status: 'accepted' | 'rejected'
  ) => {
    const db = getFirestore();

    try {
      const offerRef = doc(db, 'Driver Offers', offerId);
      
      await updateDoc(offerRef, { 
        status,
        updatedAt: new Date()
      });

      alert(`Oferta ${status === 'accepted' ? 'aceptada' : 'rechazada'} correctamente.`);
      
      if (onOfferUpdate) {
        onOfferUpdate();
      }
    } catch (error) {
      console.error('Error al actualizar oferta:', error);
      alert('Ocurrió un error al procesar la oferta.');
    }
  };

  const formatDate = (date: Date | string): string => {
    try {
      let dateObj: Date;
      
      if (typeof date === 'string') {
        const parts = date.split('-');
        if (parts.length === 3) {
          const [year, month, day] = parts.map(Number);
          dateObj = new Date(year, month - 1, day);
        } else {
          dateObj = new Date(date);
        }
      } else if (date instanceof Date) {
        dateObj = date;
      } else {
        return 'Fecha inválida';
      }

      if (isNaN(dateObj.getTime())) {
        return 'Fecha inválida';
      }

      const day = dateObj.getDate().toString().padStart(2, '0');
      const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
      const year = dateObj.getFullYear();
      return `${day}/${month}/${year}`;
    } catch (error) {
      return 'Fecha inválida';
    }
  };

  return (
    <div className="p-4 bg-white rounded shadow-md">
      <h2 className="text-xl font-semibold mb-4">
        {isPassenger ? 'Ofertas recibidas' : 'Ofertas realizadas'}
      </h2>

      {offers.length === 0 ? (
        <p className="text-gray-600">
          {isPassenger ? 'No has recibido ofertas.' : 'No has realizado ofertas.'}
        </p>
      ) : (
        <ul className="space-y-4">
          {offers.map((offer) => (
            <li
              key={offer.id}
              className="p-4 border rounded flex flex-col bg-gray-50"
            >
              <div className="flex-1">
                <div className="mb-3">
                  <p className="font-semibold text-gray-900">
                    <strong>{isPassenger ? 'Conductor:' : 'Para solicitud:'}</strong> {
                      isPassenger 
                        ? offer.driver?.name || 'No disponible'
                        : `${offer.request?.origin} → ${offer.request?.destination}`
                    }
                  </p>
                  {/* ✅ CORREGIDO: Mostrar teléfono del conductor en ofertas recibidas */}
                  {isPassenger && offer.driver?.phone && (
                    <div className="flex items-center text-sm text-gray-600 mt-1">
                      <Phone className="h-4 w-4 text-blue-500 mr-1" />
                      <span><strong>Teléfono:</strong> {offer.driver.phone}</span>
                    </div>
                  )}
                </div>

                {offer.request && (
                  <div className="mb-3 p-2 bg-blue-50 rounded border border-blue-200">
                    <div className="flex items-center text-sm text-blue-800 mb-1">
                      <Calendar className="h-4 w-4 mr-1" />
                      <span className="font-medium">
                        {isPassenger ? 'Para tu solicitud:' : 'Solicitud:'}
                      </span>
                    </div>
                    <p className="text-sm text-blue-700">
                      <strong>Fecha:</strong> {formatDate(offer.request.departureDate)}
                    </p>
                    <p className="text-sm text-blue-700">
                      <strong>Hora:</strong> {offer.request.departureTime}
                    </p>
                    <p className="text-sm text-blue-700">
                      <strong>Ruta:</strong> {offer.request.origin} → {offer.request.destination}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div className="space-y-1">
                    <div className="flex items-center text-sm text-gray-600">
                      <DollarSign className="h-4 w-4 text-green-500 mr-1" />
                      <span><strong>Precio:</strong> ${offer.price}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Users className="h-4 w-4 text-blue-500 mr-1" />
                      <span><strong>Asientos:</strong> {offer.availableSeats}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    {offer.carModel && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Car className="h-4 w-4 text-gray-500 mr-1" />
                        <span>{offer.carModel} {offer.carColor}</span>
                      </div>
                    )}
                    <p className="text-sm">
                      <strong>Estado:</strong>{' '}
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        offer.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        offer.status === 'accepted' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {offer.status === 'pending' && '⏳ Pendiente'}
                        {offer.status === 'accepted' && '✅ Aceptada'}
                        {offer.status === 'rejected' && '❌ Rechazada'}
                      </span>
                    </p>
                  </div>
                </div>

                {offer.description && (
                  <div className="mb-3">
                    <p className="text-sm text-gray-700">
                      <strong>Comentarios:</strong> {offer.description}
                    </p>
                  </div>
                )}
              </div>

              {/* Botones de acción solo para pasajeros con ofertas pendientes */}
              {isPassenger && offer.status === 'pending' && (
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => updateOfferStatus(offer.id, 'accepted')}
                    className="flex items-center bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded text-sm font-medium transition-colors"
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Aceptar Oferta
                  </button>
                  <button
                    onClick={() => updateOfferStatus(offer.id, 'rejected')}
                    className="flex items-center bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded text-sm font-medium transition-colors"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Rechazar
                  </button>
                </div>
              )}

              {/* ✅ MEJORADO: Información de contacto más prominente para ofertas aceptadas */}
              {offer.status === 'accepted' && offer.driver?.phone && (
                <div className="mt-4 p-3 bg-green-50 rounded border border-green-200">
                  <p className="text-sm text-green-800 mb-2">
                    <strong>¡Oferta aceptada!</strong> Podés contactar al conductor:
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <a
                      href={`https://wa.me/${offer.driver.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
                        `Hola ${offer.driver.name}, acepté tu oferta para el viaje de ${offer.request?.origin} a ${offer.request?.destination}. ¡Coordinemos los detalles!`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-green-500 rounded hover:bg-green-600 transition"
                    >
                      <svg
                        className="w-4 h-4 mr-1"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M16.403 12.675c-.245-.123-1.447-.713-1.672-.793-.225-.082-.39-.123-.555.123s-.637.793-.782.957c-.143.164-.287.184-.532.061-.245-.123-1.034-.381-1.97-1.215-.728-.649-1.219-1.451-1.36-1.696-.143-.246-.015-.379.107-.5.11-.109.245-.287.368-.43.123-.143.164-.245.246-.408.082-.163.041-.307-.02-.43-.061-.123-.555-1.336-.759-1.832-.2-.48-.403-.414-.555-.414h-.472c-.163 0-.429.061-.653.307s-.857.838-.857 2.043c0 1.205.877 2.367 1 .51.123 1.553 2.06 3.064 2.352 3.278.291.215 4.059 2.582 4.98 2.932.697.277 1.243.221 1.711.134.522-.097 1.447-.59 1.652-1.162.204-.572.204-1.062.143-1.162-.061-.1-.225-.163-.47-.286z" />
                        <path d="M12.005 2C6.487 2 2 6.486 2 12c0 1.995.584 3.842 1.59 5.403L2 22l4.74-1.563A9.956 9.956 0 0 0 12.005 22C17.514 22 22 17.514 22 12S17.514 2 12.005 2zm0 17.931a7.936 7.936 0 0 1-4.256-1.243l-.305-.184-2.815.927.923-2.74-.2-.312A7.932 7.932 0 0 1 4.065 12c0-4.384 3.56-7.937 7.94-7.937 4.374 0 7.933 3.553 7.933 7.937 0 4.379-3.553 7.931-7.933 7.931z" />
                      </svg>
                      Contactar por WhatsApp
                    </a>
                    <div className="flex items-center text-sm text-green-700 bg-green-100 px-3 py-2 rounded">
                      <Phone className="h-4 w-4 mr-1" />
                      <span>{offer.driver.phone}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* ✅ NUEVO: Mostrar teléfono también para ofertas pendientes (para que el pasajero pueda contactar antes de decidir) */}
              {isPassenger && offer.status === 'pending' && offer.driver?.phone && (
                <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
                  <p className="text-sm text-blue-800 mb-2">
                    <strong>Información de contacto del conductor:</strong>
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <a
                      href={`https://wa.me/${offer.driver.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
                        `Hola ${offer.driver.name}, vi tu oferta para el viaje de ${offer.request?.origin} a ${offer.request?.destination}. Me interesa conocer más detalles.`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-blue-500 rounded hover:bg-blue-600 transition"
                    >
                      <svg
                        className="w-4 h-4 mr-1"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M16.403 12.675c-.245-.123-1.447-.713-1.672-.793-.225-.082-.39-.123-.555.123s-.637.793-.782.957c-.143.164-.287.184-.532.061-.245-.123-1.034-.381-1.97-1.215-.728-.649-1.219-1.451-1.36-1.696-.143-.246-.015-.379.107-.5.11-.109.245-.287.368-.43.123-.143.164-.245.246-.408.082-.163.041-.307-.02-.43-.061-.123-.555-1.336-.759-1.832-.2-.48-.403-.414-.555-.414h-.472c-.163 0-.429.061-.653.307s-.857.838-.857 2.043c0 1.205.877 2.367 1 .51.123 1.553 2.06 3.064 2.352 3.278.291.215 4.059 2.582 4.98 2.932.697.277 1.243.221 1.711.134.522-.097 1.447-.59 1.652-1.162.204-.572.204-1.062.143-1.162-.061-.1-.225-.163-.47-.286z" />
                        <path d="M12.005 2C6.487 2 2 6.486 2 12c0 1.995.584 3.842 1.59 5.403L2 22l4.74-1.563A9.956 9.956 0 0 0 12.005 22C17.514 22 22 17.514 22 12S17.514 2 12.005 2zm0 17.931a7.936 7.936 0 0 1-4.256-1.243l-.305-.184-2.815.927.923-2.74-.2-.312A7.932 7.932 0 0 1 4.065 12c0-4.384 3.56-7.937 7.94-7.937 4.374 0 7.933 3.553 7.933 7.937 0 4.379-3.553 7.931-7.933 7.931z" />
                      </svg>
                      Consultar por WhatsApp
                    </a>
                    <div className="flex items-center text-sm text-blue-700 bg-blue-100 px-3 py-2 rounded">
                      <Phone className="h-4 w-4 mr-1" />
                      <span>{offer.driver.phone}</span>
                    </div>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default DriverOffersList;