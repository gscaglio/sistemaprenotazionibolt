import { create } from 'zustand';
import * as Sentry from "@sentry/react";
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
    const transaction = Sentry.startTransaction({
      name: "fetchAvailability",
      op: "store.fetch",
    });

    Sentry.configureScope(scope => {
      scope.setTag("month", month);
    });

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
        
        Sentry.addBreadcrumb({
          category: 'store',
          message: `Merged availability data. Total: ${newAvailability.length}, Current month: ${data?.length || 0}, Other months: ${filteredAvailability.length}`,
          level: 'info'
        });
        
        return {
          availability: newAvailability,
          loading: false,
          error: null
        };
      });
    } catch (error) {
      const sentryError = error instanceof Error ? error : new Error(String(error));
      Sentry.captureException(sentryError, {
        tags: { operation: 'fetchAvailability', month }
      });
      set({ error: sentryError.message, loading: false });
    } finally {
      transaction.finish();
    }
  },
  updateAvailability: async (id, updates) => {
    const transaction = Sentry.startTransaction({
      name: "updateAvailability",
      op: "store.update",
    });

    set({ loading: true, error: null });
    try {
      const data = await availabilityApi.updateAvailability(id, updates);
      
      Sentry.addBreadcrumb({
        category: 'store',
        message: `Updated availability for id: ${id}`,
        level: 'info',
        data: { updates }
      });

      set((state) => ({
        availability: state.availability.map((item) =>
          item.id === id ? { ...item, ...data } : item
        ),
        loading: false,
      }));
    } catch (error) {
      const sentryError = error instanceof Error ? error : new Error(String(error));
      Sentry.captureException(sentryError, {
        tags: { operation: 'updateAvailability', id: String(id) }
      });
      set({ error: sentryError.message, loading: false });
    } finally {
      transaction.finish();
    }
  },
  updateBulkAvailability: async (updates: AvailabilityUpdate[]) => {
    const transaction = Sentry.startTransaction({
      name: "updateBulkAvailability",
      op: "store.bulkUpdate",
    });

    if (!updates || updates.length === 0) {
      Sentry.captureMessage('updateBulkAvailability called with no updates', 'warning');
      set({ loading: false });
      transaction.finish();
      return;
    }

    set({ loading: true, error: null });
    try {
      Sentry.addBreadcrumb({
        category: 'store',
        message: `Starting bulk update with ${updates.length} updates`,
        level: 'info',
        data: { sample: logSample(updates) }
      });

      const returnedData = await availabilityApi.bulkUpdateAvailability(updates);
      
      if (!returnedData) {
        Sentry.captureMessage('Bulk update API returned undefined data', 'warning');
        set({ loading: false });
        return;
      }

      set((state) => {
        let newAvailability = [...state.availability];
        let sanitizationIssues = [];

        returnedData.forEach(newItem => {
          if (!newItem || !newItem.id || !newItem.room_id || !newItem.date) {
            sanitizationIssues.push({
              issue: 'Invalid item structure',
              item: newItem
            });
            return;
          }

          // Price override sanitization
          if (newItem.price_override !== null && typeof newItem.price_override !== 'number') {
            const originalPrice = newItem.price_override;
            newItem.price_override = parseFloat(String(newItem.price_override));
            if (isNaN(newItem.price_override)) {
              newItem.price_override = null;
              sanitizationIssues.push({
                issue: 'Invalid price_override',
                itemId: newItem.id,
                originalValue: originalPrice
              });
            }
          }

          // Available field sanitization
          if (typeof newItem.available !== 'boolean') {
            const originalValue = newItem.available;
            newItem.available = String(newItem.available).toLowerCase() === 'true';
            sanitizationIssues.push({
              issue: 'Non-boolean available field',
              itemId: newItem.id,
              originalValue
            });
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

        if (sanitizationIssues.length > 0) {
          Sentry.captureMessage('Data sanitization applied during bulk update', {
            level: 'warning',
            extra: { sanitizationIssues }
          });
        }

        Sentry.addBreadcrumb({
          category: 'store',
          message: `Bulk update completed. Total items: ${newAvailability.length}`,
          level: 'info'
        });

        return { availability: newAvailability, loading: false };
      });

    } catch (error) {
      const sentryError = error instanceof Error ? error : new Error(String(error));
      Sentry.captureException(sentryError, {
        tags: { operation: 'updateBulkAvailability' },
        extra: { updates: logSample(updates) }
      });
      set({ error: sentryError.message, loading: false });
    } finally {
      transaction.finish();
    }
  },
}));