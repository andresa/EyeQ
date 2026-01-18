import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import type { PropsWithChildren } from 'react'
import type { Session, SwaAuthResponse, SwaClientPrincipal, UserProfile } from '../types'
import { readStorage, writeStorage } from '../utils/storage'
import { getCurrentUser } from '../services/shared'

const SESSION_KEY = 'eyeq_session'

interface SessionContextValue {
  session: Session | null
  swaUser: SwaClientPrincipal | null
  userProfile: UserProfile | null
  isLoading: boolean
  profileError: string | null
  setSession: (next: Session) => void
  clearSession: () => void
  refetchProfile: () => Promise<void>
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined)

async function fetchSwaUser(): Promise<SwaClientPrincipal | null> {
  try {
    const response = await fetch('/.auth/me')
    if (!response.ok) return null
    const data: SwaAuthResponse = await response.json()
    return data.clientPrincipal
  } catch {
    return null
  }
}

export const SessionProvider = ({ children }: PropsWithChildren) => {
  const [session, setSessionState] = useState<Session | null>(() =>
    readStorage<Session | null>(SESSION_KEY, null),
  )
  const [swaUser, setSwaUser] = useState<SwaClientPrincipal | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchUserProfile = async () => {
    try {
      const response = await getCurrentUser()
      if (response.success && response.data) {
        setUserProfile(response.data)
        setProfileError(null)

        // Update session with profile data
        const newSession: Session = {
          email: response.data.email,
          role: response.data.role,
          companyId: response.data.companyId,
          employeeId:
            response.data.userType === 'employee' ? response.data.id : undefined,
          employerId:
            response.data.userType === 'employer' ? response.data.id : undefined,
        }
        setSessionState(newSession)
        writeStorage(SESSION_KEY, newSession)
      } else {
        setProfileError(response.error || 'Failed to load user profile')
        setUserProfile(null)
      }
    } catch {
      setProfileError('Failed to load user profile')
      setUserProfile(null)
    }
  }

  // Fetch SWA user and profile on mount
  useEffect(() => {
    const init = async () => {
      const user = await fetchSwaUser()
      setSwaUser(user)

      if (user) {
        // User is authenticated, fetch their profile from our database
        await fetchUserProfile()
      } else {
        // Not authenticated, clear any stored session
        setSessionState(null)
        writeStorage(SESSION_KEY, null)
      }

      setIsLoading(false)
    }

    init()
  }, [])

  const setSession = useCallback((next: Session) => {
    setSessionState(next)
    writeStorage(SESSION_KEY, next)
  }, [])

  const clearSession = useCallback(() => {
    setSessionState(null)
    setUserProfile(null)
    writeStorage(SESSION_KEY, null)
  }, [])

  const refetchProfile = useCallback(async () => {
    if (swaUser) {
      await fetchUserProfile()
    }
  }, [swaUser])

  const value = useMemo(
    () => ({
      session,
      swaUser,
      userProfile,
      isLoading,
      profileError,
      setSession,
      clearSession,
      refetchProfile,
    }),
    [
      session,
      swaUser,
      userProfile,
      isLoading,
      profileError,
      setSession,
      clearSession,
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
