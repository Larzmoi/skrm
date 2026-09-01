'use client'
import { AuthProvider } from '@/lib/auth-context'
import { ThemeProvider } from '@/lib/theme-context'
import { LangProvider } from '@/lib/lang-context'
import { AvatarProvider } from '@/lib/avatar-context'
import { KategoriaProvider } from '@/lib/kategoria-context'
import { CartProvider } from '@/lib/cart-context'
import { NotificationProvider } from '@/lib/notification-context'
import BackgroundLayers from './BackgroundLayers'

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ThemeProvider>
        <LangProvider>
          <AvatarProvider>
          <KategoriaProvider>
          <CartProvider>
          <NotificationProvider>
            {/* Kiinteät taustagradientit + kohina koko sivustolle (ks. CLAUDE.md "Visuaalinen
                tyylipäivitys"). Sisältö kääritään position:relative + z-index:10 -kerrokseen
                kerran täällä (sama rakenne kuin mockin oma "MAIN CONTENT WRAPPER") - yksittäisten
                sivujen ei tarvitse itse huolehtia stacking contextista näkyäkseen taustan päällä. */}
            <BackgroundLayers />
            <div className="bg-noise" />
            <div style={{ position: 'relative', zIndex: 10 }}>
              {children}
            </div>
          </NotificationProvider>
          </CartProvider>
          </KategoriaProvider>
          </AvatarProvider>
        </LangProvider>
      </ThemeProvider>
    </AuthProvider>
  )
}
