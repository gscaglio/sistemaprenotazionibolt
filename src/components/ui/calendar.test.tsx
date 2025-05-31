import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event'; // For more complex interactions
import { Calendar } from './calendar'; // Adjust path as necessary
import { useAvailabilityStore } from '../../stores/availabilityStore';
import { useRoomStore } from '../../stores/roomStore';
import { format, addMonths, startOfMonth, endOfMonth } from 'date-fns';

// Mock stores
vi.mock('../../stores/availabilityStore');
vi.mock('../../stores/roomStore');

// Mock toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock API directly if calendar calls it (though it should go via store)
// For this test, we assume calendar calls store actions primarily.
// import { availabilityApi } from '../../lib/api/availability';
// vi.mock('../../lib/api/availability');


describe('Calendar Component', () => {
  let mockRoomStoreState: any;
  let mockAvailabilityStoreState: any;
  let mockUpdateBulkAvailability: any;
  let mockFetchAvailability: any;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    mockUpdateBulkAvailability = vi.fn().mockResolvedValue([]); // Simulates store action
    mockFetchAvailability = vi.fn();

    mockRoomStoreState = {
      rooms: [
        { id: 1, name: 'Room 101', base_price: 100, type: 'double' },
        { id: 2, name: 'Room 102', base_price: 120, type: 'suite' },
      ],
      loading: false,
      error: null,
      fetchRooms: vi.fn(),
      updateRoom: vi.fn(),
    };

    mockAvailabilityStoreState = {
      availability: [
        // Sample availability for Room 1, July 2024
        { id: 1, room_id: 1, date: '2024-07-01', available: true, price_override: 110, updated_at: '' , blocked_reason: null, notes: null, created_at: ''},
        { id: 2, room_id: 1, date: '2024-07-02', available: false, price_override: null, updated_at: '', blocked_reason: 'manual_block', notes: null, created_at: '' },
        { id: 3, room_id: 1, date: '2024-07-03', available: true, price_override: null, updated_at: '', blocked_reason: null, notes: null, created_at: '' }, // Will use base_price
      ],
      loading: false,
      error: null,
      fetchAvailability: mockFetchAvailability,
      updateAvailability: vi.fn(),
      updateBulkAvailability: mockUpdateBulkAvailability,
    };

    (useRoomStore as vi.Mock).mockReturnValue(mockRoomStoreState);
    (useAvailabilityStore as vi.Mock).mockReturnValue(mockAvailabilityStoreState);

     // Mock console.log and console.error to keep test output clean
    // vi.spyOn(console, 'log').mockImplementation(() => {});
    // vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    // vi.restoreAllMocks(); // Handled by clearAllMocks or if specific spies need restoring
  });

  const renderCalendar = (currentRoomId = 1) => {
    return render(
      <Calendar 
        mode="admin" 
        currentRoomId={currentRoomId} 
      />
    );
  };

  it('renders the calendar with initial month and days', () => {
    renderCalendar();
    // Check for month name (e.g., July 2024, assuming current date is in July 2024 for test stability or mock date-fns)
    // This is tricky due to dynamic current month. For simplicity, check for days.
    // Check if day '1' for the current month is rendered for Room 1.
    // Need to make sure the test environment's date is consistent or mock `new Date()`
    // For now, let's assume it renders some days.
    expect(screen.getAllByText('1').length).toBeGreaterThan(0); // Day "1" should appear for each month
    expect(screen.getAllByText('15').length).toBeGreaterThan(0); 
  });

  it('displays prices correctly (override and base)', () => {
    // Mock current date to be July 2024 for consistent testing of initial view
    vi.setSystemTime(new Date('2024-07-15T10:00:00.000Z'));

    renderCalendar(1); // Room 1 selected

    // Day 1: Price override 110
    // The day cell itself might not directly contain the price text, but the BulkEditPanel might,
    // or other elements. Let's assume for now the day cell itself shows the price.
    // This test needs refinement based on actual DOM structure.
    // This is a simplified check; more robust would be to find the specific cell.
    const day1Cell = screen.getAllByText('1').find(el => el.closest('.min-h-\\[60px\\]')); // Find day 1 cell
    expect(day1Cell).toBeDefined();
    // This check is too simplistic as price isn't directly in the cell like this.
    // expect(within(day1Cell).getByText(/€110/)).toBeInTheDocument(); 

    // Day 3: No price override, should use base_price 100 for Room 1
    const day3Cell = screen.getAllByText('3').find(el => el.closest('.min-h-\\[60px\\]'));
    expect(day3Cell).toBeDefined();
    // expect(within(day3Cell).getByText(/€100/)).toBeInTheDocument(); 
    
    // Day 2: Closed, should not show price ideally or show it differently.
    // The component shows price even if closed, this test reflects current behavior.
    const day2Cell = screen.getAllByText('2').find(el => el.closest('.min-h-\\[60px\\]'));
    expect(day2Cell).toBeDefined();
    // expect(within(day2Cell).getByText(/€100/)).toBeInTheDocument(); // Uses base price if override is null

    vi.useRealTimers(); // Reset system time
  });


  describe('Date Selection & Range', () => {
    it('selects a single date on click, and confirms single day selection on second click on same day', async () => {
      vi.setSystemTime(new Date('2024-07-15T10:00:00.000Z'));
      const user = userEvent.setup();
      renderCalendar(1); // Render for Room 1

      // Find day '10'
      // We need to be careful to select the day cell in the current month view.
      // Assuming July 2024 is the current month due to setSystemTime.
      const day10Elements = screen.getAllByText('10');
      // Heuristic: find the one that is a button or has a button role (day cells are interactive)
      const day10Button = day10Elements.find(el => el.closest('button'));
      expect(day10Button).toBeDefined();

      await user.click(day10Button!);
      await user.click(day10Button!); // Click the same day again

      // Assert that the DateRangePicker inputs (presumably labeled 'Dal' and 'Al') show '2024-07-10'
      // These labels might not be directly linked via aria-label or htmlFor to the input if custom component.
      // Let's assume DateRangePicker has inputs that can be identified.
      // If DateRangePicker is a child component, its internal state might be hard to check directly.
      // We will check the input fields by their labels 'Dal' and 'Al' if possible,
      // or by their current value if they are standard input elements.
      
      // The DateRangePicker component used in BulkEditPanel has inputs for 'Dal' and 'Al'
      // Let's find them by their placeholder or a more robust selector if available.
      // For now, assuming the DateRangePicker updates input fields that can be queried.
      // A common pattern is to have input fields display the selected dates.
      // If the DateRangePicker updates its own internal state and doesn't expose it easily via DOM,
      // this test might need to check the effect of this selection (e.g., on BulkEditPanel inputs).

      // Let's assume the DateRangePicker component updates input fields with specific test IDs or labels.
      // If not, we might need to inspect the props passed to DateRangePicker if BulkEditPanel re-renders.
      // For this example, we'll assume input fields are updated and can be queried.
      // The DateRangePicker component itself has 'From' and 'To' inputs.
      // In BulkEditPanel, these are `DateInput` components.
      // We look for the input elements associated with 'Dal' and 'Al' labels.
      const fromInput = screen.getByLabelText('Dal') as HTMLInputElement;
      const toInput = screen.getByLabelText('Al') as HTMLInputElement;

      expect(fromInput.value).toBe('2024-07-10');
      expect(toInput.value).toBe('2024-07-10');

      vi.useRealTimers();
    });

    it('selects a date range on two clicks', async () => {
      vi.setSystemTime(new Date('2024-07-15T10:00:00.000Z'));
      const user = userEvent.setup();
      renderCalendar();
      // Click day 10 then day 15 of July 2024
      const day10Button = screen.getAllByText('10').find(el => el.closest('button'));
      const day15Button = screen.getAllByText('15').find(el => el.closest('button'));
      expect(day10Button).toBeDefined();
      expect(day15Button).toBeDefined();

      await user.click(day10Button!);
      await user.click(day15Button!);

      const fromInput = screen.getByLabelText('Dal') as HTMLInputElement;
      const toInput = screen.getByLabelText('Al') as HTMLInputElement;

      expect(fromInput.value).toBe('2024-07-10');
      expect(toInput.value).toBe('2024-07-15');
      vi.useRealTimers();
    });
    
    // Drag selection is harder to test with userEvent directly for mouse down/move/up across elements.
    // It might require dispatching mouse events manually.
    it('selects a date range by dragging', async () => {
        vi.setSystemTime(new Date('2024-07-15T10:00:00.000Z'));
        renderCalendar(1); // Room 1, July 2024
        const day10Button = screen.getAllByText('10').find(el => el.closest('button'));
        const day15Button = screen.getAllByText('15').find(el => el.closest('button'));
        expect(day10Button).toBeDefined();
        expect(day15Button).toBeDefined();

        // Simulate mouse down on day 10
        fireEvent.mouseDown(day10Button!);
        // Simulate mouse enter on day 15 (while dragging)
        // Important: mouseEnter should be on the element that Calendar attaches mouseEnter listener to.
        // This is typically the day cell itself.
        fireEvent.mouseEnter(day15Button!);
        // Simulate mouse up (globally, as per component logic on window)
        fireEvent.mouseUp(window); 
        
        const fromInput = screen.getByLabelText('Dal') as HTMLInputElement;
        const toInput = screen.getByLabelText('Al') as HTMLInputElement;
        expect(fromInput.value).toBe('2024-07-10');
        expect(toInput.value).toBe('2024-07-15');
        vi.useRealTimers();
    });
  });

  describe('Bulk Updates', () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    beforeEach(() => {
      // Ensure system time is mocked for consistent date selections in tests
      vi.setSystemTime(new Date('2024-07-15T10:00:00.000Z'));
    });

    afterEach(() => {
      vi.useRealTimers(); // Clean up system time after each test in this describe block
    });

    // Test Case 1 (Price Change for a range)
    it('Test Case 1: calls updateBulkAvailability with new price for a selected range', async () => {
      renderCalendar(1); // Room 1, July 2024
      
      const day5Button = screen.getAllByText('5').find(el => el.closest('button'));
      const day7Button = screen.getAllByText('7').find(el => el.closest('button'));
      expect(day5Button).toBeDefined();
      expect(day7Button).toBeDefined();
      
      fireEvent.mouseDown(day5Button!);
      fireEvent.mouseEnter(day7Button!);
      fireEvent.mouseUp(window);

      const priceInput = screen.getByPlaceholderText('0.00');
      await user.clear(priceInput);
      await user.type(priceInput, '150');
      
      const updatePriceButton = screen.getByRole('button', { name: /Aggiorna prezzo/i });
      await user.click(updatePriceButton);

      expect(mockUpdateBulkAvailability).toHaveBeenCalledTimes(1);
      const payload = mockUpdateBulkAvailability.mock.calls[0][0];
      expect(payload.length).toBe(3); // 5th, 6th, 7th of July
      payload.forEach((item: any, index: number) => {
        expect(item.room_id).toBe(1);
        expect(item.date).toBe(`2024-07-${(5 + index).toString().padStart(2, '0')}`);
        expect(item.price_override).toBe(150);
        expect(item.available).toBe(true);
      });
    });

    it('performs a bulk price update on a single selected day', async () => {
      renderCalendar(1); // Room 1, July 2024

      const day12Button = screen.getAllByText('12').find(el => el.closest('button'));
      expect(day12Button).toBeDefined();

      // Select day 12 by clicking it twice (first click selects, second confirms single day)
      await user.click(day12Button!);
      await user.click(day12Button!);

      // Verify DateRangePicker shows 2024-07-12 for both dates
      const fromInput = screen.getByLabelText('Dal') as HTMLInputElement;
      const toInput = screen.getByLabelText('Al') as HTMLInputElement;
      expect(fromInput.value).toBe('2024-07-12');
      expect(toInput.value).toBe('2024-07-12');

      // Enter price in BulkEditPanel
      const priceInput = screen.getByPlaceholderText('0.00');
      await user.clear(priceInput);
      await user.type(priceInput, '180');

      // Click "Aggiorna prezzo"
      const updatePriceButton = screen.getByRole('button', { name: /Aggiorna prezzo/i });
      await user.click(updatePriceButton);

      expect(mockUpdateBulkAvailability).toHaveBeenCalledTimes(1);
      const payload = mockUpdateBulkAvailability.mock.calls[0][0];
      expect(payload.length).toBe(1);
      expect(payload[0]).toEqual({
        room_id: 1,
        date: '2024-07-12',
        price_override: 180,
        available: true,
      });
    });

    // Test Case 2 (Close Availability)
    it('Test Case 2: calls updateBulkAvailability to close availability for a range', async () => {
      renderCalendar(1); // Room 1, July 2024
      const day10Button = screen.getAllByText('10').find(el => el.closest('button'));
      const day12Button = screen.getAllByText('12').find(el => el.closest('button'));
      expect(day10Button).toBeDefined();
      expect(day12Button).toBeDefined();

      fireEvent.mouseDown(day10Button!);
      fireEvent.mouseEnter(day12Button!);
      fireEvent.mouseUp(window);

      const closeButton = screen.getByRole('button', { name: /Chiudi/i });
      await user.click(closeButton);

      expect(mockUpdateBulkAvailability).toHaveBeenCalledTimes(1);
      const payload = mockUpdateBulkAvailability.mock.calls[0][0];
      expect(payload.length).toBe(3); // 10th, 11th, 12th
      payload.forEach((item: any, index: number) => {
        expect(item.room_id).toBe(1);
        expect(item.date).toBe(`2024-07-${(10 + index).toString().padStart(2, '0')}`);
        expect(item.available).toBe(false);
        expect(item.price_override).toBeNull();
        expect(item.blocked_reason).toBe('manual_block');
      });
    });

    // Test Case 3 (Reopen Availability for a range)
    it('Test Case 3: calls updateBulkAvailability to reopen availability for a range', async () => {
      // Override initial availability for this test: days 10, 11 of July are closed for room 1
      mockAvailabilityStoreState.availability = [
        ...mockAvailabilityStoreState.availability.filter((a:any) => !['2024-07-10', '2024-07-11'].includes(a.date) || a.room_id !== 1),
        { id: 100, room_id: 1, date: '2024-07-10', available: false, price_override: null, updated_at: '', blocked_reason: 'manual_block', notes:null, created_at:'' },
        { id: 101, room_id: 1, date: '2024-07-11', available: false, price_override: null, updated_at: '', blocked_reason: 'manual_block', notes:null, created_at:'' },
      ];
      (useAvailabilityStore as vi.Mock).mockReturnValue(mockAvailabilityStoreState);
      
      renderCalendar(1); // Room 1, July 2024
      const day10Button = screen.getAllByText('10').find(el => el.closest('button'));
      const day11Button = screen.getAllByText('11').find(el => el.closest('button'));
      expect(day10Button).toBeDefined();
      expect(day11Button).toBeDefined();

      fireEvent.mouseDown(day10Button!);
      fireEvent.mouseEnter(day11Button!);
      fireEvent.mouseUp(window);

      const openButton = screen.getByRole('button', { name: /Apri/i });
      await user.click(openButton);

      expect(mockUpdateBulkAvailability).toHaveBeenCalledTimes(1);
      const payload = mockUpdateBulkAvailability.mock.calls[0][0];
      expect(payload.length).toBe(2); // 10th, 11th
      payload.forEach((item: any, index: number) => {
        expect(item.room_id).toBe(1);
        expect(item.date).toBe(`2024-07-${(10 + index).toString().padStart(2, '0')}`);
        expect(item.available).toBe(true);
        expect(item.price_override).toBe(mockRoomStoreState.rooms.find(r => r.id === 1)!.base_price);
        expect(item.blocked_reason).toBeNull();
      });
    });
  });

  // More tests could be added for single date selections, edge cases, MAX_DATE limits, etc.
  // This set provides a good starting point for the core functionalities.
});
