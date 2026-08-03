'use client'
import { createContext, useContext, useState, ReactNode } from 'react'

interface KategoriaCtx {
  activeKat: string
  setActiveKat: (k: string) => void
}

const KategoriaContext = createContext<KategoriaCtx>({ activeKat: 'kaikki', setActiveKat: () => {} })

export function KategoriaProvider({ children }: { children: ReactNode }) {
  const [activeKat, setActiveKat] = useState('kaikki')
  return <KategoriaContext.Provider value={{ activeKat, setActiveKat }}>{children}</KategoriaContext.Provider>
}

export function useKategoria() { return useContext(KategoriaContext) }
