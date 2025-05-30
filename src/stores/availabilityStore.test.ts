import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useAvailabilityStore } from './availabilityStore';
import { availabilityApi } from '../lib/api/availability';
import { supabase } from '../lib/supabase'; // For mocking direct supabase calls

// Mock the availabilityApi
vi.mock('../lib/api/availability', () => ({
  availabilityApi: {
    bulkUpdateAvailability: vi.fn(),
    updateAvailability: vi.fn(), // Assuming this might be used or added later
    getAvailability: vi.fn(), // Assuming this might be used or added later
  }
}));

// Mock direct Supabase calls if any are not going through the API layer
// For fetchAvailability, it seems it uses supabase client directly.
vi.mock('../lib/supabase', () => {
  const mockSupabaseClient = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn(), // For single record fetches/updates
  };
  return { supabase: mockSupabaseClient };
});


// Helper to reset store state for each test
const resetStore = () => useAvailabilityStore.setState(useAvailabilityStore.getState(), true);


describe('useAvailabilityStore', () => {
  beforeEach(() => {
    // Reset mocks and store state before each test
    vi.clearAllMocks();
    resetStore(); 
    // Reset initial state if specific starting points are needed
    useAvailabilityStore.setState({
      availability: [],
      loading: false,
      error: null,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('fetchAvailability', () => {
    it('should fetch availability and update store state on success', async () => {
      const mockMonth = '2024-07';
      const mockData = [{ id: 1, room_id: 1, date: '2024-07-01', available: true, price_override: 100 }];
      
      // Mock the chain for supabase.from(...).select(...)...
      const fromMock = supabase.from as vi.Mock;
      const selectMock = vi.fn().mockReturnThis();
      const gteMock = vi.fn().mockReturnThis();
      const lteMock = vi.fn().mockReturnThis();
      const orderMock = vi.fn().mockResolvedValue({ data: mockData, error: null });

      fromMock.mockReturnValue({
        select: selectMock,
        gte: gteMock,
        lte: lteMock,
        order: orderMock,
      });
      
      await useAvailabilityStore.getState().fetchAvailability(mockMonth);

      expect(supabase.from).toHaveBeenCalledWith('availability');
      expect(selectMock).toHaveBeenCalledWith('*');
      expect(gteMock).toHaveBeenCalledWith('2024-07-01');
      expect(lteMock).toHaveBeenCalledWith('2024-07-31'); // Assuming endOfMonth logic
      expect(orderMock).toHaveBeenCalledWith('date');
      
      expect(useAvailabilityStore.getState().availability).toEqual(mockData);
      expect(useAvailabilityStore.getState().loading).toBe(false);
      expect(useAvailabilityStore.getState().error).toBe(null);
    });

    it('should set error state on fetch failure', async () => {
      const mockMonth = '2024-08';
      const mockError = new Error('Failed to fetch');

      const fromMock = supabase.from as vi.Mock;
      const orderMock = vi.fn().mockResolvedValue({ data: null, error: mockError });
      fromMock.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: orderMock,
      });

      await useAvailabilityStore.getState().fetchAvailability(mockMonth);

      expect(useAvailabilityStore.getState().error).toBe(mockError.message);
      expect(useAvailabilityStore.getState().loading).toBe(false);
      expect(useAvailabilityStore.getState().availability).toEqual([]);
    });
  });

  describe('updateBulkAvailability', () => {
    const mockUpdatePayload = [
      { room_id: 1, date: '2024-07-01', price_override: 120, available: true },
      { room_id: 1, date: '2024-07-02', available: false, price_override: null },
    ];

    const mockApiReturnData = [
      { id: 1, room_id: 1, date: '2024-07-01', price_override: 120, available: true, updated_at: new Date().toISOString(), blocked_reason: null, notes: null, created_at: new Date().toISOString() },
      { id: 2, room_id: 1, date: '2024-07-02', price_override: null, available: false, updated_at: new Date().toISOString(), blocked_reason: 'manual_block', notes: null, created_at: new Date().toISOString() },
    ];

    it('should call availabilityApi.bulkUpdateAvailability and merge returned data', async () => {
      (availabilityApi.bulkUpdateAvailability as vi.Mock).mockResolvedValue(mockApiReturnData);
      
      // Set initial state
      useAvailabilityStore.setState({
        availability: [
          // Existing item that will be updated
          { id: 1, room_id: 1, date: '2024-07-01', price_override: 100, available: true, updated_at: new Date().toISOString(), blocked_reason: null, notes: null, created_at: new Date().toISOString() },
          // Another item not in this update
          { id: 3, room_id: 2, date: '2024-07-01', price_override: 150, available: true, updated_at: new Date().toISOString(), blocked_reason: null, notes: null, created_at: new Date().toISOString() },
        ],
        loading: false,
        error: null,
      });
      
      await useAvailabilityStore.getState().updateBulkAvailability(mockUpdatePayload);

      expect(availabilityApi.bulkUpdateAvailability).toHaveBeenCalledWith(mockUpdatePayload);
      expect(useAvailabilityStore.getState().loading).toBe(false);
      expect(useAvailabilityStore.getState().error).toBe(null);
      
      const finalAvailability = useAvailabilityStore.getState().availability;
      // Check if the first item was updated
      const updatedItem = finalAvailability.find(item => item.id === 1);
      expect(updatedItem?.price_override).toBe(120);
      
      // Check if the new item (id:2) was added
      const newItem = finalAvailability.find(item => item.id === 2);
      expect(newItem).toBeDefined();
      expect(newItem?.available).toBe(false);
      
      // Check if the unrelated item (id:3) is still there
      const unrelatedItem = finalAvailability.find(item => item.id === 3);
      expect(unrelatedItem).toBeDefined();
      
      expect(finalAvailability.length).toBe(3); // 1 updated, 1 new, 1 existing untouched
    });

    it('should handle empty update payload', async () => {
      await useAvailabilityStore.getState().updateBulkAvailability([]);
      expect(availabilityApi.bulkUpdateAvailability).not.toHaveBeenCalled();
      expect(useAvailabilityStore.getState().loading).toBe(false);
    });

    it('should handle undefined data returned from API', async () => {
      (availabilityApi.bulkUpdateAvailability as vi.Mock).mockResolvedValue(undefined);
      await useAvailabilityStore.getState().updateBulkAvailability(mockUpdatePayload);
      
      expect(availabilityApi.bulkUpdateAvailability).toHaveBeenCalledWith(mockUpdatePayload);
      expect(useAvailabilityStore.getState().loading).toBe(false);
      // Check that availability state is not modified from its initial empty state
      expect(useAvailabilityStore.getState().availability).toEqual([]);
    });
    
    it('should set error state if API call fails', async () => {
      const mockError = new Error('API Error');
      (availabilityApi.bulkUpdateAvailability as vi.Mock).mockRejectedValue(mockError);
      
      await useAvailabilityStore.getState().updateBulkAvailability(mockUpdatePayload);
      
      expect(useAvailabilityStore.getState().error).toBe(mockError.message);
      expect(useAvailabilityStore.getState().loading).toBe(false);
    });

     it('should correctly merge when initial availability is empty', async () => {
      (availabilityApi.bulkUpdateAvailability as vi.Mock).mockResolvedValue(mockApiReturnData);
      
      useAvailabilityStore.setState({ availability: [], loading: false, error: null }); // Start with empty
      
      await useAvailabilityStore.getState().updateBulkAvailability(mockUpdatePayload);

      expect(availabilityApi.bulkUpdateAvailability).toHaveBeenCalledWith(mockUpdatePayload);
      expect(useAvailabilityStore.getState().loading).toBe(false);
      expect(useAvailabilityStore.getState().error).toBe(null);
      
      const finalAvailability = useAvailabilityStore.getState().availability;
      expect(finalAvailability.length).toBe(2); // Both items from mockApiReturnData should be added
      expect(finalAvailability.find(item => item.id === 1)?.price_override).toBe(120);
      expect(finalAvailability.find(item => item.id === 2)?.available).toBe(false);
    });

    it('should skip merging invalid items returned by API', async () => {
      const invalidApiReturn = [
        { id: 1, room_id: 1, date: '2024-07-01', price_override: 120, available: true, updated_at: new Date().toISOString() },
        { room_id: 2, date: '2024-07-02' }, // Missing id
        null, // A null item
        { id: 3, room_id: 3, date: undefined, available: true } // Missing date
      ];
      (availabilityApi.bulkUpdateAvailability as vi.Mock).mockResolvedValue(invalidApiReturn as any); // Cast as any to bypass type check for test
      
      await useAvailabilityStore.getState().updateBulkAvailability(mockUpdatePayload);
      
      const finalAvailability = useAvailabilityStore.getState().availability;
      // Only the first valid item should be merged
      expect(finalAvailability.length).toBe(1);
      expect(finalAvailability[0].id).toBe(1);
    });
  });
  
  // Tests for updateAvailability (single item update) could also be added here if needed
  describe('updateAvailability', () => {
    const mockSingleUpdatePayload = { price_override: 200, available: false };
    const mockSingleApiReturnData = { id: 1, room_id: 1, date: '2024-07-01', price_override: 200, available: false, updated_at: new Date().toISOString() };

    it('should call availabilityApi.updateAvailability and update the item in store', async () => {
      (availabilityApi.updateAvailability as vi.Mock).mockResolvedValue(mockSingleApiReturnData);

      useAvailabilityStore.setState({
        availability: [
          { id: 1, room_id: 1, date: '2024-07-01', price_override: 100, available: true, updated_at: new Date().toISOString(), blocked_reason: null, notes: null, created_at: new Date().toISOString() },
          { id: 2, room_id: 1, date: '2024-07-02', price_override: 150, available: true, updated_at: new Date().toISOString(), blocked_reason: null, notes: null, created_at: new Date().toISOString() },
        ],
      });

      await useAvailabilityStore.getState().updateAvailability(1, mockSingleUpdatePayload);

      expect(availabilityApi.updateAvailability).toHaveBeenCalledWith(1, mockSingleUpdatePayload);
      expect(useAvailabilityStore.getState().loading).toBe(false);
      
      const updatedItem = useAvailabilityStore.getState().availability.find(item => item.id === 1);
      expect(updatedItem?.price_override).toBe(200);
      expect(updatedItem?.available).toBe(false);

      // Ensure other items are not affected
      const otherItem = useAvailabilityStore.getState().availability.find(item => item.id === 2);
      expect(otherItem?.price_override).toBe(150);
    });

    it('should set error state if updateAvailability API call fails', async () => {
      const mockError = new Error('Single Update API Error');
      (availabilityApi.updateAvailability as vi.Mock).mockRejectedValue(mockError);

      await useAvailabilityStore.getState().updateAvailability(1, mockSingleUpdatePayload);

      expect(useAvailabilityStore.getState().error).toBe(mockError.message);
      expect(useAvailabilityStore.getState().loading).toBe(false);
    });
  });
});

// Initialize the store for hooks to work if tests are run in an environment that needs it.
// For Vitest, direct calls to getState().action() are fine.
// If using React Testing Library with hooks:
// import { act } from 'react-dom/test-utils'; // or from @testing-library/react
// const { result } = renderHook(() => useAvailabilityStore());
// await act(async () => { result.current.fetchAvailability('2024-01'); });
// expect(result.current.availability).toEqual(...);
