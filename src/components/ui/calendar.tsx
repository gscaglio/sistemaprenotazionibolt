import React, { useState } from 'react';
import { format, eachDayOfInterval } from 'date-fns';
import { toast } from 'react-hot-toast';
import { availabilityApi } from '../../lib/api/availability';

interface CalendarProps {
  mode: 'admin' | 'user';
}

interface DateRange {
  start: Date | null;
  end: Date | null;
}

export function Calendar({ mode }: CalendarProps) {
  const [selectedRoom, setSelectedRoom] = useState<number | null>(null);
  const [selectedDateRanges, setSelectedDateRanges] = useState<Map<number, DateRange>>(new Map());

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
      available: status === 'available',
      blocked_reason: status === 'blocked' ? 'manual_block' : null
    }));

    try {
      await availabilityApi.bulkUpdateAvailability(daysToUpdate);
      toast.success('Disponibilità aggiornata con successo');
      // Clear the selection after successful update
      setSelectedDateRanges(new Map(selectedDateRanges.set(selectedRoom, { start: null, end: null })));
    } catch (error) {
      toast.error('Errore durante l\'aggiornamento della disponibilità');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {/* Calendar implementation will go here */}
      <div className="text-center p-4">
        <p className="text-gray-600">Calendar component placeholder</p>
      </div>
      
      {mode === 'admin' && selectedRoom && (
        <div className="mt-4 flex gap-2 justify-end">
          <button
            onClick={() => handleBulkAvailabilityUpdate('available')}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Set Available
          </button>
          <button
            onClick={() => handleBulkAvailabilityUpdate('blocked')}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Set Blocked
          </button>
        </div>
      )}
    </div>
  );
}