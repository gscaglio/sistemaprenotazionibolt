import { ChevronLeft, ChevronRight } from 'lucide-react';
import { addMonths, format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, isWithinInterval, isBefore } from 'date-fns';
import { it } from 'date-fns/locale';
import { useState, useEffect } from 'react';
import { DndContext, MouseSensor, useSensor, useSensors } from '@dnd-kit/core';
import { cn } from '../../lib/utils';
import { useAvailabilityStore } from '../../stores/availabilityStore';
import { useRoomStore } from '../../stores/roomStore';
import { useEmergencyStore } from '../../stores/emergencyStore';
import { availabilityApi } from '../../lib/api/availability';
import toast from 'react-hot-toast';

// ... (keeping all the existing interfaces and helper components)

export function Calendar({ mode = 'single', selectedDates = [], onSelect, className, currentRoomId }: CalendarProps) {
  // ... (keeping all the existing state and hooks)
  
  const sensors = useSensors(
    useSensor(MouseSensor, {
      // Require the mouse to move by 10 pixels before activating
      activationConstraint: {
        distance: 10,
      },
    })
  );

  const handleDragStart = (event: any) => {
    const { active } = event;
    if (!active) return;
    
    // Store the initial drag start date
    const startDate = new Date(active.id);
    setSelectedDateRange({ start: startDate, end: startDate });
  };

  const handleDragMove = (event: any) => {
    const { active, over } = event;
    if (!active || !over) return;
    
    // Update the end date as the user drags
    const endDate = new Date(over.id);
    setSelectedDateRange(prev => ({ ...prev, end: endDate }));
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (!active || !over) return;
    
    // Finalize the date range selection
    const startDate = new Date(active.id);
    const endDate = new Date(over.id);
    
    // Ensure dates are in correct order
    const start = startDate < endDate ? startDate : endDate;
    const end = startDate < endDate ? endDate : startDate;
    
    setSelectedDateRange({ start, end });
    
    // If there's an onSelect callback, call it with the final date range
    if (onSelect) {
      onSelect({ start, end });
    }
  };

  return (
    <div className="flex">
      <div className="flex-grow overflow-auto">
        <div className={cn('bg-white rounded-lg shadow-lg p-6', className)}>
          <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragMove={handleDragMove}
            onDragEnd={handleDragEnd}
          >
            {displayedMonths.map(month => renderMonth(month))}
          </DndContext>
        </div>
      </div>

      <div className="w-80 ml-8 flex-shrink-0">
        <div className="sticky top-24">
          <div className="bg-white p-6 rounded-lg shadow-lg mb-6">
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
            selectedRoom={currentRoomId}
            onUpdatePrice={handleBulkPriceUpdate}
            onUpdateAvailability={handleBulkAvailabilityUpdate}
          />
        </div>
      </div>
    </div>
  );
}