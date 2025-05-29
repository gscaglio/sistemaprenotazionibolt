import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { availabilityApi } from '../lib/api/availability';

interface EmergencyState {
  isEmergencyActive: boolean;
  savedAvailability: any[] | null;
  activateEmergency: () => Promise<void>;
  deactivateEmergency: () => Promise<void>;
}

export const useEmergencyStore = create<EmergencyState>()(
  persist(
    (set, get) => ({
      isEmergencyActive: false,
      savedAvailability: null,
      activateEmergency: async () => {
        try {
          // Get current month's availability
          const currentDate = new Date();
          const month = currentDate.toISOString().slice(0, 7);
          const availability = await availabilityApi.getAvailability(month);
          
          // Save current state
          set({ savedAvailability: availability, isEmergencyActive: true });
          
          // Disable all rooms
          const updates = availability.map(item => ({
            room_id: item.room_id,
            date: item.date,
            available: false,
            blocked_reason: 'emergency',
            price_override: null
          }));
          
          await availabilityApi.bulkUpdateAvailability(updates);
        } catch (error) {
          console.error('Failed to activate emergency mode:', error);
          throw error;
        }
      },
      deactivateEmergency: async () => {
        const { savedAvailability } = get();
        if (savedAvailability) {
          try {
            await availabilityApi.bulkUpdateAvailability(savedAvailability);
            set({ isEmergencyActive: false, savedAvailability: null });
          } catch (error) {
            console.error('Failed to deactivate emergency mode:', error);
            throw error;
          }
        }
      }
    }),
    {
      name: 'emergency-storage'
    }
  )
);