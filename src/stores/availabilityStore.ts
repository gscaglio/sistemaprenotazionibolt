import { create } from 'zustand';
import type { Database } from '../lib/database.types';
import { availabilityApi } from '../lib/api/availability';
import { startOfMonth, endOfMonth, parse, format } from 'date-fns';

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
      
      // Get the date range for the month being fetched
      const monthStart = format(startOfMonth(parse(month, 'yyyy-MM', new Date())), 'yyyy-MM-dd');
      const monthEnd = format(endOfMonth(parse(month, 'yyyy-MM', new Date())), 'yyyy-MM-dd');
      
      const sanitizedFetchedData: Availability[] = [];
      if (data && Array.isArray(data)) {
        data.forEach(item => {
          if (!item || typeof item.id === 'undefined' || typeof item.room_id === 'undefined' || typeof item.date === 'undefined') {
            console.warn('[Store] fetchAvailability: Skipping merge for an invalid/incomplete item returned by API:', item);
            return;
          }

          const sanitizedItem: Availability = {
            id: item.id,
            room_id: item.room_id,
            date: item.date,
            available: typeof item.available === 'boolean' ? item.available :
                       (String(item.available).toLowerCase() === 'true' ? true :
                       (String(item.available).toLowerCase() === 'false' ? false : false)), // Defaulting to false
            price_override: (item.price_override === null || typeof item.price_override === 'number') ? item.price_override :
                            (!isNaN(parseFloat(String(item.price_override))) ? parseFloat(String(item.price_override)) : null),
            blocked_reason: (item.blocked_reason === null || typeof item.blocked_reason === 'string') ? item.blocked_reason : String(item.blocked_reason),
            notes: (item.notes === null || typeof item.notes === 'string') ? item.notes : String(item.notes),
            created_at: typeof item.created_at === 'string' ? item.created_at : (item.created_at ? String(item.created_at) : new Date().toISOString()),
            updated_at: typeof item.updated_at === 'string' ? item.updated_at : (item.updated_at ? String(item.updated_at) : new Date().toISOString())
          };
          sanitizedFetchedData.push(sanitizedItem);
        });
      }

      set(state => {
        // Remove existing data for this month
        const filteredAvailability = state.availability.filter(item => {
          const itemDate = item.date;
          return itemDate < monthStart || itemDate > monthEnd;
        });
        
        // Merge new data with existing data from other months
        const newAvailability = [...filteredAvailability, ...sanitizedFetchedData];
        
        console.log(`[Store] Successfully merged availability data. Total records: ${newAvailability.length}`);
        console.log(`[Store] Records for current month: ${sanitizedFetchedData.length}`);
        console.log(`[Store] Records for other months: ${filteredAvailability.length}`);
        
        return {
          availability: newAvailability,
          loading: false,
          error: null
        };
      });
    } catch (error) {
      console.error(`[Store] Error fetching availability for month ${month}:`, error);
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
        return;
      }
      
      console.log(`[Store] API call for bulk update successful. Received ${returnedData.length} records. Merging now.`);
      console.log('[Store] Sample of returned data for merge:', logSample(returnedData));

      set((state) => {
        // Create a mutable copy of the current availability for modification
        let newAvailability = [...state.availability];

        returnedData.forEach(newItem => {
          // Ensure newItem is not null and has basic structure
          if (!newItem || typeof newItem.id === 'undefined' || typeof newItem.room_id === 'undefined' || typeof newItem.date === 'undefined') {
            console.warn('[Store] Skipping merge for an invalid/incomplete item returned by API:', newItem);
            return; 
          }

          const sanitizedItem: Availability = {
            // Ensure required fields from newItem are present and spread them
            id: newItem.id, // Assuming id is always present and correct type
            room_id: newItem.room_id, // Assuming room_id is always present and correct type
            date: newItem.date, // Assuming date is always present and correct type

            // Sanitize 'available'
            available: typeof newItem.available === 'boolean' ? newItem.available :
                       (String(newItem.available).toLowerCase() === 'true' ? true :
                       (String(newItem.available).toLowerCase() === 'false' ? false : true)), // Default to true if parsing fails

            // Sanitize 'price_override'
            price_override: (newItem.price_override === null || typeof newItem.price_override === 'number') ? newItem.price_override :
                            (!isNaN(parseFloat(String(newItem.price_override))) ? parseFloat(String(newItem.price_override)) : null), // Default to null if parsing fails

            // Sanitize 'blocked_reason' - allow null or string
            blocked_reason: (newItem.blocked_reason === null || typeof newItem.blocked_reason === 'string') ? newItem.blocked_reason : String(newItem.blocked_reason),

            // Sanitize 'notes' - allow null or string
            notes: (newItem.notes === null || typeof newItem.notes === 'string') ? newItem.notes : String(newItem.notes),

            // Keep created_at and updated_at as strings, assuming they are correctly formatted by API
            // Fallback to current time if not a string or undefined/null
            created_at: typeof newItem.created_at === 'string' ? newItem.created_at : (newItem.created_at ? String(newItem.created_at) : new Date().toISOString()),
            updated_at: typeof newItem.updated_at === 'string' ? newItem.updated_at : (newItem.updated_at ? String(newItem.updated_at) : new Date().toISOString())
          };

          const index = newAvailability.findIndex(
            (existingItem) =>
              existingItem.room_id === sanitizedItem.room_id && existingItem.date === sanitizedItem.date
          );

          if (index !== -1) {
            // Update existing item
            console.log(`[Store] Merging: Updating existing item for date ${sanitizedItem.date}, room ${sanitizedItem.room_id}.`);
            newAvailability[index] = { ...newAvailability[index], ...sanitizedItem };
          } else {
            // Add new item
            console.log(`[Store] Merging: Adding new item for date ${sanitizedItem.date}, room ${sanitizedItem.room_id}.`);
            newAvailability.push(sanitizedItem);
          }
        });
        
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