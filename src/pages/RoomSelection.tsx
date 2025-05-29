import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BedDouble, AlertTriangle } from 'lucide-react';
import { useRoomStore } from '../stores/roomStore';
import { useEmergencyStore } from '../stores/emergencyStore';

function RoomSelection() {
  const { rooms, fetchRooms } = useRoomStore();
  const { isEmergencyActive } = useEmergencyStore();
  const navigate = useNavigate();

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  useEffect(() => {
    if (isEmergencyActive) {
      navigate('/settings');
    }
  }, [isEmergencyActive, navigate]);

  if (isEmergencyActive) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Seleziona una stanza</h1>
      
      <div className="grid md:grid-cols-2 gap-6">
        {rooms.map(room => (
          <Link
            key={room.id}
            to={`/calendar/${room.id}`}
            className="block p-6 bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow"
          >
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <BedDouble className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{room.name}</h2>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default RoomSelection;