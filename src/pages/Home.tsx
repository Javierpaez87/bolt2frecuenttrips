import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Car, Shield, Clock, MapPin, Mountain, Trees, Compass } from 'lucide-react';
import Layout from '../components/layout/Layout';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import TripCard from '../components/trip/TripCard';
import RecurringTripCard from '../components/trip/RecurringTripCard';
import { Trip, RecurringTripGroup } from '../types';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { processFirestoreTrip } from '../utils/recurringTrips';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [recommendedTrips, setRecommendedTrips] = useState<Trip[]>([]);
  const [recommendedRecurringGroups, setRecommendedRecurringGroups] = useState<RecurringTripGroup[]>([]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/search?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}`);
  };

  useEffect(() => {
    const fetchRecommendedTrips = async () => {
      try {
        const db = getFirestore();
        const tripsRef = collection(db, 'Post Trips');
        const snapshot = await getDocs(tripsRef);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const allTrips: Trip[] = snapshot.docs
          .map((doc) => {
            const data = doc.data();
            return processFirestoreTrip(doc, data);
          })
          .filter((trip): trip is Trip => trip !== null && trip.availableSeats > 0);

        // Separar viajes individuales y recurrentes
        const individualTrips = allTrips
          .filter(trip => !trip.isRecurring && trip.departureDate >= today)
          .slice(0, 2);

        // Procesar grupos recurrentes
        const recurringGroups = new Map<string, RecurringTripGroup>();
        
        allTrips
          .filter(trip => trip.isRecurring && trip.recurrenceId)
          .forEach(trip => {
            if (!recurringGroups.has(trip.recurrenceId!)) {
              const nextTripDate = getNextTripDate(
                trip.recurrenceDays || [],
                trip.recurrenceStartDate || ''
              );

              recurringGroups.set(trip.recurrenceId!, {
                id: trip.recurrenceId!,
                driverId: trip.driverId,
                driver: trip.driver,
                origin: trip.origin,
                destination: trip.destination,
                departureTime: trip.departureTime,
                availableSeats: trip.availableSeats,
                price: trip.price,
                description: trip.description,
                carModel: trip.carModel,
                carColor: trip.carColor,
                recurrenceDays: trip.recurrenceDays || [],
                recurrenceStartDate: trip.recurrenceStartDate || '',
                recurrenceEndDate: trip.recurrenceEndDate,
                publishDaysBefore: trip.publishDaysBefore || 0,
                nextTripDate,
                createdAt: trip.createdAt,
                status: trip.status,
              });
            }
          });

        const recurringGroupsArray = Array.from(recurringGroups.values()).slice(0, 2);

        setRecommendedTrips(individualTrips);
        setRecommendedRecurringGroups(recurringGroupsArray);
      } catch (error) {
        console.error('Error al traer viajes recomendados:', error);
      }
    };

    fetchRecommendedTrips();
  }, []);

  // Función helper para obtener próxima fecha
  const getNextTripDate = (recurrenceDays: string[], startDate: string): Date => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const [year, month, day] = startDate.split('-').map(Number);
    const start = new Date(year, month - 1, day);
    
    if (start > today) {
      const startDayName = start.toLocaleDateString('es-AR', { weekday: 'long' }).toLowerCase();
      if (recurrenceDays.includes(startDayName)) {
        return start;
      }
    }
    
    const daysOfWeek = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    
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

  const processFirestoreTrip = (doc: any, data: any): Trip | null => {
    try {
      let departureDate: Date;

      if (data.departureDate) {
        if (typeof data.departureDate.toDate === 'function') {
          departureDate = data.departureDate.toDate();
        } else if (typeof data.departureDate === 'string') {
          const [year, month, day] = data.departureDate.split('-').map(Number);
          departureDate = new Date(year, month - 1, day);
        } else if (data.departureDate instanceof Date) {
          departureDate = data.departureDate;
        } else {
          return null;
        }
      } else {
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
      console.error('Error procesando viaje:', error);
      return null;
    }
  };

  const totalRecommendations = recommendedTrips.length + recommendedRecurringGroups.length;

  return (
    <Layout>
      {/* Hero Section - Gradiente patagónico */}
      <section className="relative bg-gradient-patagonia text-white py-16 md:py-24 overflow-hidden">
        {/* Decoración de montañas de fondo */}
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" viewBox="0 0 1200 600" fill="currentColor">
            <path d="M0 400 L200 200 L400 300 L600 150 L800 250 L1000 100 L1200 200 L1200 600 L0 600 Z" />
            <path d="M0 450 L150 300 L350 380 L550 250 L750 350 L950 200 L1200 300 L1200 600 L0 600 Z" opacity="0.7"/>
          </svg>
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="flex flex-col md:flex-row items-center">
            <div className="md:w-1/2 mb-8 md:mb-0">
              <div className="flex items-center mb-4">
                <Mountain className="h-8 w-8 text-accent-300 mr-3" />
                <span className="text-accent-200 font-semibold text-lg">Patagonia</span>
              </div>

              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight mb-4 animate-slide-up text-shadow-lg">
                Juntos y al mismo lugar 
                <span className="text-accent-300"> BondiCar</span>
              </h1>

              <p className="text-lg md:text-xl opacity-90 mb-8 max-w-xl animate-slide-up" style={{ animationDelay: '0.1s' }}>
                Conectamos viajeros, ahorramos combustible, y hacemos amigos.
              </p>

              <form onSubmit={handleSearch} className="bg-white rounded-xl p-6 shadow-strong animate-slide-up border border-slate-200" style={{ animationDelay: '0.2s' }}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <Input
                    list="lugares"
                    placeholder="¿Desde dónde salís?"
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                    leftIcon={<MapPin className="h-5 w-5 text-primary-600" />}
                    required
                    className="border-slate-300 focus:border-primary-500 focus:ring-primary-500 text-slate-800"
                  />
                  
                  <Input
                    list="lugares"
                    placeholder="¿A dónde vas?"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    leftIcon={<MapPin className="h-5 w-5 text-secondary-600" />}
                    required
                    className="border-slate-300 focus:border-primary-500 focus:ring-primary-500 text-slate-800"
                  />
                </div>

                <Button 
                  type="submit" 
                  variant="primary" 
                  fullWidth 
                  icon={<Search className="h-5 w-5" />}
                  className="bg-primary-600 hover:bg-primary-700 text-white font-bold shadow-medium hover:shadow-strong transition-all duration-200"
                >
                  Buscar Viajes
                </Button>
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

            <div className="md:w-1/2 flex justify-center">
              <div className="relative">
                <img 
                  src="/sma dedo.png" 
                  alt="Viajero haciendo dedo en la Patagonia" 
                  className="rounded-xl shadow-2xl max-w-full h-auto animate-fade-in border-4 border-emerald-500"
                  style={{ maxHeight: '500px' }}
                />
                <div className="absolute -bottom-4 -right-4 bg-emerald-600 text-white p-3 rounded-lg shadow-lg">
                  <Compass className="h-6 w-6" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Viajes recomendados */}
      {totalRecommendations > 0 && (
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-10 text-slate-800">
              Viajes que pueden interesarte
            </h2>
            
            <div className="space-y-8">
              {/* Viajes Recurrentes */}
              {recommendedRecurringGroups.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm mr-2">
                      Recurrentes
                    </span>
                    Se repiten semanalmente
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {recommendedRecurringGroups.map((group) => (
                      <div
                        key={group.id}
                        className="cursor-pointer"
                        onClick={() => navigate('/search')}
                      >
                        <RecurringTripCard group={group} hideConductorInfo />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Viajes Individuales */}
              {recommendedTrips.length > 0 && (
                <div>
                  {recommendedRecurringGroups.length > 0 && (
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm mr-2">
                        Individuales
                      </span>
                      Viajes de una sola vez
                    </h3>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {recommendedTrips.map((trip) => (
                      <div
                        key={trip.id}
                        className="cursor-pointer"
                        onClick={() => navigate('/search')}
                      >
                        <TripCard trip={trip} hideConductorInfo />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="text-center mt-10">
              <Button
                onClick={() => navigate('/search')}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold border border-emerald-500 px-6 py-3 rounded-xl shadow-lg"
              >
                Ver más viajes
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* CTA Section - Gradiente vibrante */}
      <section className="py-16 bg-gradient-lake text-white">
        <div className="container mx-auto px-4 text-center">
          <Mountain className="h-16 w-16 mx-auto mb-6 text-white/80 animate-float" />
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            ¿Vamos? 
            Te llevo!
          </h2>
          <p className="text-lg opacity-90 mb-8 max-w-2xl mx-auto">
            Únite a nuestra comunidad de viajeros patagónicos. Ahorrá dinero, 
            conocé gente y cuidemos juntos nuestros hermosos paisajes.
          </p>

          <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4">
            <Button 
              variant="secondary" 
              size="lg"
              onClick={() => navigate('/create-trip')}
              className="bg-slate-800 hover:bg-slate-700 text-white border-slate-700 shadow-medium hover:shadow-strong transition-all duration-200"
            >
              Publicar un Viaje
            </Button>

            <Button 
              variant="outline" 
              size="lg"
              className="border-white text-white hover:bg-white hover:text-primary-600 shadow-medium hover:shadow-strong transition-all duration-200"
              onClick={() => navigate('/search')}
            >
              Buscar Viajes
            </Button>
          </div>
        </div>
      </section>
      
      {/* Features Section - Fondo claro */}
      <section className="py-16 bg-gradient-to-b from-slate-50 to-slate-100">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <Trees className="h-12 w-12 text-secondary-600 mx-auto mb-4" />
            <h2 className="text-2xl md:text-3xl font-bold text-slate-800 mb-4">
              ¿Por qué elegir BondiCar?
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              Nacimos en Junín de los Andes para conectar a los viajeros de la Patagonia
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-xl shadow-card hover:shadow-card-hover transition-all duration-300 border-l-4 border-primary-500 group">
              <div className="rounded-full bg-primary-100 p-4 w-16 h-16 flex items-center justify-center mb-6 mx-auto group-hover:bg-primary-200 transition-colors">
                <Car className="h-8 w-8 text-primary-600" />
              </div>
              <h3 className="text-xl font-bold mb-4 text-slate-800 text-center">Ahorrá en tus viajes</h3>
              <p className="text-slate-600 text-center leading-relaxed">
                Compartí los gastos de nafta y peajes. En rutas largas como la 40, 
                el ahorro es significativo para todos.
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-card hover:shadow-card-hover transition-all duration-300 border-l-4 border-secondary-500 group">
              <div className="rounded-full bg-secondary-100 p-4 w-16 h-16 flex items-center justify-center mb-6 mx-auto group-hover:bg-secondary-200 transition-colors">
                <Shield className="h-8 w-8 text-secondary-600" />
              </div>
              <h3 className="text-xl font-bold mb-4 text-slate-800 text-center">Viajá con confianza</h3>
              <p className="text-slate-600 text-center leading-relaxed">
                Perfiles verificados y sistema de valoraciones. 
                La comunidad patagónica se cuida entre sí.
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-card hover:shadow-card-hover transition-all duration-300 border-l-4 border-accent-500 group">
              <div className="rounded-full bg-accent-100 p-4 w-16 h-16 flex items-center justify-center mb-6 mx-auto group-hover:bg-accent-200 transition-colors">
                <Clock className="h-8 w-8 text-accent-600" />
              </div>
              <h3 className="text-xl font-bold mb-4 text-slate-800 text-center">Flexible y conveniente</h3>
              <p className="text-slate-600 text-center leading-relaxed">
                Encontrá viajes que se adapten a tu horario. 
                Perfecto para trabajadores que van entre ciudades.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works Section - Gradiente oscuro */}
      <section className="py-16 bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 text-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              ¿Cómo funciona?
            </h2>
            <p className="text-slate-300 mb-8 max-w-2xl mx-auto">
              Simple como hacer dedo en la ruta, pero más seguro y organizado
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center bg-slate-700/50 p-8 rounded-xl border border-primary-500/30 backdrop-blur-sm hover:bg-slate-700/70 transition-all duration-300">
              <div className="bg-primary-500 text-white rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6 text-2xl font-bold shadow-medium hover:bg-primary-400 transition-colors">
                1
              </div>
              <h3 className="text-xl font-bold mb-4 text-slate-100">Buscá tu viaje</h3>
              <p className="text-slate-300 leading-relaxed">
                Ingresá tu origen, destino y fecha. Encontrá viajes disponibles 
                en tu ruta patagónica.
              </p>
            </div>

            <div className="text-center bg-slate-700/50 p-8 rounded-xl border border-secondary-500/30 backdrop-blur-sm hover:bg-slate-700/70 transition-all duration-300">
              <div className="bg-secondary-500 text-white rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6 text-2xl font-bold shadow-medium hover:bg-secondary-400 transition-colors">
                2
              </div>
              <h3 className="text-xl font-bold mb-4 text-slate-100">Reservá tu lugar</h3>
              <p className="text-slate-300 leading-relaxed">
                Elegí un viaje que te convenga y reservá tu asiento. 
                Coordiná los detalles con el conductor.
              </p>
            </div>

            <div className="text-center bg-slate-700/50 p-8 rounded-xl border border-accent-500/30 backdrop-blur-sm hover:bg-slate-700/70 transition-all duration-300">
              <div className="bg-accent-500 text-white rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6 text-2xl font-bold shadow-medium hover:bg-accent-400 transition-colors">
                3
              </div>
              <h3 className="text-xl font-bold mb-4 text-slate-100">¡Disfrutá el viaje!</h3>
              <p className="text-slate-300 leading-relaxed">
                Compartí la ruta, los gastos y quizás hagás nuevos amigos 
                en el camino.
              </p>
            </div>
          </div>
        </div>
      </section>
      
      {/* Testimonios */}
      <section className="py-16 bg-gradient-to-b from-slate-50 to-white">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-12 text-slate-800">
            Lo que dicen nuestros viajeros
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Agustín */}
            <div className="bg-white p-8 rounded-xl shadow-card border-l-4 border-emerald-500">
              <div className="flex items-center mb-6">
                <img 
                  src="/agustin-r.jpeg" 
                  alt="Testimonio de Agustín" 
                  className="w-16 h-16 rounded-full object-cover mr-4 border-2 border-emerald-500"
                />
                <div>
                  <h4 className="font-bold text-slate-800">Agustín R.</h4>
                  <p className="text-sm text-slate-600">Bariloche</p>
                  <div className="flex mt-1">
                    {[...Array(5)].map((_, i) => (
                      <svg key={i} className="w-4 h-4 text-yellow-500 fill-current" viewBox="0 0 24 24">
                        <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                      </svg>
                    ))}
                  </div>
                </div>
              </div>
              <p className="text-slate-600 italic leading-relaxed">
                "Uso BondiCar para moverme de Dina Huapi a Bari. He conocido gente increíble y ahorré una fortuna en combustible. ¡Recomendadísimo!"
              </p>
            </div>

            {/* Paz */}
            <div className="bg-white p-8 rounded-xl shadow-card border-l-4 border-emerald-500">
              <div className="flex items-center mb-6">
                <img 
                  src="/Paz R.png" 
                  alt="Testimonio de Paz" 
                  className="w-16 h-16 rounded-full object-cover mr-4 border-2 border-emerald-500"
                />
                <div>
                  <h4 className="font-bold text-slate-800">Paz R.</h4>
                  <p className="text-sm text-slate-600">San Martín de los Andes</p>
                  <div className="flex mt-1">
                    {[...Array(5)].map((_, i) => (
                      <svg key={i} className="w-4 h-4 text-yellow-500 fill-current" viewBox="0 0 24 24">
                        <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                      </svg>
                    ))}
                  </div>
                </div>
              </div>
              <p className="text-slate-600 italic leading-relaxed">
                "La app es súper fácil de usar. Lo que más me gusta es poder reducir costos y hacer los viajes más lindos conociendo gente!"
              </p>
            </div>

            {/* Javier */}
            <div className="bg-white p-8 rounded-xl shadow-card border-l-4 border-emerald-500">
              <div className="flex items-center mb-6">
                <img 
                  src="/Javier P.jpeg" 
                  alt="Testimonio de Javier" 
                  className="w-16 h-16 rounded-full object-cover mr-4 border-2 border-emerald-500"
                />
                <div>
                  <h4 className="font-bold text-slate-800">Javier P.</h4>
                  <p className="text-sm text-slate-600">Junín de los Andes</p>
                  <div className="flex mt-1">
                    {[...Array(4)].map((_, i) => (
                      <svg key={i} className="w-4 h-4 text-yellow-500 fill-current" viewBox="0 0 24 24">
                        <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                      </svg>
                    ))}
                    <svg className="w-4 h-4 text-slate-300 fill-current" viewBox="0 0 24 24">
                      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                    </svg>
                  </div>
                </div>
              </div>
              <p className="text-slate-600 italic leading-relaxed">
                "Perfecta para los que vivimos en pueblos chicos y necesitamos viajar a las ciudades. ¡Una solución genial para la Patagonia!"
              </p>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Home;