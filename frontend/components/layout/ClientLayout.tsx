'use client'
import { AuthProvider } from '@/lib/auth-context'
import { ThemeProvider } from '@/lib/theme-context'
import { LangProvider } from '@/lib/lang-context'
import { AvatarProvider } from '@/lib/avatar-context'
import { KategoriaProvider } from '@/lib/kategoria-context'
import { CartProvider } from '@/lib/cart-context'
import { NotificationProvider } from '@/lib/notification-context'

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ThemeProvider>
        <LangProvider>
          <AvatarProvider>
          <KategoriaProvider>
          <CartProvider>
          <NotificationProvider>
            {children}
          </NotificationProvider>
          </CartProvider>
          </KategoriaProvider>
          </AvatarProvider>
        </LangProvider>
      </ThemeProvider>
    </AuthProvider>
  )
}
