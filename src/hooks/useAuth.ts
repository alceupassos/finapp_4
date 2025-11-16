import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { loginSupabase, getSession, logout as logoutSvc } from '../services/auth';

export type UserRole = 'admin' | 'franchisee' | 'client';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  companyCnpj?: string;
  franchiseeId?: string;
  avatar?: string;
  permissions: string[];
  createdAt: string;
  lastLogin: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
  checkPermission: (permission: string) => boolean;
}

// Sistema de permissões baseado em roles
const rolePermissions: Record<UserRole, string[]> = {
  admin: [
    'view_dashboard', 'view_reports', 'manage_reports',
    'view_clients', 'create_clients', 'edit_clients', 'delete_clients',
    'view_franchisees', 'create_franchisees', 'edit_franchisees', 'delete_franchisees',
    'view_noc', 'manage_noc', 'view_ai', 'manage_ai', 'view_settings', 'manage_settings',
    'view_analysis', 'manage_analysis', 'view_bpo_analysis', 'manage_bpo_analysis'
  ],
  franchisee: [
    'view_dashboard', 'view_reports', 'generate_reports',
    'view_clients', 'create_clients', 'edit_clients',
    'view_noc', 'view_ai', 'view_settings',
    'view_analysis', 'view_bpo_analysis'
  ],
  client: [
    'view_dashboard', 'view_reports', 'view_settings'
  ]
};

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          const session = await loginSupabase(email, password);
          if (!session) throw new Error('Falha na autenticação');
          const mapRole = (r: any): UserRole => r === 'admin' ? 'admin' : r === 'franqueado' ? 'franchisee' : 'client';
          const role = mapRole(session.role as any);
          const permissions = rolePermissions[role as UserRole];
          const user: User = {
            id: session.id || session.email,
            email: session.email,
            name: session.name || session.email,
            role,
            permissions,
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString()
          };
          set({ user, isAuthenticated: true, isLoading: false });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: () => {
        logoutSvc();
        set({ user: null, isAuthenticated: false });
      },

      updateUser: (userData: Partial<User>) => {
        const { user } = get();
        if (user) {
          set({
            user: { ...user, ...userData }
          });
        }
      },

      checkPermission: (permission: string): boolean => {
        const { user } = get();
        if (!user) return false;
        return user.permissions.includes(permission);
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
);
