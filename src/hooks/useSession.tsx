import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import type { PropsWithChildren } from 'react'
import type { UserProfile } from '../types'
import { getSession, logout as logoutApi } from '../services/shared'
import { getSessionToken, setSessionToken, clearSessionToken } from '../services/api'

interface SessionContextValue {
  userProfile: UserProfile | null
  isLoading: boolean
  isAuthenticated: boolean
  profileError: string | null
  login: (token: string, user?: UserProfile) => void
  logout: () => Promise<void>
  refetchProfile: () => Promise<void>
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined)

export const SessionProvider = ({ children }: PropsWithChildren) => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchUserProfile = useCallback(async () => {
    const token = getSessionToken()
    if (!token) {
      setUserProfile(null)
      setProfileError(null)
      setIsLoading(false)
      return
    }

    try {
      const response = await getSession()
      if (response.success && response.data) {
        setUserProfile(response.data.user)
        setProfileError(null)
      } else {
        // Session is invalid or expired
        clearSessionToken()
        setUserProfile(null)
        setProfileError(response.error || 'Session expired')
      }
    } catch {
      clearSessionToken()
      setUserProfile(null)
      setProfileError('Failed to load session')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Check session on mount
  useEffect(() => {
    fetchUserProfile()
  }, [fetchUserProfile])

  const login = useCallback(
    (token: string, user?: UserProfile) => {
      setSessionToken(token)
      if (user) {
        // If user data is provided, use it directly to avoid race condition
        // with Cosmos DB eventual consistency
        setUserProfile(user)
        setProfileError(null)
        setIsLoading(false)
      } else {
        // Fall back to fetching profile if user data not provided
        fetchUserProfile()
      }
    },
    [fetchUserProfile],
  )

  const logout = useCallback(async () => {
    try {
      await logoutApi()
    } catch {
      // Ignore errors, we'll clear local state anyway
    }
    clearSessionToken()
    setUserProfile(null)
    setProfileError(null)
  }, [])

  const refetchProfile = useCallback(async () => {
    await fetchUserProfile()
  }, [fetchUserProfile])

  const isAuthenticated = !!userProfile && !!getSessionToken()

  const value = useMemo(
    () => ({
      userProfile,
      isLoading,
      isAuthenticated,
      profileError,
      login,
      logout,
      refetchProfile,
    }),
    [
      userProfile,
      isLoading,
      isAuthenticated,
      profileError,
      login,
      logout,
      refetchProfile,
    ],
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export const useSession = () => {
  const context = useContext(SessionContext)
  if (!context) {
    throw new Error('useSession must be used within SessionProvider')
  }
  return context
}
