import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Calendar as CalendarIcon, Download, Filter, Search, X } from 'lucide-react';
import { bookingsApi } from '../lib/api/bookings';
import type { Booking } from '../types';
import toast from 'react-hot-toast';

type BookingStatus = 'all' | 'confirmed' | 'pending' | 'cancelled';
type BookingType = 'all' | 'single' | 'double';
type RoomFilter = 'all' | 'caryophyllus' | 'rosales';

interface FilterState {
  dateRange: [Date | null, Date | null];
  status: BookingStatus;
  type: BookingType;
  room: RoomFilter;
  search: string;
}

function BookingStatusBadge({ status }: { status: string }) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
      {status === 'confirmed' && 'Confermata'}
      {status === 'pending' && 'In attesa'}
      {status === 'cancelled' && 'Cancellata'}
    </span>
  );
}

function BookingRow({ booking, onStatusChange, onDelete }: {
  booking: Booking;
  onStatusChange: (id: number, status: string) => void;
  onDelete: (id: number) => void;
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-900">
          {format(new Date(booking.check_in), 'dd/MM/yyyy')}
        </div>
        <div className="text-sm text-gray-500">
          {format(new Date(booking.check_out), 'dd/MM/yyyy')}
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="text-sm font-medium text-gray-900">{booking.guest_name}</div>
        <div className="text-sm text-gray-500">{booking.guest_email}</div>
        <div className="text-sm text-gray-500">{booking.guest_phone}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {booking.nights} notti
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {booking.booking_type === 'single' ? 'Singola' : 'Doppia'}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {booking.adults} adulti, {booking.children} bambini
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        €{booking.total_amount.toFixed(2)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <BookingStatusBadge status={booking.status} />
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <div className="relative">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="text-gray-600 hover:text-gray-900"
          >
            •••
          </button>
          {isMenuOpen && (
            <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
              <div className="py-1">
                <button
                  onClick={() => {
                    onStatusChange(booking.id, 'confirmed');
                    setIsMenuOpen(false);
                  }}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Conferma
                </button>
                <button
                  onClick={() => {
                    onDelete(booking.id);
                    setIsMenuOpen(false);
                  }}
                  className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                >
                  Cancella
                </button>
              </div>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}

function Bookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    dateRange: [null, null],
    status: 'all',
    type: 'all',
    room: 'all',
    search: '',
  });

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const data = await bookingsApi.getAllBookings();
      setBookings(data);
    } catch (error) {
      toast.error('Errore nel caricamento delle prenotazioni');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id: number, status: string) => {
    try {
      await bookingsApi.updateBooking(id, { status });
      toast.success('Stato prenotazione aggiornato');
      fetchBookings();
    } catch (error) {
      toast.error('Errore nell\'aggiornamento dello stato');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Sei sicuro di voler cancellare questa prenotazione?')) return;

    try {
      await bookingsApi.cancelBooking(id);
      toast.success('Prenotazione cancellata');
      fetchBookings();
    } catch (error) {
      toast.error('Errore nella cancellazione');
    }
  };

  const filteredBookings = bookings.filter(booking => {
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      if (!booking.guest_name.toLowerCase().includes(searchLower) &&
          !booking.guest_email.toLowerCase().includes(searchLower) &&
          !booking.guest_phone.includes(searchLower)) {
        return false;
      }
    }

    if (filters.status !== 'all' && booking.status !== filters.status) return false;
    if (filters.type !== 'all' && booking.booking_type !== filters.type) return false;
    
    return true;
  });

  const exportToCSV = () => {
    const headers = [
      'Data Check-in',
      'Data Check-out',
      'Nome Ospite',
      'Email',
      'Telefono',
      'Notti',
      'Tipo',
      'Adulti',
      'Bambini',
      'Importo',
      'Stato'
    ].join(',');

    const rows = filteredBookings.map(booking => [
      format(new Date(booking.check_in), 'dd/MM/yyyy'),
      format(new Date(booking.check_out), 'dd/MM/yyyy'),
      booking.guest_name,
      booking.guest_email,
      booking.guest_phone,
      booking.nights,
      booking.booking_type === 'single' ? 'Singola' : 'Doppia',
      booking.adults,
      booking.children,
      booking.total_amount.toFixed(2),
      booking.status
    ].join(','));

    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `prenotazioni_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="sm:flex sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Prenotazioni</h1>
        <div className="mt-4 sm:mt-0 sm:flex sm:space-x-4">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filtri
          </button>
          <button
            onClick={exportToCSV}
            className="mt-2 sm:mt-0 inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <Download className="h-4 w-4 mr-2" />
            Esporta CSV
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="mt-4 bg-white p-4 rounded-lg shadow">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Ricerca</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                  placeholder="Nome, email, telefono..."
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Stato</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value as BookingStatus })}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              >
                <option value="all">Tutti</option>
                <option value="confirmed">Confermata</option>
                <option value="pending">In attesa</option>
                <option value="cancelled">Cancellata</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Tipo</label>
              <select
                value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value as BookingType })}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              >
                <option value="all">Tutti</option>
                <option value="single">Singola</option>
                <option value="double">Doppia</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Stanza</label>
              <select
                value={filters.room}
                onChange={(e) => setFilters({ ...filters, room: e.target.value as RoomFilter })}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              >
                <option value="all">Tutte</option>
                <option value="caryophyllus">Caryophyllus</option>
                <option value="rosales">Rosales</option>
              </select>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 flex flex-col">
        <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ospite
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Durata
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ospiti
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Importo
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Stato
                    </th>
                    <th scope="col" className="relative px-6 py-3">
                      <span className="sr-only">Azioni</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredBookings.map((booking) => (
                    <BookingRow
                      key={booking.id}
                      booking={booking}
                      onStatusChange={handleStatusChange}
                      onDelete={handleDelete}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Bookings;