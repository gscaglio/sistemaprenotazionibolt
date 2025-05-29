import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useEmergencyStore } from '../stores/emergencyStore';
import toast from 'react-hot-toast';

function Settings() {
  const { isEmergencyActive, activateEmergency, deactivateEmergency } = useEmergencyStore();
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleEmergencyToggle = async () => {
    try {
      if (isEmergencyActive) {
        await deactivateEmergency();
        toast.success('Modalità emergenza disattivata');
      } else {
        if (!showConfirmation) {
          setShowConfirmation(true);
          return;
        }
        await activateEmergency();
        toast.success('Modalità emergenza attivata');
        setShowConfirmation(false);
      }
    } catch (error) {
      toast.error('Errore durante la gestione della modalità emergenza');
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-8">Impostazioni</h1>

      <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            <AlertTriangle className={`h-8 w-8 ${isEmergencyActive ? 'text-red-500' : 'text-yellow-500'}`} />
          </div>
          <div className="flex-grow">
            <h2 className="text-xl font-semibold mb-2">Controllo Emergenza</h2>
            <p className="text-gray-600 mb-4">
              {isEmergencyActive
                ? "La modalità emergenza è attiva. Tutte le prenotazioni sono bloccate."
                : "Attiva la modalità emergenza per bloccare immediatamente tutte le prenotazioni."}
            </p>
            
            {showConfirmation && !isEmergencyActive && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <p className="text-yellow-800 font-medium mb-4">
                  ⚠️ Sei sicuro di voler attivare la modalità emergenza?
                </p>
                <p className="text-yellow-700 text-sm mb-4">
                  Questa azione bloccherà immediatamente tutte le prenotazioni per tutte le stanze.
                </p>
                <div className="flex space-x-3">
                  <button
                    onClick={handleEmergencyToggle}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                  >
                    Conferma Attivazione
                  </button>
                  <button
                    onClick={() => setShowConfirmation(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                  >
                    Annulla
                  </button>
                </div>
              </div>
            )}
            
            {!showConfirmation && (
              <button
                onClick={handleEmergencyToggle}
                className={`w-full md:w-auto px-6 py-3 rounded-lg font-medium text-white ${
                  isEmergencyActive
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                } focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  isEmergencyActive ? 'focus:ring-green-500' : 'focus:ring-red-500'
                }`}
              >
                {isEmergencyActive ? 'Disattiva Modalità Emergenza' : 'PANIC BUTTON'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Settings;