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
  role?: 'USER' | 'ADMIN'
  vacationUntil?: string | null
  vacationMessage?: string | null
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
    const stored = localStorage.getItem('habahub_user')
    const token = localStorage.getItem('habahub_token')
    if (stored && token) {
      // localStorage on aina totuuden lähde (ks. api.ts:n Authorization-header) - habahub_token-
      // eväste on vain proxy.ts:n reittisuojausta varten, ja se voi hävitä itsenäisesti
      // localStoragesta (esim. selaimen yksityisyyssuoja pudottaa sen risti-sivustoisen
      // uudelleenohjauksen, kuten Paytrail-maksun paluun, aikana - löydetty 2026-08-31 kun
      // ostaja päätyi /loginiin vaikka maksu onnistui täysin normaalisti). Palautetaan eväste
      // aina kun localStoragessa on kelvollisen näköinen sessio, sen sijaan että kirjattaisiin
      // koko sessio ulos pelkän evästeen puuttumisen perusteella - jos token on aidosti
      // vanhentunut, seuraava API-kutsu paljastaa sen normaalisti kuten muuallakin sovelluksessa.
      if (!hasAuthCookie()) setAuthCookie(token)
      setUser(JSON.parse(stored))
    } else if (stored || token) {
      // Vain toinen puoli (user tai token) löytyi - aidosti epäjohdonmukainen tila, ei
      // pelastettavissa palauttamalla. Siivotaan molemmat pois.
      localStorage.removeItem('habahub_token')
      localStorage.removeItem('habahub_user')
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
    localStorage.setItem('habahub_token', data.token)
    localStorage.setItem('habahub_user', JSON.stringify(data.user))
    setAuthCookie(data.token)
    setUser(data.user)
  }

  function logout() {
    localStorage.removeItem('habahub_token')
    localStorage.removeItem('habahub_user')
    clearAuthCookie()
    setUser(null)
  }

  function updateUser(partial: Partial<User>) {
    setUser(u => {
      if (!u) return u
      const updated = { ...u, ...partial }
      localStorage.setItem('habahub_user', JSON.stringify(updated))
      return updated
    })
  }

  return <AuthContext.Provider value={{ user, loading, login, logout, updateUser }}>{children}</AuthContext.Provider>
}

export function useAuth() { return useContext(AuthContext) }
