import React, { useEffect, useState } from 'react';
import Header from './Header';
import Footer from './Footer';
import { useAuthStore } from '../../store/authStore';
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

// ✅ Toastify
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, isAuthenticated } = useAuthStore();
  const [hasPendingBookings, setHasPendingBookings] = useState(false);
  const [reservationStatus, setReservationStatus] = useState<'accepted' | 'rejected' | null>(null);
  const [showNotification, setShowNotification] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const db = getFirestore();

    const fetchNotifications = async () => {
      if (!isAuthenticated || !user) return;

      try {
        // Conductor: check for pending bookings
        const tripsSnapshot = await getDocs(
          query(collection(db, 'Post Trips'), where('driverId', '==', user.uid))
        );

        const tripIds = tripsSnapshot.docs.map((doc) => doc.id);

        if (tripIds.length > 0) {
          const bookingsSnapshot = await getDocs(
            query(
              collection(db, 'Bookings'),
              where('tripId', 'in', tripIds),
              where('status', '==', 'pending')
            )
          );

          if (!bookingsSnapshot.empty) {
            setHasPendingBookings(true);
          }
        }

        // Pasajero: check for accepted or rejected bookings
        const passengerSnapshot = await getDocs(
          query(
            collection(db, 'Bookings'),
            where('passengerId', '==', user.uid),
            where('status', 'in', ['accepted', 'rejected'])
          )
        );

        if (!passengerSnapshot.empty) {
          const booking = passengerSnapshot.docs[0];
          const status = booking.data().status;
          if (status === 'accepted' || status === 'rejected') {
            setReservationStatus(status);
          }
        }
      } catch (error) {
        console.error('Error al verificar notificaciones:', error);
      }
    };

    fetchNotifications();
  }, [isAuthenticated, user]);

  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      {showNotification && (
        <>
          {hasPendingBookings && (
            <div className="fixed top-4 left-4 right-4 md:left-auto md:right-4 z-50 bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-3 rounded shadow-md flex flex-col md:flex-row md:items-center md:justify-between">
              <div>🔔 Tienes nuevas reservas pendientes para tus viajes publicados.</div>
              <div className="flex justify-end mt-2 md:mt-0 md:ml-4">
                <button
                  onClick={() => {
                    navigate('/dashboard');
                    localStorage.setItem('dashboardTab', 'received');
                  }}
                  className="mr-2 px-3 py-1 text-sm font-medium rounded bg-yellow-300 hover:bg-yellow-400 text-yellow-900"
                >
                  Ver reservas
                </button>
                <button
                  onClick={() => setShowNotification(false)}
                  className="text-sm text-yellow-700 underline"
                >
                  Cerrar
                </button>
              </div>
            </div>
          )}

          {reservationStatus === 'accepted' && (
            <div className="fixed top-4 left-4 right-4 md:left-auto md:right-4 z-50 bg-green-100 border border-green-400 text-green-800 px-4 py-3 rounded shadow-md flex flex-col md:flex-row md:items-center md:justify-between">
              <div>✅ Tu reserva fue aceptada.</div>
              <div className="flex justify-end mt-2 md:mt-0 md:ml-4">
                <button
                  onClick={() => navigate('/dashboard')}
                  className="mr-2 px-3 py-1 text-sm font-medium rounded bg-green-300 hover:bg-green-400 text-green-900"
                >
                  Ver detalles
                </button>
                <button
                  onClick={() => setShowNotification(false)}
                  className="text-sm text-green-700 underline"
                >
                  Cerrar
                </button>
              </div>
            </div>
          )}

          {reservationStatus === 'rejected' && (
            <div className="fixed top-4 left-4 right-4 md:left-auto md:right-4 z-50 bg-red-100 border border-red-400 text-red-800 px-4 py-3 rounded shadow-md flex flex-col md:flex-row md:items-center md:justify-between">
              <div>❌ Tu reserva fue rechazada.</div>
              <div className="flex justify-end mt-2 md:mt-0 md:ml-4">
                <button
                  onClick={() => navigate('/dashboard')}
                  className="mr-2 px-3 py-1 text-sm font-medium rounded bg-red-300 hover:bg-red-400 text-red-900"
                >
                  Ver detalles
                </button>
                <button
                  onClick={() => setShowNotification(false)}
                  className="text-sm text-red-700 underline"
                >
                  Cerrar
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <main className="flex-grow">{children}</main>
      <Footer />

      {/* ✅ Contenedor de toasts para todo el sitio */}
      <ToastContainer position="top-center" autoClose={3000} />
    </div>
  );
};

export default Layout;
