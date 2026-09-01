import type { NextConfig } from "next";

// Turvallisuusauditointi 2026-08-26 (ks. CLAUDE.md "Turvallisuusauditointi" -osio) — toteutettu
// 2026-09-01. script-src sallii yhä 'unsafe-inline'/'unsafe-eval': Next.js'n oma hydraatio ja
// mahdolliset kolmannen osapuolen kirjastot (LiveKit, hls.js, Paytrail-uudelleenohjaus) eivät ole
// käyty läpi nonce-pohjaista tiukennusta varten, eikä tätä ole voitu vahvistaa interaktiivisella
// selaimella (vain palvelinpuolinen curl-testaus mahdollista) — liian tiukka script-src riskeeraisi
// koko sivun hiljaisen rikkoutumisen (tyhjä sivu, ei virheilmoitusta käyttäjälle). Omistajan
// suositellaan käymään selaimen Console-välilehti läpi (kirjautuminen, selaus, LiveKit-video/chat,
// Paytrail-testimaksu) ennen kuin script-src tiukennetaan nonce-pohjaiseksi.
//
// connect-src/frame-src/form-action sallivat Paytrailin (*.paytrail.com) vaikka nykyinen koodi
// (frontend/app/kori/page.tsx, ostot/page.tsx) käyttää täyttä sivunavigointia
// (window.location.href) eikä fetch/iframe-upotusta — CSP ei siis teknisesti vaatisi näitä juuri
// nyt, mutta pidetty mukana koska maksuvirtaus saattaa muuttua eikä salliminen tuo turvariskiä
// (tunnettu, jo integroitu maksupalveluntarjoaja). Samoin Posti (gateway.posti.fi/gateway-auth.posti.fi)
// — backend kutsuu näitä nyt, ei frontend, mutta säilytetty varalta kun oikea Posti-integraatio
// rakennetaan selainpuolelle (ks. CLAUDE.md "Lähetysintegraatio").
//
// connect-src "wss:" (mikä tahansa host) tarvitaan aidosti: LiveKitin selainyhteys menee eri
// hostiin kuin sovellus itse (LIVEKIT_WS_URL, tuotannossa tätä kirjoitettaessa stream.skrm.fi —
// HUOM tämä on vanha domain, ei vielä siirretty habahub.com:iin, ks. CLAUDE.md "Hosting"-osio),
// ja Socket.io käyttää samaa originia mutta wss-skeemaa upgrade-yhteydelle.
//
// ⚠️ KORJATTU 2026-09-01 (löytyi tuotannossa: "Aloita lähetys" ei enää käynnistänyt striimiä
// CSP:n käyttöönoton jälkeen) — "stun:"/"turn:"/"turns:" PUUTTUIVAT connect-src:stä kokonaan.
// LiveKit-palvelin (/opt/livekit/livekit.yaml) ajaa oman TURN-relaynsa TLS:n yli (turns:,
// portti 5349, stream.skrm.fi) nimenomaan niitä katsojia/myyjiä varten joiden verkko ei
// muuten pystyisi muodostamaan suoraa WebRTC-yhteyttä — ilman tätä ICE-neuvottelu epäonnistuu
// hiljaa selaimessa (ei mitään näkyvää virhettä sivulla), täsmälleen tämä oli aiemmin dokumentoitu
// tunnettu riski ("en pystynyt ajamaan interaktiivista selainta LiveKit-videon läpi") joka
// toteutui. Chrome/Firefox soveltavat connect-src:ää myös RTCPeerConnectionin ICE-palvelin-URLeihin
// (stun:/turn:/turns:), ei vain fetch/XHR/WebSocketiin.
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=()" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "media-src 'self' data: blob:",
      "font-src 'self' data:",
      "connect-src 'self' wss: stun: turn: turns: https://*.paytrail.com https://gateway.posti.fi https://gateway-auth.posti.fi",
      "frame-src 'self' https://*.paytrail.com",
      "form-action 'self' https://*.paytrail.com",
      "frame-ancestors 'self'",
      "object-src 'none'",
      "base-uri 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
