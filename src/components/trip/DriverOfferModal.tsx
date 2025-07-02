import React, { useState } from 'react';
import { X, Car, DollarSign, Users, FileText } from 'lucide-react';
import { PassengerRequest } from '../../types';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { useForm } from 'react-hook-form';

interface DriverOfferModalProps {
  request: PassengerRequest;
  onClose: () => void;
  onConfirm: (requestId: string, offerData: any) => Promise<void>;
}

interface OfferFormData {
  price: number;
  availableSeats: number;
  carModel?: string;
  carColor?: string;
  description?: string;
}

const DriverOfferModal: React.FC<DriverOfferModalProps> = ({ request, onClose, onConfirm }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { register, handleSubmit, formState: { errors }, watch } = useForm<OfferFormData>();
  
  const price = watch('price');
  const availableSeats = watch('availableSeats');

  // Función para formatear fecha
  const formatDate = (date: Date): string => {
    try {
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch (error) {
      return 'Fecha inválida';
    }
  };
  
  const onSubmit = async (data: OfferFormData) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Validaciones
      if (request.maxPrice && data.price > request.maxPrice) {
        setError(`El precio no puede ser mayor a $${request.maxPrice} (máximo especificado por el pasajero)`);
        setIsLoading(false);
        return;
      }
      
      await onConfirm(request.id, data);
      onClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Ocurrió un error al enviar la oferta');
      setIsLoading(false);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md mx-auto animate-fade-in max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Hacer Oferta como Conductor</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-4">
          <div className="mb-4 p-4 bg-secondary-50 rounded-lg border border-secondary-200">
            <h3 className="font-medium text-secondary-900 mb-2">Solicitud del pasajero</h3>
            <div className="space-y-1 text-sm text-secondary-800">
              <p><strong>Pasajero:</strong> {request.passenger?.name}</p>
              <p><strong>Ruta:</strong> {request.origin} → {request.destination}</p>
              <p><strong>Fecha:</strong> {formatDate(request.departureDate)}</p>
              <p><strong>Hora:</strong> {request.departureTime}</p>
              {request.maxPrice && (
                <p><strong>Precio máximo:</strong> ${request.maxPrice}</p>
              )}
              {request.description && (
                <p><strong>Comentarios:</strong> {request.description}</p>
              )}
            </div>
          </div>
          
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Precio por asiento"
                  type="number"
                  min="0"
                  step="100"
                  placeholder="Precio que ofrecés"
                  leftIcon={<DollarSign className="h-5 w-5 text-gray-400" />}
                  error={errors.price?.message}
                  {...register('price', {
                    required: 'El precio es requerido',
                    min: { value: 0, message: 'El precio no puede ser negativo' },
                    max: request.maxPrice ? { 
                      value: request.maxPrice, 
                      message: `No puede ser mayor a $${request.maxPrice}` 
                    } : undefined
                  })}
                />

                <Input
                  label="Asientos disponibles"
                  type="number"
                  min="1"
                  max="10"
                  placeholder="Asientos que ofrecés"
                  leftIcon={<Users className="h-5 w-5 text-gray-400" />}
                  error={errors.availableSeats?.message}
                  {...register('availableSeats', {
                    required: 'Los asientos son requeridos',
                    min: { value: 1, message: 'Debe haber al menos 1 asiento' },
                    max: { value: 10, message: 'Máximo 10 asientos' }
                  })}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Modelo del vehículo (opcional)"
                  placeholder="Ej: Toyota Corolla 2020"
                  leftIcon={<Car className="h-5 w-5 text-gray-400" />}
                  {...register('carModel')}
                />

                <Input
                  label="Color del vehículo (opcional)"
                  placeholder="Ej: Blanco"
                  {...register('carColor')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Comentarios adicionales (opcional)
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-3">
                    <FileText className="h-5 w-5 text-gray-400" />
                  </div>
                  <textarea
                    className="block w-full pl-10 pr-4 py-2 rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    rows={3}
                    placeholder="Información adicional sobre tu oferta..."
                    {...register('description')}
                  ></textarea>
                </div>
              </div>

              {/* Resumen de la oferta */}
              {price && availableSeats && (
                <div className="p-4 bg-primary-50 rounded-lg border border-primary-200">
                  <h4 className="font-medium text-primary-900 mb-2">Resumen de tu oferta</h4>
                  <div className="space-y-1 text-sm text-primary-800">
                    <div className="flex justify-between">
                      <span>Precio por asiento:</span>
                      <span className="font-medium">${price}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Asientos disponibles:</span>
                      <span className="font-medium">{availableSeats}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-primary-300">
                      <span className="font-medium">Total máximo:</span>
                      <span className="font-bold">${price * availableSeats}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {error && (
              <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}
            
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 mt-6">
              <Button 
                type="submit"
                variant="primary"
                fullWidth
                isLoading={isLoading}
                icon={<Car className="h-4 w-4" />}
              >
                Enviar Oferta
              </Button>
              
              <Button 
                type="button"
                variant="outline"
                fullWidth
                onClick={onClose}
                disabled={isLoading}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default DriverOfferModal;