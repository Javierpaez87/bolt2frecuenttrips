import { DocumentData } from 'firebase/firestore';
import { Trip } from '../types';

// Función helper para crear fecha local desde string YYYY-MM-DD
export const createLocalDate = (dateString: string): Date => {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day); // month - 1 porque Date usa 0-indexado
  
  console.log('🔧 createLocalDate:', {
    input: dateString,
    parsed: { year, month, day },
    result: date.toISOString().split('T')[0],
    getDate: date.getDate(),
    getMonth: date.getMonth() + 1,
    getFullYear: date.getFullYear()
  });
  
  return date;
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
  
  console.log('🔧 generateRecurringDates INPUT:', {
    startDate,
    endDate,
    recurrenceDays,
    publishDaysBefore,
    startParsed: start.toISOString().split('T')[0],
    endParsed: end.toISOString().split('T')[0]
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
      
      console.log('✅ Fecha generada:', {
        dateString,
        dayOfWeek: currentDayNumber,
        currentDate: current.toISOString().split('T')[0],
        getDate: current.getDate(),
        getMonth: current.getMonth() + 1,
        getFullYear: current.getFullYear()
      });
    }
    
    current.setDate(current.getDate() + 1);
  }

  console.log('🎯 generateRecurringDates OUTPUT:', {
    totalGenerated: dates.length,
    firstFew: dates.slice(0, 3),
    lastFew: dates.slice(-3)
  });
  
  return dates;
};

// Función helper para procesar datos de viaje desde Firestore
export const processFirestoreTrip = (doc: any, data: DocumentData): Trip | null => {
  try {
    let departureDate: Date;

    console.log('🔧 processFirestoreTrip INPUT:', {
      docId: doc.id,
      departureDateRaw: data.departureDate,
      departureDateType: typeof data.departureDate,
      hasToDate: typeof data.departureDate?.toDate === 'function',
      isRecurring: data.isRecurring
    });

    // Manejar diferentes formatos de fecha
    if (data.departureDate) {
      if (typeof data.departureDate.toDate === 'function') {
        // Es un Timestamp de Firestore
        departureDate = data.departureDate.toDate();
        console.log('🔧 Timestamp convertido:', {
          original: data.departureDate,
          converted: departureDate.toISOString().split('T')[0],
          getDate: departureDate.getDate(),
          getMonth: departureDate.getMonth() + 1
        });
      } else if (typeof data.departureDate === 'string') {
        // Es un string, convertir a Date local
        departureDate = createLocalDate(data.departureDate);
        console.log('🔧 String convertido:', {
          original: data.departureDate,
          converted: departureDate.toISOString().split('T')[0],
          getDate: departureDate.getDate(),
          getMonth: departureDate.getMonth() + 1
        });
      } else if (data.departureDate instanceof Date) {
        // Ya es un Date
        departureDate = data.departureDate;
        console.log('🔧 Date directo:', {
          original: data.departureDate,
          iso: departureDate.toISOString().split('T')[0],
          getDate: departureDate.getDate(),
          getMonth: departureDate.getMonth() + 1
        });
      } else {
        console.warn('Formato de fecha no reconocido:', data.departureDate);
        return null;
      }
    } else {
      console.warn('No se encontró departureDate en el documento:', doc.id);
      return null;
    }

    const trip = {
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

    console.log('🔧 processFirestoreTrip OUTPUT:', {
      tripId: trip.id,
      isRecurring: trip.isRecurring,
      departureDate: trip.departureDate.toISOString().split('T')[0],
      getDate: trip.departureDate.getDate(),
      getMonth: trip.departureDate.getMonth() + 1,
      getFullYear: trip.departureDate.getFullYear()
    });

    return trip;
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
  
  console.log('🔧 getNextTripDate INPUT:', {
    recurrenceDays,
    startDate,
    today: today.toISOString().split('T')[0],
    start: start.toISOString().split('T')[0]
  });
  
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
      console.log('🔧 getNextTripDate OUTPUT:', {
        found: checkDate.toISOString().split('T')[0],
        dayNumber,
        getDate: checkDate.getDate(),
        getMonth: checkDate.getMonth() + 1
      });
      return checkDate;
    }
  }
  
  console.log('🔧 No se encontró próximo viaje, devolviendo fecha de inicio');
  return start;
};