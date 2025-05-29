import React, { useEffect } from 'react';
import { Calendar } from '../components/ui/calendar';
import { useAvailabilityStore } from '../stores/availabilityStore';
import { useRoomStore } from '../stores/roomStore';
import { format } from 'date-fns';
import { DndContext } from '@dnd-kit/core';

function CalendarPage() {
  const { fetchRooms } = useRoomStore();
  const { fetchAvailability } = useAvailabilityStore();

  useEffect(() => {
    fetchRooms();
    fetchAvailability(format(new Date(), 'yyyy-MM'));
  }, [fetchRooms, fetchAvailability]);

  return (
    <div className="container mx-auto px-4">
      <h1 className="text-2xl font-bold mb-6">Calendario Disponibilità</h1>
      <div className="bg-white rounded-lg shadow-md">
        <DndContext onDragEnd={(event) => console.log('drag end', event)}>
          <Calendar mode="admin" />
        </DndContext>
      </div>
    </div>
  );
}

export default CalendarPage;