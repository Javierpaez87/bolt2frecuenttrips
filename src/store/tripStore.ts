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
  writeBatch,
} from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { Trip, Booking, TripFilters, RecurringTripGroup } from '../types';

interface TripState {
  trips: Trip[];
  myTrips: Trip[];
  myBookings: Booking[];
  filteredTrips: Trip[];
  recurringGroups: RecurringTripGroup[];
  myRecurringGroups: RecurringTripGroup[];
  isLoading: boolean;
  error: string | null;
  createTrip: (tripData: any) => Promise<Trip>;
  fetchTrips: () => Promise<void>;
  fetchMyTrips: () => Promise<void>;
  fetchMyBookings: () => Promise<void>;
  fetchBookingsForMyTrips: () => Promise<void>;
  fetchRecurringGroups: () => Promise<void>;
  fetchMyRecurringGroups: () => Promise<void>;
  filterTrips: (filters: TripFilters) => void;
  bookTrip: (tripId: string, seats: number) => Promise<void>;
  deleteTrip: (tripId: string) => Promise<void>;
  deleteRecurringGroup: (recurrenceId: string) => Promise<void>;
}

// Función helper para crear fecha local desde string YYYY-MM-DD
const createLocalDate = (dateString: string): Date => {
  try {
    if (!dateString || typeof dateString !== 'string') {
      console.error('createLocalDate: dateString inválido:', dateString);
      return new Date();
    }

    const parts = dateString.split('-');
    if (parts.length !== 3) {
      console.error('createLocalDate: formato de fecha inválido:', dateString);
      return new Date();
    }

    const [year, month, day] = parts.map(Number);
    
    // Validar que los números sean válidos
    if (isNaN(year) || isNaN(month) || isNaN(day)) {
      console.error('createLocalDate: partes de fecha inválidas:', { year, month, day });
      return new Date();
    }

    // Validar rangos
    if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) {
      console.error('createLocalDate: valores fuera de rango:', { year, month, day });
      return new Date();
    }

    const date = new Date(year, month - 1, day); // month - 1 porque Date usa 0-indexado
    
    // Verificar que la fecha sea válida
    if (isNaN(date.getTime())) {
      console.error('createLocalDate: fecha resultante inválida:', date);
      return new Date();
    }

    return date;
  } catch (error) {
    console.error('createLocalDate: error procesando fecha:', error, dateString);
    return new Date();
  }
};

// Función helper para convertir fecha string a Timestamp SIN problemas de timezone
const convertDateToTimestamp = (dateInput: string | Date): Timestamp => {
  try {
    if (typeof dateInput === 'string') {
      const date = createLocalDate(dateInput);
      return Timestamp.fromDate(date);
    } else if (dateInput instanceof Date) {
      // Verificar que la fecha sea válida
      if (isNaN(dateInput.getTime())) {
        console.error('convertDateToTimestamp: fecha Date inválida:', dateInput);
        return Timestamp.fromDate(new Date());
      }
      return Timestamp.fromDate(dateInput);
    } else {
      console.error('convertDateToTimestamp: tipo de entrada inválido:', typeof dateInput, dateInput);
      return Timestamp.fromDate(new Date());
    }
  } catch (error) {
    console.error('convertDateToTimestamp: error:', error, dateInput);
    return Timestamp.fromDate(new Date());
  }
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

    // Verificar que la fecha sea válida
    if (isNaN(departureDate.getTime())) {
      console.warn('Fecha inválida generada:', departureDate, 'para documento:', doc.id);
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

// Generar ID único robusto para viajes recurrentes
const generateRecurrenceId = (origin: string, destination: string, time: string, startDate: string): string => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  const hash = btoa(`${origin}-${destination}-${time}-${startDate}`).substring(0, 8);
  return `REC_${hash}_${timestamp}_${random}`.toUpperCase();
};

// Generar ID único para viajes individuales
const generateTripId = (): string => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `TRIP_${timestamp}_${random}`.toUpperCase();
};

// Obtener el próximo día de la semana para un viaje recurrente
const getNextTripDate = (recurrenceDays: string[], startDate: string): Date => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const start = createLocalDate(startDate);
    
    // Si la fecha de inicio es futura, usar esa fecha
    if (start > today) {
      const startDayName = start.toLocaleDateString('es-AR', { weekday: 'long' }).toLowerCase();
      if (recurrenceDays.includes(startDayName)) {
        return start;
      }
    }
    
    // Buscar el próximo día de la semana que coincida
    for (let i = 0; i < 14; i++) { // Buscar en las próximas 2 semanas
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() + i);
      
      const dayName = checkDate.toLocaleDateString('es-AR', { weekday: 'long' }).toLowerCase();
      
      if (recurrenceDays.includes(dayName) && checkDate >= start) {
        return checkDate;
      }
    }
    
    return start; // Fallback
  } catch (error) {
    console.error('getNextTripDate: error:', error);
    return new Date();
  }
};

// 🔧 CORREGIDO: Generar fechas de viajes individuales para un patrón recurrente
const generateRecurringTripDates = (
  recurrenceDays: string[],
  startDate: string,
  endDate?: string,
  publishDaysBefore: number = 0
): Date[] => {
  try {
    const dates: Date[] = [];
    const start = createLocalDate(startDate);
    const end = endDate ? createLocalDate(endDate) : new Date(start.getFullYear() + 1, start.getMonth(), start.getDate());
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    console.log('🔧 generateRecurringTripDates:', {
      recurrenceDays,
      startDate,
      endDate,
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
      today: today.toISOString().split('T')[0]
    });
    
    let current = new Date(start);
    let iterations = 0;
    const maxIterations = 1000; // Prevenir loops infinitos
    
    while (current <= end && iterations < maxIterations) {
      const dayName = current.toLocaleDateString('es-AR', { weekday: 'long' }).toLowerCase();
      
      if (recurrenceDays.includes(dayName)) {
        // 🔧 CORREGIDO: Solo agregar si la fecha es hoy o futura (sin considerar publishDaysBefore para la fecha del viaje)
        if (current >= today) {
          dates.push(new Date(current));
          console.log('✅ Fecha agregada:', current.toISOString().split('T')[0], 'día:', dayName);
        }
      }
      
      current.setDate(current.getDate() + 1);
      iterations++;
    }
    
    if (iterations >= maxIterations) {
      console.warn('generateRecurringTripDates: se alcanzó el límite máximo de iteraciones');
    }
    
    console.log('🔧 Fechas generadas:', dates.map(d => d.toISOString().split('T')[0]));
    return dates;
  } catch (error) {
    console.error('generateRecurringTripDates: error:', error);
    return [];
  }
};

// Función para procesar grupos recurrentes
const processRecurringGroup = (trips: Trip[]): RecurringTripGroup[] => {
  const groups = new Map<string, RecurringTripGroup>();

  trips.forEach(trip => {
    if (trip.isRecurring && trip.recurrenceId) {
      if (!groups.has(trip.recurrenceId)) {
        const nextTripDate = getNextTripDate(
          trip.recurrenceDays || [],
          trip.recurrenceStartDate || ''
        );

        groups.set(trip.recurrenceId, {
          id: trip.recurrenceId,
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
    }
  });

  return Array.from(groups.values());
};

export const useTripStore = create<TripState>((set, get) => ({
  trips: [],
  myTrips: [],
  myBookings: [],
  filteredTrips: [],
  recurringGroups: [],
  myRecurringGroups: [],
  isLoading: false,
  error: null,

  createTrip: async (tripData) => {
    set({ isLoading: true, error: null });
    try {
      const db = getFirestore();
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) throw new Error('No estás autenticado');

      console.log('📦 tripData recibido:', tripData);

      const isRecurrent = tripData.isRecurring && tripData.recurrenceDays?.length > 0;

      if (isRecurrent) {
        // 🔧 CORREGIDO: Crear viajes recurrentes con fechas correctas
        console.log('🔄 Creando viaje recurrente...');
        
        const recurrenceId = generateRecurrenceId(
          tripData.origin,
          tripData.destination,
          tripData.departureTime,
          tripData.recurrenceStartDate
        );

        const dates = generateRecurringTripDates(
          tripData.recurrenceDays,
          tripData.recurrenceStartDate,
          tripData.recurrenceEndDate,
          tripData.publishDaysBefore || 0
        );

        if (dates.length === 0) {
          throw new Error('No se generaron fechas válidas para el viaje recurrente');
        }

        console.log('📅 Fechas a crear:', dates.map(d => d.toISOString().split('T')[0]));

        // Crear batch correctamente
        const batch = writeBatch(db);
        const createdTrips: Trip[] = [];

        for (const date of dates) {
          const tripId = generateTripId();
          
          // 🔧 CORREGIDO: Usar la fecha específica generada, NO la fecha actual
          const fullTrip = {
            ...tripData,
            departureDate: convertDateToTimestamp(date), // ✅ Usar la fecha del bucle
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

          const tripRef = doc(db, 'Post Trips', tripId);
          batch.set(tripRef, fullTrip);

          createdTrips.push({
            id: tripId,
            ...fullTrip,
            departureDate: date, // ✅ Usar la fecha del bucle
            createdAt: new Date(),
          });
        }

        await batch.commit();
        console.log('✅ Viajes recurrentes creados:', createdTrips.length);

        set((state) => ({
          trips: [...state.trips, ...createdTrips],
          myTrips: [...state.myTrips, ...createdTrips],
          isLoading: false,
        }));

        return createdTrips[0]; // Retornar el primer viaje creado
      } else {
        // Crear viaje individual
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
      console.error('❌ Error al crear viaje:', error);
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

      // Procesar grupos recurrentes
      const recurringGroups = processRecurringGroup(trips.filter(t => t.isRecurring));
      
      // Para la vista de búsqueda, mostrar solo viajes individuales + próximo viaje de cada grupo recurrente
      const individualTrips = trips.filter(t => !t.isRecurring);
      const nextRecurringTrips: Trip[] = [];

      recurringGroups.forEach(group => {
        const groupTrips = trips.filter(t => t.recurrenceId === group.id);
        const nextTrip = groupTrips
          .filter(t => t.departureDate >= today)
          .sort((a, b) => a.departureDate.getTime() - b.departureDate.getTime())[0];
        
        if (nextTrip) {
          nextRecurringTrips.push(nextTrip);
        }
      });

      const displayTrips = [...individualTrips, ...nextRecurringTrips];

      set({ 
        trips, 
        filteredTrips: displayTrips, 
        recurringGroups,
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
      const myRecurringGroups = processRecurringGroup(myTrips.filter(t => t.isRecurring));

      set({ myTrips, myRecurringGroups, isLoading: false });
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

      // Verificar que user.uid no sea undefined antes de usarlo en where()
      if (!user.uid) {
        throw new Error('UID de usuario no disponible');
      }

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
            if (bookingData.passengerId) {
              const passengerRef = doc(db, 'users', bookingData.passengerId);
              const passengerSnap = await getDoc(passengerRef);
              if (passengerSnap.exists()) {
                const passengerData = passengerSnap.data();
                passengerInfo = {
                  name: passengerData.name || '',
                  phone: passengerData.phone || '',
                };
              }
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

  fetchRecurringGroups: async () => {
    // Esta función se llama desde fetchTrips, no necesita implementación separada
  },

  fetchMyRecurringGroups: async () => {
    // Esta función se llama desde fetchMyTrips, no necesita implementación separada
  },

  filterTrips: (filters: TripFilters) => {
    const allTrips = get().filteredTrips; // Usar filteredTrips que ya tiene la lógica de mostrar solo próximos
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

      const bookingData = {
        tripId,
        passengerId: user.uid,
        seats,
        status: 'pending',
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'Bookings'), bookingData);
      set({ isLoading: false });
    } catch (error) {
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
      }));
    } catch (error) {
      console.error("Error al eliminar el viaje:", error);
      throw error;
    }
  },

  deleteRecurringGroup: async (recurrenceId: string) => {
    const db = getFirestore();
    try {
      // Obtener todos los viajes del grupo recurrente
      const q = query(collection(db, 'Post Trips'), where('recurrenceId', '==', recurrenceId));
      const snapshot = await getDocs(q);

      // Eliminar todos los viajes del grupo usando batch
      const batch = writeBatch(db);
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      await batch.commit();

      // Actualizar el estado local
      set((state) => ({
        myTrips: state.myTrips.filter((trip) => trip.recurrenceId !== recurrenceId),
        myRecurringGroups: state.myRecurringGroups.filter((group) => group.id !== recurrenceId),
        trips: state.trips.filter((trip) => trip.recurrenceId !== recurrenceId),
      }));
    } catch (error) {
      console.error("Error al eliminar el grupo recurrente:", error);
      throw error;
    }
  },
}));