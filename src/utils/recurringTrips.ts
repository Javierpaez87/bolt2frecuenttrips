import { Timestamp } from 'firebase/firestore';

// Generar ID único robusto para viajes recurrentes
export const generateRecurrenceId = (origin: string, destination: string, time: string, startDate: string): string => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  const hash = btoa(`${origin}-${destination}-${time}-${startDate}`).substring(0, 8);
  return `REC_${hash}_${timestamp}_${random}`.toUpperCase();
};

// Generar ID único para viajes individuales
export const generateTripId = (): string => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `TRIP_${timestamp}_${random}`.toUpperCase();
};

// Función para crear fecha local desde string YYYY-MM-DD SIN problemas de timezone
export const createLocalDate = (dateString: string): Date => {
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

// Convertir fecha string a Timestamp SIN problemas de timezone
export const convertDateToTimestamp = (dateInput: string | Date): Timestamp => {
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

// Obtener el próximo día de la semana para un viaje recurrente
export const getNextTripDate = (recurrenceDays: string[], startDate: string): Date => {
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

// Verificar si una fecha está dentro del rango de recurrencia
export const isDateInRecurrenceRange = (date: Date, startDate: string, endDate?: string): boolean => {
  try {
    const start = createLocalDate(startDate);
    const end = endDate ? createLocalDate(endDate) : null;
    
    if (date < start) return false;
    if (end && date > end) return false;
    
    return true;
  } catch (error) {
    console.error('isDateInRecurrenceRange: error:', error);
    return false;
  }
};

// Formatear días de la semana para mostrar
export const formatRecurrenceDays = (days: string[]): string => {
  const dayMap: { [key: string]: string } = {
    'lunes': 'Lun',
    'martes': 'Mar',
    'miércoles': 'Mié',
    'jueves': 'Jue',
    'viernes': 'Vie',
    'sábado': 'Sáb',
    'domingo': 'Dom'
  };
  
  return days.map(day => dayMap[day] || day).join(', ');
};

// Generar fechas de viajes individuales para un patrón recurrente
export const generateRecurringTripDates = (
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
    
    let current = new Date(start);
    let iterations = 0;
    const maxIterations = 1000; // Prevenir loops infinitos
    
    while (current <= end && iterations < maxIterations) {
      const dayName = current.toLocaleDateString('es-AR', { weekday: 'long' }).toLowerCase();
      
      if (recurrenceDays.includes(dayName)) {
        // Solo agregar si la fecha de publicación ya llegó
        const publishDate = new Date(current);
        publishDate.setDate(current.getDate() - publishDaysBefore);
        
        if (publishDate <= today) {
          dates.push(new Date(current));
        }
      }
      
      current.setDate(current.getDate() + 1);
      iterations++;
    }
    
    if (iterations >= maxIterations) {
      console.warn('generateRecurringTripDates: se alcanzó el límite máximo de iteraciones');
    }
    
    return dates;
  } catch (error) {
    console.error('generateRecurringTripDates: error:', error);
    return [];
  }
};

// Función helper para procesar datos de viaje desde Firestore
export const processFirestoreTrip = (doc: any, data: any): any | null => {
  try {
    let departureDate: Date;

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
        console.warn('processFirestoreTrip: formato de fecha no reconocido:', data.departureDate);
        return null;
      }
    } else {
      console.warn('processFirestoreTrip: no se encontró departureDate en el documento:', doc.id);
      return null;
    }

    // Verificar que la fecha sea válida
    if (isNaN(departureDate.getTime())) {
      console.warn('processFirestoreTrip: fecha inválida generada:', departureDate, 'para documento:', doc.id);
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
    };
  } catch (error) {
    console.error('processFirestoreTrip: error procesando viaje:', error, data);
    return null;
  }
};