import { ChevronLeft, ChevronRight } from 'lucide-react';
import { addMonths, format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, isWithinInterval } from 'date-fns';
import { it } from 'date-fns/locale';
import { useState } from 'react';
import { cn } from '../../lib/utils';
import { useAvailabilityStore } from '../../stores/availabilityStore';
import { useRoomStore } from '../../stores/roomStore';
import toast from 'react-hot-toast';

interface CalendarProps {
  mode?: 'single' | 'range' | 'admin';
  selectedDates?: Date[];
  onSelect?: (dates: Date[]) => void;
  className?: string;
}

interface DateRangePickerProps {
  startDate: Date | null;
  endDate: Date | null;
  onDateChange: (start: Date | null, end: Date | null) => void;
}

function DateRangePicker({ startDate, endDate, onDateChange }: DateRangePickerProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Dal</label>
        <input
          type="date"
          value={startDate ? format(startDate, 'yyyy-MM-dd') : ''}
          onChange={(e) => onDateChange(e.target.value ? new Date(e.target.value) : null, endDate)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Fino al</label>
        <input
          type="date"
          value={endDate ? format(endDate, 'yyyy-MM-dd') : ''}
          onChange={(e) => onDateChange(startDate, e.target.value ? new Date(e.target.value) : null)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
      </div>
    </div>
  );
}

interface BulkEditPanelProps {
  selectedDates: { start: Date | null; end: Date | null };
  selectedRoom: number | null;
  onUpdatePrice: (price: number) => void;
  onUpdateAvailability: (status: 'available' | 'blocked') => void;
}

function BulkEditPanel({ selectedDates, selectedRoom, onUpdatePrice, onUpdateAvailability }: BulkEditPanelProps) {
  const [price, setPrice] = useState<string>('');

  if (!selectedDates.start || !selectedRoom) return null;

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg space-y-6">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Prezzo per notte
          </label>
          <div className="mt-1 relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-500 sm:text-sm">€</span>
            </div>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="pl-7 block w-full rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              placeholder="0.00"
            />
          </div>
          <button
            onClick={() => onUpdatePrice(Number(price))}
            className="mt-2 w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Aggiorna prezzo
          </button>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Disponibilità
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => onUpdateAvailability('available')}
              className="inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
            >
              Apri
            </button>
            <button
              onClick={() => onUpdateAvailability('blocked')}
              className="inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
            >
              Chiudi
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Calendar({ mode = 'single', selectedDates = [], onSelect, className }: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateRanges, setSelectedDateRanges] = useState<Map<number, { start: Date | null; end: Date | null }>>(new Map());
  const [selectedRoom, setSelectedRoom] = useState<number | null>(null);
  
  const { rooms } = useRoomStore();
  const { availability, updateBulkAvailability } = useAvailabilityStore();

  const firstDayOfMonth = startOfMonth(currentDate);
  const lastDayOfMonth = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: firstDayOfMonth, end: lastDayOfMonth });

  const previousMonth = () => setCurrentDate(addMonths(currentDate, -1));
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  const handleDateClick = (day: Date, roomId: number) => {
    setSelectedRoom(roomId);
    const currentRange = selectedDateRanges.get(roomId) || { start: null, end: null };
    
    if (!currentRange.start) {
      setSelectedDateRanges(new Map(selectedDateRanges.set(roomId, { start: day, end: null })));
    } else if (!currentRange.end) {
      const start = currentRange.start;
      if (day < start) {
        setSelectedDateRanges(new Map(selectedDateRanges.set(roomId, { start: day, end: start })));
      } else {
        setSelectedDateRanges(new Map(selectedDateRanges.set(roomId, { start, end: day })));
      }
    } else {
      setSelectedDateRanges(new Map(selectedDateRanges.set(roomId, { start: day, end: null })));
    }
  };

  const handleBulkPriceUpdate = async (price: number) => {
    if (!selectedRoom) return;
    const range = selectedDateRanges.get(selectedRoom);
    if (!range?.start || !range?.end) return;

    const daysToUpdate = eachDayOfInterval({
      start: range.start,
      end: range.end
    }).map(date => ({
      room_id: selectedRoom,
      date: format(date, 'yyyy-MM-dd'),
      price_override: price
    }));

    try {
      await updateBulkAvailability(daysToUpdate);
      toast.success('Prezzi aggiornati con successo');
    } catch (error) {
      toast.error('Errore durante l\'aggiornamento dei prezzi');
    }
  };

  const handleBulkAvailabilityUpdate = async (status: 'available' | 'blocked') => {
    if (!selectedRoom) return;
    const range = selectedDateRanges.get(selectedRoom);
    if (!range?.start || !range?.end) return;

    const daysToUpdate = eachDayOfInterval({
      start: range.start,
      end: range.end
    }).map(date => ({
      room_id: selectedRoom,
      date: format(date, 'yyyy-MM-dd'),
      status
    }));

    try {
      await updateBulkAvailability(daysToUpdate);
      toast.success('Disponibilità aggiornata con successo');
    } catch (error) {
      toast.error('Errore durante l\'aggiornamento della disponibilità');
    }
  };

  const getAvailabilityStatus = (date: Date, roomId: number) => {
    const dayAvailability = availability.find(
      a => a.room_id === roomId && isSameDay(new Date(a.date), date)
    );
    return dayAvailability?.status || 'available';
  };

  const isDateSelected = (date: Date, roomId: number) => {
    const range = selectedDateRanges.get(roomId);
    if (!range?.start || !range?.end) {
      return range?.start ? isSameDay(date, range.start) : false;
    }
    return isWithinInterval(date, {
      start: range.start,
      end: range.end
    });
  };

  const isRangeStart = (date: Date, roomId: number) => {
    const range = selectedDateRanges.get(roomId);
    return range?.start && isSameDay(date, range.start);
  };

  const isRangeEnd = (date: Date, roomId: number) => {
    const range = selectedDateRanges.get(roomId);
    return range?.end && isSameDay(date, range.end);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      <div className="md:col-span-2">
        <div className={cn('bg-white rounded-lg shadow-lg p-6', className)}>
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={previousMonth}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <h2 className="text-xl font-semibold text-gray-900">
              {format(currentDate, 'MMMM yyyy', { locale: it })}
            </h2>
            <button
              onClick={nextMonth}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-4">
            {['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'].map((day) => (
              <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                {day}
              </div>
            ))}
          </div>

          {rooms.map(room => (
            <div key={room.id} className="mb-8">
              <h3 className="text-lg font-semibold mb-4 text-gray-900">{room.name}</h3>
              <div className="grid grid-cols-7 gap-px bg-gray-200">
                {days.map(day => {
                  const status = getAvailabilityStatus(day, room.id);
                  const isSelected = isDateSelected(day, room.id);
                  const isStart = isRangeStart(day, room.id);
                  const isEnd = isRangeEnd(day, room.id);
                  const dayPrice = availability.find(
                    a => a.room_id === room.id && 
                    isSameDay(new Date(a.date), day)
                  )?.price_override;
                  
                  return (
                    <button
                      key={`${room.id}-${day.toString()}`}
                      onClick={() => handleDateClick(day, room.id)}
                      className={cn(
                        'h-24 w-full bg-white p-2 transition-all relative flex flex-col items-start justify-between',
                        !isSameMonth(day, currentDate) && 'text-gray-400 bg-gray-50',
                        isSelected && 'bg-blue-50',
                        isStart && 'border-l-4 border-blue-500',
                        isEnd && 'border-r-4 border-blue-500',
                        isSelected && !isStart && !isEnd && 'border-y-4 border-blue-500',
                        status === 'blocked' && !isSelected && 'bg-red-50'
                      )}
                    >
                      <span className="text-lg font-medium">{format(day, 'd')}</span>
                      <div className="text-sm">
                        <div className="text-gray-600">Disponibile</div>
                        <div className="font-medium">€{dayPrice || room.base_price}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h3 className="text-lg font-semibold mb-4 text-gray-900">
            Seleziona periodo
          </h3>
          {selectedRoom && (
            <DateRangePicker
              startDate={selectedDateRanges.get(selectedRoom)?.start || null}
              endDate={selectedDateRanges.get(selectedRoom)?.end || null}
              onDateChange={(start, end) => {
                if (selectedRoom) {
                  setSelectedDateRanges(new Map(selectedDateRanges.set(selectedRoom, { start, end })));
                }
              }}
            />
          )}
        </div>

        {selectedRoom && (
          <BulkEditPanel
            selectedDates={selectedDateRanges.get(selectedRoom) || { start: null, end: null }}
            selectedRoom={selectedRoom}
            onUpdatePrice={handleBulkPriceUpdate}
            onUpdateAvailability={handleBulkAvailabilityUpdate}
          />
        )}
      </div>
    </div>
  );
}