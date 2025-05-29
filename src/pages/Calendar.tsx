import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar } from '../components/ui/calendar';
import { useAvailabilityStore } from '../stores/availabilityStore';
import { useRoomStore } from '../stores/roomStore';
import { format } from 'date-fns';
import { ArrowLeft } from 'lucide-react';

function CalendarPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { rooms, fetchRooms } = useRoomStore();
  const { fetchAvailability } = useAvailabilityStore();

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  useEffect(() => {
    if (roomId) {
      fetchAvailability(format(new Date(), 'yyyy-MM'));
    }
  }, [roomId, fetchAvailability]);

  const currentRoom = rooms.find(room => room.id === Number(roomId));

  if (!currentRoom) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/calendar')}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            Calendario - {currentRoom.name}
          </h1>
        </div>
      </div>
      <Calendar mode="admin" currentRoomId={currentRoom.id} />
    </div>
  );
}

export default CalendarPage