export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  profilePicture?: string;
  createdAt: Date;
}

export interface Trip {
  id: string;
  driverId: string;
  driver: User;
  origin: string;
  destination: string;
  departureDate: Date;
  departureTime: string;
  availableSeats: number;
  price: number;
  description?: string;
  carModel?: string;
  carColor?: string;
  status: 'active' | 'completed' | 'cancelled';
  createdAt: Date;
  
  // Campos para viajes recurrentes
  isRecurring?: boolean;
  recurrenceId?: string; // ID único para agrupar viajes recurrentes
  recurrenceDays?: string[];
  recurrenceStartDate?: string;
  recurrenceEndDate?: string;
  publishDaysBefore?: number;
}

export interface RecurringTripGroup {
  id: string; // recurrenceId
  driverId: string;
  driver: User;
  origin: string;
  destination: string;
  departureTime: string;
  availableSeats: number;
  price: number;
  description?: string;
  carModel?: string;
  carColor?: string;
  recurrenceDays: string[];
  recurrenceStartDate: string;
  recurrenceEndDate?: string;
  publishDaysBefore: number;
  nextTripDate: Date; // Próxima fecha de viaje
  createdAt: Date;
  status: 'active' | 'completed' | 'cancelled';
}

export interface Booking {
  id: string;
  tripId: string;
  trip: Trip;
  passengerId: string;
  passenger: User;
  seats: number;
  status: 'pending' | 'confirmed' | 'rejected' | 'cancelled';
  createdAt: Date;
  passengerInfo?: {
    name: string;
    phone: string;
  };
}

export interface TripFilters {
  origin?: string;
  destination?: string;
  date?: Date;
  minSeats?: number;
  maxPrice?: number;
}