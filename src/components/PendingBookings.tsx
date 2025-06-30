import React from 'react';
import { Calendar } from 'lucide-react';
import {
  getFirestore,
  updateDoc,
  doc,
  getDoc,
} from 'firebase/firestore';
import { Booking } from '../types';

interface Props {
  bookings: Booking[];
  onBookingUpdate?: () => void; // ✅ AGREGADO: Callback para refrescar datos
}

const ReceivedBookings: React.FC<Props> = ({ bookings, onBookingUpdate }) => {
  const updateBookingStatus = async (
    bookingId: string,
    status: 'accepted' | 'rejected'
  ) => {
    const db = getFirestore();

    try {
      // Obtener la reserva
      const bookingRef = doc(db, 'Bookings', bookingId);
      const bookingSnap = await getDoc(bookingRef);

      if (!bookingSnap.exists()) {
        alert('La reserva no existe.');
        return;
      }

      const bookingData = bookingSnap.data();
      const { tripId, seats } = bookingData;

      // Si se acepta la reserva, actualizar asientos del viaje
      if (status === 'accepted') {
        const tripRef = doc(db, 'Post Trips', tripId);
        const tripSnap = await getDoc(tripRef);

        if (tripSnap.exists()) {
          const tripData = tripSnap.data();
          const currentSeats = tripData?.availableSeats ?? 0;
          const updatedSeats = Math.max(0, currentSeats - seats);

          await updateDoc(tripRef, {
            availableSeats: updatedSeats,
          });
        }
      }

      // Actualizar el estado de la reserva
      await updateDoc(bookingRef, { 
        status,
        updatedAt: new Date() // ✅ AGREGADO: Timestamp de actualización
      });

      alert(`Reserva ${status === 'accepted' ? 'aceptada' : 'rechazada'} correctamente.`);
      
      // ✅ AGREGADO: Llamar callback para refrescar datos
      if (onBookingUpdate) {
        onBookingUpdate();
      }
    } catch (error) {
      console.error('Error al actualizar reserva:', error);
      alert('Ocurrió un error al procesar la reserva.');
    }
  };

  // ✅ AGREGADO: Función para formatear fecha
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
      <h2 className="text-xl font-semibold mb-4">Reservas recibidas</h2>

      {bookings.length === 0 ? (
        <p className="text-gray-600">No hay reservas pendientes.</p>
      ) : (
        <ul className="space-y-4">
          {bookings.map((booking) => (
            <li
              key={booking.id}
              className="p-4 border rounded flex justify-between items-start bg-gray-50"
            >
              <div className="flex-1">
                <div className="mb-3">
                  <p className="font-semibold text-gray-900">
                    <strong>Pasajero:</strong> {booking.passengerInfo?.name || 'No disponible'}
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Teléfono:</strong> {booking.passengerInfo?.phone || 'No disponible'}
                  </p>
                </div>

                {/* ✅ AGREGADO: Mostrar fecha del viaje reservado */}
                {booking.trip && (
                  <div className="mb-3 p-2 bg-blue-50 rounded border border-blue-200">
                    <div className="flex items-center text-sm text-blue-800 mb-1">
                      <Calendar className="h-4 w-4 mr-1" />
                      <span className="font-medium">Viaje reservado:</span>
                    </div>
                    <p className="text-sm text-blue-700">
                      <strong>Fecha:</strong> {formatDate(booking.trip.departureDate)}
                    </p>
                    <p className="text-sm text-blue-700">
                      <strong>Hora:</strong> {booking.trip.departureTime}
                    </p>
                    <p className="text-sm text-blue-700">
                      <strong>Ruta:</strong> {booking.trip.origin} → {booking.trip.destination}
                    </p>
                  </div>
                )}

                <div className="space-y-1">
                  <p className="text-sm text-gray-600">
                    <strong>Asientos solicitados:</strong> {booking.seats}
                  </p>
                  <p className="text-sm">
                    <strong>Estado:</strong>{' '}
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      booking.status === 'accepted' ? 'bg-green-100 text-green-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {booking.status === 'pending' && '⏳ Pendiente'}
                      {booking.status === 'accepted' && '✅ Aceptada'}
                      {booking.status === 'rejected' && '❌ Rechazada'}
                    </span>
                  </p>
                </div>
              </div>

              {booking.status === 'pending' && (
                <div className="flex flex-col gap-2 ml-4">
                  <button
                    onClick={() => updateBookingStatus(booking.id, 'accepted')}
                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
                  >
                    Aceptar
                  </button>
                  <button
                    onClick={() => updateBookingStatus(booking.id, 'rejected')}
                    className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
                  >
                    Rechazar
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ReceivedBookings;