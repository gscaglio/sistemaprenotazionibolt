import { create } from 'zustand';
import { supabase } from '../lib/supabase';

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
      const { data: { session } } = await supabase.auth.getSession();
      set({ isAuthenticated: !!session });
    } catch (error) {
      console.error('Error checking auth status:', error);
      set({ isAuthenticated: false });
    }
  },

  login: async (email: string, password: string) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      set({ isAuthenticated: !!data.session, loading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Errore durante il login',
        loading: false,
        isAuthenticated: false 
      });
      throw error;
    }
  },

  logout: async () => {
    set({ loading: true, error: null });
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      set({ isAuthenticated: false, loading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Errore durante il logout',
        loading: false 
      });
      throw error;
    }
  },
}));

// Inizializza lo stato di autenticazione al caricamento
useAuth.getState().checkAuth();