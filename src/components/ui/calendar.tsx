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

interface DateRange {
  start: Date;
  end: Date;
}

interface CalendarProps {
  mode?: 'single' | 'range';
  selectedDates?: DateRange;
  onSelect?: (dates: DateRange) => void;
  className?: string;
  currentRoomId?: number;
}

interface DateRangePickerProps {
  startDate: Date;
  endDate: Date;
  onDateChange: (range: DateRange) => void;
}

interface BulkEditPanelProps {
  selectedDates: DateRange;
  selectedRoom?: number;
  onUpdatePrice: (price: number) => void;
  onUpdateAvailability: (available: boolean) => void;
}

const DateRangePicker = ({ startDate, endDate, onDateChange }: DateRangePickerProps) => {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Check-in</label>
        <input
          type="date"
          value={format(startDate, 'yyyy-MM-dd')}
          onChange={(e) => onDateChange({ start: new Date(e.target.value), end: endDate })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Check-out</label>
        <input
          type="date"
          value={format(endDate, 'yyyy-MM-dd')}
          onChange={(e) => onDateChange({ start: startDate, end: new Date(e.target.value) })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
        />
      </div>
    </div>
  );
};

const BulkEditPanel = ({ selectedDates, selectedRoom, onUpdatePrice, onUpdateAvailability }: BulkEditPanelProps) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <h3 className="text-lg font-semibold mb-4 text-gray-900">Bulk Edit</h3>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Price Override</label>
          <input
            type="number"
            min="0"
            step="0.01"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            onChange={(e) => onUpdatePrice(parseFloat(e.target.value))}
          />
        </div>
        <div>
          <button
            onClick={() => onUpdateAvailability(true)}
            className="w-full mb-2 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          >
            Set Available
          </button>
          <button
            onClick={() => onUpdateAvailability(false)}
            className="w-full bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          >
            Set Unavailable
          </button>
        </div>
      </div>
    </div>
  );
};

export function Calendar({ mode = 'single', selectedDates = [], onSelect, className, currentRoomId }: CalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));
  const [selectedDateRange, setSelectedDateRange] = useState<DateRange>({
    start: new Date(),
    end: new Date()
  });

  // Calculate the displayed months (current month and next 2 months)
  const displayedMonths = [
    currentMonth,
    addMonths(currentMonth, 1),
    addMonths(currentMonth, 2)
  ];

  const renderMonth = (month: Date) => {
    const start = startOfMonth(month);
    const end = endOfMonth(month);
    const days = eachDayOfInterval({ start, end });

    return (
      <div key={format(month, 'yyyy-MM')} className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">
            {format(month, 'MMMM yyyy', { locale: it })}
          </h2>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((day) => (
            <div
              key={format(day, 'yyyy-MM-dd')}
              className={cn(
                'p-2 text-center border rounded',
                isToday(day) && 'bg-blue-50',
                !isSameMonth(day, month) && 'text-gray-400',
                isBefore(day, new Date()) && 'bg-gray-100 cursor-not-allowed'
              )}
            >
              {format(day, 'd')}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const handleDateRangeChange = (range: DateRange) => {
    setSelectedDateRange(range);
    if (onSelect) {
      onSelect(range);
    }
  };

  const handleBulkPriceUpdate = async (price: number) => {
    if (!currentRoomId) return;
    try {
      // Implementation for bulk price update
      toast.success('Prices updated successfully');
    } catch (error) {
      toast.error('Failed to update prices');
    }
  };

  const handleBulkAvailabilityUpdate = async (available: boolean) => {
    if (!currentRoomId) return;
    try {
      // Implementation for bulk availability update
      toast.success('Availability updated successfully');
    } catch (error) {
      toast.error('Failed to update availability');
    }
  };

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 10,
      },
    })
  );

  const handleDragStart = (event: any) => {
    const { active } = event;
    if (!active) return;
    
    const startDate = new Date(active.id);
    setSelectedDateRange({ start: startDate, end: startDate });
  };

  const handleDragMove = (event: any) => {
    const { active, over } = event;
    if (!active || !over) return;
    
    const endDate = new Date(over.id);
    setSelectedDateRange(prev => ({ ...prev, end: endDate }));
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (!active || !over) return;
    
    const startDate = new Date(active.id);
    const endDate = new Date(over.id);
    
    const start = startDate < endDate ? startDate : endDate;
    const end = startDate < endDate ? endDate : startDate;
    
    setSelectedDateRange({ start, end });
    
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