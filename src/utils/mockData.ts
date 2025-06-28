import { User, Trip, Booking } from '../types';
import { addDays } from 'date-fns';

// Mock Users
export const mockUsers: User[] = [
  {
    id: '1',
    name: 'Carlos Rodríguez',
    email: 'carlos@example.com',
    phone: '+54 9 11 1234-5678',
    profilePicture: 'https://images.pexels.com/photos/614810/pexels-photo-614810.jpeg?auto=compress&cs=tinysrgb&w=150',
    createdAt: new Date('2023-01-15'),
  },
  {
    id: '2',
    name: 'María García',
    email: 'maria@example.com',
    phone: '+54 9 11 2345-6789',
    profilePicture: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=150',
    createdAt: new Date('2023-02-20'),
  },
  {
    id: '3',
    name: 'Juan Pérez',
    email: 'juan@example.com',
    phone: '+54 9 11 3456-7890',
    profilePicture: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150',
    createdAt: new Date('2023-03-10'),
  },
];

// Current user (for demo purposes)
export const currentUser = mockUsers[0];

// Mock Trips
export const mockTrips: Trip[] = [
  {
    id: '1',
    driverId: '2',
    driver: mockUsers[1],
    origin: 'Buenos Aires',
    destination: 'Mar del Plata',
    departureDate: addDays(new Date(), 1),
    departureTime: '08:00',
    availableSeats: 3,
    price: 5000,
    description: 'Viaje directo con paradas breves para estirar las piernas.',
    carModel: 'Toyota Corolla 2020',
    carColor: 'Blanco',
    status: 'active',
    createdAt: new Date('2023-06-15'),
  },
  {
    id: '2',
    driverId: '3',
    driver: mockUsers[2],
    origin: 'Córdoba',
    destination: 'Mendoza',
    departureDate: addDays(new Date(), 2),
    departureTime: '10:30',
    availableSeats: 2,
    price: 6500,
    description: 'Viaje cómodo, llevamos equipaje moderado.',
    carModel: 'Honda Civic 2021',
    carColor: 'Gris',
    status: 'active',
    createdAt: new Date('2023-06-18'),
  },
  {
    id: '3',
    driverId: '1',
    driver: mockUsers[0],
    origin: 'Rosario',
    destination: 'Buenos Aires',
    departureDate: addDays(new Date(), 3),
    departureTime: '14:00',
    availableSeats: 4,
    price: 4500,
    description: 'Viaje rápido por autopista, sin muchas paradas.',
    carModel: 'Volkswagen Golf 2019',
    carColor: 'Azul',
    status: 'active',
    createdAt: new Date('2023-06-20'),
  },
  {
    id: '4',
    driverId: '2',
    driver: mockUsers[1],
    origin: 'La Plata',
    destination: 'Pinamar',
    departureDate: addDays(new Date(), 4),
    departureTime: '09:15',
    availableSeats: 3,
    price: 4800,
    description: 'Salida puntual, aire acondicionado.',
    carModel: 'Fiat Cronos 2022',
    carColor: 'Rojo',
    status: 'active',
    createdAt: new Date('2023-06-22'),
  },
];

// Mock Bookings
export const mockBookings: Booking[] = [
  {
    id: '1',
    tripId: '1',
    trip: mockTrips[0],
    passengerId: '1',
    passenger: mockUsers[0],
    seats: 2,
    status: 'confirmed',
    createdAt: new Date('2023-06-16'),
  },
  {
    id: '2',
    tripId: '2',
    trip: mockTrips[1],
    passengerId: '1',
    passenger: mockUsers[0],
    seats: 1,
    status: 'pending',
    createdAt: new Date('2023-06-19'),
  },
];

// My Trips (trips created by the current user)
export const myTrips = mockTrips.filter(trip => trip.driverId === currentUser.id);

// My Bookings (bookings made by the current user)
export const myBookings = mockBookings.filter(booking => booking.passengerId === currentUser.id);