import React, { useEffect } from 'react';
import { Calendar } from '../components/ui/calendar';
import { useAvailabilityStore } from '../stores/availabilityStore';
import { useRoomStore } from '../stores/roomStore';
import { format } from 'date-fns';

function CalendarPage() {
  const { fetchRooms } = useRoomStore();
  const { fetchAvailability } = useAvailabilityStore();

  useEffect(() => {
    fetchRooms();
    fetchAvailability(format(new Date(), 'yyyy-MM'));
  }, [fetchRooms, fetchAvailability]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Gestione Calendario</h1>
      </div>
      <Calendar mode="admin" />
    </div>
  );
}

export default CalendarPage;