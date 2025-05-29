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