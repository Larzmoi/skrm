'use client'
import { AuthProvider } from '@/lib/auth-context'
import { ThemeProvider } from '@/lib/theme-context'
import { LangProvider } from '@/lib/lang-context'
import { AvatarProvider } from '@/lib/avatar-context'
import { KategoriaProvider } from '@/lib/kategoria-context'

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ThemeProvider>
        <LangProvider>
          <AvatarProvider>
          <KategoriaProvider>
            {children}
          </KategoriaProvider>
          </AvatarProvider>
        </LangProvider>
      </ThemeProvider>
    </AuthProvider>
  )
}
