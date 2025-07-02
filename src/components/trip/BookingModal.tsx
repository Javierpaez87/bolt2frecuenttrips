import React, { useState } from 'react';
import { X, Users, Calendar } from 'lucide-react';
import { Trip } from '../../types';
import Button from '../ui/Button';

interface BookingModalProps {
  trip: Trip;
  onClose: () => void;
  onConfirm: (tripId: string, seats: number) => Promise<void>;
}

const BookingModal: React.FC<BookingModalProps> = ({ trip, onClose, onConfirm }) => {
  const [seats, setSeats] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const handleSeatsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (value > 0 && value <= trip.availableSeats) {
      setSeats(value);
    }
  };
  
  const handleConfirm = async () => {
    try {
      setIsLoading(true);
      setError(null);
      await onConfirm(trip.id, seats);
      onClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Ocurrió un error al reservar');
      setIsLoading(false);
    }
  };

  // 🔧 FUNCIÓN CORREGIDA: Formatear fecha sin problemas de timezone
  const formatDate = (date: Date): string => {
    try {
      // Crear nueva instancia para evitar mutaciones
      const dateObj = new Date(date);
      
      // Verificar que la fecha sea válida
      if (isNaN(dateObj.getTime())) {
        return 'Fecha inválida';
      }

      // Formatear usando métodos locales para evitar problemas de timezone
      const day = dateObj.getDate().toString().padStart(2, '0');
      const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
      const year = dateObj.getFullYear();
      
      const formattedDate = `${day}/${month}/${year}`;
      
      // 🔧 DEBUG: Log para verificar el formateo
      console.log('🔧 BookingModal formatDate:', {
        input: date,
        dateObj: dateObj.toISOString().split('T')[0],
        formatted: formattedDate,
        getDate: dateObj.getDate(),
        getMonth: dateObj.getMonth() + 1,
        getFullYear: dateObj.getFullYear()
      });
      
      return formattedDate;
    } catch (error) {
      console.error('Error formateando fecha en BookingModal:', error, date);
      return 'Fecha inválida';
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md mx-auto animate-fade-in">
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Reservar Viaje</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-4">
          <div className="mb-4">
            <h3 className="font-medium text-gray-900">Detalles del viaje</h3>
            <p className="text-sm text-gray-600 mt-1">
              <span className="font-medium">Ruta:</span> {trip.origin} → {trip.destination}
            </p>
            <p className="text-sm text-gray-600">
              <span className="font-medium">Conductor:</span> {trip.driver.name}
            </p>
            {/* ✅ CORREGIDO: Mostrar fecha específica del viaje con formateo correcto */}
            <div className="flex items-center text-sm text-gray-600 mt-1">
              <Calendar className="h-4 w-4 text-blue-500 mr-1" />
              <span className="font-medium">Fecha:</span>
              <span className="ml-1 text-blue-600 font-semibold">{formatDate(trip.departureDate)}</span>
            </div>
            <p className="text-sm text-gray-600">
              <span className="font-medium">Hora:</span> {trip.departureTime}
            </p>
            <p className="text-sm text-gray-600">
              <span className="font-medium">Asientos disponibles:</span> {trip.availableSeats}
            </p>
            <p className="text-sm text-gray-600">
              <span className="font-medium">Precio por asiento:</span> ${trip.price}
            </p>
          </div>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Número de asientos
            </label>
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => seats > 1 && setSeats(seats - 1)}
                className="p-2 border border-gray-300 rounded-l-lg bg-gray-50 text-gray-600 hover:bg-gray-100"
              >
                -
              </button>
              <input
                type="number"
                min="1"
                max={trip.availableSeats}
                value={seats}
                onChange={handleSeatsChange}
                className="p-2 border-t border-b border-gray-300 text-center w-16 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => seats < trip.availableSeats && setSeats(seats + 1)}
                className="p-2 border border-gray-300 rounded-r-lg bg-gray-50 text-gray-600 hover:bg-gray-100"
              >
                +
              </button>
            </div>
          </div>
          
          <div className="p-4 bg-gray-50 rounded-lg mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">Precio por asiento:</span>
              <span className="text-sm font-medium">${trip.price}</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">Número de asientos:</span>
              <span className="text-sm font-medium">{seats}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-gray-200">
              <span className="text-base font-medium text-gray-900">Total:</span>
              <span className="text-base font-bold text-primary-500">${trip.price * seats}</span>
            </div>
          </div>
          
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}
          
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
            <Button 
              variant="primary"
              fullWidth
              onClick={handleConfirm}
              isLoading={isLoading}
              icon={<Users className="h-4 w-4" />}
            >
              Confirmar Reserva
            </Button>
            
            <Button 
              variant="outline"
              fullWidth
              onClick={onClose}
              disabled={isLoading}
            >
              Cancelar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingModal;