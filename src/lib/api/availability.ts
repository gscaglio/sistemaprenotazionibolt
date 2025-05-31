import { supabase } from '../supabase';
import type { Database } from '../database.types';
import { endOfMonth, parse, format } from 'date-fns';
import { errorLogger } from '../errorLogger';
import { performanceLogger } from '../performanceLogger';

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

export const availabilityApi = {
  getPublicAvailability: async (startDate: string, endDate: string) => {
    return performanceLogger.measureAsync('getPublicAvailability', async () => {
      const { data, error } = await supabase
        .from('availability')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date');
      if (error) throw error;
      return data;
    }, { startDate, endDate });
  },

  getAvailability: async (month: string) => {
    return performanceLogger.measureAsync('getAvailability', async () => {
      const startDate = `${month}-01`;
      const parsedDate = parse(month, 'yyyy-MM', new Date());
      const endDate = format(endOfMonth(parsedDate), 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('availability')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date');
      if (error) throw error;
      return data;
    }, { month });
  },

  updateAvailability: async (id: number, updates: Partial<Availability>) => {
    return performanceLogger.measureAsync('updateAvailability', async () => {
      const { data, error } = await supabase
        .from('availability')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    }, { id, updates });
  },

  bulkUpdateAvailability: async (updates: AvailabilityUpdate[]) => {
    return performanceLogger.measureAsync('bulkUpdateAvailability', async () => {
      if (!updates || updates.length === 0) {
        return [];
      }

      try {
        // Call the RPC function with transaction support
        const { data, error } = await supabase
          .rpc('bulk_update_availability_with_transaction', {
            updates: updates.map(update => ({
              ...update,
              updated_at: new Date().toISOString()
            }))
          });

        if (error) {
          errorLogger.log(new Error(error.message), 'error', {
            operation: 'bulkUpdateAvailability_rpc',
            code: error.code,
            details: error.details,
            hint: error.hint,
            updatesCount: updates.length
          });
          throw error;
        }

        return data;
      } catch (error) {
        errorLogger.log(error instanceof Error ? error : new Error(String(error)), 'error', {
          operation: 'bulkUpdateAvailability',
          updatesCount: updates.length,
          sample: logSample(updates)
        });
        throw error;
      }
    }, { updatesCount: updates.length });
  }
};