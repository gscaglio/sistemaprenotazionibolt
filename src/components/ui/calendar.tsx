import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { addMonths, subMonths, format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, isTomorrow, isWithinInterval, isBefore, isAfter, addDays } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '../../lib/utils';
import { useAvailabilityStore } from '../../stores/availabilityStore';
import { useRoomStore } from '../../stores/roomStore';
import { priceSchema } from '../../lib/validations';
import toast from 'react-hot-toast';
import { DateRangePicker } from './DateRangePicker';
import { BulkEditPanel } from './BulkEditPanel';
import type { Database } from '../../lib/database.types';

// Define RoomType alias
type RoomType = Database['public']['Tables']['rooms']['Row'];

interface CalendarProps {
  mode?: 'single' | 'range' | 'admin';
  selectedDates?: Date[];
  onSelect?: (dates: Date[]) => void;
  className?: string;
  currentRoomId?: number;
}

const MAX_MONTHS = 16;
const MAX_DATE = addMonths(new Date(), MAX_MONTHS);

export function Calendar({ mode = 'single', selectedDates = [], onSelect, className, currentRoomId }: CalendarProps) {
  const [visibleMonths, setVisibleMonths] = useState<Date[]>([new Date()]);
  const [selectedDateRange, setSelectedDateRange] = useState<{ start: Date | null; end: Date | null }>({
    start: null,
    end: null
  });
  const [isDragging, setIsDragging] = useState(false);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false); 
  const [bulkEditPanelInfo, setBulkEditPanelInfo] = useState<{ priceDisplay: string | number }>({ priceDisplay: '' });
  
  const { rooms } = useRoomStore();
  const { 
    availability, 
    fetchAvailability, 
    updateBulkAvailability: updateStoreBulkAvailability,
    loading: storeIsLoading,
    error: storeError 
  } = useAvailabilityStore();

  // Initialize visible months and fetch availability for all months
  useEffect(() => {
    const initialMonths = [];
    const today = new Date();
    for (let i = 0; i < MAX_MONTHS; i++) {
      initialMonths.push(addMonths(today, i));
    }
    setVisibleMonths(initialMonths);

    // Fetch availability for all months
    initialMonths.forEach(month => {
      fetchAvailability(format(month, 'yyyy-MM'));
    });
  }, [fetchAvailability]); // Add fetchAvailability to dependencies

  useEffect(() => {
    if (storeError) {
      toast.error(`Errore: ${storeError}`);
    }
  }, [storeError]);

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

  const getAvailabilityInfo = (date: Date, roomId: number) => {
    const availabilityRecord = availability.find(
      a => a.room_id === roomId && isSameDay(new Date(a.date), date)
    );
    const basePrice = getDefaultPrice(roomId);
    
    const isAvailable = availabilityRecord?.available ?? true;
    const priceOverride = availabilityRecord?.price_override;
    const hasPriceOverride = priceOverride !== null && priceOverride !== undefined;

    return {
      availabilityRecord,
      isAvailable,
      displayPrice: hasPriceOverride ? priceOverride! : basePrice,
      hasPriceOverride,
      basePrice,
    };
  };

  const handleDateClick = (day: Date, roomId: number) => {
    if (roomId !== currentRoomId || isAfter(day, MAX_DATE)) return;

    if (!selectedDateRange.start) {
      // First click: set start date, end date is null
      setSelectedDateRange({ start: day, end: null });
    } else if (selectedDateRange.start && !selectedDateRange.end) {
      // Start date is set, end date is not
      if (isSameDay(selectedDateRange.start, day)) {
        // Clicked the same day again: confirm single-day selection
        setSelectedDateRange({ start: selectedDateRange.start, end: day });
      } else {
        // Clicked a different day: set as end date (or swap if needed)
        if (isBefore(day, selectedDateRange.start)) {
          setSelectedDateRange({ start: day, end: selectedDateRange.start });
        } else {
          setSelectedDateRange({ start: selectedDateRange.start, end: day });
        }
      }
    } else {
      // Both start and end are set (or a confirmed single day selection was made):
      // Reset to start a new selection with the clicked day
      setSelectedDateRange({ start: day, end: null });
    }
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        setSelectedDateRange(prevRange => {
          if (prevRange.start && prevRange.end && isAfter(prevRange.start, prevRange.end)) {
            return { start: prevRange.end, end: prevRange.start };
          }
          return prevRange;
        });
      }
    };

    if (isDragging) {
      window.addEventListener('mouseup', handleGlobalMouseUp);
    } else {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    }

    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDragging]);

  useEffect(() => {
    if (selectedDateRange.start && selectedDateRange.end && currentRoomId) {
      const startDate = isBefore(selectedDateRange.start, selectedDateRange.end) ? selectedDateRange.start : selectedDateRange.end;
      const endDate = isAfter(selectedDateRange.end, selectedDateRange.start) ? selectedDateRange.end : selectedDateRange.start;
      const datesInRange = eachDayOfInterval({ start: startDate, end: endDate });
      
      let commonPrice: number | null | undefined = undefined;
      let firstPriceFound: number | null = null;
      let isFirst = true;
      let allUseBase = true;
      let mixed = false;

      for (const date of datesInRange) {
        const info = getAvailabilityInfo(date, currentRoomId);
        if (info.isAvailable) {
          if (info.hasPriceOverride) {
            allUseBase = false;
            if (isFirst) {
              firstPriceFound = info.displayPrice;
              isFirst = false;
            } else if (info.displayPrice !== firstPriceFound) {
              mixed = true;
              break;
            }
          } else {
            if (isFirst) {
              firstPriceFound = info.basePrice;
              isFirst = false;
            } else if (info.basePrice !== firstPriceFound) {
              mixed = true;
              break;
            }
            if (!allUseBase && firstPriceFound !== info.basePrice) mixed = true;
          }
        }
      }

      if (mixed) {
        setBulkEditPanelInfo({ priceDisplay: "Misti" });
      } else if (isFirst) {
        setBulkEditPanelInfo({ priceDisplay: '' });
      } else if (allUseBase) {
        setBulkEditPanelInfo({ priceDisplay: `Base (${firstPriceFound})` });
      } else if (firstPriceFound !== null) {
        setBulkEditPanelInfo({ priceDisplay: firstPriceFound });
      } else {
        setBulkEditPanelInfo({ priceDisplay: ''});
      }
    } else {
      setBulkEditPanelInfo({ priceDisplay: '' });
    }
  }, [selectedDateRange, currentRoomId, availability, rooms]);

  const handleMouseEnter = (day: Date) => {
    if (isDragging && selectedDateRange.start && !isAfter(day, MAX_DATE)) {
      // If hovering over the start day and no end day is yet defined by dragging,
      // (i.e., end is null), do nothing. Let the second click on handleDateClick
      // define the single day selection.
      if (selectedDateRange.end === null && isSameDay(selectedDateRange.start, day)) {
        return;
      }

      setSelectedDateRange(prev => {
        // Optimization: if end is already this day, don't cause a new state update.
        // This also handles the case where end was null and is now being set to day.
        if (prev.end && isSameDay(prev.end, day)) {
          return prev;
        }
        // If end was not null and different from day, or if end was null, update end to day.
        return { start: prev.start, end: day };
      });
    }
  };

  const handleBulkPriceUpdate = async (price: number) => {
    if (!selectedDateRange.start || !selectedDateRange.end || !currentRoomId) {
      toast.error('Seleziona un intervallo di date valido e una stanza.');
      return;
    }

    const rangeStart = selectedDateRange.start;
    const rangeEnd = selectedDateRange.end;

    if (!rangeStart || !rangeEnd) return;

    const startDate = isBefore(rangeStart, rangeEnd) ? rangeStart : rangeEnd;
    const endDate = isAfter(rangeEnd, rangeStart) ? rangeEnd : rangeStart;

    const daysToUpdate = eachDayOfInterval({
      start: startDate,
      end: endDate
    }).map(date => ({
      room_id: currentRoomId,
      date: format(date, 'yyyy-MM-dd'),
      price_override: price,
      available: true
    }));

    setIsBulkUpdating(true);
    try {
      await updateStoreBulkAvailability(daysToUpdate);
      toast.success(`Prezzi aggiornati con successo per ${daysToUpdate.length} date.`);
      setSelectedDateRange({ start: null, end: null });
    } catch (error) {
      console.error('Calendar: Error during client-side bulk price update:', error);
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const handleBulkAvailabilityUpdate = async (available: boolean) => {
    if (!selectedDateRange.start || !currentRoomId) {
      toast.error('Seleziona almeno una data di inizio e una stanza.');
      return;
    }
    if (isBulkUpdating) return;

    const rangeStart = selectedDateRange.start;
    let rangeEnd = selectedDateRange.end || selectedDateRange.start;

    if (!rangeStart) return;

    const startDate = isBefore(rangeStart, rangeEnd) ? rangeStart : rangeEnd;
    const endDate = isAfter(rangeEnd, rangeStart) ? rangeEnd : rangeStart;

    const daysToUpdate = eachDayOfInterval({
      start: startDate,
      end: endDate
    }).map(date => ({
      room_id: currentRoomId,
      date: format(date, 'yyyy-MM-dd'),
      available,
      price_override: available ? getDefaultPrice(currentRoomId) : null,
      blocked_reason: available ? null : 'manual_block'
    }));

    setIsBulkUpdating(true);
    try {
      await updateStoreBulkAvailability(daysToUpdate);
      toast.success(`Disponibilità aggiornata con successo per ${daysToUpdate.length} date.`);
      setSelectedDateRange({ start: null, end: null });
    } catch (error) {
      console.error('Calendar: Error during client-side bulk availability update:', error);
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const handleRevertToBasePrice = async () => {
    if (!selectedDateRange.start || !currentRoomId) {
      toast.error('Seleziona almeno una data di inizio e una stanza.');
      return;
    }
    if (isBulkUpdating) return;

    const rangeStart = selectedDateRange.start;
    let rangeEnd = selectedDateRange.end || selectedDateRange.start;

    const startDate = isBefore(rangeStart, rangeEnd) ? rangeStart : rangeEnd;
    const endDate = isAfter(rangeEnd, rangeStart) ? rangeEnd : rangeStart;

    const daysToUpdate = eachDayOfInterval({ start: startDate, end: endDate }).map(date => ({
      room_id: currentRoomId,
      date: format(date, 'yyyy-MM-dd'),
      available: true,
      price_override: null,
      blocked_reason: null,
    }));

    setIsBulkUpdating(true);
    try {
      await updateStoreBulkAvailability(daysToUpdate);
      toast.success(`Prezzo revertito a quello base per ${daysToUpdate.length} date.`);
      setSelectedDateRange({ start: null, end: null });
    } catch (error) {
      console.error('Calendar: Error during revert to base price:', error);
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const renderMonth = (month: Date, room: RoomType) => {
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
              aria-label="Mese precedente"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={() => handleScroll('next')}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              disabled={isAfter(addMonths(month, 1), MAX_DATE)}
              aria-label="Mese successivo"
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
          {Array.from({ length: monthStart.getDay() - 1 }).map((_, index) =>
            <div key={`empty-${index}`} className="min-h-[60px]" />
          )}
          {days.map(day => {
            const dayInfo = getAvailabilityInfo(day, room.id);
            const isSelected = selectedDateRange.start && 
              (selectedDateRange.end 
                ? isWithinInterval(day, {
                    start: new Date(Math.min(selectedDateRange.start.getTime(), selectedDateRange.end.getTime())),
                    end: new Date(Math.max(selectedDateRange.start.getTime(), selectedDateRange.end.getTime()))
                  })
                : isSameDay(day, selectedDateRange.start));
            
            const isCurrentDay = isToday(day);
            const isNextDay = isTomorrow(day);
            const isFutureDate = isAfter(day, MAX_DATE);

            let dayStyle = 'bg-gray-100 cursor-not-allowed opacity-50';

            if (!isFutureDate) {
              if (dayInfo.isAvailable) {
                if (dayInfo.hasPriceOverride) {
                  dayStyle = 'bg-green-200 hover:bg-green-300 border border-green-400';
                } else {
                  dayStyle = 'bg-green-100 hover:bg-green-200';
                }
              } else {
                dayStyle = 'bg-red-100 hover:bg-red-200';
              }
            }

            if (isSelected) {
              dayStyle = isFutureDate ? dayStyle : 'bg-gray-300 hover:bg-gray-400';
            }

            return (
              <div
                key={day.toString()}
                onMouseDown={(e) => {
                  e.preventDefault();
                  if (!isFutureDate) {
                    handleDateClick(day, room.id);
                    setIsDragging(true);
                  }
                }}
                onMouseEnter={() => {
                  if (!isFutureDate) {
                    handleMouseEnter(day);
                  }
                }}
                className={cn(
                  'min-h-[60px] p-2 rounded-lg text-sm transition-all relative cursor-pointer select-none',
                  isCurrentDay && 'ring-2 ring-blue-600',
                  isNextDay && 'ring-1 ring-blue-400',
                  dayStyle
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
                  {!isFutureDate && (
                    <span className="text-xs font-medium text-gray-700">
                      €{dayInfo.displayPrice}
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
          {storeIsLoading && (
            <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50">
              <p className="text-lg font-semibold">Caricamento disponibilità...</p>
            </div>
          )}
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
          onRevertToBasePrice={handleRevertToBasePrice}
          isUpdating={isBulkUpdating}
          currentPriceDisplay={bulkEditPanelInfo.priceDisplay}
        />
      </div>
    </div>
  );
}