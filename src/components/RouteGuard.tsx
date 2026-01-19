import { Navigate } from 'react-router-dom'
import { Spin } from 'antd'
import { useSession } from '../hooks/useSession'
import { getDashboardRoute } from '../utils/auth'
import type { UserRole } from '../types'

interface RouteGuardProps {
  children: React.ReactNode
  allowedRoles: UserRole[]
}

/**
 * Route guard that restricts access based on user role from the database.
 * Admin can access all routes.
 * Other roles can only access their designated routes.
 */
const RouteGuard = ({ children, allowedRoles }: RouteGuardProps) => {
  const { swaUser, userProfile, isLoading, profileError } = useSession()

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spin size="large" />
      </div>
    )
  }

  // If not authenticated via SWA, redirect to login
  if (!swaUser) {
    return <Navigate to="/login" replace />
  }

  // If profile failed to load (user not in database), redirect to login
  if (profileError || !userProfile) {
    return <Navigate to="/login" replace />
  }

  const userRole = userProfile.role

  // Admin can access everything
  if (userRole === 'admin') {
    return <>{children}</>
  }

  // Check if user's role is in the allowed roles
  if (!allowedRoles.includes(userRole)) {
    // Redirect to their appropriate dashboard
    return <Navigate to={getDashboardRoute(userRole)} replace />
  }

  return <>{children}</>
}

export default RouteGuard
