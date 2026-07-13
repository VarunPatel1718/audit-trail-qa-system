import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import {
  apiClient,
  AUTH_UNAUTHORIZED_EVENT,
  clearStoredToken,
  getStoredToken,
  storeToken,
} from '../lib/apiClient'
import type { LoginRequest, TokenResponse, UserOut } from '../types/api'

interface AuthContextValue {
  user: UserOut | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (credentials: LoginRequest, remember: boolean) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserOut | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchCurrentUser = async () => {
    const { data } = await apiClient.get<UserOut>('/auth/me')
    setUser(data)
  }

  useEffect(() => {
    const token = getStoredToken()
    if (!token) {
      setIsLoading(false)
      return
    }
    fetchCurrentUser().finally(() => setIsLoading(false))
  }, [])

  useEffect(() => {
    const handleUnauthorized = () => setUser(null)
    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized)
    return () => window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized)
  }, [])

  const login = async (credentials: LoginRequest, remember: boolean) => {
    const { data } = await apiClient.post<TokenResponse>('/auth/login', credentials)
    storeToken(data.access_token, remember)
    await fetchCurrentUser()
  }

  const logout = () => {
    clearStoredToken()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
