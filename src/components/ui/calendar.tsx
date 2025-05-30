import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { addMonths, subMonths, format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, isTomorrow, isWithinInterval, isBefore, addDays, isAfter } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '../../lib/utils';
import { useAvailabilityStore } from '../../stores/availabilityStore';
import { useRoomStore } from '../../stores/roomStore';
import { availabilityApi } from '../../lib/api/availability';
import { priceSchema, dateRangeSchema } from '../../lib/validations';
import toast from 'react-hot-toast';

interface CalendarProps {
  mode?: 'single' | 'range' | 'admin';
  selectedDates?: Date[];
  onSelect?: (dates: Date[]) => void;
  className?: string;
  currentRoomId?: number;
}

interface DateRangePickerProps {
  startDate: Date | null;
  endDate: Date | null;
  onDateChange: (start: Date | null, end: Date | null) => void;
}

interface BulkEditPanelProps {
  selectedDates: { start: Date | null; end: Date | null };
  selectedRoom: number | null;
  onUpdatePrice: (price: number) => void;
  onUpdateAvailability: (available: boolean) => void;
}

const MAX_MONTHS = 16;
const MAX_DATE = addMonths(new Date(), MAX_MONTHS);

function DateRangePicker({ startDate, endDate, onDateChange }: DateRangePickerProps) {
  const [error, setError] = useState('');

  const handleDateChange = (start: Date | null, end: Date | null) => {
    setError('');
    if (start && isAfter(start, MAX_DATE)) {
      setError(`Non puoi selezionare date oltre ${format(MAX_DATE, 'dd/MM/yyyy')}`);
      return;
    }
    if (end && isAfter(end, MAX_DATE)) {
      setError(`Non puoi selezionare date oltre ${format(MAX_DATE, 'dd/MM/yyyy')}`);
      return;
    }
    if (start && end) {
      try {
        dateRangeSchema.parse({ startDate: start, endDate: end });
        onDateChange(start, end);
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        }
      }
    } else {
      onDateChange(start, end);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Dal</label>
        <input
          type="date"
          value={startDate ? format(startDate, 'yyyy-MM-dd') : ''}
          onChange={(e) => handleDateChange(e.target.value ? new Date(e.target.value) : null, endDate)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          max={format(MAX_DATE, 'yyyy-MM-dd')}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Al</label>
        <input
          type="date"
          value={endDate ? format(endDate, 'yyyy-MM-dd') : ''}
          onChange={(e) => handleDateChange(startDate, e.target.value ? new Date(e.target.value) : null)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          max={format(MAX_DATE, 'yyyy-MM-dd')}
        />
      </div>
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}

function BulkEditPanel({ selectedDates, selectedRoom, onUpdatePrice, onUpdateAvailability }: BulkEditPanelProps) {
  const [price, setPrice] = useState<string>('');
  const [error, setError] = useState('');

  if (!selectedDates.start || !selectedRoom) return null;

  const handlePriceUpdate = () => {
    setError('');
    try {
      const numericPrice = Number(price);
      priceSchema.parse({ price: numericPrice });
      onUpdatePrice(numericPrice);
      setPrice('');
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      }
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">
        Modifica date selezionate
      </h3>
      
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
          {error && (
            <p className="mt-2 text-sm text-red-600">{error}</p>
          )}
          <button
            onClick={handlePriceUpdate}
            className="mt-4 w-full h-11 inline-flex justify-center items-center px-4 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
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
              onClick={() => onUpdateAvailability(true)}
              className="h-11 inline-flex justify-center items-center px-4 border border-transparent text-base font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
            >
              Apri
            </button>
            <button
              onClick={() => onUpdateAvailability(false)}
              className="h-11 inline-flex justify-center items-center px-4 border border-transparent text-base font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
            >
              Chiudi
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Calendar({ mode = 'single', selectedDates = [], onSelect, className, currentRoomId }: CalendarProps) {
  const [visibleMonths, setVisibleMonths] = useState<Date[]>([new Date()]);
  const [selectedDateRange, setSelectedDateRange] = useState<{ start: Date | null; end: Date | null }>({
    start: null,
    end: null
  });
  const [isDragging, setIsDragging] = useState(false);
  
  const { rooms } = useRoomStore();
  const { availability, fetchAvailability } = useAvailabilityStore();

  useEffect(() => {
    // Initialize with current month and next 2 months
    const initialMonths = [new Date()];
    for (let i = 1; i <= 2; i++) {
      initialMonths.push(addMonths(new Date(), i));
    }
    setVisibleMonths(initialMonths);
  }, []);

  useEffect(() => {
    // Fetch availability for all visible months
    const months = new Set(visibleMonths.map(date => format(date, 'yyyy-MM')));
    months.forEach(month => {
      fetchAvailability(month);
    });
  }, [visibleMonths, fetchAvailability]);

  const handleScroll = useCallback((direction: 'prev' | 'next') => {
    setVisibleMonths(prev => {
      const firstMonth = prev[0];
      const lastMonth = prev[prev.length - 1];
      
      if (direction === 'prev') {
        const prevMonth = subMonths(firstMonth, 1);
        if (isBefore(prevMonth, new Date())) {
          return prev;
        }
        return [prevMonth, ...prev.slice(0, -1)];
      } else {
        const nextMonth = addMonths(lastMonth, 1);
        if (isAfter(nextMonth, MAX_DATE)) {
          return prev;
        }
        return [...prev.slice(1), nextMonth];
      }
    });
  }, []);

  const getDefaultPrice = (roomId: number) => {
    const room = rooms.find(r => r.id === roomId);
    return room?.base_price || 0;
  };

  const handleDateClick = (day: Date, roomId: number) => {
    if (roomId !== currentRoomId || isAfter(day, MAX_DATE)) return;
    
    if (!selectedDateRange.start) {
      setSelectedDateRange({ start: day, end: null });
    } else if (!selectedDateRange.end && !isSameDay(selectedDateRange.start, day)) {
      if (isBefore(day, selectedDateRange.start)) {
        setSelectedDateRange({
          start: day,
          end: selectedDateRange.start
        });
      } else {
        setSelectedDateRange(prev => ({
          start: prev.start,
          end: day
        }));
      }
    } else {
      setSelectedDateRange({ start: day, end: null });
    }
  };

  const handleMouseEnter = (day: Date) => {
    if (isDragging && selectedDateRange.start && !isSameDay(selectedDateRange.start, day) && !isAfter(day, MAX_DATE)) {
      setSelectedDateRange(prev => ({
        start: prev.start,
        end: day
      }));
    }
  };

  const handleBulkPriceUpdate = async (price: number) => {
    if (!selectedDateRange.start || !selectedDateRange.end || !currentRoomId) return;

    const daysToUpdate = eachDayOfInterval({
      start: selectedDateRange.start,
      end: selectedDateRange.end
    }).map(date => ({
      room_id: currentRoomId,
      date: format(date, 'yyyy-MM-dd'),
      price_override: price,
      available: true
    }));

    try {
      await availabilityApi.bulkUpdateAvailability(daysToUpdate);
      toast.success('Prezzi aggiornati con successo');
      const uniqueMonths = new Set(daysToUpdate.map(day => day.date.substring(0, 7)));
      uniqueMonths.forEach(month => {
        fetchAvailability(month);
      });
    } catch (error) {
      toast.error('Errore durante l\'aggiornamento dei prezzi');
    }
  };

  const handleBulkAvailabilityUpdate = async (available: boolean) => {
    if (!selectedDateRange.start || !currentRoomId) return;

    const endDate = selectedDateRange.end || selectedDateRange.start;
    const daysToUpdate = eachDayOfInterval({
      start: selectedDateRange.start,
      end: endDate
    }).map(date => ({
      room_id: currentRoomId,
      date: format(date, 'yyyy-MM-dd'),
      available,
      blocked_reason: available ? null : 'manual_block',
      price_override: available ? getDefaultPrice(currentRoomId) : null
    }));

    try {
      await availabilityApi.bulkUpdateAvailability(daysToUpdate);
      toast.success('Disponibilità aggiornata con successo');
      const uniqueMonths = new Set(daysToUpdate.map(day => day.date.substring(0, 7)));
      uniqueMonths.forEach(month => {
        fetchAvailability(month);
      });
      setSelectedDateRange({ start: null, end: null });
    } catch (error) {
      toast.error('Errore durante l\'aggiornamento della disponibilità');
    }
  };

  const getAvailabilityStatus = (date: Date, roomId: number) => {
    const dayAvailability = availability.find(
      a => a.room_id === roomId && isSameDay(new Date(a.date), date)
    );
    return dayAvailability?.available ?? true;
  };

  const getDatePrice = (date: Date, roomId: number) => {
    const dayAvailability = availability.find(
      a => a.room_id === roomId && isSameDay(new Date(a.date), date)
    );
    return dayAvailability?.price_override || getDefaultPrice(roomId);
  };

  const renderMonth = (month: Date, room: any) => {
    if (currentRoomId && room.id !== currentRoomId) return null;

    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    return (
      <div key={format(month, 'yyyy-MM')} className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {format(month, 'MMMM yyyy', { locale: it })}
          </h3>
          <div className="flex space-x-2">
            <button
              onClick={() => handleScroll('prev')}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              disabled={isBefore(subMonths(month, 1), new Date())}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={() => handleScroll('next')}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              disabled={isAfter(addMonths(month, 1), MAX_DATE)}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1 mb-4">
          {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map((day) => (
            <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: monthStart.getDay() - 1 }).map((_, index) => (
            <div key={`empty-${index}`} className="min-h-[60px]" />
          ))}
          {days.map(day => {
            const isAvailable = getAvailabilityStatus(day, room.id);
            const isSelected = selectedDateRange.start && 
              (selectedDateRange.end 
                ? isWithinInterval(day, {
                    start: new Date(Math.min(selectedDateRange.start.getTime(), selectedDateRange.end.getTime())),
                    end: new Date(Math.max(selectedDateRange.start.getTime(), selectedDateRange.end.getTime()))
                  })
                : isSameDay(day, selectedDateRange.start));
            const dayPrice = getDatePrice(day, room.id);
            const isCurrentDay = isToday(day);
            const isNextDay = isTomorrow(day);
            const isFutureDate = isAfter(day, MAX_DATE);

            return (
              <div
                key={day.toString()}
                onMouseDown={() => {
                  if (!isFutureDate) {
                    handleDateClick(day, room.id);
                    setIsDragging(true);
                  }
                }}
                onMouseEnter={() => handleMouseEnter(day)}
                onMouseUp={() => setIsDragging(false)}
                className={cn(
                  'min-h-[60px] p-2 rounded-lg text-sm transition-all relative cursor-pointer select-none',
                  isCurrentDay && 'ring-2 ring-gray-900',
                  isNextDay && 'ring-1 ring-gray-600',
                  isSelected && 'bg-gray-200 hover:bg-gray-300',
                  !isSelected && !isFutureDate && (isAvailable ? 'bg-green-100 hover:bg-green-200' : 'bg-red-100 hover:bg-red-200'),
                  isFutureDate && 'bg-gray-100 cursor-not-allowed opacity-50'
                )}
              >
                <div className="flex flex-col h-full">
                  <span className={cn(
                    "block font-medium mb-1",
                    isCurrentDay && "text-gray-900",
                    isNextDay && "text-gray-800",
                    isFutureDate && "text-gray-400"
                  )}>
                    {format(day, 'd')}
                  </span>
                  {dayPrice && !isFutureDate && (
                    <span className="text-xs font-medium text-gray-700">
                      €{dayPrice}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      <div className="md:col-span-2">
        <div className={cn(
          'bg-white rounded-lg shadow-lg p-4 md:p-6 max-h-[800px] overflow-y-auto',
          className
        )}>
          {rooms.map(room => (
            <div key={room.id}>
              {visibleMonths.map(month => renderMonth(month, room))}
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-6 md:sticky md:top-4">
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h3 className="text-lg font-semibold mb-4 text-gray-900">
            Seleziona periodo
          </h3>
          <DateRangePicker
            startDate={selectedDateRange.start}
            endDate={selectedDateRange.end}
            onDateChange={(start, end) => setSelectedDateRange({ start, end })}
          />
        </div>

        <BulkEditPanel
          selectedDates={selectedDateRange}
          selectedRoom={currentRoomId}
          onUpdatePrice={handleBulkPriceUpdate}
          onUpdateAvailability={handleBulkAvailabilityUpdate}
        />
      </div>
    </div>
  );
}