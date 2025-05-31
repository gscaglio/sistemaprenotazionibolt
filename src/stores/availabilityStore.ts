import { create } from 'zustand';
import type { Database } from '../lib/database.types';
import { availabilityApi } from '../lib/api/availability';
import { startOfMonth, endOfMonth, parse, format } from 'date-fns';
import { errorLogger } from '../lib/errorLogger';

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
    set(state => ({ loading: true, error: null }));
    
    try {
      const data = await availabilityApi.getAvailability(month);
      
      const monthStart = format(startOfMonth(parse(month, 'yyyy-MM', new Date())), 'yyyy-MM-dd');
      const monthEnd = format(endOfMonth(parse(month, 'yyyy-MM', new Date())), 'yyyy-MM-dd');
      
      set(state => {
        const filteredAvailability = state.availability.filter(item => {
          const itemDate = item.date;
          return itemDate < monthStart || itemDate > monthEnd;
        });
        
        const newAvailability = [...filteredAvailability, ...(data || [])];
        
        console.log(`[Store] Successfully merged availability data. Total records: ${newAvailability.length}`);
        console.log(`[Store] Records for current month: ${data?.length || 0}`);
        console.log(`[Store] Records for other months: ${filteredAvailability.length}`);
        
        return {
          availability: newAvailability,
          loading: false,
          error: null
        };
      });
    } catch (error) {
      errorLogger.log(error instanceof Error ? error : new Error(String(error)), 'error', {
        operation: 'fetchAvailability',
        month
      });
      set({ error: (error as Error).message, loading: false });
    }
  },
  updateAvailability: async (id, updates) => {
    console.log(`[Store] Updating availability for id: ${id} with updates:`, updates);
    set({ loading: true, error: null });
    try {
      const data = await availabilityApi.updateAvailability(id, updates);
      
      console.log(`[Store] Successfully updated availability for id: ${id}`);
      set((state) => ({
        availability: state.availability.map((item) =>
          item.id === id ? { ...item, ...data } : item
        ),
        loading: false,
      }));
    } catch (error) {
      errorLogger.log(error instanceof Error ? error : new Error(String(error)), 'error', {
        operation: 'updateAvailability',
        id,
        updates
      });
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
        return;
      }
      
      console.log(`[Store] API call for bulk update successful. Received ${returnedData.length} records. Merging now.`);
      console.log('[Store] Sample of returned data for merge:', logSample(returnedData));

      set((state) => {
        let newAvailability = [...state.availability];

        returnedData.forEach(newItem => {
          if (!newItem || !newItem.id || !newItem.room_id || !newItem.date) {
            console.warn('[Store] Skipping merge for an invalid item returned by API:', newItem);
            return;
          }

          // Price override sanitization
          if (newItem.price_override !== null && typeof newItem.price_override !== 'number') {
            const originalPrice = newItem.price_override;
            newItem.price_override = parseFloat(String(newItem.price_override));
            if (isNaN(newItem.price_override)) {
              newItem.price_override = null;
              console.warn('[Store] Invalid price_override value:', originalPrice);
            }
          }

          // Available field sanitization
          if (typeof newItem.available !== 'boolean') {
            const originalValue = newItem.available;
            newItem.available = String(newItem.available).toLowerCase() === 'true';
            console.warn('[Store] Non-boolean available field:', originalValue);
          }

          const index = newAvailability.findIndex(
            (existingItem) =>
              existingItem.room_id === newItem.room_id && existingItem.date === newItem.date
          );

          if (index !== -1) {
            newAvailability[index] = { ...newAvailability[index], ...newItem };
          } else {
            newAvailability.push(newItem as Availability);
          }
        });

        console.log('[Store] Merging complete. New availability sample:', logSample(newAvailability));
        console.log('[Store] Total items in availability after merge:', newAvailability.length);

        return { availability: newAvailability, loading: false };
      });

    } catch (error) {
      errorLogger.log(error instanceof Error ? error : new Error(String(error)), 'error', {
        operation: 'updateBulkAvailability',
        updatesCount: updates.length,
        sample: logSample(updates)
      });
      set({ error: (error as Error).message, loading: false });
    }
  },
}));