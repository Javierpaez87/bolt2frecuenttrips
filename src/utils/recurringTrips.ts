import { DocumentData } from 'firebase/firestore';
import { Trip } from '../types';

// Función helper para crear fecha local desde string YYYY-MM-DD
export const createLocalDate = (dateString: string): Date => {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day); // month - 1 porque Date usa 0-indexado
};

// 🔧 FUNCIÓN SIMPLIFICADA: Generar fechas recurrentes SIN lógica compleja
export const generateRecurringDates = (
  startDate: string, 
  endDate: string | undefined, 
  recurrenceDays: string[], 
  publishDaysBefore: number
): string[] => {
  const dates: string[] = [];
  const start = createLocalDate(startDate);
  const end = endDate ? createLocalDate(endDate) : new Date(start.getFullYear() + 1, start.getMonth(), start.getDate());
  
  console.log('🔧 Generando fechas recurrentes SIMPLIFICADO:', {
    startDate,
    endDate,
    recurrenceDays,
    publishDaysBefore
  });

  // Mapeo de días en español a números (0 = domingo, 1 = lunes, etc.)
  const dayMapping: { [key: string]: number } = {
    'domingo': 0,
    'lunes': 1,
    'martes': 2,
    'miércoles': 3,
    'jueves': 4,
    'viernes': 5,
    'sábado': 6
  };

  const targetDayNumbers = recurrenceDays.map(day => dayMapping[day]).filter(num => num !== undefined);
  
  console.log('🔧 Días objetivo:', recurrenceDays, '→', targetDayNumbers);

  let current = new Date(start);
  let generatedCount = 0;
  const maxDates = 365; // Límite de seguridad

  while (current <= end && generatedCount < maxDates) {
    const currentDayNumber = current.getDay();
    
    if (targetDayNumbers.includes(currentDayNumber)) {
      // 🔧 SIMPLIFICADO: Generar TODAS las fechas que coincidan con los días
      // La lógica de "cuándo publicar" se maneja en el frontend, no aquí
      const dateString = current.toISOString().split('T')[0];
      dates.push(dateString);
      generatedCount++;
      
      console.log('✅ Fecha generada:', dateString, 'día de la semana:', currentDayNumber);
    }
    
    current.setDate(current.getDate() + 1);
  }

  console.log('🎯 Total fechas generadas:', dates.length);
  return dates;
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

// 🔧 FUNCIÓN SIMPLIFICADA: Obtener próxima fecha de viaje recurrente
export const getNextTripDate = (recurrenceDays: string[], startDate: string): Date => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const start = createLocalDate(startDate);
  
  // Mapeo de días en español a números
  const dayMapping: { [key: string]: number } = {
    'domingo': 0,
    'lunes': 1,
    'martes': 2,
    'miércoles': 3,
    'jueves': 4,
    'viernes': 5,
    'sábado': 6
  };

  const targetDayNumbers = recurrenceDays.map(day => dayMapping[day]).filter(num => num !== undefined);
  
  console.log('🔧 getNextTripDate - días objetivo:', recurrenceDays, '→', targetDayNumbers);
  
  // 🔧 SIMPLIFICADO: Buscar desde la fecha de inicio hacia adelante
  let current = new Date(Math.max(start.getTime(), today.getTime()));
  
  for (let i = 0; i < 14; i++) {
    const checkDate = new Date(current);
    checkDate.setDate(current.getDate() + i);
    
    const dayNumber = checkDate.getDay();
    
    if (targetDayNumbers.includes(dayNumber)) {
      console.log('🔧 Próximo viaje encontrado:', checkDate.toISOString().split('T')[0], 'día:', dayNumber);
      return checkDate;
    }
  }
  
  console.log('🔧 No se encontró próximo viaje, devolviendo fecha de inicio');
  return start;
};