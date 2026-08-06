'use client'
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { BACKEND_URL as BACKEND } from './backend'
import { setAuthCookie, clearAuthCookie, hasAuthCookie } from './authCookie'

interface User {
  id: string
  email: string
  name: string
  username: string
  avatarUrl?: string
  bio?: string
  phone?: string
  address?: string
  postalCode?: string
  city?: string
  businessId?: string
  usernameChangedAt?: string | null
}

interface AuthCtx {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  updateUser: (partial: Partial<User>) => void
}

const AuthContext = createContext<AuthCtx>({ user: null, loading: true, login: async () => {}, logout: () => {}, updateUser: () => {} })

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('skrm_user')
    if (stored && hasAuthCookie()) {
      setUser(JSON.parse(stored))
    } else if (stored) {
      // localStoragessa on käyttäjä mutta ei skrm_token-cookieta (esim. vanha sessio ennen
      // proxy.ts-lukitusta) — proxy ohjaisi silti /loginiin, mikä aiheuttaisi uudelleenohjaussilmukan.
      // Siivotaan pois niin kirjautumaton tila on yhtenäinen joka paikassa.
      localStorage.removeItem('skrm_token')
      localStorage.removeItem('skrm_user')
    }
    setLoading(false)
  }, [])

  async function login(email: string, password: string) {
    const res = await fetch(`${BACKEND}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error)
    localStorage.setItem('skrm_token', data.token)
    localStorage.setItem('skrm_user', JSON.stringify(data.user))
    setAuthCookie(data.token)
    setUser(data.user)
  }

  function logout() {
    localStorage.removeItem('skrm_token')
    localStorage.removeItem('skrm_user')
    clearAuthCookie()
    setUser(null)
  }

  function updateUser(partial: Partial<User>) {
    setUser(u => {
      if (!u) return u
      const updated = { ...u, ...partial }
      localStorage.setItem('skrm_user', JSON.stringify(updated))
      return updated
    })
  }

  return <AuthContext.Provider value={{ user, loading, login, logout, updateUser }}>{children}</AuthContext.Provider>
}

export function useAuth() { return useContext(AuthContext) }
