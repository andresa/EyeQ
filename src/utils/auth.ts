import type { UserRole } from '../types'

/**
 * Gets the dashboard route for a given role
 */
export function getDashboardRoute(role: UserRole): string {
  switch (role) {
    case 'admin':
      return '/admin'
    case 'manager':
      return '/manager'
    case 'employee':
    default:
      return '/employee'
  }
}
