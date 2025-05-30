import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { availabilityApi } from './availability'; // Assuming default export or named
import { supabase } from '../supabase'; // To mock the Supabase client

// Type imports for casting if needed, though mocks reduce this need
// import type { AvailabilityUpdate, Availability } from './availability'; 

// Mock the Supabase client
vi.mock('../supabase', () => {
  const mockSupabaseClient = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(), // For the pre-fetch part and the final .select()
    upsert: vi.fn().mockReturnThis(), // For the main operation
    eq: vi.fn().mockReturnThis(),     // For pre-fetch query
    in: vi.fn().mockReturnThis(),     // For pre-fetch query
  };
  return { supabase: mockSupabaseClient };
});

describe('availabilityApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('bulkUpdateAvailability', () => {
    const mockUpdatesPayload = [
      { room_id: 1, date: '2024-07-01', price_override: 120, available: true },
      { room_id: 1, date: '2024-07-02', available: false, price_override: null },
    ];

    const mockSuccessfulUpsertResponse = {
      data: mockUpdatesPayload.map((u, i) => ({ ...u, id: i + 1, updated_at: new Date().toISOString() })), // Simulate returned data
      error: null,
    };
    
    const mockSuccessfulFetchResponse = {
        data: [ { id: 1, date: '2024-07-01', room_id: 1, price: 100, available_rooms: 1 } ], // Sample existing record
        error: null,
    };


    it('should prepare upsertData with updated_at and call Supabase upsert', async () => {
      // Mock implementations for this specific test case
      (supabase.from('availability').select as vi.Mock).mockResolvedValueOnce(mockSuccessfulFetchResponse); // For the pre-fetch
      (supabase.from('availability').upsert as vi.Mock).mockReturnThis(); // upsert returns 'this'
      (supabase.from('availability').upsert().select as vi.Mock).mockResolvedValueOnce(mockSuccessfulUpsertResponse); // select after upsert

      const result = await availabilityApi.bulkUpdateAvailability(mockUpdatesPayload);

      expect(supabase.from).toHaveBeenCalledWith('availability');
      
      // Check pre-fetch call if updates are not empty
      if (mockUpdatesPayload.length > 0) {
          expect(supabase.from('availability').select).toHaveBeenCalledWith('id, date, room_id, price, available_rooms');
          expect(supabase.from('availability').eq).toHaveBeenCalledWith('room_id', mockUpdatesPayload[0].room_id);
          const dates = mockUpdatesPayload.map(u => u.date);
          expect(supabase.from('availability').in).toHaveBeenCalledWith('date', dates);
      }
      
      // Check upsert call
      expect(supabase.from('availability').upsert).toHaveBeenCalledTimes(1);
      const upsertArg = (supabase.from('availability').upsert as vi.Mock).mock.calls[0][0];
      expect(upsertArg.length).toBe(mockUpdatesPayload.length);
      upsertArg.forEach((item: any) => {
        expect(item).toHaveProperty('updated_at');
        expect(typeof item.updated_at).toBe('string');
      });
      // Check the options for upsert
      expect((supabase.from('availability').upsert as vi.Mock).mock.calls[0][1]).toEqual({
        onConflict: 'room_id,date',
        ignoreDuplicates: false,
      });
      // Check that .select() was called after upsert
      expect(supabase.from('availability').upsert().select).toHaveBeenCalledTimes(1);


      expect(result).toEqual(mockSuccessfulUpsertResponse.data);
    });

    it('should return an empty array if updates payload is empty', async () => {
      const result = await availabilityApi.bulkUpdateAvailability([]);
      expect(result).toEqual([]);
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it('should throw an error if Supabase upsert fails', async () => {
      const mockError = new Error('Supabase Upsert Error');
      (supabase.from('availability').select as vi.Mock).mockResolvedValueOnce(mockSuccessfulFetchResponse); // Pre-fetch
      (supabase.from('availability').upsert as vi.Mock).mockReturnThis();
      (supabase.from('availability').upsert().select as vi.Mock).mockResolvedValueOnce({ data: null, error: mockError });


      await expect(availabilityApi.bulkUpdateAvailability(mockUpdatesPayload))
        .rejects
        .toThrow(mockError);
    });
    
    it('should proceed with upsert even if pre-fetch of existing records fails', async () => {
      const fetchError = new Error('Supabase Fetch Error');
      (supabase.from('availability').select as vi.Mock).mockResolvedValueOnce({data: null, error: fetchError}); // Pre-fetch fails
      
      // Subsequent upsert succeeds
      (supabase.from('availability').upsert as vi.Mock).mockReturnThis();
      (supabase.from('availability').upsert().select as vi.Mock).mockResolvedValueOnce(mockSuccessfulUpsertResponse);

      const result = await availabilityApi.bulkUpdateAvailability(mockUpdatesPayload);

      expect(supabase.from).toHaveBeenCalledWith('availability'); // Called for fetch
      expect(supabase.from).toHaveBeenCalledWith('availability'); // Called for upsert
      
      // Verify upsert was still called correctly
      expect(supabase.from('availability').upsert).toHaveBeenCalledTimes(1);
      const upsertArg = (supabase.from('availability').upsert as vi.Mock).mock.calls[0][0];
      expect(upsertArg.length).toBe(mockUpdatesPayload.length);
      upsertArg.forEach((item: any) => expect(item).toHaveProperty('updated_at'));
      
      expect(result).toEqual(mockSuccessfulUpsertResponse.data);
      // Optionally, check console.error for the fetchError log
    });

    it('should skip pre-fetch if updates array has no room_id or dates', async () => {
      const updatesWithNoRoomId = [{ date: '2024-07-01', price_override: 100 }];
      (supabase.from('availability').upsert as vi.Mock).mockReturnThis();
      (supabase.from('availability').upsert().select as vi.Mock).mockResolvedValueOnce(mockSuccessfulUpsertResponse);
      
      await availabilityApi.bulkUpdateAvailability(updatesWithNoRoomId as any); // Cast to bypass type check for test
      
      // select should not have been called for pre-fetch
      expect(supabase.from('availability').select).not.toHaveBeenCalledWith('id, date, room_id, price, available_rooms');
      // but upsert should still be called
      expect(supabase.from('availability').upsert).toHaveBeenCalledTimes(1);
    });

  });

  // Basic tests for other API functions can be added if they were more complex.
  // For getAvailability, getPublicAvailability, updateAvailability, they are
  // straightforward Supabase calls, so extensive testing here might be redundant
  // if Supabase client itself is assumed to be reliable.
  // However, a simple test for parameter passing could be:
  describe('getAvailability', () => {
    it('should call Supabase with correct parameters for month', async () => {
      const mockMonth = '2024-07';
      const expectedStartDate = '2024-07-01';
      const expectedEndDate = '2024-07-31'; // Assuming endOfMonth logic
      const mockResponse = { data: [{id:1}], error: null };

      (supabase.from('availability').select as vi.Mock).mockReturnThis();
      (supabase.from('availability').select().gte as vi.Mock).mockReturnThis();
      (supabase.from('availability').select().gte().lte as vi.Mock).mockReturnThis();
      (supabase.from('availability').select().gte().lte().order as vi.Mock).mockResolvedValue(mockResponse);

      await availabilityApi.getAvailability(mockMonth);

      expect(supabase.from).toHaveBeenCalledWith('availability');
      expect(supabase.from('availability').select().gte).toHaveBeenCalledWith('date', expectedStartDate);
      expect(supabase.from('availability').select().gte().lte).toHaveBeenCalledWith('date', expectedEndDate);
      expect(supabase.from('availability').select().gte().lte().order).toHaveBeenCalledWith('date');
    });
  });
});
