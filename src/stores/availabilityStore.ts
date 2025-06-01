import { create } from 'zustand';
import type { Database } from '../lib/database.types';
import { availabilityApi } from '../lib/api/availability';
import { startOfMonth, endOfMonth, parse, format } from 'date-fns';
import toast from 'react-hot-toast';

type Availability = Database['public']['Tables']['availability']['Row'];
type AvailabilityUpdate = Partial<Availability>;

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
        
        return {
          availability: [...filteredAvailability, ...(data || [])],
          loading: false,
          error: null
        };
      });
    } catch (error) {
      console.error('Error fetching availability:', error);
      set({ error: (error as Error).message, loading: false });
      toast.error('Errore nel caricamento della disponibilità');
    }
  },
  updateAvailability: async (id, updates) => {
    set({ loading: true, error: null });
    try {
      const data = await availabilityApi.updateAvailability(id, updates);
      
      set((state) => ({
        availability: state.availability.map((item) =>
          item.id === id ? { ...item, ...data } : item
        ),
        loading: false,
      }));
    } catch (error) {
      console.error('Error updating availability:', error);
      set({ error: (error as Error).message, loading: false });
      toast.error('Errore nell\'aggiornamento della disponibilità');
    }
  },
  updateBulkAvailability: async (updates: AvailabilityUpdate[]) => {
    if (!updates || updates.length === 0) {
      set({ loading: false });
      return;
    }

    set({ loading: true, error: null });
    
    try {
      const returnedData = await availabilityApi.bulkUpdateAvailability(updates);
      
      if (!returnedData) {
        set({ loading: false });
        return;
      }

      set((state) => {
        let newAvailability = [...state.availability];

        returnedData.forEach(newItem => {
          if (!newItem || !newItem.id || !newItem.room_id || !newItem.date) {
            return;
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

        return { availability: newAvailability, loading: false };
      });

    } catch (error) {
      console.error('Error in bulk update:', error);
      set({ 
        error: (error as Error).message,
        loading: false 
      });
      toast.error('Errore nell\'aggiornamento massivo della disponibilità');
      throw error;
    }
  },
}));