import { supabase } from '../supabase';
import type { Database } from '../database.types';

type Room = Database['public']['Tables']['rooms']['Row'];

export const roomsApi = {
  // Public endpoints
  getPublicRooms: async () => {
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('active', true)
      .order('id');
    if (error) throw error;
    return data;
  },

  getPublicRoom: async (slug: string) => {
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('slug', slug)
      .eq('active', true)
      .single();
    if (error) throw error;
    return data;
  },

  // Admin endpoints
  getAllRooms: async () => {
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .order('id');
    if (error) throw error;
    return data;
  },

  createRoom: async (room: Omit<Room, 'id' | 'created_at'>) => {
    const { data, error } = await supabase
      .from('rooms')
      .insert([room])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  updateRoom: async (id: number, updates: Partial<Room>) => {
    const { data, error } = await supabase
      .from('rooms')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  deleteRoom: async (id: number) => {
    const { error } = await supabase
      .from('rooms')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
};