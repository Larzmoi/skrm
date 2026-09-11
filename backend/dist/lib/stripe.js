"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeCommissionCents = computeCommissionCents;
exports.getEffectiveCommissionOverride = getEffectiveCommissionOverride;
exports.createConnectedAccount = createConnectedAccount;
exports.createOnboardingLink = createOnboardingLink;
exports.createDashboardLoginLink = createDashboardLoginLink;
exports.getAccountStatus = getAccountStatus;
exports.computeProcessingFeeCents = computeProcessingFeeCents;
exports.createCheckoutSession = createCheckoutSession;
exports.getLatestChargeId = getLatestChargeId;
exports.createSellerTransfer = createSellerTransfer;
exports.verifyWebhookSignature = verifyWebhookSignature;
exports.verifyAccountEventSignature = verifyAccountEventSignature;
exports.refundPayment = refundPayment;
const stripe_1 = __importDefault(require("stripe"));
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
const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY || '');
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
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
const MIN_COMMISSION_EUROS = 0.3;
function computeCommissionCents(priceEuros, customRatePercent, customCapEuros) {
    const usingDefaultRate = customRatePercent == null;
    const usingDefaultCap = customCapEuros == null;
    const rate = (customRatePercent != null && isFinite(customRatePercent) && customRatePercent >= 0) ? customRatePercent : 3.5;
    const cap = (customCapEuros != null && isFinite(customCapEuros) && customCapEuros >= 0) ? customCapEuros : 35;
    const computed = Math.min(priceEuros * (rate / 100), cap);
    const final = (usingDefaultRate && usingDefaultCap) ? Math.max(computed, MIN_COMMISSION_EUROS) : computed;
    return Math.round(final * 100);
}
// Rekisteröitymisen jälkeinen 0%-tutustumisjakso (ks. CLAUDE.md "14 päivän 0%-tutustumisjakso")
// — siirretty sellaisenaan, ei muutu maksupalveluntarjoajan vaihdon myötä.
const SIGNUP_PROMO_DAYS = 14;
function getEffectiveCommissionOverride(seller) {
    if (seller.customCommissionRate != null || seller.customCommissionCap != null) {
        return { rate: seller.customCommissionRate, cap: seller.customCommissionCap };
    }
    const promoEndsAt = seller.createdAt.getTime() + SIGNUP_PROMO_DAYS * 24 * 60 * 60 * 1000;
    if (Date.now() < promoEndsAt)
        return { rate: 0, cap: 0 };
    return { rate: null, cap: null };
}
function eurosToCents(euros) {
    return Math.round(euros * 100);
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
async function createConnectedAccount(seller) {
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
    });
    return account.id;
}
// Onboarding-linkki (Account Links -API toimii v2-tileille sellaisenaan, vahvistettu
// testissä 2026-09-09) - myyjä avaa tämän täyttääkseen nimen/osoitteen/syntymäajan/
// pankkitilin Stripen hostatulla lomakkeella (suomeksi, mobiilipankkitunnistuksella).
async function createOnboardingLink(accountId) {
    const link = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: `${FRONTEND_URL}/dashboard/tilitykset`,
        return_url: `${FRONTEND_URL}/dashboard/tilitykset`,
        type: 'account_onboarding',
    });
    return link.url;
}
// Kertakäyttöinen kirjautumislinkki myyjän omaan Stripe Express -hallintapaneeliin (saldo,
// tilityshistoria, pankkitiedot) - accounts.createLoginLink() on v1-API:n metodi, mutta
// hyväksyy v2-tilin ID:n sellaisenaan (ks. docs.stripe.com/connect/accounts-v2 "Certain
// features don't yet directly support v2 Accounts... you can still pass the ID of a v2
// Account to an Accounts v1 API endpoint" - login-linkit eivät ole tuon sivun v1-only-
// listalla, joten tämän oletetaan toimivan samoin kuin Account Links teki v2-tileille).
async function createDashboardLoginLink(accountId) {
    const link = await stripe.accounts.createLoginLink(accountId);
    return link.url;
}
// Tilin tila - kaksi ERI kapasiteettia, tarkoituksella eroteltu (löytyi tuotantotestissä
// 2026-09-09): stripe_transfers = voiko destination-charge YLIPÄÄTÄÄN ohjata rahaa tälle
// tilille (tämä on se joka estää POST /orders/:id/pay:n jos puuttuu, ks. checkTransfersReady
// alla) - payouts = voiko myyjä NOSTAA jo vastaanotetun saldon omalle pankkitililleen,
// eri, myöhempi vaihe onboardingissa. v2:ssa ei ole v1:n kaltaista suoraa details_submitted-
// kenttää - kapasiteettien tila kertoo saman asian käytännössä.
async function getAccountStatus(accountId) {
    const account = await stripe.v2.core.accounts.retrieve(accountId, {
        include: ['configuration.recipient'],
    });
    const capabilities = account.configuration?.recipient?.capabilities?.stripe_balance;
    return {
        payoutsEnabled: capabilities?.payouts?.status === 'active',
        transfersEnabled: capabilities?.stripe_transfers?.status === 'active',
    };
}
// Ostajalta veloitettava maksunkäsittelymaksu — LISÄTTY 2026-09-10, omistajan päätös. Aiemmin
// Habahub kattoi Stripen oman ~1,5%+0,25€ EU-korttimaksun omasta komissiostaan (ks. yllä oleva
// "Minimikomissio 0,30€" -korjaus, joka lievitti mutta ei poistanut tätä pienillä tuotteilla).
// Nyt tämä veloitetaan ostajalta erillisenä, näkyvänä rivinä checkoutissa - lasketaan KOKO
// tilauksen summasta (tuotteet+toimitus), koska Stripen oma korttimaksu lasketaan samoin koko
// veloitetusta summasta. Sama kaava on peilattu frontendin lib/pakettikoot.ts:ssä NÄYTTÖÄ
// varten (/kori, /ostot ennen maksua) - palvelin laskee ja veloittaa aina itse, ei koskaan
// luota clientin arvoon.
function computeProcessingFeeCents(totalEuros) {
    return Math.round(totalEuros * 1.5 + 25);
}
// Yksi Checkout Session KOKO ostoskorille, yhdistäen mahdollisesti useamman myyjän Orderit
// (ks. CLAUDE.md "Yhdistetty ostoskorimaksu" 2026-09-11) - tuote+toimitus yhdessä per myyjä,
// sama LUKITTU-sääntö kuin ennenkin (omistajan korjaus 2026-08-12 kahden erillisen maksun
// sijaan), laajennettu nyt kattamaan useamman myyjän KERRALLA yhdessä maksussa.
//
// ⚠️ ARKKITEHTUURIMUUTOS 2026-09-11: destination charge (payment_intent_data.transfer_data.
// destination) tukee VAIN YHTÄ kohdetiliä per PaymentIntent - ei riitä kun ostoskorissa on
// useamman myyjän tuotteita samassa maksussa. Vaihdettu Stripen "separate charges and
// transfers" -malliin (vahvistettu suoraan docs.stripe.com/connect/separate-charges-and-
// transfers:sta ennen koodausta, ei arvattu): KOKO summa laskeutuu ensin Habahubin OMALLE
// Stripe-saldolle (ei transfer_data/application_fee_amount ollenkaan tässä), ja VASTA
// checkout.session.completed-webhookissa luodaan ERILLINEN stripe.transfers.create()-kutsu
// per myyjä/Order (ks. webhooks.ts + getLatestChargeId/createSellerTransfer alempana).
// Stripen dokumentaatio vahvistaa nimenomaisesti: "You can split a single charge between
// multiple transfers" - source_transaction-parametri (charge ID) sallii tämän ilman että
// tarvitsee odottaa saldon "vapautumista", ja useampi transfer voi jakaa saman source_
// transactionin niin kauan kuin summat eivät ylitä alkuperäistä chargea.
//
// Komissio EI enää mene Stripelle ollenkaan checkout-vaiheessa (ei application_fee_amount) -
// se on nyt puhtaasti sisäinen laskenta joka määrää KUNKIN myyjän Transfer-summan webhookissa
// (productTotal - kyseisen myyjän oma komissio). Toimitusmaksu ja maksunkäsittelymaksu jäävät
// automaattisesti kokonaan Habahubin saldolle, koska niitä ei koskaan siirretä kenellekään -
// sama lopputulos kuin vanhassa application_fee_amount-laskennassa, vain toteutettu toisin päin.
async function createCheckoutSession(params) {
    const multiSeller = params.orders.length > 1;
    const lineItems = [];
    for (const order of params.orders) {
        for (const item of order.items) {
            lineItems.push({
                price_data: { currency: 'eur', unit_amount: eurosToCents(item.unitPriceEuros), product_data: { name: item.name } },
                quantity: item.quantity,
            });
        }
        if (order.shippingEuros > 0) {
            // Myyjän nimi mukaan toimitusrivin nimeen VAIN kun ostoskorissa on useampi myyjä -
            // yhden myyjän tilaukselle sama "Toimitus"-teksti kuin ennenkin, ei turhaa toistoa.
            const label = multiSeller ? `Toimitus – ${order.sellerName}` : 'Toimitus';
            lineItems.push({
                price_data: { currency: 'eur', unit_amount: eurosToCents(order.shippingEuros), product_data: { name: label } },
                quantity: 1,
            });
        }
    }
    const totalBeforeFeeEuros = params.orders.reduce((sum, o) => sum + o.items.reduce((s, i) => s + i.unitPriceEuros * i.quantity, 0) + o.shippingEuros, 0);
    const processingFeeCents = computeProcessingFeeCents(totalBeforeFeeEuros);
    lineItems.push({
        price_data: { currency: 'eur', unit_amount: processingFeeCents, product_data: { name: 'Maksunkäsittelymaksu' } },
        quantity: 1,
    });
    // EI orderId:tä success/cancel-URL:ssa enää - vahvistettu ettei frontend (/ostot) koskaan
    // lukenut sitä (vain ?payment=success/cancel-parametria), joten se oli aina pelkkä koriste.
    // Yhdistetyssä maksussa yhtä orderId:tä ei voisi edes valita mielekkäästi useamman joukosta.
    const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        line_items: lineItems,
        customer_email: params.buyerEmail,
        success_url: `${FRONTEND_URL}/ostot?payment=success`,
        cancel_url: `${FRONTEND_URL}/ostot?payment=cancel`,
    });
    if (!session.url)
        throw new Error('Stripe ei palauttanut maksuosoitetta');
    return { sessionId: session.id, redirectUrl: session.url };
}
// Haetaan PaymentIntentin viimeisin charge - tarvitaan Transferin source_transaction-
// parametriksi (ks. createSellerTransfer alla). Kutsutaan webhookista checkout.session.
// completed -tapahtuman payment_intent-ID:llä.
async function getLatestChargeId(paymentIntentId) {
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
    const chargeId = typeof pi.latest_charge === 'string' ? pi.latest_charge : pi.latest_charge?.id;
    if (!chargeId)
        throw new Error(`PaymentIntentillä ${paymentIntentId} ei ole vielä valmista chargea`);
    return chargeId;
}
// Yksi myyjäkohtainen Transfer, sidottu alkuperäiseen chargeen source_transaction:illa -
// vahvistettu Stripen dokumentaatiosta (docs.stripe.com/connect/separate-charges-and-
// transfers): "You can create multiple transfers with the same source_transaction, as long
// as the sum of the transfers doesn't exceed the source charge" ja "the transfer request
// returns success regardless of your available balance if the related charge hasn't settled
// yet" - eli tämä ei koskaan epäonnistu riittämättömän saldon takia heti maksun jälkeen,
// toisin kuin ilman source_transactionia tehty transfer olisi voinut ennen varojen
// "vapautumista". Palauttaa Transferin ID:n - tallennetaan Order.stripeTransferId:iin
// hyvitystä varten (ks. refundPayment alla).
async function createSellerTransfer(params) {
    const transfer = await stripe.transfers.create({
        amount: eurosToCents(params.amountEuros),
        currency: 'eur',
        destination: params.sellerStripeAccountId,
        source_transaction: params.chargeId,
    });
    return transfer.id;
}
// EI KOSKAAN luoteta webhook-ilmoitukseen ilman tätä - vahvistaa että pyyntö tuli oikeasti
// Stripeltä (sama periaate kuin Paytrailin HMAC-tarkistus, eri toteutustapa). Vaatii RAA'AN
// pyyntörungon (Buffer, ei jäsennettyä JSON-oliota) - ks. index.ts:n reitityksen erikoisjärjestys.
function verifyWebhookSignature(rawBody, signature) {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret)
        throw new Error('STRIPE_WEBHOOK_SECRET puuttuu');
    return stripe.webhooks.constructEvent(rawBody, signature, secret);
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
function verifyAccountEventSignature(rawBody, signature) {
    const secret = process.env.STRIPE_ACCOUNT_EVENTS_SECRET;
    if (!secret)
        throw new Error('STRIPE_ACCOUNT_EVENTS_SECRET puuttuu');
    return stripe.parseEventNotification(rawBody, signature, secret);
}
// ⚠️ HYVITYSLOGIIKKA MUUTTUI 2026-09-11 "separate charges and transfers" -siirron myötä.
// Vanha reverse_transfer:true/refund_application_fee:true toimi VAIN destination-chargeissa,
// joissa PaymentIntentillä on täsmälleen yksi transfer/application_fee sidottuna siihen
// itseensä - Stripe hoiti suhteutuksen automaattisesti. Nyt PaymentIntent voi kattaa USEAMMAN
// Orderin (eri myyjät) yhdistetyssä maksussa, joten "reversoi TÄMÄN PaymentIntentin transfer"
// ei ole enää mielekäs käsite - jokaisella Orderilla on oma erillinen Transfer-objektinsa.
// Stripen oma dokumentaatio on tässä yksiselitteinen: "refunding a charge has no impact on
// any associated transfers... reconcile any amount owed back by reducing subsequent transfer
// amounts or by reversing transfers" - hyvitys ja transferin peruminen ovat AINA kaksi
// erillistä, meidän itse orkestroimaa kutsua tästä eteenpäin, ei koskaan automaattista.
//
// refundAmountEuros on AINA PAKOLLINEN (ei enää valinnainen "koko PaymentIntent" -oletus) -
// koska PaymentIntent voi kattaa useamman Orderin summan, "hyvitä koko PaymentIntent" olisi
// voinut vahingossa hyvittää TOISEN myyjän/tilauksen rahat takaisin ostajalle. Kutsujan
// (routes/orders.ts) on aina laskettava täsmälleen TÄMÄN Orderin oma osuus.
//
// transferId puuttuu (null) vanhoilta, ENNEN 2026-09-11 destination-chargella maksetuilta
// tilauksilta (niillä ei koskaan ollut omaa Transfer-objektia, koko siirto tapahtui Stripen
// sisäisesti osana PaymentIntentiä) - näille käytetään yhä VANHAA reverse_transfer/
// refund_application_fee-mekanismia (toimii oikein VAIN destination-chargelle, ei koskaan
// yhdistetylle usean Orderin maksulle - mutta legacy-tilaus on aina yhden Orderin, yhden
// PaymentIntentin maksu, joten se on tässä turvallista). Uusille (stripeTransferId asetettu)
// tehdään erillinen reversal+refund, ks. yllä oleva kommentti.
async function refundPayment(params) {
    if (params.transferId) {
        await stripe.transfers.createReversal(params.transferId, {
            ...(params.transferReversalAmountEuros != null ? { amount: eurosToCents(params.transferReversalAmountEuros) } : {}),
        });
        const refund = await stripe.refunds.create({
            payment_intent: params.paymentIntentId,
            amount: eurosToCents(params.refundAmountEuros),
        });
        return { status: refund.status ?? 'unknown' };
    }
    // Legacy-polku (ks. yllä) - sama kutsu kuin ennen 2026-09-11 arkkitehtuurimuutosta.
    const refund = await stripe.refunds.create({
        payment_intent: params.paymentIntentId,
        amount: eurosToCents(params.refundAmountEuros),
        reverse_transfer: true,
        refund_application_fee: true,
    });
    return { status: refund.status ?? 'unknown' };
}
