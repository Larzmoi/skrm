import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Oletuksena julkinen - lukitaan vain ne polut jotka oikeasti vaativat identiteetin
// (ostajan/myyjän omat tiedot, hallintapaneelit). Käännetty PUBLIC_PATHS-allowlistasta
// PROTECTED_PATHS-listaksi 2026-09-08, ks. CLAUDE.md "Koko sivusto vaatii kirjautumisen"
// - omistajan päätös ja lupa. Julkinen /u/[username]-profiilinäkymä jää tarkoituksella
// listan ulkopuolelle, samoin etusivu/Selaa/Huutokaupat/Live-katselu/tuotesivut/
// FAQ/Meistä/Välityspalkkiot/käyttöehdot/tietosuoja - kaikki nämä julkisia oletuksena.
const PROTECTED_PATHS = ['/dashboard', '/kori', '/checkout', '/ostot', '/myynnit', '/tarjoukset', '/viestit', '/admin', '/profiili/muokkaa']

export function proxy(request: NextRequest) {
  const token = request.cookies.get('habahub_token')?.value
  const path = request.nextUrl.pathname
  const isProtected = PROTECTED_PATHS.some(p => path.startsWith(p))

  if (!token && isProtected) {
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
