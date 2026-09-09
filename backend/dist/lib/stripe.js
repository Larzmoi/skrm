"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeCommissionCents = computeCommissionCents;
exports.getEffectiveCommissionOverride = getEffectiveCommissionOverride;
exports.createConnectedAccount = createConnectedAccount;
exports.createOnboardingLink = createOnboardingLink;
exports.getAccountStatus = getAccountStatus;
exports.createCheckoutSession = createCheckoutSession;
exports.verifyWebhookSignature = verifyWebhookSignature;
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
function computeCommissionCents(priceEuros, customRatePercent, customCapEuros) {
    const rate = (customRatePercent != null && isFinite(customRatePercent) && customRatePercent >= 0) ? customRatePercent : 3.5;
    const cap = (customCapEuros != null && isFinite(customCapEuros) && customCapEuros >= 0) ? customCapEuros : 35;
    return Math.round(Math.min(priceEuros * (rate / 100), cap) * 100);
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
async function createConnectedAccount(seller) {
    const account = await stripe.v2.core.accounts.create({
        contact_email: seller.email,
        display_name: seller.name,
        identity: { country: 'fi', entity_type: 'individual' },
        configuration: {
            recipient: { capabilities: { stripe_balance: { stripe_transfers: { requested: true } } } },
        },
        dashboard: 'express',
        defaults: {
            currency: 'eur',
            // fees_collector/losses_collector: "application" = Habahub (ei Stripe) vastaa
            // negatiivisten saldojen riskistä - sama vastuunjako kuin Paytrailin Shop-in-Shopissa,
            // jossa SKRM oli aina se joka hallinnoi sub-merchant-suhdetta.
            responsibilities: { fees_collector: 'application', losses_collector: 'application' },
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
// Yksi Checkout Session koko tilaukselle (tuote+toimitus yhdessä, sama LUKITTU-sääntö kuin
// Paytraililla - ks. CLAUDE.md "Paytrail", omistajan korjaus 2026-08-12 kahden erillisen
// maksun sijaan). application_fee_amount lasketaan VAIN tuoteriveistä, ei toimituksesta.
async function createCheckoutSession(params) {
    const lineItems = params.items.map(item => ({
        price_data: {
            currency: 'eur',
            unit_amount: eurosToCents(item.unitPriceEuros),
            product_data: { name: item.name },
        },
        quantity: item.quantity,
    }));
    if (params.shippingEuros > 0) {
        lineItems.push({
            price_data: { currency: 'eur', unit_amount: eurosToCents(params.shippingEuros), product_data: { name: 'Toimitus' } },
            quantity: 1,
        });
    }
    const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        line_items: lineItems,
        customer_email: params.buyerEmail,
        payment_intent_data: {
            application_fee_amount: params.commissionCents,
            transfer_data: { destination: params.sellerStripeAccountId },
        },
        success_url: `${FRONTEND_URL}/ostot?payment=success&orderId=${params.orderId}`,
        cancel_url: `${FRONTEND_URL}/ostot?payment=cancel&orderId=${params.orderId}`,
        metadata: { orderId: params.orderId },
    });
    if (!session.url)
        throw new Error('Stripe ei palauttanut maksuosoitetta');
    return { sessionId: session.id, redirectUrl: session.url };
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
// Hyvitys, koko tai osittainen (amountEuros pois jättäminen = koko maksun hyvitys).
// reverse_transfer palauttaa myyjän saaman osuuden takaisin meille, refund_application_fee
// palauttaa myös meidän komissio-osuutemme - Stripe suhteuttaa molemmat automaattisesti
// hyvitettyyn summaan jos kyseessä on osittainen hyvitys (vahvistettu Stripen
// dokumentaatiosta 2026-09-09: "Otherwise, you refund a proportional amount of the
// application fee" - EI vaadi manuaalista komissiolaskentaa toisin kuin Paytraililla).
async function refundPayment(paymentIntentId, amountEuros) {
    const refund = await stripe.refunds.create({
        payment_intent: paymentIntentId,
        ...(amountEuros != null ? { amount: eurosToCents(amountEuros) } : {}),
        reverse_transfer: true,
        refund_application_fee: true,
    });
    return { status: refund.status ?? 'unknown' };
}
