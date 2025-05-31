import { create } from 'zustand';
import bcrypt from 'bcryptjs';
import { supabase } from '../lib/supabase';
import { errorLogger } from '../lib/errorLogger';

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
      // Check rate limit before attempting login
      await supabase.rpc('log_login_attempt', { ip_address_param: 'unknown_ip' });
      await supabase.rpc('check_login_attempts', { ip_address_param: 'unknown_ip' });

      if (email === ADMIN_EMAIL && password === 'Roominbloom2024!') {
        sessionStorage.setItem('auth_session', 'true');
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
        error: errorMessage.includes('rate_limit_exceeded') 
          ? 'Troppi tentativi di login. Riprova più tardi.' 
          : errorMessage,
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