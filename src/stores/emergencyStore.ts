import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { availabilityApi } from '../lib/api/availability';
import { format } from 'date-fns';
import { supabase } from '../lib/supabase';
import { errorLogger } from '../lib/errorLogger';

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
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        try {
          // Start transaction for emergency mode activation
          const { data: result, error } = await supabase.rpc('activate_emergency_mode', {
            p_user_id: user.id
          });

          if (error) throw error;

          set({ 
            savedAvailability: result.saved_availability, 
            isEmergencyActive: true 
          });
        } catch (error) {
          errorLogger.log(error instanceof Error ? error : new Error(String(error)), 'error', {
            operation: 'activateEmergency',
            userId: user.id
          });
          throw error;
        }
      },
      deactivateEmergency: async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        try {
          // Start transaction for emergency mode deactivation
          const { error } = await supabase.rpc('deactivate_emergency_mode', {
            p_user_id: user.id,
            p_saved_availability: get().savedAvailability
          });

          if (error) throw error;

          // Force a refresh of availability data
          const currentDate = new Date();
          const month = format(currentDate, 'yyyy-MM');
          await availabilityApi.getAvailability(month);

          set({ isEmergencyActive: false, savedAvailability: null });
        } catch (error) {
          errorLogger.log(error instanceof Error ? error : new Error(String(error)), 'error', {
            operation: 'deactivateEmergency',
            userId: user.id
          });
          throw error;
        }
      }
    }),
    {
      name: 'emergency-storage'
    }
  )
);