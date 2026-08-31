import crypto from 'crypto'

// MOCK-toteutus, rakennettu OmaPosti Pro API:n VAHVISTETUN skeeman mukaan (ks. CLAUDE.md
// "Lähetysintegraatio" -osion "✅ VAHVISTUS 2026-08-26" ja "Eteneminen 2026-08-26"). Pyyntö
// rakennetaan tarkalleen oikeaan JSON-muotoon (sender/receiver/senderPartners/service/
// parcels/agent.quickId) mutta ei vielä lähetetä minnekään - kun oikea API-avain/
// testiympäristö saadaan Postilta (LogEDI@posti.com), ainoa muutos on HTTP-kutsun
// lisääminen näiden funktioiden sisään, ei kutsujan koodi eikä datan muoto.

export const POSTI_CUST_NO = '691317' // logistiikkasopimusnumero (Muistikuva Oy), ks. CLAUDE.md
export const POSTI_PROD_URL = 'https://gateway.posti.fi/shippingapi/api/v1/shipping/order' // EI vielä käytössä, vain rakenteen malli

export type Pakettikoko = 'PIENI' | 'ISO'

// Postin palvelumatriisista (posti.fi/en/for-businesses/service-channels/service-matrix)
// pitäisi valita oikeat palvelukoodit - ei vielä tehty (ks. CLAUDE.md "Eteneminen
// 2026-08-26", avoin kohta). Nämä ovat PAIKKAMERKKEJÄ jotka näyttävät oikealta muodolta,
// eivät vahvistettuja oikeita koodeja - päivitä kun palvelukoodi on valittu.
const SERVICE_ID_BY_PAKETTIKOKO: Record<Pakettikoko, string> = {
  PIENI: 'PO2102',
  ISO: 'PO2103',
}
const PACKAGE_CODE_BY_PAKETTIKOKO: Record<Pakettikoko, string> = {
  PIENI: 'PIKKUPAKETTI',
  ISO: 'PAKETTI',
}
const WEIGHT_KG_BY_PAKETTIKOKO: Record<Pakettikoko, number> = {
  PIENI: 1,
  ISO: 5,
}

export interface ShipmentParty {
  name: string
  streetAddress: string
  postalCode: string
  city: string
  countryCode?: string
  phone?: string
  email?: string
}

export interface CreateShipmentParams {
  sender: ShipmentParty
  receiver: ShipmentParty
  pakettikoko: Pakettikoko
  pickupPointQuickId?: string | null // shipment.agent.quickId - Location API v3:n pupCode
}

interface PostiPartyPayload {
  name: string
  streetAddress: string
  postalCode: string
  city: string
  countryCode: string
  phone?: string
  email?: string
}

// OmaPosti Pro API:n POST /shipping/order -pyynnön TARKKA muoto (ks. CLAUDE.md "Keskeiset
// JSON-kentät"). Rakennetaan aina, vaikka MOCK-vaiheessa sitä ei lähetetä minnekään - näin
// sekä pyynnön että vastauksen muoto on jo valmiiksi testattu oikeaa rakennetta vasten,
// eikä UI:ssa/reitissä ole mitään Postin API:n kanssa yhteensopimatonta oletettuna.
export interface PostiShippingOrderRequest {
  shipment: {
    sender: PostiPartyPayload
    receiver: PostiPartyPayload
    senderPartners: { id: string; custNo: string }[]
    agent?: { quickId: string }
    service: { id: string }
  }
  parcels: { copies: number; weight: number; packageCode: string; contents: string }[]
  pdfConfig: { type: 'laser-a5' | 'laser-a4' | 'thermo-se' | 'thermo-225' }
}

function toParty(p: ShipmentParty): PostiPartyPayload {
  return {
    name: p.name || 'Tuntematon',
    streetAddress: p.streetAddress || '',
    postalCode: p.postalCode || '',
    city: p.city || '',
    countryCode: p.countryCode ?? 'FI',
    ...(p.phone ? { phone: p.phone } : {}),
    ...(p.email ? { email: p.email } : {}),
  }
}

export function buildShippingOrderRequest(params: CreateShipmentParams): PostiShippingOrderRequest {
  return {
    shipment: {
      sender: toParty(params.sender),
      receiver: toParty(params.receiver),
      senderPartners: [{ id: 'POSTI', custNo: POSTI_CUST_NO }],
      ...(params.pickupPointQuickId ? { agent: { quickId: params.pickupPointQuickId } } : {}),
      service: { id: SERVICE_ID_BY_PAKETTIKOKO[params.pakettikoko] },
    },
    parcels: [{
      copies: 1,
      weight: WEIGHT_KG_BY_PAKETTIKOKO[params.pakettikoko],
      packageCode: PACKAGE_CODE_BY_PAKETTIKOKO[params.pakettikoko],
      contents: 'Verkkokaupan tuote',
    }],
    pdfConfig: { type: 'laser-a5' },
  }
}

export interface CreateShipmentResult {
  shipmentId: string
  trackingNumber: string
  request: PostiShippingOrderRequest // talteen debuggausta/tulevaa Posti-vertailua varten
}

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

// Vastine POST /shipping/order:lle. Palauttaa parcels[].parcelNo:n (= trackingNumber) ja
// lähetyksen oman tunnisteen. Oikea API:n vastaus sisältää myös pdfs[]-taulukon, mutta se
// haetaan tässä erikseen getShipmentOutput()-funktiolla (ks. sen oma kommentti miksi
// eriytetty) - ei sidota tähän kutsuun.
export function createShipment(params: CreateShipmentParams): CreateShipmentResult {
  const request = buildShippingOrderRequest(params)
  const trackingNumber = `JJFI${randomDigits(17)}`
  const shipmentId = `MOCK${randomHex(12)}`
  return { shipmentId, trackingNumber, request }
}

export type ShipmentOutput =
  | { type: 'code'; value: string }
  | { type: 'label_pdf'; url: string }

// ⚠️ Vaihda tämä kun Posti vastaa avoimeen kysymykseen (ks. CLAUDE.md "AVOIN KYSYMYS,
// selvitettävä Postilta ennen koodausta") - kumpaa muotoa lähetys oikeasti näytetään
// myyjälle/ostajalle. 'code' vastaa tavoiteltua Vinted-tyylistä labelless-virtaa,
// 'label_pdf' sitä että OmaPosti Pro API on puhtaasti tarrapohjainen. Koko UI
// (dashboard/tilaukset, ostot) tukee jo molempia yhtä hyvin - tämän arvon vaihtaminen on
// AINOA koodimuutos joka tarvitaan kumpaan tahansa vastaukseen.
const MOCK_OUTPUT_TYPE: 'code' | 'label_pdf' = 'code'

// Erillinen kutsu createShipment():sta, koska emme vielä tiedä palauttaako Posti koodin/
// tarran suoraan luontivastauksessa vai vaatiiko se oman hakukutsun (esim. Sending Code
// API erikseen trackingNumberilla, ks. CLAUDE.md kohta 3 "API:t ja tarkat endpointit").
// Pitämällä nämä erillään vaihto oikeaan API:in ei vaadi createShipmentin omaa rakennetta
// muutettavaksi kumpaan suuntaan tahansa kysymys ratkeaa.
export function getShipmentOutput(shipmentId: string, trackingNumber: string): ShipmentOutput {
  if (MOCK_OUTPUT_TYPE === 'label_pdf') {
    // Oikeassa API:ssa linkki vaatii saman API-avaimen autentikoinnin ja on voimassa 1h
    // (ks. CLAUDE.md) - mockissa pelkkä esimerkkiosoite, ei oikeasti toimiva PDF.
    return { type: 'label_pdf', url: `https://mock-posti.local/labels/${shipmentId}.pdf` }
  }
  // Labelless-koodi: 6 merkkiä, numerot 0-9 + kirjaimet A-F (Sending Code API:n dokumentoitu
  // muoto) - deterministinen samalle trackingNumberille, ei satunnainen joka kutsulla,
  // koska oikeakin API palauttaisi saman jo luodun koodin uudestaan.
  const chars = '0123456789ABCDEF'
  let seed = 0
  for (const ch of trackingNumber) seed = (seed * 31 + ch.charCodeAt(0)) % 1_000_000
  let code = ''
  let n = seed
  for (let i = 0; i < 6; i++) { code += chars[n % 16]; n = Math.floor(n / 16) + i * 7 }
  return { type: 'code', value: code }
}

export type PostiTrackingStep = 'RECEIVED' | 'IN_TRANSIT' | 'AT_PICKUP_POINT' | 'PICKED_UP'

export interface TrackingStatusResponse {
  trackingNumber: string
  status: PostiTrackingStep
}

// Kanoninen järjestys - jaettu frontendin kanssa seurantanäkymän askelten piirtoon.
export const POSTI_TRACKING_STEPS: PostiTrackingStep[] = ['RECEIVED', 'IN_TRANSIT', 'AT_PICKUP_POINT', 'PICKED_UP']

// Vastine Tracking API:lle - staattinen esimerkkitila, ei oikeaa reaaliaikaista Posti-dataa.
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
