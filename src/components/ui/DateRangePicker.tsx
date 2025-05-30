import { useState } from 'react';
import { format, isAfter, addMonths } from 'date-fns';
import { dateRangeSchema } from '../../lib/validations';

// Define MAX_MONTHS and MAX_DATE here as per plan
const MAX_MONTHS = 16;
const MAX_DATE = addMonths(new Date(), MAX_MONTHS);

export interface DateRangePickerProps {
  startDate: Date | null;
  endDate: Date | null;
  onDateChange: (start: Date | null, end: Date | null) => void;
}

export function DateRangePicker({ startDate, endDate, onDateChange }: DateRangePickerProps) {
  const [error, setError] = useState('');

  const handleDateChange = (start: Date | null, end: Date | null) => {
    setError('');
    if (start && isAfter(start, MAX_DATE)) {
      setError(`Non puoi selezionare date oltre ${format(MAX_DATE, 'dd/MM/yyyy')}`);
      return;
    }
    if (end && isAfter(end, MAX_DATE)) {
      setError(`Non puoi selezionare date oltre ${format(MAX_DATE, 'dd/MM/yyyy')}`);
      return;
    }
    if (start && end) {
      try {
        dateRangeSchema.parse({ startDate: start, endDate: end });
        onDateChange(start, end);
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        }
      }
    } else {
      onDateChange(start, end);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Dal</label>
        <input
          type="date"
          value={startDate ? format(startDate, 'yyyy-MM-dd') : ''}
          onChange={(e) => handleDateChange(e.target.value ? new Date(e.target.value) : null, endDate)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          max={format(MAX_DATE, 'yyyy-MM-dd')}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Al</label>
        <input
          type="date"
          value={endDate ? format(endDate, 'yyyy-MM-dd') : ''}
          onChange={(e) => handleDateChange(startDate, e.target.value ? new Date(e.target.value) : null)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          max={format(MAX_DATE, 'yyyy-MM-dd')}
        />
      </div>
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
