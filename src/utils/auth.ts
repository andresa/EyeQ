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

/**
 * Check if dev mode is enabled.
 * Uses Vite's built-in DEV flag which is true during development
 * and false in production builds.
 */
export function isDevMode(): boolean {
  return import.meta.env.DEV
}
