"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PAYTRAIL_TEST_MODE = void 0;
exports.getSubmerchantId = getSubmerchantId;
exports.computeCommissionCents = computeCommissionCents;
exports.getEffectiveCommissionOverride = getEffectiveCommissionOverride;
exports.parseStamp = parseStamp;
exports.createPayment = createPayment;
exports.verifyCallbackSignature = verifyCallbackSignature;
exports.refundFull = refundFull;
exports.refundItem = refundItem;
const crypto_1 = __importDefault(require("crypto"));
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
const PAYTRAIL_API_URL = 'https://services.paytrail.com';
const PAYTRAIL_TEST_MODE = process.env.PAYTRAIL_TEST_MODE !== 'false';
exports.PAYTRAIL_TEST_MODE = PAYTRAIL_TEST_MODE;
// Aggregate-tunnukset - näillä KAIKKI Shop-in-Shop-pyynnöt allekirjoitetaan riippumatta
// siitä minkä sub-merchantin items[].merchant-kenttään ne osoittavat.
const PAYTRAIL_MERCHANT_ID = process.env.PAYTRAIL_MERCHANT_ID || '695861';
const PAYTRAIL_SECRET = process.env.PAYTRAIL_SECRET || 'MONISAIPPUAKAUPPIAS';
// Testivaiheen kiinteä sub-merchant KAIKILLE myyjille (ks. yllä oleva selitys).
const PAYTRAIL_SUBMERCHANT_ID = process.env.PAYTRAIL_SUBMERCHANT_ID || '695874';
// Komission (SKRM:n oman osuuden) vastaanottava sub-merchant-tili. Paytrailin oma
// dokumentaatio sanoo tämän olevan aggregate-tilin OMA erillinen sub-merchant-ID, mutta
// testiympäristössä Paytrailin viralliset esimerkit (examples.md) käyttävät samaa
// 695874:ää myös komissiolle - seurataan sitä testivaiheessa. Oikea, erillinen
// komissiotili pitää selvittää Paytraililta tuotantoon siirryttäessä.
const PAYTRAIL_COMMISSION_MERCHANT_ID = process.env.PAYTRAIL_COMMISSION_MERCHANT_ID || PAYTRAIL_SUBMERCHANT_ID;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const BACKEND_PUBLIC_URL = process.env.BACKEND_PUBLIC_URL || 'http://localhost:4000';
// Testivaiheessa jokainen myyjä kartoittuu samaan test-submerchantiin. Kun oikeat
// per-myyjä submerchant-ID:t on onboardattu Paytrailin kanssa (myöhempi, erillinen
// vaihe), tämä funktio on ainoa paikka joka pitää päivittää - esim. lukemaan
// User.paytrailSubmerchantId-kentästä.
function getSubmerchantId(_sellerId) {
    return PAYTRAIL_SUBMERCHANT_ID;
}
// Habahubin välityspalkkio: 3,5%, katto 35€ (LUKITTU-sääntö, ks. CLAUDE.md) — oletusarvot,
// paitsi jos myyjälle on admin-paneelista asetettu poikkeavat customRate/customCap-arvot
// (ks. CLAUDE.md/INTEGRATION.md 2026-09-02, User.customCommissionRate/Cap). Palauttaa
// senttejä, koska Paytrailin API käyttää pienintä valuuttayksikköä kaikkialla.
// TÄRKEÄÄ: customRate/customCap on AINA haettava myyjän User-riviltä juuri ennen tätä
// kutsua (ks. orders.ts) — ei koskaan luoteta frontendiltä tulevaan arvoon.
function computeCommissionCents(priceEuros, customRatePercent, customCapEuros) {
    const rate = (customRatePercent != null && isFinite(customRatePercent) && customRatePercent >= 0) ? customRatePercent : 3.5;
    const cap = (customCapEuros != null && isFinite(customCapEuros) && customCapEuros >= 0) ? customCapEuros : 35;
    return Math.round(Math.min(priceEuros * (rate / 100), cap) * 100);
}
// Rekisteröitymisen jälkeinen 0%-tutustumisjakso (päätetty 2026-09-03, omistajan pyynnöstä) —
// KAIKKI uudet myyjät kauppaavat provisiovapaasti ensimmäiset 14 vuorokautta rekisteröitymisestä.
// TIETOINEN SUUNNITTELUPÄÄTÖS: ei tallenneta 0€/0%:a User-riville rekisteröitymishetkellä,
// koska se vaatisi manuaalisen/ajastetun massapäivityksen 14 päivän jälkeen palauttamaan kaikki
// takaisin 3,5%/35€:oon (juuri se työläs ongelma jonka omistaja halusi välttää) — sen sijaan
// tämä LASKETAAN joka maksuhetkellä suoraan User.createdAt:sta, jolloin promojakso päättyy
// itsestään eikä mitään tarvitse koskaan palauttaa manuaalisesti.
// Admin-paneelista asetettu eksplisiittinen customCommissionRate/Cap (ks. PATCH /admin/users/:id)
// menee AINA tämän edelle riippumatta rekisteröitymisajasta - admin-yliajo on tarkoituksella
// pysyvä, ei promojakson piirissä.
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
// HMAC-allekirjoitus Paytrailin dokumentoimalla algoritmilla (ks. docs/README.md
// "Authentication" + docs/examples.md "HMAC calculation (Node.js)"):
// kaikki checkout-alkuiset parametrit (headerit TAI query-parametrit riippuen
// kontekstista) aakkosjärjestykseen, "key:value" per rivi, body (tarkalleen samassa
// muodossa kuin lähetetään, tai tyhjä merkkijono) perään, kaikki yhdistettynä \n:llä.
function calculateHmac(secret, params, body) {
    const payload = Object.keys(params)
        .sort()
        .map(key => `${key}:${params[key]}`)
        .concat(body)
        .join('\n');
    return crypto_1.default.createHmac('sha256', secret).update(payload).digest('hex');
}
function authHeaders(method, transactionId) {
    const headers = {
        'checkout-account': PAYTRAIL_MERCHANT_ID,
        'checkout-algorithm': 'sha256',
        'checkout-method': method,
        'checkout-nonce': crypto_1.default.randomUUID(),
        'checkout-timestamp': new Date().toISOString(),
    };
    if (transactionId)
        headers['checkout-transaction-id'] = transactionId;
    return headers;
}
async function paytrailRequest(method, path, body) {
    const bodyStr = body ? JSON.stringify(body) : '';
    const transactionId = path.match(/^\/payments\/([^/]+)/)?.[1];
    const headers = authHeaders(method, path === '/payments' ? undefined : transactionId);
    const signature = calculateHmac(PAYTRAIL_SECRET, headers, bodyStr);
    const res = await fetch(`${PAYTRAIL_API_URL}${path}`, {
        method,
        headers: {
            ...headers,
            'content-type': 'application/json; charset=utf-8',
            signature,
        },
        body: bodyStr || undefined,
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
        throw new Error(`Paytrail ${method} ${path} epäonnistui (${res.status}): ${JSON.stringify(data)}`);
    }
    return data;
}
// Stampiin koodataan orderId niin että webhook/redirect-käsittelijä löytää oikean tilauksen
// ilman erillistä tietokantahakua transactionId:n perusteella - Paytrail palauttaa
// checkout-stamp:n sellaisenaan takaisin jokaisessa callbackissa. Yksi tilaus = yksi maksu
// (tuote+toimitus aina yhdessä, ks. CLAUDE.md "Paytrail" - omistajan korjaus 2026-08-12),
// joten stampissa ei enää tarvita erillistä maksuvaihetta.
function buildStamp(orderId, attemptId) {
    return `${orderId}__${attemptId}`;
}
function parseStamp(stamp) {
    const parts = stamp.split('__');
    if (parts.length < 2)
        return null;
    return { orderId: parts[0] };
}
// Luo Shop-in-Shop-muotoisen maksupyynnön. Jokainen tuoterivi saa oman merchant-kentän
// (myyjän sub-merchant, testivaiheessa aina sama) ja tarvittaessa commission-kentän
// (Habahubin 3,5%/max35€ osuus) - Paytrail hoitaa jaon automaattisesti maksun yhteydessä.
async function createPayment(params) {
    // Paytrail hylkää pyynnön jos jokin stamp on jo nähty aiemmin SAMALLA merchantilla (oma
    // toistohyökkäyssuoja) - havaittu tuotantotestissä: uudelleenyritys (esim. ostaja peruutti
    // ensimmäisen maksun ja yritti uudestaan) käytti samaa OrderItem.id:tä stampina joka
    // toisella kerralla törmäsi "stamp already exists for merchant" -virheeseen. Jokainen
    // createPayment()-kutsu (= jokainen yritys) saa siis oman satunnaisen attemptId:n joka
    // liitetään sekä tilauksen että jokaisen rivin stamppiin, mutta productCode pysyy
    // muuttumattomana (se on tuotteen oma tunniste, ei toistosuoja).
    const attemptId = crypto_1.default.randomUUID();
    const stamp = buildStamp(params.orderId, attemptId);
    const amountCents = params.items.reduce((sum, i) => sum + eurosToCents(i.unitPriceEuros) * i.quantity, 0);
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
            stamp: `${item.itemId}__${attemptId}`,
            reference: item.itemId,
            ...(item.chargeCommission
                ? { commission: { merchant: PAYTRAIL_COMMISSION_MERCHANT_ID, amount: computeCommissionCents(item.unitPriceEuros * item.quantity, item.customCommissionRate, item.customCommissionCap) } }
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
    };
    const data = await paytrailRequest('POST', '/payments', body);
    return { transactionId: data.transactionId, redirectUrl: data.href, attemptId };
}
// Vahvistaa redirect/webhook-kutsun allekirjoituksen - EI KOSKAAN luoteta maksuilmoitukseen
// ilman tätä. Query-parametrit toimivat samalla algoritmilla kuin pyyntöjen headerit,
// mutta bodyna käytetään tyhjää merkkijonoa (ks. docs "Redirect and callback URL signing").
function verifyCallbackSignature(query) {
    const { signature, ...rest } = query;
    if (!signature)
        return false;
    const checkoutParams = {};
    for (const [key, value] of Object.entries(rest)) {
        if (key.startsWith('checkout-'))
            checkoutParams[key] = value;
    }
    const expected = calculateHmac(PAYTRAIL_SECRET, checkoutParams, '');
    // timingSafeEqual vaatii samanmittaiset bufferit - eripituiset merkkijonot eivät
    // koskaan ole oikea allekirjoitus, joten ne voi turvallisesti hylätä suoraan.
    if (expected.length !== signature.length)
        return false;
    return crypto_1.default.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}
// Koko maksun täysi hyvitys (yksinkertaisin Shop-in-Shop-tapaus - aggregate voi hyvittää
// koko summan pelkällä amountilla ilman item-tason erittelyä, Paytrail purkaa jaon itse).
async function refundFull(transactionId, amountEuros) {
    const data = await paytrailRequest('POST', `/payments/${transactionId}/refund`, {
        amount: eurosToCents(amountEuros),
        refundStamp: crypto_1.default.randomUUID(),
        refundReference: transactionId,
        callbackUrls: {
            success: `${BACKEND_PUBLIC_URL}/webhooks/paytrail`,
            cancel: `${BACKEND_PUBLIC_URL}/webhooks/paytrail`,
        },
    });
    return { status: data.status };
}
// Yksittäisen tuoterivin hyvitys - vaatii alkuperäisen rivin stampin, joka on
// "{itemId}__{attemptId}" (ks. createPayment - attemptId pitää olla SAMAN onnistuneen
// maksuyrityksen arvo, tallennettu Order.paytrailAttemptId:iin). Palauttaa myös komission
// osuuden myyjän sub-merchantille takaisin SKRM:n komissiotililtä, jos rivi maksettiin
// komission kanssa.
async function refundItem(transactionId, itemId, attemptId, amountEuros, sellerId, commissionEuros) {
    const itemStamp = `${itemId}__${attemptId}`;
    const data = await paytrailRequest('POST', `/payments/${transactionId}/refund`, {
        refundStamp: crypto_1.default.randomUUID(),
        refundReference: transactionId,
        items: [
            {
                amount: eurosToCents(amountEuros),
                stamp: itemStamp,
                refundStamp: crypto_1.default.randomUUID(),
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
    });
    return { status: data.status };
}
