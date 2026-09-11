'use client'
import { usePathname } from 'next/navigation'
import { AuthProvider } from '@/lib/auth-context'
import { ThemeProvider } from '@/lib/theme-context'
import { LangProvider } from '@/lib/lang-context'
import { AvatarProvider } from '@/lib/avatar-context'
import { KategoriaProvider } from '@/lib/kategoria-context'
import { CartProvider } from '@/lib/cart-context'
import { NotificationProvider } from '@/lib/notification-context'
import BackgroundLayers from './BackgroundLayers'

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  // .bg-noise on kiinteä koko-ruudun overlay z-index:40:lla, eli se piirtyy KAIKEN,
  // myös videon, päälle - 3% opasiteetin kohinatekstuuri on huomaamaton tavallisilla
  // kortti-/tekstisivuilla mutta näkyy selvästi "rakeisena" liikkuvan videokuvan päällä
  // (ks. CLAUDE.md "Live-taustan kohinatekstuuri"). Piilotettu vain /live- ja /lahetys-
  // reiteiltä, joissa tausta on jo valmiiksi kiinteä tumma väri (#080808) - muu sivusto
  // pitää kohinan ennallaan, se on tarkoituksellinen osa visuaalista tyyliä.
  const hideNoise = pathname?.startsWith('/live/') || pathname?.startsWith('/lahetys')

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
            {!hideNoise && <div className="bg-noise" />}
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
