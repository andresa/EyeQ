import { createContext, useContext, useMemo, useState } from 'react'
import type { PropsWithChildren } from 'react'
import type { Session } from '../types'
import { readStorage, writeStorage } from '../utils/storage'

const SESSION_KEY = 'eyeq_session'

interface SessionContextValue {
  session: Session | null
  setSession: (next: Session) => void
  clearSession: () => void
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined)

export const SessionProvider = ({ children }: PropsWithChildren) => {
  const [session, setSessionState] = useState<Session | null>(() =>
    readStorage<Session | null>(SESSION_KEY, null),
  )

  const setSession = (next: Session) => {
    setSessionState(next)
    writeStorage(SESSION_KEY, next)
  }

  const clearSession = () => {
    setSessionState(null)
    writeStorage(SESSION_KEY, null)
  }

  const value = useMemo(
    () => ({
      session,
      setSession,
      clearSession,
    }),
    [session],
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export const useSession = () => {
  const context = useContext(SessionContext)
  if (!context) {
    throw new Error('useSession must be used within SessionProvider')
  }
  return context
}
