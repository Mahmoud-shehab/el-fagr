import { Outlet, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import Sidebar from './Sidebar'

export default function Layout() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-auto p-6">
        <Outlet />
      </main>
    </div>
  )
}
