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
}

export interface TripFilters {
  origin?: string;
  destination?: string;
  date?: Date;
  minSeats?: number;
  maxPrice?: number;
}