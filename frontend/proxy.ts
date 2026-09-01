import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/login', '/register', '/kayttoehdot', '/tietosuoja', '/unohtuiko-salasana', '/nollaa-salasana']

export function proxy(request: NextRequest) {
  const token = request.cookies.get('habahub_token')?.value
  const path = request.nextUrl.pathname
  const isPublic = PUBLIC_PATHS.some(p => path.startsWith(p))

  if (!token && !isPublic) {
    // Säilytä alkuperäinen kohde redirect-parametrissa - ilman tätä esim. Paytrailin
    // maksun jälkeinen paluu /ostot:iin (ks. lib/paytrail.ts redirectUrls) katosi kokonaan
    // jos habahub_token-eväste puuttui juuri sillä hetkellä selaimesta (esim. selaimen oma
    // yksityisyyssuoja pudotti sen ristiin-sivustoisen Paytrail-uudelleenohjauksen aikana) -
    // login-sivu osaa jatkaa oikeaan paikkaan kirjautumisen (tai session palautuksen,
    // ks. auth-context.tsx) jälkeen.
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', path + request.nextUrl.search)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.svg).*)'],
}
