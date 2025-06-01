import { create } from 'zustand';
import { errorLogger } from '../lib/errorLogger';

interface AuthStore {
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuth = create<AuthStore>((set) => ({
  isAuthenticated: false,
  loading: false,
  error: null,

  checkAuth: async () => {
    try {
      const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
      set({ isAuthenticated });
    } catch (error) {
      set({ isAuthenticated: false });
    }
  },

  login: async (email: string, password: string) => {
    set({ loading: true, error: null });
    try {
      if (email === 'info.roominbloom@gmail.com' && password === 'Roominbloom2024!') {
        localStorage.setItem('isAuthenticated', 'true');
        set({ isAuthenticated: true, loading: false });
      } else {
        throw new Error('Credenziali non valide');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Errore durante il login';
      errorLogger.log(
        error instanceof Error ? error : new Error(errorMessage),
        'warning',
        { operation: 'login', email }
      );
      set({ 
        error: errorMessage,
        loading: false,
        isAuthenticated: false 
      });
      throw error;
    }
  },

  logout: async () => {
    try {
      localStorage.removeItem('isAuthenticated');
      set({ isAuthenticated: false });
    } catch (error) {
      errorLogger.log(error instanceof Error ? error : new Error('Logout failed'), 'warning', {
        operation: 'logout'
      });
      throw error;
    }
  },
}));