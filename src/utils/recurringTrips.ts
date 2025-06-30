import { DocumentData } from 'firebase/firestore';
import { Trip } from '../types';

// Función helper para crear fecha local desde string YYYY-MM-DD
export const createLocalDate = (dateString: string): Date => {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day); // month - 1 porque Date usa 0-indexado
};

// Función helper para procesar datos de viaje desde Firestore
export const processFirestoreTrip = (doc: any, data: DocumentData): Trip | null => {
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

// Función helper para obtener próxima fecha de viaje recurrente
export const getNextTripDate = (recurrenceDays: string[], startDate: string): Date => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const [year, month, day] = startDate.split('-').map(Number);
  const start = new Date(year, month - 1, day);
  
  // Si la fecha de inicio es futura y coincide con un día de recurrencia
  if (start > today) {
    const startDayName = start.toLocaleDateString('es-AR', { weekday: 'long' }).toLowerCase();
    if (recurrenceDays.includes(startDayName)) {
      return start;
    }
  }
  
  // Buscar el próximo día que coincida con la recurrencia
  for (let i = 0; i < 14; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(today.getDate() + i);
    
    const dayName = checkDate.toLocaleDateString('es-AR', { weekday: 'long' }).toLowerCase();
    
    if (recurrenceDays.includes(dayName) && checkDate >= start) {
      return checkDate;
    }
  }
  
  return start;
};