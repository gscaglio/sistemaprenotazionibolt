import { create } from 'zustand';
import { auth } from '../lib/supabase';
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
      const session = await auth.getSession();
      set({ isAuthenticated: !!session });
    } catch (error) {
      set({ isAuthenticated: false });
    }
  },

  login: async (email: string, password: string) => {
    set({ loading: true, error: null });
    try {
      await auth.signIn(email, password);
      set({ isAuthenticated: true, loading: false });
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
      await auth.signOut();
      set({ isAuthenticated: false });
    } catch (error) {
      errorLogger.log(error instanceof Error ? error : new Error('Logout failed'), 'warning', {
        operation: 'logout'
      });
      throw error;
    }
  },
}));