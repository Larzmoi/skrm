import crypto from 'crypto'

// MOCK-toteutus, ks. CLAUDE.md "Mikä voidaan rakentaa NYT ilman Postin sopimusta/tunnuksia"
// (2026-08-12). Sama korvaamismalli kuin mock-pay ennen Paytrail-integraatiota — kun oikeat
// Posti-tunnukset (LogEDI@posti.com) saadaan, vaihdetaan VAIN näiden funktioiden SISÄLTÖ
// oikeiksi HTTP-kutsuiksi Sending Code API:in. Paluuarvojen muoto vastaa jo nyt tarkalleen
// API:n dokumentoitua vastausmuotoa, joten mikään muu sovelluksessa ei muutu.
//
// HUOM (ks. CLAUDE.md "TÄRKEÄ LÖYDÖS 2026-08-12"): Postin Orders/Shipments V3 -API on GLUE-
// järjestelmän dropshipping-tuote (Supplier↔Retailer), EI sovi SKRM:n C2C-malliin. Vain
// Sending Code API:n dokumentoitu muoto on käytetty tässä luotettavana referenssinä — mistä
// trackingNumber oikeasti syntyy tuotannossa on vielä auki, kysytty Postilta erikseen.

export interface PostiShipment {
  trackingNumber: string
  sendingCode: string
}

export interface SendingCodeResponse {
  shipments: PostiShipment[]
}

export type PostiTrackingStep = 'RECEIVED' | 'IN_TRANSIT' | 'AT_PICKUP_POINT' | 'PICKED_UP'

export interface TrackingStatusResponse {
  trackingNumber: string
  status: PostiTrackingStep
}

// Kanoninen järjestys - jaettu frontendin kanssa seurantanäkymän askelten piirtoon.
export const POSTI_TRACKING_STEPS: PostiTrackingStep[] = ['RECEIVED', 'IN_TRANSIT', 'AT_PICKUP_POINT', 'PICKED_UP']

function randomDigits(length: number): string {
  let out = ''
  for (let i = 0; i < length; i++) out += crypto.randomInt(0, 10)
  return out
}

function randomHex(length: number): string {
  const chars = '0123456789ABCDEF'
  let out = ''
  for (let i = 0; i < length; i++) out += chars[crypto.randomInt(0, chars.length)]
  return out
}

// Vastine POST /labelless:lle — luo uuden lähetyksen, palauttaa trackingNumberin + sendingCoden
// täsmälleen samassa muodossa kuin oikea Sending Code API.
export function createShipment(): SendingCodeResponse {
  const trackingNumber = `JJFI${randomDigits(17)}`
  const sendingCode = randomHex(6)
  return { shipments: [{ trackingNumber, sendingCode }] }
}

// Vastine GET /labelless/{trackingNumber}:lle — hakee olemassa olevan koodin. Mock palauttaa
// deterministisen koodin samalle trackingNumberille (ei satunnainen joka kutsulla), koska
// oikeakin API palauttaisi saman jo luodun koodin uudestaan.
export function getSendingCode(trackingNumber: string): SendingCodeResponse {
  const chars = '0123456789ABCDEF'
  let seed = 0
  for (const ch of trackingNumber) seed = (seed * 31 + ch.charCodeAt(0)) % 1_000_000
  let code = ''
  let n = seed
  for (let i = 0; i < 6; i++) { code += chars[n % 16]; n = Math.floor(n / 16) + i * 7 }
  return { shipments: [{ trackingNumber, sendingCode: code }] }
}

// Vastine Tracking API:lle — staattinen esimerkkitila, ei oikeaa reaaliaikaista Posti-dataa.
// Etenee ajan kuluessa lähetyksen luontihetkestä (shippedAt) demoa/testausta varten, jotta
// koko UI-virta on nähtävissä toiminnassa ilman että kukaan käy manuaalisesti muuttamassa tilaa.
export function getTrackingStatus(trackingNumber: string, shippedAt: Date): TrackingStatusResponse {
  const hoursElapsed = (Date.now() - shippedAt.getTime()) / (1000 * 60 * 60)
  let status: PostiTrackingStep = 'RECEIVED'
  if (hoursElapsed >= 36) status = 'PICKED_UP'
  else if (hoursElapsed >= 20) status = 'AT_PICKUP_POINT'
  else if (hoursElapsed >= 2) status = 'IN_TRANSIT'
  return { trackingNumber, status }
}
