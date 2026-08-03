'use client'
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface AvatarCtx {
  avatar: string | null
  setAvatar: (url: string | null) => void
}

const AvatarContext = createContext<AvatarCtx>({ avatar: null, setAvatar: () => {} })

export function AvatarProvider({ children }: { children: ReactNode }) {
  const [avatar, setAvatarState] = useState<string | null>(null)

  useEffect(() => {
    const a = localStorage.getItem('skrm_avatar')
    if (a) setAvatarState(a)
  }, [])

  function setAvatar(url: string | null) {
    setAvatarState(url)
    if (url) localStorage.setItem('skrm_avatar', url)
    else localStorage.removeItem('skrm_avatar')
  }

  return <AvatarContext.Provider value={{ avatar, setAvatar }}>{children}</AvatarContext.Provider>
}

export function useAvatar() { return useContext(AvatarContext) }
