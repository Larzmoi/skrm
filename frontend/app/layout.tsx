import type { Metadata } from 'next'
import { Hanken_Grotesk } from 'next/font/google'
import './globals.css'
import ClientLayout from '@/components/layout/ClientLayout'

// Otsikoiden/hintojen/nappien fontti (ks. visuaalinen uudistus) - leipäteksti pysyy
// järjestelmäfontissa (globals.css), tämä tuo vain painavamman, tunnistettavamman
// leikkauksen korostuksiin. next/font hoitaa itse-hostauksen ja fallbackin, ei erillistä
// <link>-tagia tarvita.
const hanken = Hanken_Grotesk({ subsets: ['latin'], weight: ['500', '600', '700', '800'], variable: '--font-hanken', display: 'swap' })

export const metadata: Metadata = {
  title: 'Habahub — Live-huutokauppa',
  description: 'Suomen paras live-huutokauppa. Provisio vain 3,5%, max 35€.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fi" className={hanken.variable}>
      <body>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  )
}
