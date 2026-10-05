import { createContext, useContext, useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'

const AuthContext = createContext(null)

// Remembers that this browser has a logged-in session, so '/' can wait for the auth check
// instead of flashing the homepage. Only a hint — the cookie is still verified by the backend.
const SESSION_HINT_KEY = 'bimaone_logged_in'

export const hasSessionHint = () => {
  try {
    return localStorage.getItem(SESSION_HINT_KEY) === '1'
  } catch {
    return false
  }
}

const setSessionHint = (loggedIn) => {
  try {
    if (loggedIn) localStorage.setItem(SESSION_HINT_KEY, '1')
    else localStorage.removeItem(SESSION_HINT_KEY)
  } catch {
    // localStorage may be disabled — silently ignore
  }
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  const isAuthenticatedRef = useRef(false)

  useEffect(() => {
    isAuthenticatedRef.current = isAuthenticated
    if (isAuthenticated) setSessionHint(true)
  }, [isAuthenticated])

  const clearAuthState = () => {
    setUser(null)
    setIsAuthenticated(false)
    setSessionHint(false)
  }

  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response && error.response.status === 401) {
          const url = error.config?.url || ''
          // If this is a login or google login request, let the component handle the error
          if (!url.endsWith('/api/auth/login') && !url.endsWith('/api/auth/google')) {
            if (isAuthenticatedRef.current) {
              toast.error('Your session has expired or your account has been deactivated.', { toastId: 'auth-error' })
            }
            clearAuthState()
          }
        }
        return Promise.reject(error)
      }
    )

    return () => {
      axios.interceptors.response.eject(interceptor)
    }
  }, [])

  // Check if user is already logged in on mount
  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      // Skip auth check if on login page
      if (window.location.pathname === '/login' || window.location.pathname.startsWith('/admin')) {
        setLoading(false)
        return
      }

      // Verify token by fetching user profile
      const response = await axios.get(`${BACKEND_URL}/api/auth/profile`, {
        withCredentials: true
      })

      if (response.data.success) {
        const userData = response.data.data.user
        setUser(userData)
        setIsAuthenticated(true)
      } else {
        clearAuthState()
      }
    } catch (error) {
      console.error('Auth check error:', error)
      // Only clear auth if token is invalid (401), not on network errors
      if (error.response?.status === 401) {
        clearAuthState()
      }
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    try {
      // Call backend logout endpoint to clear cookie
      await axios.post(`${BACKEND_URL}/api/auth/logout`, {}, {
        withCredentials: true
      })
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      // Always clear local auth state, even if API call fails
      clearAuthState()
    }
  }


  const value = {
    user,
    setUser,
    isAuthenticated,
    setIsAuthenticated,
    loading,
    logout,
    checkAuth
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
