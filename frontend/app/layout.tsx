import type { Metadata } from 'next'
import { Outfit, Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'
import ClientLayout from '@/components/layout/ClientLayout'

// Visuaalinen tyylipäivitys 2026-09-01 (ks. CLAUDE.md) - korvaa aiemman Hanken Groteskin.
// Outfit: otsikot/hinnat/napit/badget ('--font-display', käytetään inline-tyyleissä
// fontFamily: 'var(--font-display), sans-serif'). Plus Jakarta Sans: leipäteksti, asetettu
// suoraan body-elementille globals.css:ssä ('--font-body') - ei tarvitse toistaa jokaisessa
// komponentissa erikseen. next/font hoitaa itse-hostauksen ja fallbackin, ei erillistä
// <link>-tagia tarvita.
const outfit = Outfit({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'], variable: '--font-display', display: 'swap' })
const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['300', '400', '500', '600', '700'], variable: '--font-body', display: 'swap' })

export const metadata: Metadata = {
  title: 'Habahub — Live-huutokauppa',
  description: 'Suomen paras live-huutokauppa. Provisio vain 3,5%, max 35€.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fi" className={`${outfit.variable} ${jakarta.variable}`}>
      <body>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  )
}
