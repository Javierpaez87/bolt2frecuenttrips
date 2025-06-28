import React from 'react';
import {
  getFirestore,
  updateDoc,
  doc,
  getDoc,
} from 'firebase/firestore';
import { Booking } from '../types';

interface Props {
  bookings: Booking[];
}

const ReceivedBookings: React.FC<Props> = ({ bookings }) => {
  const updateBookingStatus = async (
    bookingId: string,
    status: 'accepted' | 'rejected'
  ) => {
    const db = getFirestore();

    // Obtener la reserva
    const bookingRef = doc(db, 'Bookings', bookingId);
    const bookingSnap = await getDoc(bookingRef);

    if (!bookingSnap.exists()) return;

    const bookingData = bookingSnap.data();
    const { tripId, seats } = bookingData;

    // Si se acepta la reserva, actualizar asientos del viaje
    if (status === 'accepted') {
      const tripRef = doc(db, 'Post Trips', tripId);
      const tripSnap = await getDoc(tripRef);

      if (tripSnap.exists()) {
        const tripData = tripSnap.data();
        const currentSeats = tripData?.availableSeats ?? 0;
        const updatedSeats = currentSeats - seats;

        await updateDoc(tripRef, {
          availableSeats: updatedSeats > 0 ? updatedSeats : 0,
        });
      }
    }

    // Actualizar el estado de la reserva
    await updateDoc(bookingRef, { status });

    alert(`Reserva ${status === 'accepted' ? 'aceptada' : 'rechazada'} correctamente.`);
    // ⚠️ Si querés refrescar desde el padre, se debe llamar a fetchMyTrips()
  };

  return (
    <div className="p-4 bg-white rounded shadow-md">
      <h2 className="text-xl font-semibold mb-4">Reservas recibidas</h2>

      {bookings.length === 0 ? (
        <p>No hay reservas.</p>
      ) : (
        <ul className="space-y-4">
          {bookings.map((booking) => (
            <li
              key={booking.id}
              className="p-4 border rounded flex justify-between items-center bg-gray-50"
            >
              <div>
                <p><strong>Pasajero:</strong> {booking.passengerInfo?.name || 'No disponible'}</p>
                <p><strong>Teléfono:</strong> {booking.passengerInfo?.phone || 'No disponible'}</p>
                <p><strong>Asientos solicitados:</strong> {booking.seats}</p>
                <p>
                  <strong>Estado:</strong>{' '}
                  {booking.status === 'pending' && '⏳ Pendiente'}
                  {booking.status === 'accepted' && '✅ Aceptada'}
                  {booking.status === 'rejected' && '❌ Rechazada'}
                </p>
              </div>

              {booking.status === 'pending' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => updateBookingStatus(booking.id, 'accepted')}
                    className="bg-green-600 text-white px-3 py-1 rounded"
                  >
                    Aceptar
                  </button>
                  <button
                    onClick={() => updateBookingStatus(booking.id, 'rejected')}
                    className="bg-red-500 text-white px-3 py-1 rounded"
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
