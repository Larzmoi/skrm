import crypto from 'crypto'

// MOCK-toteutus - ei enää käytä v1-oletusta (ks. `postiClient.ts`, kirjoitettu 2026-09-03
// Postin oman "How to test OmaPosti Pro API v2" -ohjeen ja testitunnusten mukaan, joka on
// OIKEA, testattu (token-taso) integraatio v2:een). Tämä tiedosto pysyy mockina siihen asti
// kunnes `POSTI_GATEWAY_SECRET` saadaan Postilta ja `postiClient.createShippingOrder()` on
// vahvistettu toimivaksi päästä päähän demo-ympäristössä - vasta sen jälkeen tämä korvataan.
//
// ✅ PÄIVITETTY 2026-09-03 Postin oman v2-ohjeen mukaan (ks. CLAUDE.md): service PO2103,
// packageCode "PKT" ja MOCK_OUTPUT_TYPE='label_pdf' ovat nyt VAHVISTETTUJA oikeita arvoja,
// eivät enää arvauksia - poimittu suoraan Postin dokumentoidusta curl-esimerkistä.

export const POSTI_CUST_NO = '691317' // tuotannon logistiikkasopimusnumero (Muistikuva Oy), ks. CLAUDE.md - testiympäristön oma on 677503, ks. postiClient.ts
export const POSTI_PROD_URL = 'https://gateway.posti.fi/shippingapi/api/v2/shipping/order' // EI vielä käytössä tässä mockissa, vain rakenteen malli - oikea kutsu on postiClient.ts:ssä

export type Pakettikoko = 'PIENI' | 'ISO'

// PO2103 VAHVISTETTU 2026-09-03 suoraan Postin omasta curl-esimerkistä (ISO-pakettikoolle).
// PO2102 on yhä vahvistamaton arvaus PIENI-koolle - Postin esimerkki käytti vain yhtä kokoa.
const SERVICE_ID_BY_PAKETTIKOKO: Record<Pakettikoko, string> = {
  PIENI: 'PO2102',
  ISO: 'PO2103',
}
// "PKT" VAHVISTETTU 2026-09-03 Postin omasta esimerkistä - korvaa aiemmat arvatut
// "PIKKUPAKETTI"/"PAKETTI"-arvot. Esimerkissä sama koodi käytössä painosta riippumatta,
// joten käytetään samaa molemmille kokoluokille kunnes toisin vahvistetaan.
const PACKAGE_CODE_BY_PAKETTIKOKO: Record<Pakettikoko, string> = {
  PIENI: 'PKT',
  ISO: 'PKT',
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

// ✅ RATKAISTU 2026-09-03 - Postin oma "How to test OmaPosti Pro API v2" -ohje vahvistaa
// vastauksen sisältävän prints[]-taulukon jossa pdf_type:"ADDRESSLABEL" ja shipment.status:
// "PRINTED" - OmaPosti Pro API v2 on siis PUHTAASTI TARRAPOHJAINEN, ei koskaan palauta
// Vinted-tyylistä labelless-koodia. "Sending Code API" (jos sitä ylipäätään tarvitaan) olisi
// eri, erillinen Postin tuote - ei tämän saman kutsun sivutuote. TÄMÄ ON TUOTEPÄÄTÖS, EI VAIN
// TEKNINEN YKSITYISKOHTA: myyjä joutuu tulostamaan ja kiinnittämään fyysisen osoitetarran,
// ei voi enää kirjoittaa koodia käsin pakettiin - kerrottu omistajalle, ei toteutettu UI:hin
// vielä koska POSTI_GATEWAY_SECRET puuttuu eikä oikeaa vastausta ole nähty käytännössä.
const MOCK_OUTPUT_TYPE: 'code' | 'label_pdf' = 'label_pdf'

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
