import { create } from 'zustand';
import bcrypt from 'bcryptjs';

interface AuthStore {
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => void;
}

const ADMIN_EMAIL = 'info.roominbloom@gmail.com';

export const useAuth = create<AuthStore>((set) => ({
  isAuthenticated: false,
  loading: false,
  error: null,

  checkAuth: () => {
    const session = sessionStorage.getItem('auth_session');
    set({ isAuthenticated: !!session });
  },

  login: async (email: string, password: string) => {
    set({ loading: true, error: null });
    try {
      if (email === ADMIN_EMAIL && password === 'Roominbloom2024!') {
        sessionStorage.setItem('auth_session', 'true');
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
    sessionStorage.removeItem('auth_session');
    set({ isAuthenticated: false });
  },
}));