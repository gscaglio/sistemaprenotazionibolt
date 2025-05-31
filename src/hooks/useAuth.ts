import { create } from 'zustand';
// import bcrypt from 'bcryptjs'; // bcrypt seems unused, commenting out for now. If needed, can be uncommented.
import { supabase } from '../../lib/supabase';

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
      // Call rate limiting functions before attempting login
      await supabase.rpc('log_login_attempt', { ip_address_param: 'unknown_ip' });
      await supabase.rpc('check_login_attempts', { ip_address_param: 'unknown_ip' });

      // Proceed with existing mock login logic
      if (email === ADMIN_EMAIL && password === 'Roominbloom2024!') {
        sessionStorage.setItem('auth_session', 'true');
        set({ isAuthenticated: true, loading: false });
      } else {
        throw new Error('Credenziali non valide');
      }
    } catch (error: any) {
      let errorMessage = 'Errore durante il login';
      if (error.message && error.message.includes('Rate limit exceeded for login attempts')) {
        errorMessage = 'Troppi tentativi di login. Riprova più tardi.';
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      set({ 
        error: errorMessage,
        loading: false,
        isAuthenticated: false 
      });
      // It's important to decide if we re-throw or not.
      // For this hook, typically we set the error state and don't re-throw
      // to allow the UI to react to the error state.
      // If re-throwing: throw error;
    }
  },

  logout: () => {
    sessionStorage.removeItem('auth_session');
    set({ isAuthenticated: false });
  },
}));