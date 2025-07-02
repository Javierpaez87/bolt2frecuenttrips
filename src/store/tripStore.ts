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
import { Trip, Booking, TripFilters, RecurringTripGroup, PassengerRequest, DriverOffer } from '../types';
import { processFirestoreTrip, getNextTripDate, createLocalDate } from '../utils/recurringTrips';

interface TripState {
  trips: Trip[];
  myTrips: Trip[];
  myBookings: Booking[];
  myRecurringGroups: RecurringTripGroup[];
  filteredTrips: Trip[];
  recurringGroups: RecurringTripGroup[];
  
  // ✅ NUEVOS ESTADOS PARA SOLICITUDES DE PASAJEROS
  passengerRequests: PassengerRequest[];
  myPassengerRequests: PassengerRequest[];
  filteredPassengerRequests: PassengerRequest[];
  myDriverOffers: DriverOffer[];
  receivedDriverOffers: DriverOffer[];
  
  isLoading: boolean;
  error: string | null;
  
  // ✅ FUNCIONES EXISTENTES MANTENIDAS
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
  
  // ✅ NUEVAS FUNCIONES PARA SOLICITUDES DE PASAJEROS
  createPassengerRequest: (requestData: any) => Promise<PassengerRequest>;
  fetchPassengerRequests: () => Promise<void>;
  fetchMyPassengerRequests: () => Promise<void>;
  filterPassengerRequests: (filters: TripFilters) => void;
  createDriverOffer: (requestId: string, offerData: any) => Promise<DriverOffer>;
  fetchMyDriverOffers: () => Promise<void>;
  fetchReceivedDriverOffers: () => Promise<void>;
  deletePassengerRequest: (requestId: string) => Promise<void>;
}

// Función helper para convertir fecha string a Timestamp SIN problemas de timezone
const convertDateToTimestamp = (dateInput: string | Date): Timestamp => {
  if (typeof dateInput === 'string') {
    // 🔧 CORREGIDO: Usar createLocalDate para consistencia
    const date = createLocalDate(dateInput);
    return Timestamp.fromDate(date);
  } else {
    // Si ya es Date, convertir directamente
    return Timestamp.fromDate(dateInput);
  }
};

// ✅ NUEVA FUNCIÓN: Procesar solicitudes de pasajeros desde Firestore
const processFirestorePassengerRequest = (doc: any, data: DocumentData): PassengerRequest | null => {
  try {
    let departureDate: Date;

    console.log('🔧 processFirestorePassengerRequest INPUT:', {
      docId: doc.id,
      departureDateRaw: data.departureDate,
      departureDateType: typeof data.departureDate,
      hasToDate: typeof data.departureDate?.toDate === 'function',
      isRecurring: data.isRecurring
    });

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
        console.warn('Formato de fecha no reconocido en solicitud:', data.departureDate);
        return null;
      }
    } else {
      console.warn('No se encontró departureDate en la solicitud:', doc.id);
      return null;
    }

    const request = {
      id: doc.id,
      ...data,
      departureDate,
      createdAt: data.createdAt?.toDate?.() || new Date(),
      passenger: {
        ...data.passenger,
        phone: data.passenger?.phone || '',
        profilePicture: data.passenger?.profilePicture || '',
      },
    } as PassengerRequest;

    console.log('🔧 processFirestorePassengerRequest OUTPUT:', {
      requestId: request.id,
      isRecurring: request.isRecurring,
      departureDate: request.departureDate.toISOString().split('T')[0],
    });

    return request;
  } catch (error) {
    console.error('Error procesando solicitud de pasajero:', error, data);
    return null;
  }
};

export const useTripStore = create<TripState>((set, get) => ({
  trips: [],
  myTrips: [],
  myBookings: [],
  myRecurringGroups: [],
  filteredTrips: [],
  recurringGroups: [],
  
  // ✅ NUEVOS ESTADOS INICIALIZADOS
  passengerRequests: [],
  myPassengerRequests: [],
  filteredPassengerRequests: [],
  myDriverOffers: [],
  receivedDriverOffers: [],
  
  isLoading: false,
  error: null,

  // ✅ FUNCIÓN EXISTENTE MANTENIDA COMPLETA
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
        const { recurrenceStartDate, recurrenceEndDate, recurrenceDays, recurringDates } = tripData;
        
        if (!recurrenceStartDate) {
          throw new Error('Fecha de inicio requerida para viajes recurrentes');
        }

        // 🔧 CORREGIDO: Usar las fechas específicas generadas en CreateTrip
        const datesToCreate = recurringDates || [];
        
        if (datesToCreate.length === 0) {
          throw new Error('No se generaron fechas para el viaje recurrente');
        }

        const recurrenceId = `${tripData.origin}-${tripData.destination}-${recurrenceStartDate}-${Date.now()}`;
        const viajesGenerados = [];

        console.log('🔧 Creando viajes recurrentes para fechas:', datesToCreate);

        // 🔧 CORREGIDO: Crear un viaje por cada fecha específica
        for (const fechaString of datesToCreate) {
          const departureDateTimestamp = convertDateToTimestamp(fechaString);

          const fullTrip = {
            ...tripData,
            departureDate: departureDateTimestamp,
            driverId: user.uid,
            status: 'active',
            createdAt: serverTimestamp(),
            isRecurring: true,
            recurrenceId,
            tripType: 'driver_offer', // ✅ AGREGADO: Marcar como oferta de conductor
            driver: {
              id: user.uid,
              name: user.displayName || '',
              email: user.email || '',
              phone: tripData.phone || '',
              profilePicture: user.photoURL || '',
            },
          };

          console.log('🔧 Creando viaje recurrente para fecha:', fechaString);

          const docRef = await addDoc(collection(db, 'Post Trips'), fullTrip);
          
          const trip: Trip = {
            id: docRef.id,
            ...fullTrip,
            departureDate: departureDateTimestamp.toDate(),
            createdAt: new Date(),
          };

          viajesGenerados.push(trip);
        }

        console.log('✅ Viajes recurrentes generados:', viajesGenerados.length);

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
          tripType: 'driver_offer', // ✅ AGREGADO: Marcar como oferta de conductor
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

  // ✅ NUEVA FUNCIÓN: Crear solicitud de pasajero
  createPassengerRequest: async (requestData) => {
    set({ isLoading: true, error: null });
    try {
      const db = getFirestore();
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) throw new Error('No estás autenticado');

      console.log('📦 Creando solicitud de pasajero con datos:', requestData);

      // Si es solicitud recurrente, generar múltiples solicitudes
      if (requestData.isRecurring && requestData.recurrenceDays?.length > 0) {
        const { recurrenceStartDate, recurrenceEndDate, recurrenceDays, recurringDates } = requestData;
        
        if (!recurrenceStartDate) {
          throw new Error('Fecha de inicio requerida para solicitudes recurrentes');
        }

        const datesToCreate = recurringDates || [];
        
        if (datesToCreate.length === 0) {
          throw new Error('No se generaron fechas para la solicitud recurrente');
        }

        const recurrenceId = `req-${requestData.origin}-${requestData.destination}-${recurrenceStartDate}-${Date.now()}`;
        const solicitudesGeneradas = [];

        console.log('🔧 Creando solicitudes recurrentes para fechas:', datesToCreate);

        for (const fechaString of datesToCreate) {
          const departureDateTimestamp = convertDateToTimestamp(fechaString);

          const fullRequest = {
            ...requestData,
            departureDate: departureDateTimestamp,
            passengerId: user.uid,
            status: 'active',
            createdAt: serverTimestamp(),
            isRecurring: true,
            recurrenceId,
            passenger: {
              id: user.uid,
              name: user.displayName || '',
              email: user.email || '',
              phone: requestData.phone || '',
              profilePicture: user.photoURL || '',
            },
          };

          console.log('🔧 Creando solicitud recurrente para fecha:', fechaString);

          const docRef = await addDoc(collection(db, 'Passenger Requests'), fullRequest);
          
          const request: PassengerRequest = {
            id: docRef.id,
            ...fullRequest,
            departureDate: departureDateTimestamp.toDate(),
            createdAt: new Date(),
          };

          solicitudesGeneradas.push(request);
        }

        console.log('✅ Solicitudes recurrentes generadas:', solicitudesGeneradas.length);

        // Actualizar estado con las nuevas solicitudes
        set((state) => ({
          passengerRequests: [...state.passengerRequests, ...solicitudesGeneradas],
          myPassengerRequests: [...state.myPassengerRequests, ...solicitudesGeneradas],
          isLoading: false,
        }));

        // Refrescar solicitudes
        get().fetchPassengerRequests();

        return solicitudesGeneradas[0] || ({} as PassengerRequest);
      } else {
        // Solicitud individual
        if (!requestData.departureDate) {
          throw new Error('Fecha de salida requerida para solicitudes individuales');
        }

        const departureDateTimestamp = convertDateToTimestamp(requestData.departureDate);

        const fullRequest = {
          ...requestData,
          departureDate: departureDateTimestamp,
          passengerId: user.uid,
          status: 'active',
          createdAt: serverTimestamp(),
          isRecurring: false,
          passenger: {
            id: user.uid,
            name: user.displayName || '',
            email: user.email || '',
            phone: requestData.phone || '',
            profilePicture: user.photoURL || '',
          },
        };

        const docRef = await addDoc(collection(db, 'Passenger Requests'), fullRequest);

        const request: PassengerRequest = {
          id: docRef.id,
          ...fullRequest,
          departureDate: departureDateTimestamp.toDate(),
          createdAt: new Date(),
        };

        set((state) => ({
          passengerRequests: [...state.passengerRequests, request],
          myPassengerRequests: [...state.myPassengerRequests, request],
          filteredPassengerRequests: [...state.filteredPassengerRequests, request],
          isLoading: false,
        }));

        return request;
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Error al crear solicitud',
        isLoading: false,
      });
      throw error;
    }
  },

  // ✅ FUNCIÓN EXISTENTE MANTENIDA COMPLETA
  fetchTrips: async () => {
    set({ isLoading: true, error: null });
    try {
      const db = getFirestore();
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const allDocsSnapshot = await getDocs(collection(db, 'Post Trips'));

      const allTrips: Trip[] = allDocsSnapshot.docs
        .map((doc) => {
          const data = doc.data() as DocumentData;
          return processFirestoreTrip(doc, data);
        })
        .filter((trip): trip is Trip => {
          if (!trip) return false;
          
          // Filtrar solo viajes futuros con asientos disponibles
          return trip.departureDate >= today && trip.availableSeats > 0;
        });

      // 🔧 SIMPLIFICADO: Para viajes recurrentes, mostrar solo el próximo viaje de cada grupo
      const recurringGroups = new Map<string, Trip>();
      const individualTrips: Trip[] = [];

      allTrips.forEach(trip => {
        if (trip.isRecurring && trip.recurrenceId) {
          const existingTrip = recurringGroups.get(trip.recurrenceId);
          if (!existingTrip || trip.departureDate < existingTrip.departureDate) {
            // Guardar solo el viaje más próximo de cada grupo recurrente
            recurringGroups.set(trip.recurrenceId, trip);
          }
        } else {
          // Viajes individuales se muestran todos
          individualTrips.push(trip);
        }
      });

      // Combinar viajes individuales con próximos viajes recurrentes
      const finalTrips = [...individualTrips, ...Array.from(recurringGroups.values())];

      console.log('🔍 Viajes totales en Firebase:', allTrips.length);
      console.log('🔍 Viajes finales mostrados:', finalTrips.length);
      console.log('🔍 Viajes recurrentes únicos mostrados:', recurringGroups.size);

      // Procesar grupos recurrentes para el dashboard
      const recurringGroupsForDashboard = new Map<string, RecurringTripGroup>();
      
      allTrips
        .filter(trip => trip.isRecurring && trip.recurrenceId)
        .forEach(trip => {
          if (!recurringGroupsForDashboard.has(trip.recurrenceId!)) {
            const nextTripDate = getNextTripDate(
              trip.recurrenceDays || [],
              trip.recurrenceStartDate || ''
            );

            recurringGroupsForDashboard.set(trip.recurrenceId!, {
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
        trips: finalTrips, 
        filteredTrips: finalTrips, 
        recurringGroups: Array.from(recurringGroupsForDashboard.values()),
        isLoading: false 
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Error al obtener viajes',
        isLoading: false,
      });
    }
  },

  // ✅ NUEVA FUNCIÓN: Obtener solicitudes de pasajeros
  fetchPassengerRequests: async () => {
    set({ isLoading: true, error: null });
    try {
      const db = getFirestore();
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const allDocsSnapshot = await getDocs(collection(db, 'Passenger Requests'));

      const allRequests: PassengerRequest[] = allDocsSnapshot.docs
        .map((doc) => {
          const data = doc.data() as DocumentData;
          return processFirestorePassengerRequest(doc, data);
        })
        .filter((request): request is PassengerRequest => {
          if (!request) return false;
          
          // Filtrar solo solicitudes futuras activas
          return request.departureDate >= today && request.status === 'active';
        });

      // Aplicar el mismo filtro que para viajes: mostrar solo una solicitud por grupo recurrente
      const recurringGroups = new Map<string, PassengerRequest>();
      const individualRequests: PassengerRequest[] = [];

      allRequests.forEach(request => {
        if (request.isRecurring && request.recurrenceId) {
          const existingRequest = recurringGroups.get(request.recurrenceId);
          if (!existingRequest || request.departureDate < existingRequest.departureDate) {
            // Guardar solo la solicitud más próxima de cada grupo recurrente
            recurringGroups.set(request.recurrenceId, request);
          }
        } else {
          // Solicitudes individuales se muestran todas
          individualRequests.push(request);
        }
      });

      // Combinar solicitudes individuales con próximas solicitudes recurrentes
      const finalRequests = [...individualRequests, ...Array.from(recurringGroups.values())];

      console.log('🔍 Solicitudes totales en Firebase:', allRequests.length);
      console.log('🔍 Solicitudes finales mostradas:', finalRequests.length);
      console.log('🔍 Solicitudes recurrentes únicas mostradas:', recurringGroups.size);

      set({ 
        passengerRequests: finalRequests, 
        filteredPassengerRequests: finalRequests, 
        isLoading: false 
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Error al obtener solicitudes de pasajeros',
        isLoading: false,
      });
    }
  },

  // ✅ FUNCIONES EXISTENTES MANTENIDAS COMPLETAS
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

  // ✅ NUEVA FUNCIÓN: Obtener mis solicitudes de pasajero
  fetchMyPassengerRequests: async () => {
    set({ isLoading: true, error: null });
    try {
      const db = getFirestore();
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) throw new Error('No estás autenticado');

      const q = query(collection(db, 'Passenger Requests'), where('passengerId', '==', user.uid));
      const snapshot = await getDocs(q);

      const myRequests: PassengerRequest[] = snapshot.docs
        .map((doc) => {
          const data = doc.data() as DocumentData;
          return processFirestorePassengerRequest(doc, data);
        })
        .filter((request): request is PassengerRequest => request !== null);

      set({ 
        myPassengerRequests: myRequests,
        isLoading: false 
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Error al obtener mis solicitudes',
        isLoading: false,
      });
    }
  },

  // ✅ FUNCIONES EXISTENTES MANTENIDAS COMPLETAS
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
        const tripData = tripDoc.data();

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

          const trip = processFirestoreTrip(tripDoc, tripData);

          allBookings.push({
            id: bookingDoc.id,
            ...bookingData,
            passengerInfo,
            trip,
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

  // ✅ FUNCIONES EXISTENTES MANTENIDAS
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

  // ✅ NUEVA FUNCIÓN: Filtrar solicitudes de pasajeros
  filterPassengerRequests: (filters: TripFilters) => {
    const allRequests = get().passengerRequests;
    const filtered = allRequests.filter((request) => {
      const matchesOrigin = filters.origin
        ? request.origin.toLowerCase().includes(filters.origin.toLowerCase())
        : true;
      const matchesDestination = filters.destination
        ? request.destination.toLowerCase().includes(filters.destination.toLowerCase())
        : true;
      return matchesOrigin && matchesDestination;
    });
    set({ filteredPassengerRequests: filtered });
  },

  bookTrip: async (tripId: string, seats: number) => {
    set({ isLoading: true, error: null });
    try {
      const db = getFirestore();
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) throw new Error('No estás autenticado');

      console.log('🎯 Reservando viaje:', tripId, 'asientos:', seats);

      const bookingData = {
        tripId,
        passengerId: user.uid,
        seats,
        status: 'pending',
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'Bookings'), bookingData);
      
      console.log('✅ Reserva creada exitosamente');
      set({ isLoading: false });

    } catch (error) {
      console.error('❌ Error al reservar viaje:', error);
      set({
        error: error instanceof Error ? error.message : 'Error al reservar viaje',
        isLoading: false,
      });
      throw error;
    }
  },

  // ✅ NUEVA FUNCIÓN: Crear oferta de conductor a solicitud de pasajero
  createDriverOffer: async (requestId: string, offerData: any) => {
    set({ isLoading: true, error: null });
    try {
      const db = getFirestore();
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) throw new Error('No estás autenticado');

      const fullOffer = {
        ...offerData,
        requestId,
        driverId: user.uid,
        status: 'pending',
        createdAt: serverTimestamp(),
        driver: {
          id: user.uid,
          name: user.displayName || '',
          email: user.email || '',
          phone: offerData.phone || '',
          profilePicture: user.photoURL || '',
        },
      };

      const docRef = await addDoc(collection(db, 'Driver Offers'), fullOffer);

      const offer: DriverOffer = {
        id: docRef.id,
        ...fullOffer,
        createdAt: new Date(),
      };

      set((state) => ({
        myDriverOffers: [...state.myDriverOffers, offer],
        isLoading: false,
      }));

      return offer;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Error al crear oferta',
        isLoading: false,
      });
      throw error;
    }
  },

  // ✅ NUEVA FUNCIÓN: Obtener mis ofertas como conductor
  fetchMyDriverOffers: async () => {
    set({ isLoading: true, error: null });
    try {
      const db = getFirestore();
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) throw new Error('No estás autenticado');

      const q = query(collection(db, 'Driver Offers'), where('driverId', '==', user.uid));
      const snapshot = await getDocs(q);

      const offers: DriverOffer[] = [];

      for (const docSnap of snapshot.docs) {
        const data = docSnap.data() as DocumentData;

        let request = null;
        if (data.requestId) {
          const requestRef = doc(db, 'Passenger Requests', data.requestId);
          const requestSnap = await getDoc(requestRef);
          if (requestSnap.exists()) {
            const requestData = requestSnap.data();
            request = processFirestorePassengerRequest(requestSnap, requestData);
          }
        }

        offers.push({
          id: docSnap.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() || new Date(),
          request,
        });
      }

      set({ myDriverOffers: offers, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Error al obtener mis ofertas',
        isLoading: false,
      });
    }
  },

  // ✅ NUEVA FUNCIÓN: Obtener ofertas recibidas como pasajero
  fetchReceivedDriverOffers: async () => {
    set({ isLoading: true, error: null });
    try {
      const db = getFirestore();
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) throw new Error('No estás autenticado');

      // Primero obtener mis solicitudes
      const requestsQuery = query(collection(db, 'Passenger Requests'), where('passengerId', '==', user.uid));
      const requestsSnapshot = await getDocs(requestsQuery);
      const myRequestIds = requestsSnapshot.docs.map(doc => doc.id);

      if (myRequestIds.length === 0) {
        set({ receivedDriverOffers: [], isLoading: false });
        return;
      }

      // Luego obtener ofertas para mis solicitudes
      const offersQuery = query(collection(db, 'Driver Offers'), where('requestId', 'in', myRequestIds));
      const offersSnapshot = await getDocs(offersQuery);

      const offers: DriverOffer[] = [];

      for (const docSnap of offersSnapshot.docs) {
        const data = docSnap.data() as DocumentData;

        let request = null;
        if (data.requestId) {
          const requestRef = doc(db, 'Passenger Requests', data.requestId);
          const requestSnap = await getDoc(requestRef);
          if (requestSnap.exists()) {
            const requestData = requestSnap.data();
            request = processFirestorePassengerRequest(requestSnap, requestData);
          }
        }

        offers.push({
          id: docSnap.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() || new Date(),
          request,
        });
      }

      set({ receivedDriverOffers: offers, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Error al obtener ofertas recibidas',
        isLoading: false,
      });
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

  // ✅ NUEVA FUNCIÓN: Eliminar solicitud de pasajero
  deletePassengerRequest: async (requestId: string) => {
    const db = getFirestore();
    try {
      await deleteDoc(doc(db, 'Passenger Requests', requestId));
      set((state) => ({
        myPassengerRequests: state.myPassengerRequests.filter((request) => request.id !== requestId),
        passengerRequests: state.passengerRequests.filter((request) => request.id !== requestId),
        filteredPassengerRequests: state.filteredPassengerRequests.filter((request) => request.id !== requestId),
      }));
    } catch (error) {
      console.error("Error al eliminar la solicitud:", error);
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