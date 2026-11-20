import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { API_BASE, api, setUnauthorizedHandler, tokenStore } from './api'
import { chat } from './nexconn'
import type { AuthResponse, Role, User } from './types'

interface RegisterInput {
  fullName: string
  email: string
  password: string
  phone?: string
  role: 'CITIZEN' | 'RESPONDER'
  responderType?: string
}

interface AuthState {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<User>
  register: (input: RegisterInput) => Promise<User>
  logout: () => void
}

const Ctx = createContext<AuthState | null>(null)

export function homePathFor(role: Role): string {
  switch (role) {
    case 'CITIZEN': return '/citizen'
    case 'RESPONDER': return '/responder'
    case 'ADMIN': return '/admin/users'
    default: return '/dispatch'
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState<boolean>(!!tokenStore.get())

  const logout = useCallback(() => {
    // Revoke every token for this user on the server (best effort), then clear local state.
    const t = tokenStore.get()
    tokenStore.clear()
    // Raw fetch on purpose: going through the API client would re-trigger the 401 handler and loop.
    if (t) void fetch(`${API_BASE}/api/v1/auth/logout`, { method: 'POST', headers: { Authorization: `Bearer ${t}` } }).catch(() => undefined)
    void chat.disconnect()
    setUser(null)
  }, [])

  useEffect(() => {
    setUnauthorizedHandler(logout)
    return () => setUnauthorizedHandler(null)
  }, [logout])

  useEffect(() => {
    if (!tokenStore.get()) return
    api.get<User>('/auth/me')
      .then(setUser)
      .catch(() => tokenStore.clear())
      .finally(() => setLoading(false))
  }, [])

  const accept = useCallback((r: AuthResponse) => {
    tokenStore.set(r.token)
    setUser(r.user)
    return r.user
  }, [])

  const login = useCallback(async (email: string, password: string) => accept(await api.post<AuthResponse>('/auth/login', { email, password })), [accept])
  const register = useCallback(async (input: RegisterInput) => accept(await api.post<AuthResponse>('/auth/register', input)), [accept])

  const value = useMemo(() => ({ user, loading, login, register, logout }), [user, loading, login, register, logout])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth(): AuthState {
  const v = useContext(Ctx)
  if (!v) throw new Error('useAuth must be used inside AuthProvider')
  return v
}
