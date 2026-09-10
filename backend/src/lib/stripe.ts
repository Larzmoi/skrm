import Stripe from 'stripe'

// Stripe Connect -integraatio, korvaa Paytrailin (ks. CLAUDE.md "Paytrail -> Stripe" 2026-09-09).
// Syy vaihtoon: Paytrailin sub-merchant-onboarding vaatisi aina vähintään Y-tunnuksen, mikä
// sulkisi pois suurimman osan Habahubin todellisista myyjistä (yksityishenkilöt ilman
// toiminimeä). Stripe Connect tukee yksityishenkilöitä (identity.entity_type: "individual")
// ilman mitään yritysrekisteröintiä - vahvistettu suoraan Stripen v2 Accounts APIa vasten
// 2026-09-09 ennen koodausta (ei arvattu, ks. testiskripti jonka tulokset dokumentoitu
// CLAUDE.md:ssä).
//
// Malli: Stripe Connect, v2 Accounts API — Stripen oma dokumentaatio/API ohjaa KAIKKI uudet
// integraatiot v2:een (vanha v1 POST /v1/accounts on suljettu uusilta platformeilta
// oletuksena, vahvistettu suoraan virheviestistä testauksessa: "Stripe no longer recommends
// Accounts v1 for new Connect integrations"). Jokainen myyjä saa oman "recipient"-
// konfiguroidun v2 Accountin (vastine Paytrailin sub-merchant-ID:lle) - EI "merchant"-
// konfiguraatiota, koska myyjä ei koskaan itse vastaanota korttimaksua suoraan, hän vain
// SAA rahaa Habahubin luoman destination-chargen kautta (ks. createCheckoutSession).
//
// Maksu: Checkout Session (hostattu maksusivu, samaan tapaan kuin Paytrailin `href`-
// uudelleenohjaus - frontendin `window.location.href = redirectUrl` toimii sellaisenaan,
// ei vaadi mitään muutosta ostajan puolen koodiin) + destination charge
// (payment_intent_data.transfer_data.destination + application_fee_amount). Stripe jakaa
// maksun automaattisesti: koko summa siirtyy ensin myyjän tilille, sitten
// application_fee_amount siirtyy takaisin meille - sama lopputulos kuin Paytrailin
// Shop-in-Shopilla, mutta EI on_behalf_of-parametria (vaatisi card_payments-kapasiteetin,
// joka ei ole sallittu recipient-tileille, ks. Stripen dokumentaatio "Specify the
// settlement merchant").

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '')

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000'

// Sama LUKITTU 3,5%/35€-sääntö kuin Paytraililla — siirretty sellaisenaan lib/paytrail.ts:stä,
// logiikka ei riipu maksupalveluntarjoajasta.
//
// ⚠️ 0,30€ minimikomissio lisätty 2026-09-10, LUKITTU (omistajan päätös). Syy löytyi
// omistajan omasta ensimmäisestä oikeasta testiostosta: 0,50€ tuotteen 3,5% on n. 2 senttiä,
// kun Stripen oma käsittelymaksu (~1,5%+0,25€, EU-kortit) samalle summalle on n. 26 senttiä —
// vahvistettu suoraan Stripen balance_transactionista kyseiselle oikealle maksulle. Habahubin
// komissio ei kata Stripen omaa maksua ennen kuin tuotteen hinta on n. 12,50€ (3,5%×hinta ≥
// 1,5%×hinta+0,25€ ⟺ hinta ≥ 12,50€) - kaikki tätä halvemmat myynnit olisivat olleet
// Habahubille tappiollisia ilman tätä minimikomissiota.
//
// Minimi koskee VAIN oletuslaskentaa (customRatePercent/customCapEuros molemmat null, eli 3,5%/
// 35€-oletus) - EI koske 14pv-tutustumispromoa eikä adminin asettamaa mukautettua komissiota,
// koska molemmat ovat tarkoituksellisia, eksplisiittisiä poikkeuksia ("0% ensimmäiset 14
// päivää", tietty sovittu alennus tietylle myyjälle) - minimikomissio ei saa hiljaa mitätöidä
// niitä. Sama funktio lasketaan per tuoterivi (ks. kutsupaikka orders.ts:ssä, summataan
// tilauksen kaikista riveistä) - minimi pätee siis per rivi, ei per koko tilaus, samalla
// periaatteella kuin 3,5%/35€-oletuskin jo lasketaan.
const MIN_COMMISSION_EUROS = 0.3

export function computeCommissionCents(priceEuros: number, customRatePercent?: number | null, customCapEuros?: number | null): number {
  const usingDefaultRate = customRatePercent == null
  const usingDefaultCap = customCapEuros == null
  const rate = (customRatePercent != null && isFinite(customRatePercent) && customRatePercent >= 0) ? customRatePercent : 3.5
  const cap = (customCapEuros != null && isFinite(customCapEuros) && customCapEuros >= 0) ? customCapEuros : 35
  const computed = Math.min(priceEuros * (rate / 100), cap)
  const final = (usingDefaultRate && usingDefaultCap) ? Math.max(computed, MIN_COMMISSION_EUROS) : computed
  return Math.round(final * 100)
}

// Rekisteröitymisen jälkeinen 0%-tutustumisjakso (ks. CLAUDE.md "14 päivän 0%-tutustumisjakso")
// — siirretty sellaisenaan, ei muutu maksupalveluntarjoajan vaihdon myötä.
const SIGNUP_PROMO_DAYS = 14

export function getEffectiveCommissionOverride(seller: {
  customCommissionRate: number | null
  customCommissionCap: number | null
  createdAt: Date
}): { rate: number | null; cap: number | null } {
  if (seller.customCommissionRate != null || seller.customCommissionCap != null) {
    return { rate: seller.customCommissionRate, cap: seller.customCommissionCap }
  }
  const promoEndsAt = seller.createdAt.getTime() + SIGNUP_PROMO_DAYS * 24 * 60 * 60 * 1000
  if (Date.now() < promoEndsAt) return { rate: 0, cap: 0 }
  return { rate: null, cap: null }
}

function eurosToCents(euros: number): number {
  return Math.round(euros * 100)
}

// Luo myyjälle Stripe Connect -tilin jos ei vielä ole (kerran per myyjä, tallennetaan
// kutsujan toimesta User.stripeAccountId:iin - tämä funktio vain luo tilin Stripeen,
// ei kirjoita tietokantaan). "recipient"-konfiguraatio + stripe_transfers-kapasiteetti
// riittää vastaanottamaan destination-chargen siirrot, dashboard:"express" antaa
// myyjälle Stripen oman brändätyn Express-hallintapaneelin (saldon/tilitysten seuranta).
//
// ⚠️ 2026-09-10, löydetty ensimmäisellä oikealla live-onboarding-yrityksellä (aiempi
// pelkkä recipient.stripe_transfers -pyyntö toimi vielä 2026-09-09 mutta testitilassa -
// live-tila hylkäsi sen suoraan): Stripe palauttaa "The stripe_balance.stripe_transfers
// capability cannot be requested without the configuration.merchant.capabilities.
// card_payments capability" - vahvistettu suoraan live-avainta vasten kertakäyttöisellä
// diagnostiikkaskriptillä (luotu+poistettu kaksi testitiliä, ei jäänyt tuotantoon) ennen
// koodausta, ei arvattu. Ratkaisu: pyydetään myös merchant.card_payments-kapasiteetti
// rinnalla - EI tarkoita että myyjä alkaisi käsitellä korttimaksuja itse (Habahub tekee
// yhä KAIKKI veloitukset omalla Checkout Sessionillaan destination-chargen kautta, ks.
// createCheckoutSession), Stripe vain vaatii tämän parin olemassa olevaksi jotta
// stripe_transfers voidaan ylipäätään myöntää live-tilassa.
//
// Tämä toi mukanaan KAKSI uutta "routine_onboarding"-vaatimusta joita recipient-only-tili
// ei koskaan tarvinnut: configuration.merchant.mcc (toimialakoodi) ja
// defaults.profile.business_url. Vahvistettu samalla diagnostiikkaskriptillä että KUMPIKAAN
// ei koske myyjää - kun Habahub asettaa ne itse tässä (mcc 5945 "Hobby, Toy, and Game Shops",
// business_url habahub.com), ne poistuvat kokonaan tilin requirements-listalta eikä Stripen
// hostattu onboarding-lomake koskaan kysy niitä myyjältä. Jäljelle jäävät vaatimukset ovat
// täsmälleen samat kuin ennenkin (nimi/osoite/syntymäaika/puhelin/pankkitili) - EI lisää
// kitkaa yksityishenkilömyyjälle, ks. CLAUDE.md "Paytrail -> Stripe Connect".
export async function createConnectedAccount(seller: { email: string; name: string }): Promise<string> {
  const account = await stripe.v2.core.accounts.create({
    contact_email: seller.email,
    display_name: seller.name,
    identity: { country: 'fi', entity_type: 'individual' },
    dashboard: 'express',
    configuration: {
      recipient: { capabilities: { stripe_balance: { stripe_transfers: { requested: true } } } },
      merchant: { capabilities: { card_payments: { requested: true } }, mcc: '5945' },
    },
    defaults: {
      currency: 'eur',
      // fees_collector/losses_collector: "application" = Habahub (ei Stripe) vastaa
      // negatiivisten saldojen riskistä - sama vastuunjako kuin Paytrailin Shop-in-Shopissa,
      // jossa SKRM oli aina se joka hallinnoi sub-merchant-suhdetta.
      responsibilities: { fees_collector: 'application', losses_collector: 'application' },
      profile: { business_url: 'https://habahub.com' },
    },
  })
  return account.id
}

// Onboarding-linkki (Account Links -API toimii v2-tileille sellaisenaan, vahvistettu
// testissä 2026-09-09) - myyjä avaa tämän täyttääkseen nimen/osoitteen/syntymäajan/
// pankkitilin Stripen hostatulla lomakkeella (suomeksi, mobiilipankkitunnistuksella).
export async function createOnboardingLink(accountId: string): Promise<string> {
  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${FRONTEND_URL}/dashboard/tilitykset`,
    return_url: `${FRONTEND_URL}/dashboard/tilitykset`,
    type: 'account_onboarding',
  })
  return link.url
}

// Kertakäyttöinen kirjautumislinkki myyjän omaan Stripe Express -hallintapaneeliin (saldo,
// tilityshistoria, pankkitiedot) - accounts.createLoginLink() on v1-API:n metodi, mutta
// hyväksyy v2-tilin ID:n sellaisenaan (ks. docs.stripe.com/connect/accounts-v2 "Certain
// features don't yet directly support v2 Accounts... you can still pass the ID of a v2
// Account to an Accounts v1 API endpoint" - login-linkit eivät ole tuon sivun v1-only-
// listalla, joten tämän oletetaan toimivan samoin kuin Account Links teki v2-tileille).
export async function createDashboardLoginLink(accountId: string): Promise<string> {
  const link = await stripe.accounts.createLoginLink(accountId)
  return link.url
}

// Tilin tila - kaksi ERI kapasiteettia, tarkoituksella eroteltu (löytyi tuotantotestissä
// 2026-09-09): stripe_transfers = voiko destination-charge YLIPÄÄTÄÄN ohjata rahaa tälle
// tilille (tämä on se joka estää POST /orders/:id/pay:n jos puuttuu, ks. checkTransfersReady
// alla) - payouts = voiko myyjä NOSTAA jo vastaanotetun saldon omalle pankkitililleen,
// eri, myöhempi vaihe onboardingissa. v2:ssa ei ole v1:n kaltaista suoraa details_submitted-
// kenttää - kapasiteettien tila kertoo saman asian käytännössä.
export async function getAccountStatus(accountId: string): Promise<{ payoutsEnabled: boolean; transfersEnabled: boolean }> {
  const account = await stripe.v2.core.accounts.retrieve(accountId, {
    include: ['configuration.recipient'],
  })
  const capabilities = account.configuration?.recipient?.capabilities?.stripe_balance
  return {
    payoutsEnabled: capabilities?.payouts?.status === 'active',
    transfersEnabled: capabilities?.stripe_transfers?.status === 'active',
  }
}

export interface CheckoutLineItem {
  name: string
  unitPriceEuros: number
  quantity: number
}

export interface CreateCheckoutParams {
  orderId: string
  items: CheckoutLineItem[]
  shippingEuros: number
  buyerEmail: string
  sellerStripeAccountId: string
  commissionCents: number // VAIN tuoterivien komissio (3,5%/35€) - toimitus lisätään erikseen alla, ei tähän
}

// Ostajalta veloitettava maksunkäsittelymaksu — LISÄTTY 2026-09-10, omistajan päätös. Aiemmin
// Habahub kattoi Stripen oman ~1,5%+0,25€ EU-korttimaksun omasta komissiostaan (ks. yllä oleva
// "Minimikomissio 0,30€" -korjaus, joka lievitti mutta ei poistanut tätä pienillä tuotteilla).
// Nyt tämä veloitetaan ostajalta erillisenä, näkyvänä rivinä checkoutissa - lasketaan KOKO
// tilauksen summasta (tuotteet+toimitus), koska Stripen oma korttimaksu lasketaan samoin koko
// veloitetusta summasta. Sama kaava on peilattu frontendin lib/pakettikoot.ts:ssä NÄYTTÖÄ
// varten (/kori, /ostot ennen maksua) - palvelin laskee ja veloittaa aina itse, ei koskaan
// luota clientin arvoon.
export function computeProcessingFeeCents(totalEuros: number): number {
  return Math.round(totalEuros * 1.5 + 25)
}

export interface CheckoutSession {
  sessionId: string
  redirectUrl: string
}

// Yksi Checkout Session koko tilaukselle (tuote+toimitus yhdessä, sama LUKITTU-sääntö kuin
// Paytraililla - ks. CLAUDE.md "Paytrail", omistajan korjaus 2026-08-12 kahden erillisen
// maksun sijaan).
//
// ⚠️ KRIITTINEN RAHANJAKO-KORJAUS 2026-09-10 (löydetty ennen ensimmäistä oikeaa live-maksua,
// ei koskaan ollut väärin tuotannossa oikealla rahalla): destination-charge-mallissa KOKO
// maksettu summa (tuotteet+toimitus) siirtyy myyjän tilille MIINUS application_fee_amount -
// vain application_fee_amount jää Habahubille. Aiempi versio laski application_fee_amount:iin
// VAIN 3,5%/35€-komission (ks. LUKITTU-sääntö "ei provisiota postista" - tarkoitti ettei 3,5%
// lasketa toimitusmaksun PÄÄLLE, ei sitä että toimitusmaksu saisi mennä myyjälle) - tämä olisi
// tarkoittanut että koko 6,90€ toimitusmaksu olisi päätynyt MYYJÄLLE, ei Habahubille, vaikka
// CLAUDE.md:n "Postihinnat"-sääntö on aina ollut että Habahub veloittaa 6,90€ ostajalta ja
// maksaa Postille itse erikseen (oma kuluerä, oma ALV-vastuu) - toimitusmaksu on Habahubin
// omaa liikevaihtoa, ei myyjän. Korjattu: application_fee_amount = komissio + KOKO toimitusmaksu,
// jolloin myyjän tilille siirtyy aina täsmälleen productTotal - komissio, ei senttiäkään
// toimituksesta. Nouto-tilauksille shippingEuros on jo 0 (ks. lib/shipping.ts, palvelinpuolinen
// PAKETTIKOOT-taulukko - 'nouto' hinta 0, ei koskaan luoteta clientiltä) - ei vaadi erillistä
// nouto/postitus-erottelua tässä, 0€ ei muuta mitään application_fee_amount-laskennassa.
export async function createCheckoutSession(params: CreateCheckoutParams): Promise<CheckoutSession> {
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = params.items.map(item => ({
    price_data: {
      currency: 'eur',
      unit_amount: eurosToCents(item.unitPriceEuros),
      product_data: { name: item.name },
    },
    quantity: item.quantity,
  }))
  if (params.shippingEuros > 0) {
    lineItems.push({
      price_data: { currency: 'eur', unit_amount: eurosToCents(params.shippingEuros), product_data: { name: 'Toimitus' } },
      quantity: 1,
    })
  }
  const totalBeforeFeeEuros = params.items.reduce((sum, i) => sum + i.unitPriceEuros * i.quantity, 0) + params.shippingEuros
  const processingFeeCents = computeProcessingFeeCents(totalBeforeFeeEuros)
  lineItems.push({
    price_data: { currency: 'eur', unit_amount: processingFeeCents, product_data: { name: 'Maksunkäsittelymaksu' } },
    quantity: 1,
  })

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: lineItems,
    customer_email: params.buyerEmail,
    payment_intent_data: {
      // Habahub pitää komission + koko toimitusmaksun (ks. yllä oleva "KRIITTINEN RAHANJAKO-
      // KORJAUS") + nyt myös maksunkäsittelymaksun (ostaja maksaa sen, ei Habahub enää omasta
      // pussistaan) - myyjän tilille siirtyy aina täsmälleen productTotal - komissio, ei
      // senttiäkään toimituksesta eikä maksunkäsittelystä.
      application_fee_amount: params.commissionCents + eurosToCents(params.shippingEuros) + processingFeeCents,
      transfer_data: { destination: params.sellerStripeAccountId },
    },
    success_url: `${FRONTEND_URL}/ostot?payment=success&orderId=${params.orderId}`,
    cancel_url: `${FRONTEND_URL}/ostot?payment=cancel&orderId=${params.orderId}`,
    metadata: { orderId: params.orderId },
  })
  if (!session.url) throw new Error('Stripe ei palauttanut maksuosoitetta')
  return { sessionId: session.id, redirectUrl: session.url }
}

// EI KOSKAAN luoteta webhook-ilmoitukseen ilman tätä - vahvistaa että pyyntö tuli oikeasti
// Stripeltä (sama periaate kuin Paytrailin HMAC-tarkistus, eri toteutustapa). Vaatii RAA'AN
// pyyntörungon (Buffer, ei jäsennettyä JSON-oliota) - ks. index.ts:n reitityksen erikoisjärjestys.
export function verifyWebhookSignature(rawBody: Buffer, signature: string): Stripe.Event {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET puuttuu')
  return stripe.webhooks.constructEvent(rawBody, signature, secret)
}

// v2 Core Accounts -tilikapasiteettimuutokset (ks. CLAUDE.md "PÄÄTÖS 2026-09-09:
// SIGNICAT/CRIIPTO HYLÄTTY" -osio) tulevat Stripen "thin events" -mallin kautta, ERI
// mekanismi kuin yllä oleva v1 checkout.session.completed-webhook - vahvistettu suoraan
// Stripen dokumentaatiosta (docs.stripe.com/event-destinations) ennen koodausta:
// - Rekisteröidään ERIKSEEN "Event Destination" -resurssina (POST /v2/core/event_destinations,
//   tehty kertakäyttöisellä palvelinskriptillä samaan tapaan kuin muutkin tämän projektin
//   kertaluontoiset ulkoisten API:en asetuskutsut, ei jäänyt repoon), ei Dashboardin
//   klassinen webhook-URL-lista jota v1-tapahtumat käyttävät. Oma signing secret
//   (STRIPE_ACCOUNT_EVENTS_SECRET), eri kuin STRIPE_WEBHOOK_SECRET. Tehty erikseen testi-
//   ja tuotantotilassa (kumpikin oma Event Destination, oma secret) - ks. CLAUDE.md.
// - Thin event -runko on kevyt: sisältää vain event.type + related_object.id:n (esim.
//   tilin acct_-ID:n), EI tilan/kapasiteetin uutta arvoa itsessään - luotettava tapa on
//   aina hakea tuore tila erikseen (ks. getAccountStatus), ei koskaan luottaa runkoon.
// - ⚠️ Allekirjoituksen tarkistus EI käytä samaa stripe.webhooks.constructEvent-mekanismia
//   kuin v1 - vahvistettu VÄÄRÄKSI suoraan tuotantotestissä 2026-09-09 (aiempi WebSearch-
//   löydös oli virheellinen): constructEvent hylkää thin eventin omalla virheellään
//   ("You passed a thin event notification to a function that expects a webhook. Use the
//   corresponding EventNotification method instead."). Oikea metodi on stripen SDK:n oma
//   `stripe.parseEventNotification(payload, signature, secret)` (top-level, ei
//   `stripe.webhooks`-alla) - löydetty tutkimalla asennetun stripe-node-paketin prototyyppiä
//   suoraan, ei arvattu. Palauttaa `Stripe.V2.EventNotification`-tyyppisen olion.
export function verifyAccountEventSignature(rawBody: Buffer, signature: string): Stripe.V2.Core.EventNotification {
  const secret = process.env.STRIPE_ACCOUNT_EVENTS_SECRET
  if (!secret) throw new Error('STRIPE_ACCOUNT_EVENTS_SECRET puuttuu')
  return stripe.parseEventNotification(rawBody, signature, secret)
}

// Hyvitys, koko tai osittainen (amountEuros pois jättäminen = koko maksun hyvitys).
// reverse_transfer palauttaa myyjän saaman osuuden takaisin meille, refund_application_fee
// palauttaa myös meidän komissio-osuutemme - Stripe suhteuttaa molemmat automaattisesti
// hyvitettyyn summaan jos kyseessä on osittainen hyvitys (vahvistettu Stripen
// dokumentaatiosta 2026-09-09: "Otherwise, you refund a proportional amount of the
// application fee" - EI vaadi manuaalista komissiolaskentaa toisin kuin Paytraililla).
export async function refundPayment(paymentIntentId: string, amountEuros?: number): Promise<{ status: string }> {
  const refund = await stripe.refunds.create({
    payment_intent: paymentIntentId,
    ...(amountEuros != null ? { amount: eurosToCents(amountEuros) } : {}),
    reverse_transfer: true,
    refund_application_fee: true,
  })
  return { status: refund.status ?? 'unknown' }
}
