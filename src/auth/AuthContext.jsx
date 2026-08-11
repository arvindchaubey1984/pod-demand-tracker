import { createContext, useContext, useMemo, useState } from 'react'
import {
  authenticate,
  clearSession,
  loadSession,
} from '../utils/auth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => loadSession())

  const value = useMemo(
    () => ({
      session,
      isAuthenticated: Boolean(session),
      login(email, password) {
        const result = authenticate(email, password)
        if (result.ok) setSession(result.session)
        return result
      },
      logout() {
        clearSession()
        setSession(null)
      },
    }),
    [session],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
