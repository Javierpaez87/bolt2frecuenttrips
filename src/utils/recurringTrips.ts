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
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day); // month - 1 porque Date usa 0-indexado
};

// Convertir fecha string a Timestamp SIN problemas de timezone
export const convertDateToTimestamp = (dateInput: string | Date): Timestamp => {
  if (typeof dateInput === 'string') {
    const [year, month, day] = dateInput.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return Timestamp.fromDate(date);
  } else {
    return Timestamp.fromDate(dateInput);
  }
};

// Obtener el próximo día de la semana para un viaje recurrente
export const getNextTripDate = (recurrenceDays: string[], startDate: string): Date => {
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
  const daysOfWeek = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  
  for (let i = 0; i < 14; i++) { // Buscar en las próximas 2 semanas
    const checkDate = new Date(today);
    checkDate.setDate(today.getDate() + i);
    
    const dayName = checkDate.toLocaleDateString('es-AR', { weekday: 'long' }).toLowerCase();
    
    if (recurrenceDays.includes(dayName) && checkDate >= start) {
      return checkDate;
    }
  }
  
  return start; // Fallback
};

// Verificar si una fecha está dentro del rango de recurrencia
export const isDateInRecurrenceRange = (date: Date, startDate: string, endDate?: string): boolean => {
  const start = createLocalDate(startDate);
  const end = endDate ? createLocalDate(endDate) : null;
  
  if (date < start) return false;
  if (end && date > end) return false;
  
  return true;
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
  const dates: Date[] = [];
  const start = createLocalDate(startDate);
  const end = endDate ? createLocalDate(endDate) : new Date(start.getFullYear() + 1, start.getMonth(), start.getDate());
  
  let current = new Date(start);
  
  while (current <= end) {
    const dayName = current.toLocaleDateString('es-AR', { weekday: 'long' }).toLowerCase();
    
    if (recurrenceDays.includes(dayName)) {
      // Solo agregar si la fecha de publicación ya llegó
      const publishDate = new Date(current);
      publishDate.setDate(current.getDate() - publishDaysBefore);
      
      if (publishDate <= new Date()) {
        dates.push(new Date(current));
      }
    }
    
    current.setDate(current.getDate() + 1);
  }
  
  return dates;
};