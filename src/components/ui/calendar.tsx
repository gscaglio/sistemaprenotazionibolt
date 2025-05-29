import { ChevronLeft, ChevronRight } from 'lucide-react';
import { addMonths, format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, isWithinInterval, isBefore } from 'date-fns';
import { it } from 'date-fns/locale';
import { useState, useEffect } from 'react';
import { DndContext, MouseSensor, useSensor, useSensors } from '@dnd-kit/core';
import { cn } from '../../lib/utils';
import { useAvailabilityStore } from '../../stores/availabilityStore';
import { useRoomStore } from '../../stores/roomStore';
import { availabilityApi } from '../../lib/api/availability';
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
        <label className="block text-sm font-medium text-gray-700">Al</label>
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
  onUpdateAvailability: (available: boolean) => void;
}

function BulkEditPanel({ selectedDates, selectedRoom, onUpdatePrice, onUpdateAvailability }: BulkEditPanelProps) {
  const [price, setPrice] = useState<string>('');

  if (!selectedDates.start || !selectedRoom) return null;

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
              onClick={() => onUpdateAvailability(true)}
              className="inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
            >
              Apri
            </button>
            <button
              onClick={() => onUpdateAvailability(false)}
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
  const [selectedDateRange, setSelectedDateRange] = useState<{ start: Date | null; end: Date | null }>({
    start: null,
    end: null
  });
  const [selectedRoom, setSelectedRoom] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const { rooms } = useRoomStore();
  const { availability, fetchAvailability } = useAvailabilityStore();

  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: {
      distance: 0,
    },
  });
  const sensors = useSensors(mouseSensor);

  useEffect(() => {
    const month = format(currentDate, 'yyyy-MM');
    fetchAvailability(month);
  }, [currentDate, fetchAvailability]);

  const firstDayOfMonth = startOfMonth(currentDate);
  const lastDayOfMonth = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: firstDayOfMonth, end: lastDayOfMonth });

  const previousMonth = () => setCurrentDate(addMonths(currentDate, -1));
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  const handleDateRangeChange = (start: Date | null, end: Date | null) => {
    setSelectedDateRange({ start, end });
  };

  const handleBulkPriceUpdate = async (price: number) => {
    if (!selectedDateRange.start || !selectedDateRange.end || !selectedRoom) return;

    const daysToUpdate = eachDayOfInterval({
      start: selectedDateRange.start,
      end: selectedDateRange.end || selectedDateRange.start
    }).map(date => ({
      room_id: selectedRoom,
      date: format(date, 'yyyy-MM-dd'),
      price_override: price
    }));

    try {
      await availabilityApi.bulkUpdateAvailability(daysToUpdate);
      toast.success('Prezzi aggiornati con successo');
      const month = format(currentDate, 'yyyy-MM');
      fetchAvailability(month);
    } catch (error) {
      toast.error('Errore durante l\'aggiornamento dei prezzi');
    }
  };

  const handleBulkAvailabilityUpdate = async (available: boolean) => {
    if (!selectedDateRange.start || !selectedRoom) return;

    const daysToUpdate = eachDayOfInterval({
      start: selectedDateRange.start,
      end: selectedDateRange.end || selectedDateRange.start
    }).map(date => ({
      room_id: selectedRoom,
      date: format(date, 'yyyy-MM-dd'),
      available,
      blocked_reason: available ? null : 'manual_block'
    }));

    try {
      await availabilityApi.bulkUpdateAvailability(daysToUpdate);
      toast.success('Disponibilità aggiornata con successo');
      const month = format(currentDate, 'yyyy-MM');
      fetchAvailability(month);
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

  const handleDragStart = (event: any) => {
    const { date, roomId } = event.active.data.current;
    setSelectedRoom(roomId);
    setSelectedDateRange({ start: date, end: date });
    setIsDragging(true);
  };

  const handleDragMove = (event: any) => {
    if (!isDragging || !selectedDateRange.start) return;
    
    const { date } = event.active.data.current;
    const start = selectedDateRange.start;
    
    setSelectedDateRange({
      start: isBefore(start, date) ? start : date,
      end: isBefore(start, date) ? date : start
    });
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const handleDateClick = (day: Date, roomId: number) => {
    if (isDragging) return;
    
    setSelectedRoom(roomId);
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

          <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragMove={handleDragMove}
            onDragEnd={handleDragEnd}
          >
            {rooms.map(room => (
              <div key={room.id} className="mb-8">
                <h3 className="text-lg font-semibold mb-4 text-gray-900">{room.name}</h3>
                <div className="grid grid-cols-7 gap-1">
                  {days.map(day => {
                    const isAvailable = getAvailabilityStatus(day, room.id);
                    const isSelected = selectedDateRange.start && 
                      (selectedDateRange.end 
                        ? isWithinInterval(day, {
                            start: selectedDateRange.start,
                            end: selectedDateRange.end
                          })
                        : isSameDay(day, selectedDateRange.start));
                    const dayPrice = availability.find(
                      a => a.room_id === room.id && 
                      isSameDay(new Date(a.date), day)
                    )?.price_override;

                    return (
                      <div
                        key={day.toString()}
                        data-date={format(day, 'yyyy-MM-dd')}
                        draggable
                        onClick={() => handleDateClick(day, room.id)}
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/plain', '');
                          handleDragStart({
                            active: {
                              data: { current: { date: day, roomId: room.id } }
                            }
                          });
                        }}
                        onDragEnter={(e) => {
                          e.preventDefault();
                          handleDragMove({
                            active: {
                              data: { current: { date: day, roomId: room.id } }
                            }
                          });
                        }}
                        onDragEnd={handleDragEnd}
                        className={cn(
                          'h-16 w-full rounded-lg text-sm p-2 transition-all relative cursor-pointer select-none',
                          !isSameMonth(day, currentDate) && 'text-gray-400 bg-gray-50',
                          isToday(day) && 'border-2 border-blue-500',
                          isSelected && 'bg-blue-200 hover:bg-blue-300',
                          !isSelected && (isAvailable ? 'bg-green-200 hover:bg-green-300' : 'bg-red-200 hover:bg-red-300')
                        )}
                      >
                        <span className="block font-medium">{format(day, 'd')}</span>
                        {dayPrice && (
                          <span className="absolute bottom-1 right-1 text-xs font-medium text-gray-700">
                            €{dayPrice}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </DndContext>
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
            onDateChange={handleDateRangeChange}
          />
        </div>

        <BulkEditPanel
          selectedDates={selectedDateRange}
          selectedRoom={selectedRoom}
          onUpdatePrice={handleBulkPriceUpdate}
          onUpdateAvailability={handleBulkAvailabilityUpdate}
        />
      </div>
    </div>
  );
}