import type { UserRole } from '../types'

/**
 * Gets the dashboard route for a given role
 */
export function getDashboardRoute(role: UserRole): string {
  switch (role) {
    case 'admin':
      return '/admin'
    case 'employer':
      return '/employer'
    case 'employee':
    default:
      return '/employee'
  }
}
