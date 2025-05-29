import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { availabilityApi } from '../lib/api/availability';
import { format } from 'date-fns';

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
          const currentDate = new Date();
          const month = format(currentDate, 'yyyy-MM');
          const availability = await availabilityApi.getAvailability(month);
          
          set({ savedAvailability: availability, isEmergencyActive: true });
          
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
            // Ripristina lo stato precedente
            await availabilityApi.bulkUpdateAvailability(savedAvailability);
            
            // Forza un aggiornamento dei dati dopo il ripristino
            const currentDate = new Date();
            const month = format(currentDate, 'yyyy-MM');
            await availabilityApi.getAvailability(month);
            
            set({ isEmergencyActive: false, savedAvailability: null });
          } catch (error) {
            console.error('Failed to deactivate emergency mode:', error);
            throw error;
          }
        } else {
          set({ isEmergencyActive: false });
        }
      }
    }),
    {
      name: 'emergency-storage'
    }
  )
);