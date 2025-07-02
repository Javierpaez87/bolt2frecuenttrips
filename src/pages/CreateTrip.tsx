import { toast } from 'react-toastify';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { MapPin, Calendar, Clock, Users, DollarSign, Car, FileText, UserCheck, User as UserIcon } from 'lucide-react';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

import Layout from '../components/layout/Layout';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

import { useTripStore } from '../store/tripStore';
import { useAuthStore } from '../store/authStore';
import { generateRecurringDates } from '../utils/recurringTrips';

interface CreateTripFormData {
  // ✅ NUEVO: Tipo de publicación
  tripType: 'driver_offer' | 'passenger_request';
  
  origin: string;
  destination: string;
  departureDate: string;
  departureTime: string;
  
  // Campos solo para conductores
  availableSeats?: number;
  price?: number;
  carModel?: string;
  carColor?: string;
  
  // Campos solo para pasajeros
  maxPrice?: number;
  
  description?: string;
  phone: string;

  // Campos para viaje recurrente
  isRecurring?: boolean;
  recurrenceDays?: string[];
  recurrenceStartDate?: string;
  recurrenceEndDate?: string;
  publishDaysBefore?: number;
}

const CreateTrip: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { createTrip, createPassengerRequest, isLoading, error } = useTripStore();
  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<CreateTripFormData>({
    defaultValues: {
      tripType: 'driver_offer' // Por defecto conductor
    }
  });
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceDays, setRecurrenceDays] = useState<string[]>([]);
  const [userPhone, setUserPhone] = useState('');

  // ✅ NUEVO: Observar el tipo seleccionado
  const selectedTripType = watch('tripType');

  // Redirigir si no está autenticado
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  // Traer teléfono si existe en el perfil
  useEffect(() => {
    const fetchPhone = async () => {
      const db = getFirestore();
      const auth = getAuth();
      const uid = auth.currentUser?.uid;
      if (!uid) return;

      const userRef = doc(db, 'users', uid);
      const snapshot = await getDoc(userRef);
      const data = snapshot.data();
      if (data?.phone) {
        setUserPhone(data.phone);
        setValue('phone', data.phone);
      }
    };

    fetchPhone();
  }, [setValue]);

  // Guardar teléfono si no estaba ya en el perfil
  const guardarTelefonoUsuario = async (telefono: string) => {
    const db = getFirestore();
    const auth = getAuth();
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const userRef = doc(db, 'users', uid);
    const snapshot = await getDoc(userRef);

    if (!snapshot.exists()) {
      await setDoc(userRef, { phone: telefono });
    } else {
      const data = snapshot.data();
      if (!data.phone) {
        await setDoc(userRef, { ...data, phone: telefono });
      }
    }
  };

  const onSubmit = async (data: CreateTripFormData) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Asignar correctamente los días de recurrencia
      data.recurrenceDays = recurrenceDays;
      data.isRecurring = isRecurring;
      const isRecurrent = isRecurring && recurrenceDays.length > 0;

      console.log('🔧 onSubmit - datos del formulario:', {
        tripType: data.tripType,
        isRecurrent,
        isRecurring,
        recurrenceDays,
        recurrenceStartDate: data.recurrenceStartDate,
        recurrenceEndDate: data.recurrenceEndDate,
        departureDate: data.departureDate,
        publishDaysBefore: data.publishDaysBefore
      });

      // Validación para viaje NO recurrente
      if (!isRecurrent) {
        if (!data.departureDate) {
          alert("Debes especificar una fecha de salida.");
          return;
        }

        const selectedDate = new Date(data.departureDate);
        if (selectedDate < today) {
          alert("La fecha del viaje no puede ser anterior a hoy.");
          return;
        }

        // Asegurar que departureDate esté en formato string
        if (data.departureDate instanceof Date) {
          data.departureDate = data.departureDate.toISOString().split('T')[0];
        }
      }

      // Validaciones para viaje recurrente
      if (isRecurrent) {
        if (!data.recurrenceStartDate) {
          alert("Debes especificar la fecha de inicio para viajes recurrentes.");
          return;
        }

        const startDate = new Date(data.recurrenceStartDate);
        if (startDate < today) {
          alert("La fecha de inicio no puede ser anterior a hoy.");
          return;
        }

        if (data.recurrenceEndDate) {
          const endDate = new Date(data.recurrenceEndDate);
          if (endDate <= startDate) {
            alert("La fecha de fin debe ser posterior a la fecha de inicio.");
            return;
          }
        }

        if (recurrenceDays.length === 0) {
          alert("Debes seleccionar al menos un día de la semana para viajes recurrentes.");
          return;
        }

        if (!data.publishDaysBefore || data.publishDaysBefore < 0) {
          alert("Debes especificar cuántos días antes se publican los viajes.");
          return;
        }

        // Generar fechas recurrentes
        const recurringDates = generateRecurringDates(
          data.recurrenceStartDate,
          data.recurrenceEndDate,
          recurrenceDays,
          data.publishDaysBefore || 0
        );

        if (recurringDates.length === 0) {
          alert("No hay viajes para publicar en este momento. Los viajes se publicarán automáticamente según la configuración de días antes.");
          return;
        }

        // Agregar las fechas generadas a los datos
        data.recurringDates = recurringDates;
        
        console.log('🔧 Fechas específicas a crear ahora:', recurringDates);
      }

      // ✅ VALIDACIONES ESPECÍFICAS POR TIPO
      if (data.tripType === 'driver_offer') {
        // Validaciones para conductores
        if (!data.availableSeats || data.availableSeats < 1) {
          alert("Debes especificar al menos 1 asiento disponible.");
          return;
        }
        if (!data.price || data.price < 0) {
          alert("Debes especificar un precio válido.");
          return;
        }
      } else if (data.tripType === 'passenger_request') {
        // Validaciones para pasajeros
        if (data.maxPrice && data.maxPrice < 0) {
          alert("El precio máximo no puede ser negativo.");
          return;
        }
      }

      await guardarTelefonoUsuario(data.phone);

      console.log('🔧 Datos finales enviados al store:', data);

      // ✅ NUEVO: Llamar función diferente según el tipo
      if (data.tripType === 'passenger_request') {
        await createPassengerRequest(data as any);
        
        if (isRecurrent) {
          const hora = data.departureTime;
          const dias = recurrenceDays
            .map((d) => d.charAt(0).toUpperCase() + d.slice(1))
            .join(', ');

          toast.success(
            `✅ Has configurado una solicitud de viaje recurrente para los ${dias} a las ${hora}. Los conductores podrán hacer ofertas para estos viajes.`,
            { position: 'top-center', autoClose: 5000 }
          );
        } else {
          toast.success('✅ Solicitud de viaje publicada con éxito! Los conductores podrán hacer ofertas.');
        }
      } else {
        await createTrip(data as any);
        
        if (isRecurrent) {
          const hora = data.departureTime;
          const dias = recurrenceDays
            .map((d) => d.charAt(0).toUpperCase() + d.slice(1))
            .join(', ');

          toast.success(
            `✅ Has configurado un viaje recurrente para los ${dias} a las ${hora}. Los viajes se publicarán automáticamente ${data.publishDaysBefore} días antes de cada fecha.`,
            { position: 'top-center', autoClose: 5000 }
          );
        } else {
          toast.success('✅ Viaje publicado con éxito!');
        }
      }

      navigate('/dashboard');
    } catch (error) {
      console.error('❌ Error al crear viaje/solicitud:', error);
      toast.error('Ocurrió un error al publicar.');
    }
  };

  return (
    <Layout>
      <div className="bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-card p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">
              Publicar un Viaje
            </h1>

            {error && (
              <div className="p-4 mb-6 bg-red-50 text-red-700 rounded-lg">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="space-y-6">
                {/* ✅ NUEVO: Selector de tipo de publicación */}
                <div className="border-b border-gray-200 pb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    ¿Qué tipo de publicación querés hacer?
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label className={`relative flex cursor-pointer rounded-lg border p-4 focus:outline-none ${
                      selectedTripType === 'driver_offer' 
                        ? 'border-primary-500 bg-primary-50' 
                        : 'border-gray-300 bg-white hover:bg-gray-50'
                    }`}>
                      <input
                        type="radio"
                        value="driver_offer"
                        {...register('tripType', { required: true })}
                        className="sr-only"
                      />
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <UserCheck className={`h-6 w-6 ${
                            selectedTripType === 'driver_offer' ? 'text-primary-600' : 'text-gray-400'
                          }`} />
                        </div>
                        <div className="ml-3">
                          <div className={`text-sm font-medium ${
                            selectedTripType === 'driver_offer' ? 'text-primary-900' : 'text-gray-900'
                          }`}>
                            Soy Conductor/a
                          </div>
                          <div className={`text-sm ${
                            selectedTripType === 'driver_offer' ? 'text-primary-700' : 'text-gray-500'
                          }`}>
                            Ofrezco un viaje en mi vehículo
                          </div>
                        </div>
                      </div>
                    </label>

                    <label className={`relative flex cursor-pointer rounded-lg border p-4 focus:outline-none ${
                      selectedTripType === 'passenger_request' 
                        ? 'border-secondary-500 bg-secondary-50' 
                        : 'border-gray-300 bg-white hover:bg-gray-50'
                    }`}>
                      <input
                        type="radio"
                        value="passenger_request"
                        {...register('tripType', { required: true })}
                        className="sr-only"
                      />
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <UserIcon className={`h-6 w-6 ${
                            selectedTripType === 'passenger_request' ? 'text-secondary-600' : 'text-gray-400'
                          }`} />
                        </div>
                        <div className="ml-3">
                          <div className={`text-sm font-medium ${
                            selectedTripType === 'passenger_request' ? 'text-secondary-900' : 'text-gray-900'
                          }`}>
                            Soy Pasajero/a
                          </div>
                          <div className={`text-sm ${
                            selectedTripType === 'passenger_request' ? 'text-secondary-700' : 'text-gray-500'
                          }`}>
                            Busco que me lleven en un viaje
                          </div>
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Origen"
                    list="lugares"
                    placeholder="Ciudad de origen"
                    leftIcon={<MapPin className="h-5 w-5 text-gray-400" />}
                    error={errors.origin?.message}
                    {...register('origin', { required: 'El origen es requerido' })}
                  />

                  <Input
                    label="Destino"
                    list="lugares"
                    placeholder="Ciudad de destino"
                    leftIcon={<MapPin className="h-5 w-5 text-gray-400" />}
                    error={errors.destination?.message}
                    {...register('destination', { required: 'El destino es requerido' })}
                  />
                </div>

                <div>
                  <Input
                    label="Teléfono de contacto (WhatsApp)"
                    placeholder="Ej: 5491123456789"
                    error={errors.phone?.message}
                    {...register('phone', {
                      required: 'El número de teléfono es requerido',
                      pattern: {
                        value: /^549\d{10}$/,
                        message: 'Debe comenzar con 549 y tener 13 dígitos',
                      },
                    })}
                  />
                  <div className="text-sm mt-1 text-amber-600 flex items-center">
                    ⚠️ Asegurate de ingresar el número completo, incluyendo el código de país (ej: 549...). Es el que se usará para abrir WhatsApp.
                  </div>
                </div>

                {/* Viaje Recurrente */}
                <div className="space-y-4 border-t border-gray-200 pt-6 mt-6">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isRecurring}
                      onChange={(e) => setIsRecurring(e.target.checked)}
                      className="h-4 w-4 text-primary-600 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700 font-medium">
                      {selectedTripType === 'driver_offer' ? '¿Es un viaje recurrente?' : '¿Es una solicitud recurrente?'}
                    </span>
                  </label>

                  {isRecurring && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Días de la semana
                        </label>
                        <div className="flex flex-wrap gap-3">
                          {['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'].map((day) => (
                            <label key={day} className="flex items-center gap-1">
                              <input
                                type="checkbox"
                                value={day}
                                checked={recurrenceDays.includes(day)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setRecurrenceDays([...recurrenceDays, day]);
                                  } else {
                                    setRecurrenceDays(recurrenceDays.filter((d) => d !== day));
                                  }
                                }}
                                className="h-4 w-4 text-primary-600 border-gray-300 rounded"
                              />
                              <span className="text-sm capitalize">{day}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                          label="Desde (fecha de inicio)"
                          type="date"
                          min={new Date().toISOString().split('T')[0]}
                          {...register('recurrenceStartDate', { required: isRecurring })}
                        />
                        <Input
                          label="Hasta (fecha de fin - opcional)"
                          type="date"
                          {...register('recurrenceEndDate')}
                        />
                      </div>

                      <Input
                        label={selectedTripType === 'driver_offer' 
                          ? "¿Cuántos días antes se publican los viajes?" 
                          : "¿Cuántos días antes se publican las solicitudes?"
                        }
                        type="number"
                        min="0"
                        max="30"
                        defaultValue={3}
                        {...register('publishDaysBefore', { 
                          required: isRecurring,
                          min: { value: 0, message: 'Debe ser 0 o mayor' },
                          max: { value: 30, message: 'Máximo 30 días' }
                        })}
                      />

                      <div className="text-sm mt-1 text-blue-600 flex items-start gap-2">
                        <svg className="h-5 w-5 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 20.5C6.76 20.5 2.5 16.24 2.5 11S6.76 1.5 12 1.5 21.5 5.76 21.5 11 17.24 20.5 12 20.5z" />
                        </svg>
                        <div>
                          <strong>Sistema simplificado:</strong> {selectedTripType === 'driver_offer' 
                            ? 'Los viajes recurrentes se publican automáticamente como viajes individuales normales.'
                            : 'Las solicitudes recurrentes se publican automáticamente según los "días antes" configurados.'
                          }
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="relative">
                    <Input
                      label="Fecha de salida"
                      type="date"
                      disabled={isRecurring}
                      min={new Date().toISOString().split('T')[0]}
                      leftIcon={<Calendar className="h-5 w-5 text-gray-400" />}
                      error={
                        isRecurring
                          ? undefined
                          : errors.departureDate?.message
                      }
                      {...register('departureDate', {
                        required: !isRecurring && 'La fecha es requerida',
                        validate: !isRecurring
                          ? (value) => {
                              const selected = new Date(value);
                              const today = new Date();
                              today.setHours(0, 0, 0, 0);
                              return selected >= today || 'La fecha no puede ser anterior a hoy';
                            }
                          : undefined,
                      })}
                    />

                    {isRecurring && (
                      <p className="text-sm text-gray-500 absolute -bottom-5 left-0">
                        Este campo se desactiva porque el viaje es recurrente.
                      </p>
                    )}
                  </div>

                  <Input
                    label="Hora de salida"
                    type="time"
                    leftIcon={<Clock className="h-5 w-5 text-gray-400" />}
                    error={errors.departureTime?.message}
                    {...register('departureTime', { required: 'La hora es requerida' })}
                  />
                </div>

                {/* ✅ CAMPOS CONDICIONALES SEGÚN EL TIPO */}
                {selectedTripType === 'driver_offer' && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input
                        label="Asientos disponibles"
                        type="number"
                        min="1"
                        max="10"
                        leftIcon={<Users className="h-5 w-5 text-gray-400" />}
                        error={errors.availableSeats?.message}
                        {...register('availableSeats', { 
                          required: 'El número de asientos es requerido',
                          min: { value: 1, message: 'Debe haber al menos 1 asiento disponible' },
                          max: { value: 10, message: 'Máximo 10 asientos disponibles' }
                        })}
                      />

                      <Input
                        label="Precio por asiento"
                        type="number"
                        min="0"
                        step="100"
                        leftIcon={<DollarSign className="h-5 w-5 text-gray-400" />}
                        error={errors.price?.message}
                        {...register('price', { 
                          required: 'El precio es requerido',
                          min: { value: 0, message: 'El precio no puede ser negativo' }
                        })}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input
                        label="Modelo del vehículo"
                        placeholder="Ej: Toyota Corolla 2020"
                        leftIcon={<Car className="h-5 w-5 text-gray-400" />}
                        {...register('carModel')}
                      />

                      <Input
                        label="Color del vehículo"
                        placeholder="Ej: Blanco"
                        {...register('carColor')}
                      />
                    </div>
                  </>
                )}

                {selectedTripType === 'passenger_request' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Precio máximo por asiento (opcional)"
                      type="number"
                      min="0"
                      step="100"
                      placeholder="Precio máximo que estás dispuesto/a a pagar"
                      leftIcon={<DollarSign className="h-5 w-5 text-gray-400" />}
                      error={errors.maxPrice?.message}
                      {...register('maxPrice', { 
                        min: { value: 0, message: 'El precio no puede ser negativo' }
                      })}
                    />
                    <div className="flex items-end">
                      <div className="text-sm text-gray-600 p-3 bg-blue-50 rounded-lg">
                        💡 Si no especificas un precio máximo, los conductores podrán hacer ofertas con cualquier precio.
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {selectedTripType === 'driver_offer' 
                      ? 'Descripción (opcional)' 
                      : 'Comentarios adicionales (opcional)'
                    }
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-3">
                      <FileText className="h-5 w-5 text-gray-400" />
                    </div>
                    <textarea
                      className="block w-full pl-10 pr-4 py-2 rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                      rows={3}
                      placeholder={selectedTripType === 'driver_offer' 
                        ? "Información adicional sobre el viaje..."
                        : "Información adicional sobre tu solicitud..."
                      }
                      {...register('description')}
                    ></textarea>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                    Cancelar
                  </Button>

                  <Button type="submit" variant="primary" isLoading={isLoading}>
                    {selectedTripType === 'driver_offer' ? 'Publicar Viaje' : 'Publicar Solicitud'}
                  </Button>
                </div>
              </div>
            </form>

            <datalist id="lugares">
              <option value="Junín de los Andes" />
              <option value="San Martín de los Andes" />
              <option value="Bariloche" />
              <option value="Villa La Angostura" />
              <option value="Zapala" />
              <option value="Neuquén" />
              <option value="Esquel" />
              <option value="El Bolsón" />
              <option value="Trevelin" />
              <option value="La Pampa" />
            </datalist>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CreateTrip;