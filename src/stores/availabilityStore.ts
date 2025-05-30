import { create } from 'zustand';
import { supabase } from '../lib/supabase'; // Direct Supabase client, possibly for other methods
import type { Database } from '../lib/database.types';
import { endOfMonth, parse, format } from 'date-fns';
import { availabilityApi } from '../lib/api/availability'; // Import the API

type Availability = Database['public']['Tables']['availability']['Row'];
type AvailabilityUpdate = Partial<Availability>;

// Helper to log a sample of data if it's too large
const logSample = (data: any[], sampleSize: number = 3) => {
  if (!data) return 'undefined data';
  if (data.length > sampleSize) {
    return `Array of ${data.length} items. Sample: ${JSON.stringify(data.slice(0, sampleSize))}...`;
  }
  return data;
};

interface AvailabilityStore {
  availability: Availability[];
  loading: boolean;
  error: string | null;
  fetchAvailability: (month: string) => Promise<void>;
  updateAvailability: (id: number, updates: AvailabilityUpdate) => Promise<void>;
  updateBulkAvailability: (updates: AvailabilityUpdate[]) => Promise<void>;
}

export const useAvailabilityStore = create<AvailabilityStore>((set, get) => ({
  availability: [],
  loading: false,
  error: null,
  fetchAvailability: async (month) => {
    console.log(`[Store] Fetching availability for month: ${month}`);
    set({ loading: true, error: null });
    try {
      // Using availabilityApi.getAvailability for consistency, though it was not part of the original request to change
      // For now, let's assume direct supabase call is fine here as per original code.
      const startDate = `${month}-01`;
      const parsedDate = parse(month, 'yyyy-MM', new Date());
      const endDate = format(endOfMonth(parsedDate), 'yyyy-MM-dd');
      
      const { data, error } = await supabase // Direct Supabase call
        .from('availability')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date');
      
      if (error) {
        console.error(`[Store] Error fetching availability for month ${month}:`, error);
        throw error;
      }
      console.log(`[Store] Successfully fetched ${data?.length || 0} records for month ${month}.`);
      set({ availability: data || [], loading: false });
    } catch (error) {
      console.error(`[Store] Catch: Error fetching availability for month ${month}:`, error);
      set({ error: (error as Error).message, loading: false });
    }
  },
  updateAvailability: async (id, updates) => {
    console.log(`[Store] Updating availability for id: ${id} with updates:`, updates);
    set({ loading: true, error: null });
    try {
      // Using availabilityApi.updateAvailability for consistency
      const data = await availabilityApi.updateAvailability(id, updates);
      
      console.log(`[Store] Successfully updated availability for id: ${id}.`);
      set((state) => ({
        availability: state.availability.map((item) =>
          item.id === id ? { ...item, ...data } : item
        ),
        loading: false,
      }));
    } catch (error) {
      console.error(`[Store] Error updating availability for id: ${id}:`, error);
      set({ error: (error as Error).message, loading: false });
    }
  },
  updateBulkAvailability: async (updates: AvailabilityUpdate[]) => {
    console.log('[Store] Initiating bulk update of availability. Number of updates:', updates.length, 'Sample:', logSample(updates));
    if (!updates || updates.length === 0) {
      console.warn('[Store] updateBulkAvailability called with no updates.');
      set({ loading: false });
      return;
    }
    set({ loading: true, error: null });
    try {
      console.log(`[Store] Calling API for bulk update with ${updates.length} updates.`);
      const returnedData = await availabilityApi.bulkUpdateAvailability(updates);
      
      if (!returnedData) {
        console.warn('[Store] API call for bulk update returned undefined data. No store update will be performed.');
        set({ loading: false });
        // Potentially set an error state here if this is unexpected
        return;
      }
      
      console.log(`[Store] API call for bulk update successful. Received ${returnedData.length} records. Merging now.`);
      console.log('[Store] Sample of returned data for merge:', logSample(returnedData));

      set((state) => {
        // Create a mutable copy of the current availability for modification
        let newAvailability = [...state.availability];

        returnedData.forEach(newItem => {
          if (!newItem || !newItem.id || !newItem.room_id || !newItem.date) {
            console.warn('[Store] Skipping merge for an invalid item returned by API:', newItem);
            return; 
          }
          const index = newAvailability.findIndex(
            (existingItem) =>
              existingItem.room_id === newItem.room_id && existingItem.date === newItem.date
          );

          if (index !== -1) {
            // Update existing item
            console.log(`[Store] Merging: Updating existing item for date ${newItem.date}, room ${newItem.room_id}.`);
            newAvailability[index] = { ...newAvailability[index], ...newItem };
          } else {
            // Add new item
            console.log(`[Store] Merging: Adding new item for date ${newItem.date}, room ${newItem.room_id}.`);
            newAvailability.push(newItem as Availability); // Cast to Availability as API returns full object
          }
        });
        
        // For debugging: log a sample of the new availability state
        console.log('[Store] Merging complete. New availability sample:', logSample(newAvailability));
        console.log('[Store] Total items in availability after merge:', newAvailability.length);

        return { availability: newAvailability, loading: false };
      });

      console.log('[Store] Bulk update process and store merge completed successfully.');

    } catch (error) {
      console.error('[Store] Error during bulk availability update or merge process:', error);
      set({ error: (error as Error).message, loading: false });
    }
  },
}));