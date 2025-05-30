import { useState, useEffect } from 'react';
import { cn } from '../../lib/utils';
import { priceSchema } from '../../lib/validations';

export interface BulkEditPanelProps {
  selectedDates: { start: Date | null; end: Date | null };
  selectedRoom: number | null;
  onUpdatePrice: (price: number) => void;
  onUpdateAvailability: (available: boolean) => void;
  onRevertToBasePrice: () => void;
  currentPriceDisplay?: string | number;
  isUpdating?: boolean; // Added isUpdating here
}

export function BulkEditPanel({
  selectedDates,
  selectedRoom,
  onUpdatePrice,
  onUpdateAvailability,
  onRevertToBasePrice,
  isUpdating, // Consuming the prop
  currentPriceDisplay
}: BulkEditPanelProps) { // Use the combined BulkEditPanelProps
  const [price, setPrice] = useState<string>('');
  const [error, setError] = useState('');

  useEffect(() => {
    setPrice('');
  }, [currentPriceDisplay, selectedDates]);

  if (!selectedDates.start || !selectedRoom) return null;

  const handlePriceUpdate = () => {
    if (isUpdating) return;
    setError('');
    try {
      const numericPrice = Number(price);
      priceSchema.parse({ price: numericPrice });
      onUpdatePrice(numericPrice);
      setPrice('');
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      }
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">
        Modifica date selezionate
      </h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Prezzo per notte
          </label>
          <div className="mt-1 relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-500 sm:text-sm">€</span>
            </div>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="pl-7 block w-full rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              placeholder={
                currentPriceDisplay !== undefined && currentPriceDisplay !== ''
                  ? String(currentPriceDisplay)
                  : "0.00"
              }
            />
          </div>
          {error && (
            <p className="mt-2 text-sm text-red-600">{error}</p>
          )}
          <button
            onClick={handlePriceUpdate}
            disabled={isUpdating}
            className={cn(
              "mt-4 w-full h-11 inline-flex justify-center items-center px-4 border border-transparent text-base font-medium rounded-md text-white",
              isUpdating ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            )}
          >
            {isUpdating ? 'Aggiornamento...' : 'Aggiorna prezzo'}
          </button>
          <button
            onClick={() => {
              if (isUpdating) return;
              onRevertToBasePrice();
            }}
            disabled={isUpdating}
            className={cn(
              "mt-2 w-full h-11 inline-flex justify-center items-center px-4 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50",
              isUpdating ? "opacity-50 cursor-not-allowed" : ""
            )}
            title="Imposta il prezzo override a NULL, usando il prezzo base della stanza."
          >
            {isUpdating ? '...' : 'Reverti a Prezzo Base'}
          </button>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Disponibilità
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => onUpdateAvailability(true)}
              disabled={isUpdating}
              className={cn(
                "h-11 inline-flex justify-center items-center px-4 border border-transparent text-base font-medium rounded-md text-white",
                isUpdating ? "bg-gray-400 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"
              )}
            >
              {isUpdating ? '...' : 'Apri'}
            </button>
            <button
              onClick={() => onUpdateAvailability(false)}
              disabled={isUpdating}
              className={cn(
                "h-11 inline-flex justify-center items-center px-4 border border-transparent text-base font-medium rounded-md text-white",
                isUpdating ? "bg-gray-400 cursor-not-allowed" : "bg-red-600 hover:bg-red-700"
              )}
            >
              {isUpdating ? '...' : 'Chiudi'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
