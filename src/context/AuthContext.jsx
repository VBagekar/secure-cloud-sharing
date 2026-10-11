import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { authService } from '../services/authService'
import { setTokenProvider } from '../services/apiClient'
import { isAuthConfigured } from '../config'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [status, setStatus] = useState(isAuthConfigured ? 'restoring' : 'unconfigured')
  const [user, setUser] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let active = true

    setTokenProvider(() => authService.getIdToken())

    authService.setSessionListener((session) => {
      if (!active) return
      if (session) {
        setUser(session.user)
        setStatus('signedIn')
      } else {
        setUser(null)
        setStatus(isAuthConfigured ? 'signedOut' : 'unconfigured')
      }
    })

    if (isAuthConfigured) {
      authService
        .restore()
        .then((session) => {
          if (!active) return
          if (session) {
            setUser(session.user)
            setStatus('signedIn')
          } else {
            setStatus('signedOut')
          }
        })
        .catch(() => {
          if (active) setStatus('signedOut')
        })
    }

    return () => {
      active = false
      authService.setSessionListener(null)
    }
  }, [])

  const signIn = useCallback(async (email, password) => {
    setError(null)
    setStatus('signingIn')
    try {
      const session = await authService.signIn(email, password)
      setUser(session?.user || null)
      setStatus('signedIn')
      return session
    } catch (err) {
      setError(err)
      setStatus(isAuthConfigured ? 'signedOut' : 'unconfigured')
      throw err
    }
  }, [])

  const signOut = useCallback(async () => {
    try {
      await authService.signOut()
    } catch {
      // Sign-out should always clear local state even if the backend call fails.
    }
    setUser(null)
    setError(null)
    setStatus(isAuthConfigured ? 'signedOut' : 'unconfigured')
  }, [])

  const value = useMemo(
    () => ({
      status,
      user,
      error,
      isAuthenticated: status === 'signedIn',
      isAuthConfigured,
      isSigningIn: status === 'signingIn',
      isRestoring: status === 'restoring',
      canAccessApp: status === 'signedIn',
      signIn,
      signOut,
    }),
    [status, user, error, signIn, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
