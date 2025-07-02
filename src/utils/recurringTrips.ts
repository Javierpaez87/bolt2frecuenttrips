import { DocumentData } from 'firebase/firestore';
import { Trip } from '../types';

// Función helper para crear fecha local desde string YYYY-MM-DD
export const createLocalDate = (dateString: string): Date => {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day); // month - 1 porque Date usa 0-indexado
};

// 🔧 NUEVA FUNCIÓN: Generar fechas recurrentes con lógica mejorada
export const generateRecurringDates = (
  startDate: string, 
  endDate: string | undefined, 
  recurrenceDays: string[], 
  publishDaysBefore: number
): string[] => {
  const dates: string[] = [];
  const start = createLocalDate(startDate);
  const end = endDate ? createLocalDate(endDate) : new Date(start.getFullYear() + 1, start.getMonth(), start.getDate());
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  console.log('🔧 Generando fechas recurrentes:', {
    startDate,
    endDate,
    recurrenceDays,
    publishDaysBefore,
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0]
  });

  // Mapeo de días en español a inglés para consistencia
  const dayMapping: { [key: string]: string } = {
    'lunes': 'monday',
    'martes': 'tuesday',
    'miércoles': 'wednesday',
    'jueves': 'thursday',
    'viernes': 'friday',
    'sábado': 'saturday',
    'domingo': 'sunday'
  };

  // Convertir días a inglés para usar con Date.getDay()
  const targetDays = recurrenceDays.map(day => dayMapping[day] || day);
  const targetDayNumbers = targetDays.map(day => {
    const dayMap: { [key: string]: number } = {
      'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3,
      'thursday': 4, 'friday': 5, 'saturday': 6
    };
    return dayMap[day];
  }).filter(num => num !== undefined);

  console.log('🔧 Días objetivo (números):', targetDayNumbers);

  let current = new Date(start);
  let generatedCount = 0;
  const maxDates = 365; // Límite de seguridad

  while (current <= end && generatedCount < maxDates) {
    const currentDayNumber = current.getDay();
    
    if (targetDayNumbers.includes(currentDayNumber)) {
      // 🔧 CORREGIDO: Solo crear viajes que deben publicarse ahora o en el futuro cercano
      const publishDate = new Date(current);
      publishDate.setDate(publishDate.getDate() - publishDaysBefore);
      
      // Solo agregar si la fecha de publicación es hoy o en el pasado (ya debe estar visible)
      if (publishDate <= today) {
        const dateString = current.toISOString().split('T')[0];
        dates.push(dateString);
        generatedCount++;
        
        console.log('✅ Fecha generada para publicar:', dateString, 'día de la semana:', currentDayNumber);
      } else {
        console.log('⏳ Fecha futura, no se publica aún:', current.toISOString().split('T')[0]);
      }
    }
    
    current.setDate(current.getDate() + 1);
  }

  console.log('🎯 Total fechas a publicar ahora:', dates.length);
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

// 🔧 FUNCIÓN MEJORADA: Obtener próxima fecha de viaje recurrente
export const getNextTripDate = (recurrenceDays: string[], startDate: string): Date => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const start = createLocalDate(startDate);
  
  // Mapeo de días en español a números
  const dayMapping: { [key: string]: number } = {
    'lunes': 1, 'martes': 2, 'miércoles': 3, 'jueves': 4,
    'viernes': 5, 'sábado': 6, 'domingo': 0
  };

  const targetDayNumbers = recurrenceDays.map(day => dayMapping[day]).filter(num => num !== undefined);
  
  console.log('🔧 getNextTripDate - días objetivo:', recurrenceDays, '→', targetDayNumbers);
  
  // Si la fecha de inicio es futura y coincide con un día de recurrencia
  if (start > today) {
    const startDayNumber = start.getDay();
    if (targetDayNumbers.includes(startDayNumber)) {
      console.log('🔧 Próximo viaje es la fecha de inicio:', start.toISOString().split('T')[0]);
      return start;
    }
  }
  
  // Buscar el próximo día que coincida con la recurrencia
  for (let i = 0; i < 14; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(today.getDate() + i);
    
    const dayNumber = checkDate.getDay();
    
    if (targetDayNumbers.includes(dayNumber) && checkDate >= start) {
      console.log('🔧 Próximo viaje encontrado:', checkDate.toISOString().split('T')[0], 'día:', dayNumber);
      return checkDate;
    }
  }
  
  console.log('🔧 No se encontró próximo viaje, devolviendo fecha de inicio');
  return start;
};