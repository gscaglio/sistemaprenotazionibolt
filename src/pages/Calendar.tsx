import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar } from '../components/ui/calendar';
import { useAvailabilityStore } from '../stores/availabilityStore';
import { useRoomStore } from '../stores/roomStore';
import { useEmergencyStore } from '../stores/emergencyStore';
import { format } from 'date-fns';
import { ArrowLeft, AlertTriangle } from 'lucide-react';

function CalendarPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { rooms, fetchRooms } = useRoomStore();
  const { fetchAvailability } = useAvailabilityStore();
  const { isEmergencyActive } = useEmergencyStore();

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

  if (isEmergencyActive) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/')}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">
              Calendario - {currentRoom.name}
            </h1>
          </div>
        </div>
        
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-md">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5" />
            <div className="ml-3">
              <h3 className="text-lg font-medium text-red-800">
                Calendario non disponibile
              </h3>
              <p className="mt-2 text-red-700">
                Il calendario è temporaneamente disabilitato perché la modalità emergenza è attiva. 
                Disattiva la modalità emergenza dalle impostazioni per riprendere la gestione del calendario.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/')}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            Calendario - {currentRoom.name}
          </h1>
        </div>
      </div>
      <Calendar mode="admin" currentRoomId={Number(roomId)} />
    </div>
  );
}

export default CalendarPage;