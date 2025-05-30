import { create } from 'zustand';

interface AuthStore {
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const ADMIN_EMAIL = 'info.roominbloom@gmail.com';
const ADMIN_PASSWORD = 'Roominbloom2024!';

export const useAuth = create<AuthStore>((set) => ({
  isAuthenticated: localStorage.getItem('isAuthenticated') === 'true',
  loading: false,
  error: null,

  login: async (email: string, password: string) => {
    set({ loading: true, error: null });
    try {
      if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
        localStorage.setItem('isAuthenticated', 'true');
        set({ isAuthenticated: true, loading: false });
      } else {
        throw new Error('Credenziali non valide');
      }
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Errore durante il login',
        loading: false,
        isAuthenticated: false 
      });
      throw error;
    }
  },

  logout: () => {
    localStorage.removeItem('isAuthenticated');
    set({ isAuthenticated: false });
  },
}));