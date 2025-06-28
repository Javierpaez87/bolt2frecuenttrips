import React, { useState } from 'react';
import { MapPin, Calendar, Users, DollarSign, Search } from 'lucide-react';
import { TripFilters } from '../../types';
import Input from '../ui/Input';
import Button from '../ui/Button';

interface TripFilterProps {
  onFilter: (filters: TripFilters) => void;
}

const TripFilter: React.FC<TripFilterProps> = ({ onFilter }) => {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [date, setDate] = useState('');
  const [minSeats, setMinSeats] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const filters: TripFilters = {
      origin: origin || undefined,
      destination: destination || undefined,
      date: date ? new Date(date) : undefined,
      minSeats: minSeats ? parseInt(minSeats) : undefined,
      maxPrice: maxPrice ? parseInt(maxPrice) : undefined,
    };

    onFilter(filters);
  };

  const handleReset = () => {
    setOrigin('');
    setDestination('');
    setDate('');
    setMinSeats('');
    setMaxPrice('');

    onFilter({});
  };

  return (
    <div className="bg-white shadow-sm rounded-lg p-4 mb-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Filtrar Viajes</h2>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Input
            label="Origen"
            placeholder="¿Desde dónde sales?"
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
            list="lugares"
            leftIcon={<MapPin className="h-5 w-5 text-emerald-500" />}
          />

          <Input
            label="Destino"
            placeholder="¿A dónde vas?"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            list="lugares"
            leftIcon={<MapPin className="h-5 w-5 text-teal-500" />}
          />

          <Input
            label="Fecha"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            leftIcon={<Calendar className="h-5 w-5 text-lime-500" />}
          />

          <Input
            label="Asientos mínimos"
            type="number"
            min="1"
            placeholder="1"
            value={minSeats}
            onChange={(e) => setMinSeats(e.target.value)}
            leftIcon={<Users className="h-5 w-5 text-emerald-500" />}
          />

          <Input
            label="Precio máximo"
            type="number"
            min="0"
            placeholder="Precio máximo"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            leftIcon={<DollarSign className="h-5 w-5 text-teal-500" />}
          />
        </div>

        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 mt-4">
          <Button
            type="submit"
            variant="primary"
            icon={<Search className="h-4 w-4" />}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            Buscar
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
            className="border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Limpiar filtros
          </Button>
        </div>

        {/* Lista de sugerencias para inputs de origen/destino */}
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
      </form>
    </div>
  );
};

export default TripFilter;
