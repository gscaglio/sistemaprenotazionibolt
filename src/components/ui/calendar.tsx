import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { addMonths, format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday } from 'date-fns';
import { it } from 'date-fns/locale';
import { useState } from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
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

interface PriceModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: Date;
  roomId: number;
  currentPrice: number | null;
  onSave: (price: number | null) => void;
}

function PriceModal({ isOpen, onClose, date, roomId, currentPrice, onSave }: PriceModalProps) {
  const [price, setPrice] = useState(currentPrice?.toString() || '');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">
            Prezzo per {format(date, 'dd MMMM yyyy', { locale: it })}
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>
        <input
          type="number"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="w-full p-2 border rounded mb-4"
          placeholder="Inserisci il prezzo"
        />
        <div className="flex justify-end space-x-2">
          <button
            onClick={() => {
              onSave(price ? Number(price) : null);
              onClose();
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Salva
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
          >
            Annulla
          </button>
        </div>
      </div>
    </div>
  );
}

function DraggableDay({ day, status, roomId }: { day: Date; status: string; roomId: number }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: `${roomId}-${format(day, 'yyyy-MM-dd')}`,
    data: { day, roomId },
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="cursor-move"
    >
      {format(day, 'd')}
    </div>
  );
}

export function Calendar({ mode = 'single', selectedDates = [], onSelect, className }: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  
  const { rooms } = useRoomStore();
  const { availability, updateBulkAvailability } = useAvailabilityStore();

  const firstDayOfMonth = startOfMonth(currentDate);
  const lastDayOfMonth = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: firstDayOfMonth, end: lastDayOfMonth });

  const previousMonth = () => setCurrentDate(addMonths(currentDate, -1));
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  const getAvailabilityStatus = (date: Date, roomId: number) => {
    const dayAvailability = availability.find(
      a => a.room_id === roomId && isSameDay(new Date(a.date), date)
    );
    return dayAvailability?.status || 'available';
  };

  const handleDateClick = async (date: Date, roomId: number) => {
    if (mode === 'admin') {
      const currentStatus = getAvailabilityStatus(date, roomId);
      const newStatus = currentStatus === 'available' ? 'blocked' : 'available';
      
      try {
        await availabilityApi.bulkUpdateAvailability([{
          room_id: roomId,
          date: format(date, 'yyyy-MM-dd'),
          status: newStatus
        }]);
        toast.success('Disponibilità aggiornata');
      } catch (error) {
        toast.error('Errore durante l\'aggiornamento');
      }
    } else if (onSelect) {
      if (mode === 'single') {
        onSelect([date]);
      } else if (mode === 'range') {
        if (selectedDates.length === 0 || selectedDates.length === 2) {
          onSelect([date]);
        } else {
          onSelect([selectedDates[0], date].sort((a, b) => a.getTime() - b.getTime()));
        }
      }
    }
  };

  const handlePriceUpdate = async (price: number | null) => {
    if (!selectedDay || !selectedRoomId) return;

    try {
      const formattedDate = format(selectedDay, 'yyyy-MM-dd');
      const existingAvailability = availability.find(
        a => a.room_id === selectedRoomId && a.date === formattedDate
      );

      if (existingAvailability) {
        // Update existing availability record
        await availabilityApi.bulkUpdateAvailability([{
          id: existingAvailability.id,
          room_id: selectedRoomId,
          date: formattedDate,
          price_override: price,
          status: existingAvailability.status || 'available'
        }]);
      } else {
        // Create new availability record
        await availabilityApi.bulkUpdateAvailability([{
          room_id: selectedRoomId,
          date: formattedDate,
          price_override: price,
          status: 'available'
        }]);
      }
      
      toast.success('Prezzo aggiornato');
    } catch (error) {
      toast.error('Errore durante l\'aggiornamento del prezzo');
    }
  };

  const handleDragEnd = async (event: any) => {
    if (!event.over || !event.active) return;

    const { day: startDay, roomId } = event.active.data.current;
    const endDay = new Date(event.over.id.split('-')[1]);
    
    const daysToUpdate = eachDayOfInterval({
      start: startDay,
      end: endDay
    }).map(date => ({
      room_id: roomId,
      date: format(date, 'yyyy-MM-dd'),
      status: 'blocked'
    }));

    try {
      await availabilityApi.bulkUpdateAvailability(daysToUpdate);
      toast.success('Disponibilità aggiornata');
    } catch (error) {
      toast.error('Errore durante l\'aggiornamento');
    }
  };

  return (
    <div className={cn('p-4', className)}>
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={previousMonth}
          className="p-2 hover:bg-gray-100 rounded-full"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h2 className="text-lg font-semibold">
          {format(currentDate, 'MMMM yyyy', { locale: it })}
        </h2>
        <button
          onClick={nextMonth}
          className="p-2 hover:bg-gray-100 rounded-full"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'].map((day) => (
          <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
            {day}
          </div>
        ))}
      </div>

      {rooms.map(room => (
        <div key={room.id} className="mt-8">
          <h3 className="text-lg font-semibold mb-4">{room.name}</h3>
          <div className="grid grid-cols-7 gap-1">
            {days.map(day => {
              const status = getAvailabilityStatus(day, room.id);
              const isSelected = selectedDates.some(date => isSameDay(date, day));
              
              return (
                <button
                  key={day.toString()}
                  onClick={() => {
                    if (mode === 'admin') {
                      setSelectedDay(day);
                      setSelectedRoomId(room.id);
                      setCurrentPrice(availability.find(
                        a => a.room_id === room.id && isSameDay(new Date(a.date), day)
                      )?.price_override || null);
                      setIsPriceModalOpen(true);
                    } else {
                      handleDateClick(day, room.id);
                    }
                  }}
                  className={cn(
                    'h-14 w-full rounded-lg text-sm p-2 transition-colors relative',
                    !isSameMonth(day, currentDate) && 'text-gray-400',
                    isToday(day) && 'border-2 border-blue-500',
                    isSelected && 'bg-blue-100',
                    status === 'available' && 'bg-green-100 hover:bg-green-200',
                    status === 'blocked' && 'bg-red-100 hover:bg-red-200',
                    status === 'booked' && 'bg-blue-100 hover:bg-blue-200'
                  )}
                >
                  {mode === 'admin' ? (
                    <DraggableDay day={day} status={status} roomId={room.id} />
                  ) : (
                    format(day, 'd')
                  )}
                  {availability.find(
                    a => a.room_id === room.id && 
                    isSameDay(new Date(a.date), day) && 
                    a.price_override
                  ) && (
                    <span className="absolute bottom-1 right-1 text-xs font-medium text-gray-600">
                      €
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <PriceModal
        isOpen={isPriceModalOpen}
        onClose={() => setIsPriceModalOpen(false)}
        date={selectedDay!}
        roomId={selectedRoomId!}
        currentPrice={currentPrice}
        onSave={handlePriceUpdate}
      />
    </div>
  );
}