import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { addMonths, subMonths, format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, isTomorrow, isWithinInterval, isBefore, addDays, isAfter } from 'date-fns';
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

// DateRangePickerProps moved to DateRangePicker.tsx
// BulkEditPanelProps moved to BulkEditPanel.tsx

const MAX_MONTHS = 16;
const MAX_DATE = addMonths(new Date(), MAX_MONTHS);

// DateRangePicker function moved to DateRangePicker.tsx

// BulkEditPanel function moved to BulkEditPanel.tsx

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
    loading: storeIsLoading, // Global loading from store (e.g., for fetching)
    error: storeError 
  } = useAvailabilityStore();

  // Display global errors from the store via toast
  useEffect(() => {
    if (storeError) {
      toast.error(`Errore: ${storeError}`);
      // Consider clearing the store error after displaying it
      // useAvailabilityStore.setState({ error: null }); 
    }
  }, [storeError]);

  useEffect(() => {
    // Initialize with current month and next 15 months (total 16 months)
    const initialMonths = [];
    const today = new Date();
    for (let i = 0; i < MAX_MONTHS; i++) { // MAX_MONTHS is already defined as 16
      initialMonths.push(addMonths(today, i));
    }
    setVisibleMonths(initialMonths);
  }, []); // Keep the dependency array empty to run only on mount

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
  }, []); // MAX_DATE is used here

  const getDefaultPrice = (roomId: number) => {
    const room = rooms.find(r => r.id === roomId);
    return room?.base_price || 0;
  };

  /**
   * Retrieves detailed availability information for a specific day and room.
   * @param date The date to get information for.
   * @param roomId The ID of the room.
   * @returns An object containing the raw availability record (if any), 
   *          calculated availability status, display price (override or base),
   *          a flag indicating if a price override is set, and the room's base price.
   */
  const getAvailabilityInfo = (date: Date, roomId: number) => {
    const availabilityRecord = availability.find(
      a => a.room_id === roomId && isSameDay(new Date(a.date), date)
    );
    const basePrice = getDefaultPrice(roomId);
    
    // Default to available if no specific record exists for the day
    const isAvailable = availabilityRecord?.available ?? true; 
    const priceOverride = availabilityRecord?.price_override;
    const hasPriceOverride = priceOverride !== null && priceOverride !== undefined;

    return {
      availabilityRecord,
      isAvailable,
      displayPrice: hasPriceOverride ? priceOverride! : basePrice, // Non-null assertion as hasPriceOverride checks it
      hasPriceOverride,
      basePrice,
    };
  };

  /**
   * Handles clicks on individual date cells in the calendar.
   * Manages the selection of single dates or date ranges.
   * - If no date is selected, sets the clicked date as the start of a new range.
   * - If a start date is selected but no end date, sets the clicked date as the end date.
   *   If the clicked date is before the current start date, it swaps them.
   * - If a full range is already selected, it resets the selection and starts a new range
   *   with the clicked date as the start.
   */
  const handleDateClick = (day: Date, roomId: number) => {
    // console.log('handleDateClick - Before:', { 
    //   day: format(day, 'yyyy-MM-dd'),
    //   currentRange: {
    //     start: selectedDateRange.start ? format(selectedDateRange.start, 'yyyy-MM-dd') : null,
    //     end: selectedDateRange.end ? format(selectedDateRange.end, 'yyyy-MM-dd') : null
    //   }
    // });

    if (roomId !== currentRoomId || isAfter(day, MAX_DATE)) return; // MAX_DATE is used here
    
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

    // console.log('handleDateClick - After:', {
    //   day: format(day, 'yyyy-MM-dd'),
    //   newRange: {
    //     start: selectedDateRange.start ? format(selectedDateRange.start, 'yyyy-MM-dd') : null,
    //     end: selectedDateRange.end ? format(selectedDateRange.end, 'yyyy-MM-dd') : null
    //   }
    // });
  };

  /**
   * Effect to handle global mouseup events. This is crucial for correctly ending
   * a drag-select operation even if the mouse button is released outside the calendar grid.
   * It sets `isDragging` to false and sorts the selected date range if `start` is after `end`.
   */
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging) {
        // console.log('Calendar: GlobalMouseUp triggered while dragging.');
        setIsDragging(false);
        // Finalize and sort the date range
        setSelectedDateRange(prevRange => {
          if (prevRange.start && prevRange.end && isAfter(prevRange.start, prevRange.end)) {
            // console.log('Calendar: GlobalMouseUp - Swapping start and end in selectedDateRange.');
            return { start: prevRange.end, end: prevRange.start };
          }
          return prevRange;
        });
      }
    };

    if (isDragging) {
      // console.log('Calendar: useEffect - Adding global mouseup listener because isDragging is true.');
      window.addEventListener('mouseup', handleGlobalMouseUp);
    } else {
      // console.log('Calendar: useEffect - Removing global mouseup listener because isDragging is false.');
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    }

    return () => {
      // console.log('Calendar: useEffect cleanup - Removing global mouseup listener.');
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDragging]);

  /**
   * Effect to calculate and display information about the selected date range
   * in the BulkEditPanel (e.g., common price, "Mixed", "Base").
   * Depends on the selected date range, current room, availability data, and room base prices.
   */
  useEffect(() => {
    if (selectedDateRange.start && selectedDateRange.end && currentRoomId) {
      const startDate = isBefore(selectedDateRange.start, selectedDateRange.end) ? selectedDateRange.start : selectedDateRange.end;
      const endDate = isAfter(selectedDateRange.end, selectedDateRange.start) ? selectedDateRange.end : selectedDateRange.start;
      const datesInRange = eachDayOfInterval({ start: startDate, end: endDate });
      
      let commonPrice: number | null | undefined = undefined; // undefined: not set, null: mixed or base, number: common price
      let firstPriceFound: number | null = null;
      let isFirst = true;
      let allUseBase = true;
      let mixed = false;

      for (const date of datesInRange) {
        const info = getAvailabilityInfo(date, currentRoomId);
        if (info.isAvailable) { // Only consider available dates for price display consistency
          if (info.hasPriceOverride) {
            allUseBase = false;
            if (isFirst) {
              firstPriceFound = info.displayPrice;
              isFirst = false;
            } else if (info.displayPrice !== firstPriceFound) {
              mixed = true;
              break;
            }
          } else { // Uses base price
            if (isFirst) {
              firstPriceFound = info.basePrice; // Consider base price as the first price
              isFirst = false;
            } else if (info.basePrice !== firstPriceFound) {
              // This case (different base prices for same room) shouldn't happen, but good for robustness
              mixed = true; 
              break;
            }
             // If it has no override, it doesn't disqualify a common override if others have it.
            // But if some have override and some use base, it's mixed.
            if (!allUseBase && firstPriceFound !== info.basePrice) mixed = true;

          }
        }
      }

      if (mixed) {
        setBulkEditPanelInfo({ priceDisplay: "Misti" });
      } else if (isFirst) { // No available dates in range, or no price info found
        setBulkEditPanelInfo({ priceDisplay: '' }); // Or "N/A"
      } else if (allUseBase) {
         setBulkEditPanelInfo({ priceDisplay: `Base (${firstPriceFound})` }); // e.g. Base (100)
      } else if (firstPriceFound !== null) {
        setBulkEditPanelInfo({ priceDisplay: firstPriceFound }); // Common override price
      } else {
         setBulkEditPanelInfo({ priceDisplay: ''}); // Default fallback
      }

    } else {
      setBulkEditPanelInfo({ priceDisplay: '' }); // Clear if no range
    }
  }, [selectedDateRange, currentRoomId, availability, rooms]);


  const handleMouseEnter = (day: Date) => {
    if (isDragging && selectedDateRange.start && !isAfter(day, MAX_DATE)) { // MAX_DATE is used here
      // Allow mouse enter to update the end date even if it's the same as start,
      // as the user might drag out and back in. The final sorting of start/end will be handled on mouse up.
      // console.log('Calendar: handleMouseEnter - Updating potential end date.', { 
      //   day: format(day, 'yyyy-MM-dd'),
      //   currentStart: selectedDateRange.start ? format(selectedDateRange.start, 'yyyy-MM-dd') : 'null'
      // });
      setSelectedDateRange(prev => ({
        start: prev.start, // Keep the original start
        end: day         // Update the end as mouse moves
      }));
    }
  };

  const handleBulkPriceUpdate = async (price: number) => {
    if (!selectedDateRange.start || !selectedDateRange.end || !currentRoomId) {
      toast.error('Seleziona un intervallo di date valido e una stanza.');
      return;
    }
        // Ensure start is before end for the update payload
    const rangeStart = selectedDateRange.start;
    const rangeEnd = selectedDateRange.end;

    if (!rangeStart || !rangeEnd) return; // Should be caught by above, but for TS

    const startDate = isBefore(rangeStart, rangeEnd) ? rangeStart : rangeEnd;
    const endDate = isAfter(rangeEnd, rangeStart) ? rangeEnd : rangeStart;


    const daysToUpdate = eachDayOfInterval({
      start: startDate,
      end: endDate
    }).map(date => ({
      room_id: currentRoomId,
      date: format(date, 'yyyy-MM-dd'),
      price_override: price,
      available: true // Setting price usually implies making it available
    }));

    console.log('Calendar: handleBulkPriceUpdate - Preparing to update.', {
      selectedRange: {
        start: format(selectedDateRange.start, 'yyyy-MM-dd'),
        end: format(selectedDateRange.end, 'yyyy-MM-dd')
      },
      orderedRange: {
        start: format(startDate, 'yyyy-MM-dd'),
        end: format(endDate, 'yyyy-MM-dd')
      },
      updatesCount: daysToUpdate.length,
      sampleUpdate: daysToUpdate[0]
    });

    setIsBulkUpdating(true);
    try {
      await updateStoreBulkAvailability(daysToUpdate);
      toast.success(`Prezzi aggiornati con successo per ${daysToUpdate.length} date.`);
      setSelectedDateRange({ start: null, end: null }); 
    } catch (error) {
      // Error is already set in the store by updateStoreBulkAvailability action
      // The useEffect for storeError will pick it up and show a toast.
      // If direct toast is needed here:
      // The useEffect for storeError will pick it up and show a toast.
      console.error('Calendar: Error during client-side bulk price update:', error);
    } finally {
      setIsBulkUpdating(false);
    }
  };

  /**
   * Handles bulk updating of availability (opening/closing dates) for the selected range.
   * @param available Boolean indicating whether to set dates as available (true) or unavailable (false).
   */
  const handleBulkAvailabilityUpdate = async (available: boolean) => {
    if (!selectedDateRange.start || !currentRoomId) {
      toast.error('Seleziona almeno una data di inizio e una stanza.');
      return;
    }
    if (isBulkUpdating) return; // Prevent concurrent updates

    // If only start is selected, end is the same day. If end is also selected, use it.
    // Ensure start is before end for the update payload
    const rangeStart = selectedDateRange.start;
    let rangeEnd = selectedDateRange.end || selectedDateRange.start; // if no end, it's a single day

    if (!rangeStart) return; // Should be caught by above, but for TS

    const startDate = isBefore(rangeStart, rangeEnd) ? rangeStart : rangeEnd;
    const endDate = isAfter(rangeEnd, rangeStart) ? rangeEnd : rangeStart;

    const daysToUpdate = eachDayOfInterval({
      start: startDate,
      end: endDate
    }).map(date => ({
      room_id: currentRoomId,
      date: format(date, 'yyyy-MM-dd'),
      available,
      price_override: available ? getDefaultPrice(currentRoomId) : null, // Set to null when closing
      blocked_reason: available ? null : 'manual_block'
    }));

    console.log('Calendar: handleBulkAvailabilityUpdate - Preparing to update.', {
      selectedRange: {
        start: format(selectedDateRange.start, 'yyyy-MM-dd'),
        end: selectedDateRange.end ? format(selectedDateRange.end, 'yyyy-MM-dd') : format(selectedDateRange.start, 'yyyy-MM-dd')
      },
      orderedRange: {
        start: format(startDate, 'yyyy-MM-dd'),
        end: format(endDate, 'yyyy-MM-dd')
      },
      updatesCount: daysToUpdate.length,
      sampleUpdate: daysToUpdate[0],
      newAvailabilityState: available
    });

    setIsBulkUpdating(true);
    try {
      await updateStoreBulkAvailability(daysToUpdate);
      toast.success(`Disponibilità aggiornata con successo per ${daysToUpdate.length} date.`);
      setSelectedDateRange({ start: null, end: null });
    } catch (error) {
      // Store's error handling will be triggered by the action.
      // Error toast will be shown by the storeError effect.
      console.error('Calendar: Error during client-side bulk availability update:', error);
    } finally {
      setIsBulkUpdating(false);
    }
  };

  /**
   * Handles reverting the price for the selected date range to the room's base price.
   * This is achieved by setting `price_override` to `null` and ensuring the dates are available.
   */
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
      available: true, // Ensure date is available
      price_override: null, // Key change: set price_override to null
      blocked_reason: null,
    }));

    console.log('Calendar: handleRevertToBasePrice - Preparing to update.', {
      selectedRange: {
        start: format(selectedDateRange.start, 'yyyy-MM-dd'),
        end: selectedDateRange.end ? format(selectedDateRange.end, 'yyyy-MM-dd') : format(selectedDateRange.start, 'yyyy-MM-dd')
      },
      updatesCount: daysToUpdate.length,
    });

    setIsBulkUpdating(true);
    try {
      await updateStoreBulkAvailability(daysToUpdate);
      toast.success(`Prezzo revertito a quello base per ${daysToUpdate.length} date.`);
      setSelectedDateRange({ start: null, end: null });
    } catch (error) {
      // Error toast will be shown by the storeError effect.
      console.error('Calendar: Error during revert to base price:', error);
    } finally {
      setIsBulkUpdating(false);
    }
  };

  /**
   * Renders a single month view for a given room.
   * Includes month navigation and the grid of days with their respective styles and prices.
   */
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
              aria-label="Mese precedente" // Added ARIA label
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={() => handleScroll('next')}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              disabled={isAfter(addMonths(month, 1), MAX_DATE)} // MAX_DATE is used here
              aria-label="Mese successivo" // Added ARIA label
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
            const isFutureDate = isAfter(day, MAX_DATE); // MAX_DATE is used here

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