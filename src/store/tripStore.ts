import { create } from 'zustand';
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  Timestamp,
  serverTimestamp,
  doc,
  getDoc,
  deleteDoc,
  DocumentData,
  updateDoc,
} from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { Trip, Booking, TripFilters, RecurringTripGroup } from '../types';

interface TripState {
  trips: Trip[];
  myTrips: Trip[];
  myBookings: Booking[];
  myRecurringGroups: RecurringTripGroup[];
  filteredTrips: Trip[];
  recurringGroups: RecurringTripGroup[];
  isLoading: boolean;
  error: string | null;
  createTrip: (tripData: any) => Promise<Trip>;
  fetchTrips: () => Promise<void>;
  fetchMyTrips: () => Promise<void>;
  fetchMyBookings: () => Promise<void>;
  fetchBookingsForMyTrips: () => Promise<void>;
  filterTrips: (filters: TripFilters) => void;
  bookTrip: (tripId: string, seats: number) => Promise<void>;
  deleteTrip: (tripId: string) => Promise<void>;
  deleteRecurringGroup: (recurrenceId: string) => Promise<void>;
  clearFilteredTrips: () => void;
  cancelBooking: (bookingId: string) => Promise<void>;
}

// Función helper para convertir fecha string a Timestamp SIN problemas de timezone
const convertDateToTimestamp = (dateInput: string | Date): Timestamp => {
  if (typeof dateInput === 'string') {
    // Si es string en formato YYYY-MM-DD, crear fecha local y luego convertir a Timestamp
    const [year, month, day] = dateInput.split('-').map(Number);
    const date = new Date(year, month - 1, day); // month - 1 porque Date usa 0-indexado
    return Timestamp.fromDate(date);
  } else {
    // Si ya es Date, convertir directamente
    return Timestamp.fromDate(dateInput);
  }
};

// Función helper para crear fecha local desde string YYYY-MM-DD
const createLocalDate = (dateString: string): Date => {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day); // month - 1 porque Date usa 0-indexado
};

// Función helper para procesar datos de viaje desde Firestore
const processFirestoreTrip = (doc: any, data: DocumentData): Trip | null => {
  try {
    let departureDate: Date;

    // Manejar diferentes formatos de fecha
    if (data.departureDate) {
      if (typeof data.departureDate.toDate === 'function') {
        // Es un Timestamp de Firestore
        departureDate = data.departureDate.toDate();
      } else if (typeof data.departureDate === 'string') {
        // Es un string, convertir a Date local
        departureDate = createLocalDate(data.departureDate);
      } else if (data.departureDate instanceof Date) {
        // Ya es un Date
        departureDate = data.departureDate;
      } else {
        console.warn('Formato de fecha no reconocido:', data.departureDate);
        return null;
      }
    } else {
      console.warn('No se encontró departureDate en el documento:', doc.id);
      return null;
    }

    return {
      id: doc.id,
      ...data,
      departureDate,
      createdAt: data.createdAt?.toDate?.() || new Date(),
      driver: {
        ...data.driver,
        phone: data.driver?.phone || '',
        profilePicture: data.driver?.profilePicture || '',
      },
    } as Trip;
  } catch (error) {
    console.error('Error procesando viaje:', error, data);
    return null;
  }
};

// Función helper para obtener próxima fecha de viaje recurrente
const getNextTripDate = (recurrenceDays: string[], startDate: string): Date => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const [year, month, day] = startDate.split('-').map(Number);
  const start = new Date(year, month - 1, day);
  
  if (start > today) {
    const startDayName = start.toLocaleDateString('es-AR', { weekday: 'long' }).toLowerCase();
    if (recurrenceDays.includes(startDayName)) {
      return start;
    }
  }
  
  const daysOfWeek = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  
  for (let i = 0; i < 14; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(today.getDate() + i);
    
    const dayName = checkDate.toLocaleDateString('es-AR', { weekday: 'long' }).toLowerCase();
    
    if (recurrenceDays.includes(dayName) && checkDate >= start) {
      return checkDate;
    }
  }
  
  return start;
};

export const useTripStore = create<TripState>((set, get) => ({
  trips: [],
  myTrips: [],
  myBookings: [],
  myRecurringGroups: [],
  filteredTrips: [],
  recurringGroups: [],
  isLoading: false,
  error: null,

  createTrip: async (tripData) => {
    set({ isLoading: true, error: null });
    try {
      const db = getFirestore();
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) throw new Error('No estás autenticado');

      console.log('📦 Creando viaje con datos:', tripData);

      // Si es viaje recurrente, generar múltiples viajes
      if (tripData.isRecurring && tripData.recurrenceDays?.length > 0) {
        const { recurrenceStartDate, recurrenceEndDate, recurrenceDays } = tripData;
        
        if (!recurrenceStartDate) {
          throw new Error('Fecha de inicio requerida para viajes recurrentes');
        }

        const start = new Date(recurrenceStartDate);
        const end = recurrenceEndDate ? new Date(recurrenceEndDate) : new Date(start.getFullYear() + 1, start.getMonth(), start.getDate());
        const recurrenceId = `${tripData.origin}-${tripData.destination}-${recurrenceStartDate}-${Date.now()}`;

        const viajesGenerados = [];
        let current = new Date(start);

        while (current <= end) {
          const diaSemana = current.toLocaleDateString('es-AR', {
            weekday: 'long',
          }).toLowerCase();

          if (recurrenceDays.includes(diaSemana)) {
            const fechaFormateada = current.toISOString().split('T')[0];
            
            // 🔧 CORREGIDO: Usar la fecha específica del viaje, no departureDate del formulario
            const departureDateTimestamp = convertDateToTimestamp(fechaFormateada);

            const fullTrip = {
              ...tripData,
              departureDate: departureDateTimestamp, // 🔧 Usar la fecha específica generada
              driverId: user.uid,
              status: 'active',
              createdAt: serverTimestamp(),
              isRecurring: true,
              recurrenceId,
              driver: {
                id: user.uid,
                name: user.displayName || '',
                email: user.email || '',
                phone: tripData.phone || '',
                profilePicture: user.photoURL || '',
              },
            };

            console.log('🔧 Creando viaje recurrente para fecha:', fechaFormateada, 'día:', diaSemana);

            const docRef = await addDoc(collection(db, 'Post Trips'), fullTrip);
            
            const trip: Trip = {
              id: docRef.id,
              ...fullTrip,
              departureDate: departureDateTimestamp.toDate(),
              createdAt: new Date(),
            };

            viajesGenerados.push(trip);
          }

          current.setDate(current.getDate() + 1);
        }

        console.log('🔧 Viajes recurrentes generados:', viajesGenerados.length);

        // Actualizar estado con los nuevos viajes
        set((state) => ({
          trips: [...state.trips, ...viajesGenerados],
          myTrips: [...state.myTrips, ...viajesGenerados],
          isLoading: false,
        }));

        // Refrescar grupos recurrentes
        get().fetchTrips();

        return viajesGenerados[0] || ({} as Trip);
      } else {
        // Viaje individual
        if (!tripData.departureDate) {
          throw new Error('Fecha de salida requerida para viajes individuales');
        }

        const departureDateTimestamp = convertDateToTimestamp(tripData.departureDate);

        const fullTrip = {
          ...tripData,
          departureDate: departureDateTimestamp,
          driverId: user.uid,
          status: 'active',
          createdAt: serverTimestamp(),
          isRecurring: false,
          driver: {
            id: user.uid,
            name: user.displayName || '',
            email: user.email || '',
            phone: tripData.phone || '',
            profilePicture: user.photoURL || '',
          },
        };

        const docRef = await addDoc(collection(db, 'Post Trips'), fullTrip);

        const trip: Trip = {
          id: docRef.id,
          ...fullTrip,
          departureDate: departureDateTimestamp.toDate(),
          createdAt: new Date(),
        };

        set((state) => ({
          trips: [...state.trips, trip],
          myTrips: [...state.myTrips, trip],
          filteredTrips: [...state.filteredTrips, trip],
          isLoading: false,
        }));

        return trip;
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Error al crear viaje',
        isLoading: false,
      });
      throw error;
    }
  },

  fetchTrips: async () => {
    set({ isLoading: true, error: null });
    try {
      const db = getFirestore();
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const allDocsSnapshot = await getDocs(collection(db, 'Post Trips'));

      const trips: Trip[] = allDocsSnapshot.docs
        .map((doc) => {
          const data = doc.data() as DocumentData;
          return processFirestoreTrip(doc, data);
        })
        .filter((trip): trip is Trip => {
          if (!trip) return false;
          
          // Filtrar solo viajes futuros con asientos disponibles
          return trip.departureDate >= today && trip.availableSeats > 0;
        });

      // 🔧 CORREGIDO: Procesar grupos recurrentes con mejor lógica
      const recurringGroups = new Map<string, RecurringTripGroup>();
      
      trips
        .filter(trip => trip.isRecurring && trip.recurrenceId)
        .forEach(trip => {
          const groupId = trip.recurrenceId!;
          
          if (!recurringGroups.has(groupId)) {
            // Calcular próxima fecha basada en los viajes disponibles del grupo
            const groupTrips = trips.filter(t => t.recurrenceId === groupId && t.availableSeats > 0);
            const nextAvailableTrip = groupTrips.sort((a, b) => a.departureDate.getTime() - b.departureDate.getTime())[0];
            
            if (nextAvailableTrip) {
              recurringGroups.set(groupId, {
                id: groupId,
                driverId: trip.driverId,
                driver: trip.driver,
                origin: trip.origin,
                destination: trip.destination,
                departureTime: trip.departureTime,
                availableSeats: trip.availableSeats,
                price: trip.price,
                description: trip.description,
                carModel: trip.carModel,
                carColor: trip.carColor,
                recurrenceDays: trip.recurrenceDays || [],
                recurrenceStartDate: trip.recurrenceStartDate || '',
                recurrenceEndDate: trip.recurrenceEndDate,
                publishDaysBefore: trip.publishDaysBefore || 0,
                nextTripDate: nextAvailableTrip.departureDate, // 🔧 Usar fecha del próximo viaje real
                createdAt: trip.createdAt,
                status: trip.status,
              });
            }
          }
        });

      console.log('🔧 Grupos recurrentes procesados:', recurringGroups.size);
      console.log('🔧 Viajes totales cargados:', trips.length);

      set({ 
        trips, 
        filteredTrips: trips, 
        recurringGroups: Array.from(recurringGroups.values()),
        isLoading: false 
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Error al obtener viajes',
        isLoading: false,
      });
    }
  },

  fetchMyTrips: async () => {
    set({ isLoading: true, error: null });
    try {
      const db = getFirestore();
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) throw new Error('No estás autenticado');

      const q = query(collection(db, 'Post Trips'), where('driverId', '==', user.uid));
      const snapshot = await getDocs(q);

      const myTrips: Trip[] = snapshot.docs
        .map((doc) => {
          const data = doc.data() as DocumentData;
          return processFirestoreTrip(doc, data);
        })
        .filter((trip): trip is Trip => trip !== null);

      // Procesar mis grupos recurrentes
      const myRecurringGroups = new Map<string, RecurringTripGroup>();
      
      myTrips
        .filter(trip => trip.isRecurring && trip.recurrenceId)
        .forEach(trip => {
          if (!myRecurringGroups.has(trip.recurrenceId!)) {
            const nextTripDate = getNextTripDate(
              trip.recurrenceDays || [],
              trip.recurrenceStartDate || ''
            );

            myRecurringGroups.set(trip.recurrenceId!, {
              id: trip.recurrenceId!,
              driverId: trip.driverId,
              driver: trip.driver,
              origin: trip.origin,
              destination: trip.destination,
              departureTime: trip.departureTime,
              availableSeats: trip.availableSeats,
              price: trip.price,
              description: trip.description,
              carModel: trip.carModel,
              carColor: trip.carColor,
              recurrenceDays: trip.recurrenceDays || [],
              recurrenceStartDate: trip.recurrenceStartDate || '',
              recurrenceEndDate: trip.recurrenceEndDate,
              publishDaysBefore: trip.publishDaysBefore || 0,
              nextTripDate,
              createdAt: trip.createdAt,
              status: trip.status,
            });
          }
        });

      set({ 
        myTrips, 
        myRecurringGroups: Array.from(myRecurringGroups.values()),
        isLoading: false 
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Error al obtener mis viajes',
        isLoading: false,
      });
    }
  },

  fetchMyBookings: async () => {
    set({ isLoading: true, error: null });

    const auth = getAuth();
    return new Promise<void>((resolve) => {
      onAuthStateChanged(auth, async (user) => {
        if (!user) {
          console.error('⚠️ Usuario no autenticado en fetchMyBookings');
          set({ myBookings: [], error: 'Usuario no autenticado.', isLoading: false });
          return resolve();
        }

        try {
          const db = getFirestore();
          const q = query(collection(db, 'Bookings'), where('passengerId', '==', user.uid));
          const snapshot = await getDocs(q);

          const bookings: Booking[] = [];

          for (const docSnap of snapshot.docs) {
            const data = docSnap.data() as DocumentData;

            let trip = null;
            if (data.tripId) {
              const tripRef = doc(db, 'Post Trips', data.tripId);
              const tripSnap = await getDoc(tripRef);
              if (tripSnap.exists()) {
                const tripData = tripSnap.data();
                trip = processFirestoreTrip(tripSnap, tripData);
              }
            }

            bookings.push({
              id: docSnap.id,
              ...data,
              createdAt: data.createdAt?.toDate?.() || new Date(),
              trip,
            });
          }

          console.log('📦 fetchMyBookings:', bookings);
          set({ myBookings: bookings, isLoading: false });
          resolve();
        } catch (error) {
          console.error('❌ Error en fetchMyBookings:', error);
          set({
            error: error instanceof Error ? error.message : 'Error al obtener reservas',
            isLoading: false,
          });
          resolve();
        }
      });
    });
  },

  fetchBookingsForMyTrips: async () => {
    set({ isLoading: true, error: null });

    try {
      const db = getFirestore();
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) throw new Error('No estás autenticado');

      const tripsQuery = query(collection(db, 'Post Trips'), where('driverId', '==', user.uid));
      const tripsSnapshot = await getDocs(tripsQuery);

      const allBookings: Booking[] = [];

      for (const tripDoc of tripsSnapshot.docs) {
        const tripId = tripDoc.id;

        const bookingsQuery = query(collection(db, 'Bookings'), where('tripId', '==', tripId));
        const bookingsSnapshot = await getDocs(bookingsQuery);

        for (const bookingDoc of bookingsSnapshot.docs) {
          const bookingData = bookingDoc.data();
          let passengerInfo = { name: '', phone: '' };

          try {
            const passengerRef = doc(db, 'users', bookingData.passengerId);
            const passengerSnap = await getDoc(passengerRef);
            if (passengerSnap.exists()) {
              const passengerData = passengerSnap.data();
              passengerInfo = {
                name: passengerData.name || '',
                phone: passengerData.phone || '',
              };
            }
          } catch (e) {
            console.error('Error obteniendo datos del pasajero:', e);
          }

          allBookings.push({
            id: bookingDoc.id,
            ...bookingData,
            passengerInfo,
            createdAt: bookingData.createdAt?.toDate?.() || new Date(),
          } as Booking);
        }
      }

      set({ myBookings: allBookings, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Error al obtener reservas de mis viajes',
        isLoading: false,
      });
    }
  },

  filterTrips: (filters: TripFilters) => {
    const allTrips = get().trips;
    const filtered = allTrips.filter((trip) => {
      const matchesOrigin = filters.origin
        ? trip.origin.toLowerCase().includes(filters.origin.toLowerCase())
        : true;
      const matchesDestination = filters.destination
        ? trip.destination.toLowerCase().includes(filters.destination.toLowerCase())
        : true;
      return matchesOrigin && matchesDestination;
    });
    set({ filteredTrips: filtered });
  },

  bookTrip: async (tripId: string, seats: number) => {
    set({ isLoading: true, error: null });
    try {
      const db = getFirestore();
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) throw new Error('No estás autenticado');

      console.log('🔧 Reservando viaje:', tripId, 'asientos:', seats);

      // 🔧 CORREGIDO: Verificar que el viaje existe y tiene asientos disponibles
      const tripRef = doc(db, 'Post Trips', tripId);
      const tripSnap = await getDoc(tripRef);
      
      if (!tripSnap.exists()) {
        throw new Error('El viaje no existe');
      }

      const tripData = tripSnap.data();
      if (tripData.availableSeats < seats) {
        throw new Error('No hay suficientes asientos disponibles');
      }

      // Crear la reserva
      const bookingData = {
        tripId,
        passengerId: user.uid,
        seats,
        status: 'pending',
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'Bookings'), bookingData);

      // 🔧 CORREGIDO: Actualizar asientos disponibles inmediatamente
      const newAvailableSeats = tripData.availableSeats - seats;
      await updateDoc(tripRef, {
        availableSeats: newAvailableSeats
      });

      console.log('✅ Reserva creada y asientos actualizados');

      set({ isLoading: false });
    } catch (error) {
      console.error('❌ Error al reservar:', error);
      set({
        error: error instanceof Error ? error.message : 'Error al reservar viaje',
        isLoading: false,
      });
      throw error;
    }
  },

  deleteTrip: async (tripId: string) => {
    const db = getFirestore();
    try {
      await deleteDoc(doc(db, 'Post Trips', tripId));
      set((state) => ({
        myTrips: state.myTrips.filter((trip) => trip.id !== tripId),
        trips: state.trips.filter((trip) => trip.id !== tripId),
        filteredTrips: state.filteredTrips.filter((trip) => trip.id !== tripId),
      }));
    } catch (error) {
      console.error("Error al eliminar el viaje:", error);
      throw error;
    }
  },

  deleteRecurringGroup: async (recurrenceId: string) => {
    const db = getFirestore();
    try {
      // Obtener todos los viajes con el mismo recurrenceId
      const q = query(collection(db, 'Post Trips'), where('recurrenceId', '==', recurrenceId));
      const snapshot = await getDocs(q);

      // Eliminar todos los viajes del grupo
      const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);

      // Actualizar estado local
      set((state) => ({
        myTrips: state.myTrips.filter((trip) => trip.recurrenceId !== recurrenceId),
        trips: state.trips.filter((trip) => trip.recurrenceId !== recurrenceId),
        filteredTrips: state.filteredTrips.filter((trip) => trip.recurrenceId !== recurrenceId),
        myRecurringGroups: state.myRecurringGroups.filter((group) => group.id !== recurrenceId),
        recurringGroups: state.recurringGroups.filter((group) => group.id !== recurrenceId),
      }));
    } catch (error) {
      console.error("Error al eliminar el grupo recurrente:", error);
      throw error;
    }
  },

  clearFilteredTrips: () => {
    const allTrips = get().trips;
    set({ filteredTrips: allTrips });
  },

  cancelBooking: async (bookingId: string) => {
    const db = getFirestore();
    try {
      await deleteDoc(doc(db, 'Bookings', bookingId));
      set((state) => ({
        myBookings: state.myBookings.filter((booking) => booking.id !== bookingId),
      }));
    } catch (error) {
      console.error("Error al cancelar la reserva:", error);
      throw error;
    }
  },
}));