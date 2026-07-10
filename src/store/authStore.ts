import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types';

// Parse a JWT without verifying signature (safe client-side use only —
// we trust the token since it came from our own backend's login endpoint)
function parseJwtRoles(token: string): string[] {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    // The backend adds a "roles" claim for each UserRoleAssignment row.
    // It may come as a single string or an array of strings depending on
    // how many roles are assigned.
    const raw = payload['roles'];
    if (!raw) return [];
    return Array.isArray(raw) ? raw : [raw];
  } catch { return []; }
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  _hydrated: boolean;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  setHydrated: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      _hydrated: false,
      setAuth: (user, token) => {
        localStorage.setItem('lms_token', token);
        // Attach the full roles list from the JWT so the role switcher
        // can show every role the admin assigned to this user, not just
        // the single primary role stored in the User DTO.
        const roles = parseJwtRoles(token);
        const userWithRoles = { ...user, roles: roles.length ? roles : [user.role] };
        set({ user: userWithRoles, token, isAuthenticated: true });
      },
      logout: () => {
        localStorage.removeItem('lms_token');
        set({ user: null, token: null, isAuthenticated: false });
      },
      setHydrated: () => set({ _hydrated: true }),
    }),
    {
      name: 'lms_auth',
      partialize: (s) => ({ user: s.user, token: s.token, isAuthenticated: s.isAuthenticated }),
      onRehydrateStorage: () => (state) => {
        if (state) state.setHydrated();
      },
    }
  )
);