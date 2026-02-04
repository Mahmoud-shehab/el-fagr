import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: string[]
  restrictedRoles?: string[]
}

export default function ProtectedRoute({ children, allowedRoles, restrictedRoles }: ProtectedRouteProps) {
  const { user } = useAuthStore()
  
  if (!user) {
    return <Navigate to="/login" replace />
  }

  const userRole = user?.role?.name_ar || user?.role?.name

  // If restrictedRoles is specified, check if user role is in the restricted list
  if (restrictedRoles && userRole && restrictedRoles.includes(userRole)) {
    return <Navigate to="/pos" replace />
  }

  // If allowedRoles is specified, check if user role is in the allowed list
  if (allowedRoles && userRole && !allowedRoles.includes(userRole)) {
    return <Navigate to="/pos" replace />
  }

  return <>{children}</>
}
