import type { Metadata } from 'next'
import './globals.css'
import ClientLayout from '@/components/layout/ClientLayout'

export const metadata: Metadata = {
  title: 'Habahub — Live-huutokauppa',
  description: 'Suomen paras live-huutokauppa. Provisio vain 3%, max 35€.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fi">
      <body>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  )
}
