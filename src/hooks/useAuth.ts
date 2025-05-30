import { create } from 'zustand';
import bcrypt from 'bcryptjs';

interface AuthStore {
  isAuthenticated: boolean;
  login: (password: string) => boolean;
  logout: () => void;
}

const ADMIN_PASSWORD_HASH = import.meta.env.VITE_ADMIN_PASSWORD_HASH;

if (!ADMIN_PASSWORD_HASH) {
  throw new Error('Missing admin password hash');
}

export const useAuth = create<AuthStore>((set) => ({
  isAuthenticated: localStorage.getItem('adminAuth') === 'true',
  login: (password: string) => {
    const isValid = bcrypt.compareSync(password, ADMIN_PASSWORD_HASH);
    if (isValid) {
      localStorage.setItem('adminAuth', 'true');
      set({ isAuthenticated: true });
    }
    return isValid;
  },
  logout: () => {
    localStorage.removeItem('adminAuth');
    set({ isAuthenticated: false });
  },
}));