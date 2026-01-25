import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Tables } from '@/types/database'

type User = Tables<'users'> & { role?: Tables<'roles'>; branch?: Tables<'branches'> }

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  login: (user: User) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      login: (user) => set({ user, isAuthenticated: true }),
      logout: () => set({ user: null, isAuthenticated: false }),
    }),
    { name: 'auth-storage' }
  )
)
