import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type Room = Database['public']['Tables']['rooms']['Row'];

interface RoomStore {
  rooms: Room[];
  loading: boolean;
  error: string | null;
  fetchRooms: () => Promise<void>;
  updateRoom: (id: number, updates: Partial<Room>) => Promise<void>;
}

export const useRoomStore = create<RoomStore>((set) => ({
  rooms: [],
  loading: false,
  error: null,
  fetchRooms: async () => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .order('id');
      
      if (error) throw error;
      set({ rooms: data, loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },
  updateRoom: async (id, updates) => {
    set({ loading: true, error: null });
    try {
      const { error } = await supabase
        .from('rooms')
        .update(updates)
        .eq('id', id);
      
      if (error) throw error;
      
      set((state) => ({
        rooms: state.rooms.map((room) =>
          room.id === id ? { ...room, ...updates } : room
        ),
        loading: false,
      }));
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },
}));