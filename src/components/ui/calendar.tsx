import { ChevronLeft, ChevronRight } from 'lucide-react';
import { addMonths, subMonths, format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, isTomorrow, isWithinInterval, isBefore } from 'date-fns';
import { it } from 'date-fns/locale';
import { useState, useEffect } from 'react';
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

function DateRangePicker({ startDate, endDate, onDateChange }: DateRangePickerProps) {
  const [error, setError] = useState('');

  const handleDateChange = (start: Date | null, end: Date | null) => {
    setError('');
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
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Al</label>
        <input
          type="date"
          value={endDate ? format(endDate, 'yyyy-MM-dd') : ''}
          onChange={(e) => handleDateChange(startDate, e.target.value ? new Date(e.target.value) : null)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
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
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateRange, setSelectedDateRange] = useState<{ start: Date | null; end: Date | null }>({
    start: null,
    end: null
  });
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  
  const { rooms } = useRoomStore();
  const { availability, fetchAvailability } = useAvailabilityStore();

  useEffect(() => {
    const startOfCurrentMonth = startOfMonth(currentDate);
    const endOfCurrentMonth = endOfMonth(currentDate);
    
    const months = new Set([
      format(startOfCurrentMonth, 'yyyy-MM'),
      format(endOfCurrentMonth, 'yyyy-MM')
    ]);
    
    months.forEach(month => {
      fetchAvailability(month);
    });
  }, [currentDate, fetchAvailability]);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchEndX - touchStartX;
    
    if (Math.abs(diff) > 50) { // Minimum swipe distance
      if (diff > 0) {
        // Swipe right - previous month
        setCurrentDate(prev => subMonths(prev, 1));
      } else {
        // Swipe left - next month
        setCurrentDate(prev => addMonths(prev, 1));
      }
    }
    
    setTouchStartX(null);
  };

  const getDefaultPrice = (roomId: number) => {
    const room = rooms.find(r => r.id === roomId);
    return room?.base_price || 0;
  };

  const handleDateClick = (day: Date, roomId: number) => {
    if (roomId !== currentRoomId) return;
    
    if (!selectedDateRange.start) {
      setSelectedDateRange({ start: day, end: null });
    } else if (!selectedDateRange.end && !isSameDay(selectedDateRange.start, day)) {
      setSelectedDateRange(prev => ({
        start: prev.start,
        end: day
      }));
    } else {
      setSelectedDateRange({ start: day, end: null });
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

    const daysToUpdate = eachDayOfInterval({
      start: selectedDateRange.start,
      end: selectedDateRange.end || selectedDateRange.start
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

  const renderMonthView = (room: any) => {
    if (currentRoomId && room.id !== currentRoomId) return null;

    const startOfCurrentMonth = startOfMonth(currentDate);
    const endOfCurrentMonth = endOfMonth(currentDate);
    const days = eachDayOfInterval({ start: startOfCurrentMonth, end: endOfCurrentMonth });

    return (
      <div 
        className="touch-pan-x"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="grid grid-cols-7 gap-1 mb-4">
          {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map((day) => (
            <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: startOfCurrentMonth.getDay() - 1 }).map((_, index) => (
            <div key={`empty-${index}`} className="min-h-[60px]" />
          ))}
          {days.map(day => {
            const isAvailable = getAvailabilityStatus(day, room.id);
            const isSelected = selectedDateRange.start && 
              (selectedDateRange.end 
                ? isWithinInterval(day, {
                    start: selectedDateRange.start,
                    end: selectedDateRange.end
                  })
                : isSameDay(day, selectedDateRange.start));
            const dayPrice = getDatePrice(day, room.id);
            const isCurrentDay = isToday(day);
            const isNextDay = isTomorrow(day);

            return (
              <div
                key={day.toString()}
                onClick={() => handleDateClick(day, room.id)}
                className={cn(
                  'min-h-[60px] p-2 rounded-lg text-sm transition-all relative cursor-pointer select-none',
                  isCurrentDay && 'ring-2 ring-blue-500',
                  isNextDay && 'ring-1 ring-blue-300',
                  isSelected && 'bg-blue-200 hover:bg-blue-300',
                  !isSelected && (isAvailable ? 'bg-green-200 hover:bg-green-300' : 'bg-red-200 hover:bg-red-300')
                )}
              >
                <div className="flex flex-col h-full">
                  <span className={cn(
                    "block font-medium mb-1",
                    isCurrentDay && "text-blue-700",
                    isNextDay && "text-blue-600"
                  )}>
                    {format(day, 'd')}
                  </span>
                  {dayPrice && (
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
        <div className={cn('bg-white rounded-lg shadow-lg p-4 md:p-6', className)}>
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => setCurrentDate(prev => subMonths(prev, 1))}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <h3 className="text-lg font-medium">
              {format(currentDate, 'MMMM yyyy', { locale: it })}
            </h3>
            <button
              onClick={() => setCurrentDate(prev => addMonths(prev, 1))}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </div>

          {rooms.map(room => (
            <div key={room.id} className="mb-8">
              {renderMonthView(room)}
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-6">
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