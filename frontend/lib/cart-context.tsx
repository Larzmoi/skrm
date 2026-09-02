'use client'
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { cartApi } from './api'
import { useAuth } from './auth-context'
import { PAKETTIKOOT, PakettikokoOption } from './pakettikoot'

export interface CartItemView {
  id: string; productId: string; name: string; imageUrl: string | null
  price: number; quantity: number; source: 'live' | 'direct'; addedAt: string; expiresAt: string | null
}
export interface CartGroup {
  sellerId: string
  seller: { name: string; username: string }
  items: CartItemView[]
  total: number
  suggestedPakettikoko: string | null
  // Ryhmän (= tulevan Orderin) sallitut toimitustavat — false jos yksikin ryhmän tuote on
  // rajannut kyseisen tavan pois (ks. CLAUDE.md "Kaksi UX-löydöstä 2026-09-02" kohta 2).
  allowShipping: boolean
  allowPickup: boolean
}
export type { PakettikokoOption }

interface CartCtx {
  groups: CartGroup[]
  pakettikoot: PakettikokoOption[]
  itemCount: number
  loading: boolean
  refresh: () => Promise<void>
}

const CartContext = createContext<CartCtx>({ groups: [], pakettikoot: PAKETTIKOOT, itemCount: 0, loading: false, refresh: async () => {} })

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [groups, setGroups] = useState<CartGroup[]>([])
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    if (!user) { setGroups([]); return }
    setLoading(true)
    try {
      const data = await cartApi.get()
      setGroups(data.groups ?? [])
    } catch {
      setGroups([])
    }
    setLoading(false)
  }, [user])

  useEffect(() => { refresh() }, [refresh])

  const itemCount = groups.reduce((sum, g) => sum + g.items.length, 0)

  return (
    <CartContext.Provider value={{ groups, pakettikoot: PAKETTIKOOT, itemCount, loading, refresh }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() { return useContext(CartContext) }
