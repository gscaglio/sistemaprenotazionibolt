import { create } from 'zustand';

interface AuthStore {
  isAuthenticated: boolean;
  login: (password: string) => boolean;
  logout: () => void;
}

export const useAuth = create<AuthStore>((set) => ({
  isAuthenticated: localStorage.getItem('adminAuth') === 'true',
  login: (password: string) => {
    const isValid = password === 'Roominbloom2024!';
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