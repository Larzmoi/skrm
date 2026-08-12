import crypto from 'crypto'

// Paytrail Shop-in-Shop -integraatio. Ks. CLAUDE.md "Paytrail" -osio päätökselle ja
// testitunnuksille. Dokumentaatio: github.com/paytrail/api-documentation.
//
// Arkkitehtuuri: jokainen Order on aina yhden myyjän (Order.sellerId on yksittäinen
// kenttä, ei taulukko) — Shop-in-Shopia ei siis tarvita usean myyjän YHDEN maksun
// yhdistämiseen, vaan siihen että Paytrail jakaa maksun automaattisesti SKRM:n
// (aggregate, komissio) ja myyjän (sub-merchant) kesken ilman että SKRM joutuu
// pitämään omaa "pidätetty saldo" -kirjanpitoa tai tekemään manuaalisia tilisiirtoja.
//
// Testivaiheessa KAIKKI myyjät kartoitetaan samaan Paytrailin dokumentoituun
// Shop-in-Shop-testi-submerchantiin (695874) - oikeat per-myyjä submerchant-ID:t
// vaativat erillisen onboarding-prosessin Paytrailin kanssa, joka on tietoisesti
// rajattu pois tästä vaiheesta (ks. käyttäjän ohje).

const PAYTRAIL_API_URL = 'https://services.paytrail.com'
const PAYTRAIL_TEST_MODE = process.env.PAYTRAIL_TEST_MODE !== 'false'
// Aggregate-tunnukset - näillä KAIKKI Shop-in-Shop-pyynnöt allekirjoitetaan riippumatta
// siitä minkä sub-merchantin items[].merchant-kenttään ne osoittavat.
const PAYTRAIL_MERCHANT_ID = process.env.PAYTRAIL_MERCHANT_ID || '695861'
const PAYTRAIL_SECRET = process.env.PAYTRAIL_SECRET || 'MONISAIPPUAKAUPPIAS'
// Testivaiheen kiinteä sub-merchant KAIKILLE myyjille (ks. yllä oleva selitys).
const PAYTRAIL_SUBMERCHANT_ID = process.env.PAYTRAIL_SUBMERCHANT_ID || '695874'
// Komission (SKRM:n oman osuuden) vastaanottava sub-merchant-tili. Paytrailin oma
// dokumentaatio sanoo tämän olevan aggregate-tilin OMA erillinen sub-merchant-ID, mutta
// testiympäristössä Paytrailin viralliset esimerkit (examples.md) käyttävät samaa
// 695874:ää myös komissiolle - seurataan sitä testivaiheessa. Oikea, erillinen
// komissiotili pitää selvittää Paytraililta tuotantoon siirryttäessä.
const PAYTRAIL_COMMISSION_MERCHANT_ID = process.env.PAYTRAIL_COMMISSION_MERCHANT_ID || PAYTRAIL_SUBMERCHANT_ID

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000'
const BACKEND_PUBLIC_URL = process.env.BACKEND_PUBLIC_URL || 'http://localhost:4000'

export { PAYTRAIL_TEST_MODE }

// Testivaiheessa jokainen myyjä kartoittuu samaan test-submerchantiin. Kun oikeat
// per-myyjä submerchant-ID:t on onboardattu Paytrailin kanssa (myöhempi, erillinen
// vaihe), tämä funktio on ainoa paikka joka pitää päivittää - esim. lukemaan
// User.paytrailSubmerchantId-kentästä.
export function getSubmerchantId(_sellerId: string): string {
  return PAYTRAIL_SUBMERCHANT_ID
}

// SKRM:n välityspalkkio: 3%, katto 20€ (LUKITTU-sääntö, ks. CLAUDE.md). Palauttaa
// senttejä, koska Paytrailin API käyttää pienintä valuuttayksikköä kaikkialla.
export function computeCommissionCents(priceEuros: number): number {
  return Math.round(Math.min(priceEuros * 0.03, 20) * 100)
}

function eurosToCents(euros: number): number {
  return Math.round(euros * 100)
}

// HMAC-allekirjoitus Paytrailin dokumentoimalla algoritmilla (ks. docs/README.md
// "Authentication" + docs/examples.md "HMAC calculation (Node.js)"):
// kaikki checkout-alkuiset parametrit (headerit TAI query-parametrit riippuen
// kontekstista) aakkosjärjestykseen, "key:value" per rivi, body (tarkalleen samassa
// muodossa kuin lähetetään, tai tyhjä merkkijono) perään, kaikki yhdistettynä \n:llä.
function calculateHmac(secret: string, params: Record<string, string>, body: string): string {
  const payload = Object.keys(params)
    .sort()
    .map(key => `${key}:${params[key]}`)
    .concat(body)
    .join('\n')
  return crypto.createHmac('sha256', secret).update(payload).digest('hex')
}

function authHeaders(method: 'GET' | 'POST', transactionId?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'checkout-account': PAYTRAIL_MERCHANT_ID,
    'checkout-algorithm': 'sha256',
    'checkout-method': method,
    'checkout-nonce': crypto.randomUUID(),
    'checkout-timestamp': new Date().toISOString(),
  }
  if (transactionId) headers['checkout-transaction-id'] = transactionId
  return headers
}

async function paytrailRequest(method: 'GET' | 'POST', path: string, body?: object) {
  const bodyStr = body ? JSON.stringify(body) : ''
  const transactionId = path.match(/^\/payments\/([^/]+)/)?.[1]
  const headers = authHeaders(method, path === '/payments' ? undefined : transactionId)
  const signature = calculateHmac(PAYTRAIL_SECRET, headers, bodyStr)

  const res = await fetch(`${PAYTRAIL_API_URL}${path}`, {
    method,
    headers: {
      ...headers,
      'content-type': 'application/json; charset=utf-8',
      signature,
    },
    body: bodyStr || undefined,
  })

  const data = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error(`Paytrail ${method} ${path} epäonnistui (${res.status}): ${JSON.stringify(data)}`)
  }
  return data
}

export interface PaytrailLineItem {
  itemId: string // oma pysyvä tunniste (esim. OrderItem.id) - käytetään stampina, tarvitaan per-tuote-hyvityksiin
  name: string
  unitPriceEuros: number
  quantity: number
  sellerId: string
  chargeCommission: boolean // false toimitusmaksulle - SKRM ei ota provisiota postista
}

export interface CreatePaymentParams {
  orderId: string
  stage: 'product' | 'shipping'
  items: PaytrailLineItem[]
  buyerEmail: string
}

export interface PaymentSession {
  transactionId: string
  redirectUrl: string
}

// Stampiin koodataan orderId+stage niin että webhook/redirect-käsittelijä löytää oikean
// tilauksen JA maksuvaiheen ilman erillistä tietokantahakua tai lisäkenttää - Paytrail
// palauttaa checkout-stamp:n sellaisenaan takaisin jokaisessa callbackissa.
function buildStamp(orderId: string, stage: string): string {
  return `${orderId}__${stage}__${crypto.randomUUID()}`
}

export function parseStamp(stamp: string): { orderId: string; stage: 'product' | 'shipping' } | null {
  const parts = stamp.split('__')
  if (parts.length < 2) return null
  const [orderId, stage] = parts
  if (stage !== 'product' && stage !== 'shipping') return null
  return { orderId, stage }
}

// Luo Shop-in-Shop-muotoisen maksupyynnön. Jokainen tuoterivi saa oman merchant-kentän
// (myyjän sub-merchant, testivaiheessa aina sama) ja tarvittaessa commission-kentän
// (SKRM:n 3%/max20€ osuus) - Paytrail hoitaa jaon automaattisesti maksun yhteydessä.
export async function createPayment(params: CreatePaymentParams): Promise<PaymentSession> {
  const stamp = buildStamp(params.orderId, params.stage)
  const amountCents = params.items.reduce((sum, i) => sum + eurosToCents(i.unitPriceEuros) * i.quantity, 0)

  const body = {
    stamp,
    reference: params.orderId,
    amount: amountCents,
    currency: 'EUR',
    language: 'FI',
    items: params.items.map(item => ({
      unitPrice: eurosToCents(item.unitPriceEuros),
      units: item.quantity,
      vatPercentage: 0, // yksityismyyjien käytettyjä tuotteita, ei arvonlisäveroa
      productCode: item.itemId,
      description: item.name,
      merchant: getSubmerchantId(item.sellerId),
      stamp: item.itemId,
      reference: item.itemId,
      ...(item.chargeCommission
        ? { commission: { merchant: PAYTRAIL_COMMISSION_MERCHANT_ID, amount: computeCommissionCents(item.unitPriceEuros * item.quantity) } }
        : {}),
    })),
    customer: { email: params.buyerEmail },
    redirectUrls: {
      success: `${FRONTEND_URL}/ostot?payment=success&orderId=${params.orderId}`,
      cancel: `${FRONTEND_URL}/ostot?payment=cancel&orderId=${params.orderId}`,
    },
    callbackUrls: {
      success: `${BACKEND_PUBLIC_URL}/webhooks/paytrail`,
      cancel: `${BACKEND_PUBLIC_URL}/webhooks/paytrail`,
    },
  }

  const data = await paytrailRequest('POST', '/payments', body)
  return { transactionId: data.transactionId, redirectUrl: data.href }
}

// Vahvistaa redirect/webhook-kutsun allekirjoituksen - EI KOSKAAN luoteta maksuilmoitukseen
// ilman tätä. Query-parametrit toimivat samalla algoritmilla kuin pyyntöjen headerit,
// mutta bodyna käytetään tyhjää merkkijonoa (ks. docs "Redirect and callback URL signing").
export function verifyCallbackSignature(query: Record<string, string>): boolean {
  const { signature, ...rest } = query
  if (!signature) return false
  const checkoutParams: Record<string, string> = {}
  for (const [key, value] of Object.entries(rest)) {
    if (key.startsWith('checkout-')) checkoutParams[key] = value
  }
  const expected = calculateHmac(PAYTRAIL_SECRET, checkoutParams, '')
  // timingSafeEqual vaatii samanmittaiset bufferit - eripituiset merkkijonot eivät
  // koskaan ole oikea allekirjoitus, joten ne voi turvallisesti hylätä suoraan.
  if (expected.length !== signature.length) return false
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
}

// Koko maksun täysi hyvitys (yksinkertaisin Shop-in-Shop-tapaus - aggregate voi hyvittää
// koko summan pelkällä amountilla ilman item-tason erittelyä, Paytrail purkaa jaon itse).
export async function refundFull(transactionId: string, amountEuros: number): Promise<{ status: string }> {
  const data = await paytrailRequest('POST', `/payments/${transactionId}/refund`, {
    amount: eurosToCents(amountEuros),
    refundStamp: crypto.randomUUID(),
    refundReference: transactionId,
    callbackUrls: {
      success: `${BACKEND_PUBLIC_URL}/webhooks/paytrail`,
      cancel: `${BACKEND_PUBLIC_URL}/webhooks/paytrail`,
    },
  })
  return { status: data.status }
}

// Yksittäisen tuoterivin hyvitys - vaatii alkuperäisen rivin stampin (= itemId, ks.
// createPayment). Palauttaa myös komission osuuden myyjän sub-merchantille takaisin
// SKRM:n komissiotililtä, jos rivi maksettiin komission kanssa.
export async function refundItem(
  transactionId: string,
  itemId: string,
  amountEuros: number,
  sellerId: string,
  commissionEuros: number,
): Promise<{ status: string }> {
  const data = await paytrailRequest('POST', `/payments/${transactionId}/refund`, {
    refundStamp: crypto.randomUUID(),
    refundReference: transactionId,
    items: [
      {
        amount: eurosToCents(amountEuros),
        stamp: itemId,
        refundStamp: crypto.randomUUID(),
        refundReference: itemId,
        ...(commissionEuros > 0
          ? { commission: { merchant: getSubmerchantId(sellerId), amount: eurosToCents(commissionEuros) } }
          : {}),
      },
    ],
    callbackUrls: {
      success: `${BACKEND_PUBLIC_URL}/webhooks/paytrail`,
      cancel: `${BACKEND_PUBLIC_URL}/webhooks/paytrail`,
    },
  })
  return { status: data.status }
}
