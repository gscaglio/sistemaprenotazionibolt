import { supabase } from '../supabase';
import type { Database } from '../database.types';

type Setting = Database['public']['Tables']['settings']['Row'];

export const settingsApi = {
  // Public endpoints
  getPublicSettings: async () => {
    const { data, error } = await supabase
      .from('settings')
      .select('key, value')
      .eq('public', true);
    if (error) throw error;
    return data;
  },

  // Admin endpoints
  getAllSettings: async () => {
    const { data, error } = await supabase
      .from('settings')
      .select('*');
    if (error) throw error;
    return data;
  },

  updateSetting: async (key: string, value: any) => {
    const { data, error } = await supabase
      .from('settings')
      .update({ value })
      .eq('key', key)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
};