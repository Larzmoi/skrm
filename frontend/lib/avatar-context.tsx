'use client'
import { createContext, useContext, ReactNode } from 'react'
import { useAuth } from './auth-context'
import { userApi } from './api'

interface AvatarCtx {
  avatar: string | null
  setAvatar: (url: string | null) => void
}

const AvatarContext = createContext<AvatarCtx>({ avatar: null, setAvatar: () => {} })

export function AvatarProvider({ children }: { children: ReactNode }) {
  const { user, updateUser } = useAuth()
  const avatar = user?.avatarUrl ?? null

  function setAvatar(url: string | null) {
    updateUser({ avatarUrl: url ?? undefined })
    userApi.updateProfile({ avatarUrl: url ?? '' }).catch(() => {})
  }

  return <AvatarContext.Provider value={{ avatar, setAvatar }}>{children}</AvatarContext.Provider>
}

export function useAvatar() { return useContext(AvatarContext) }
