"use strict";
// OIKEA OmaPosti Pro API v2 -integraatio, kirjoitettu Postin oman "How to test OmaPosti Pro
// API v2 (UPDATED with Demo URLs)" -ohjedokumentin mukaan (toimitettu omistajalta 2026-09-03,
// yhdessä testiympäristön tunnusten kanssa - ks. CLAUDE.md "Lähetysintegraatio").
//
// ✅ VAHVISTETTU PÄÄSTÄ PÄÄHÄN 2026-09-04 demo-ympäristöä vasten (token + createShippingOrder()
// + fetchLabelPdf(), kaikki HTTP 200, oikea PDF palautui) — KYTKETTY LIVE-REITTIIN samana
// päivänä (`POST /orders/:id/create-shipment`, ks. routes/orders.ts), korvaa `postiService.ts`:n
// aiemman MOCK-toteutuksen kokonaan sille reitille. `POSTI_TEST_MODE=true` (oletus) pitää tämän
// yhä demo-ympäristössä - ei tuotannossa - kunnes joku eksplisiittisesti vaihtaa sen.
//
// LÖYDÖS ohjeesta: OPP API v2 itsessään palauttaa AINA PRINTATTAVAN PDF-osoitetarran
// (vastauksen prints[].pdf_type: "ADDRESSLABEL", shipment.status: "PRINTED") - EI koskaan
// suoraan Vinted-tyylistä koodia. TARKENNETTU 2026-09-03 (luettu myös erillinen "Sending Code
// API.txt" -dokumentti): labelless-tavoite ON silti saavutettavissa, mutta KAHDESSA erillisessä
// API-kutsussa, ei yhdessä - ks. tiedoston loppuosan `getSendingCode()`, joka toimii tämän
// luoman trackingNumberin päällä mutta on YHÄ oma, erillinen 403 (puuttuva tuoterekisteröinti,
// ei sama este kuin gateway secret oli).
Object.defineProperty(exports, "__esModule", { value: true });
exports.POSTI_CONTRACT_NUMBER = exports.POSTI_TEST_MODE = exports.WEIGHT_KG_BY_PAKETTIKOKO = exports.PACKAGE_CODE_BY_PAKETTIKOKO = exports.SERVICE_ID_BY_PAKETTIKOKO = void 0;
exports.createShippingOrder = createShippingOrder;
exports.fetchLabelPdf = fetchLabelPdf;
exports.getSendingCode = getSendingCode;
const POSTI_TEST_MODE = process.env.POSTI_TEST_MODE !== 'false';
exports.POSTI_TEST_MODE = POSTI_TEST_MODE;
const POSTI_TOKEN_URL = POSTI_TEST_MODE
    ? 'https://gateway-auth.demo.posti.fi/api/v1/token'
    : 'https://gateway-auth.posti.fi/api/v1/token';
const POSTI_SHIPPING_URL = POSTI_TEST_MODE
    ? 'https://gateway.demo.posti.fi/shippingapi/api/v2/shipping/order'
    : 'https://gateway.posti.fi/shippingapi/api/v2/shipping/order';
const POSTI_CLIENT_ID = POSTI_TEST_MODE ? (process.env.POSTI_TEST_CLIENT_ID || '') : (process.env.POSTI_CLIENT_ID || '');
const POSTI_CLIENT_SECRET = POSTI_TEST_MODE ? (process.env.POSTI_TEST_CLIENT_SECRET || '') : (process.env.POSTI_CLIENT_SECRET || '');
// Testiympäristön sopimusnumero (677503, paketit - ks. testitunnusten JSON-tiedosto) vs.
// tuotannon oma (691317, ks. CLAUDE.md "Eteneminen 2026-08-26") - EI SAMA LUKU, älä sekoita.
const POSTI_CONTRACT_NUMBER = POSTI_TEST_MODE ? (process.env.POSTI_TEST_CONTRACT_NUMBER || '677503') : (process.env.POSTI_CONTRACT_NUMBER || '691317');
exports.POSTI_CONTRACT_NUMBER = POSTI_CONTRACT_NUMBER;
// Vaaditaan JOKAISEEN kutsuun paitsi token-hakuun - ei vielä vastaanotettu omistajalta.
const POSTI_GATEWAY_SECRET = process.env.POSTI_GATEWAY_SECRET || '';
exports.SERVICE_ID_BY_PAKETTIKOKO = {
    PIENI: 'PO2102',
    ISO: 'PO2103',
};
exports.PACKAGE_CODE_BY_PAKETTIKOKO = {
    PIENI: 'PKT',
    ISO: 'PKT',
};
exports.WEIGHT_KG_BY_PAKETTIKOKO = {
    PIENI: 1,
    ISO: 5,
};
let cachedToken = null;
async function getAccessToken() {
    if (cachedToken && cachedToken.expiresAt > Date.now() + 30000)
        return cachedToken.value;
    if (!POSTI_CLIENT_ID || !POSTI_CLIENT_SECRET) {
        throw new Error(`Posti-tunnuksia ei ole asetettu (${POSTI_TEST_MODE ? 'POSTI_TEST_CLIENT_ID/SECRET' : 'POSTI_CLIENT_ID/SECRET'})`);
    }
    const res = await fetch(POSTI_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ grant_type: 'client_credentials', client_id: POSTI_CLIENT_ID, client_secret: POSTI_CLIENT_SECRET }),
    });
    if (!res.ok)
        throw new Error(`Posti-tokenin haku epäonnistui: ${res.status}`);
    const json = await res.json();
    cachedToken = { value: json.access_token, expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000 };
    return cachedToken.value;
}
function toPostiParty(p) {
    return {
        name: p.name, address1: p.address1, zipcode: p.zipcode, city: p.city,
        country: p.country ?? 'FI',
        ...(p.phone ? { phone: p.phone } : {}),
        ...(p.email ? { email: p.email } : {}),
    };
}
// Luo lähetyksen OmaPosti Pro API v2:lla. HUOM: tämä on OIKEA API-kutsu, ei mock - kutsuminen
// tuotantotilassa (POSTI_TEST_MODE=false) luo oikean, laskutettavan lähetyksen jos joku vie
// sen fyysisesti Postiin. Testitilassa (oletus) kutsuu demo.posti.fi:tä, ei laskutusta.
async function createShippingOrder(params) {
    if (!POSTI_GATEWAY_SECRET)
        throw new Error('POSTI_GATEWAY_SECRET puuttuu - Posti-tuki ei ole vielä toimittanut sitä, ks. CLAUDE.md "Lähetysintegraatio"');
    const token = await getAccessToken();
    const payload = {
        printConfig: { target1Media: 'laser-a5' },
        shipment: {
            senderPartners: [{ id: 'POSTI', custNo: POSTI_CONTRACT_NUMBER }],
            sender: toPostiParty(params.sender),
            ...(params.pickupPointQuickId ? { agent: { quickId: params.pickupPointQuickId } } : {}),
            receiver: toPostiParty(params.receiver),
            service: { id: params.serviceId },
            parcels: [{ copies: 1, weight: params.weightKg, packageCode: params.packageCode, contents: params.contents, valuePerParcel: true }],
        },
    };
    const res = await fetch(POSTI_SHIPPING_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'x-gateway-secret': POSTI_GATEWAY_SECRET },
        body: JSON.stringify(payload),
    });
    const text = await res.text();
    if (!res.ok)
        throw new Error(`Posti-lähetyksen luonti epäonnistui: ${res.status} ${text.slice(0, 300)}`);
    const json = JSON.parse(text);
    const shipment = json[0];
    if (!shipment)
        throw new Error('Posti ei palauttanut yhtään lähetystä');
    const trackingNumber = shipment.parcels?.[0]?.parcelNo;
    if (!trackingNumber)
        throw new Error('Posti-vastauksesta puuttuu parcelNo');
    const labelPdfHref = shipment.prints?.[0]?.href ?? null;
    return { shipmentId: shipment.id, trackingNumber, labelPdfHref };
}
// Hakee osoitetarran PDF-tavuina Postin API:sta - href tulee suoraan createShippingOrder():n
// vastauksesta, ei rakenneta itse (ks. Postin oman ohjeen huomautus: "use the URL from the
// response"). Vaatii saman Bearer+x-gateway-secret -parin kuin luonti.
async function fetchLabelPdf(href) {
    if (!POSTI_GATEWAY_SECRET)
        throw new Error('POSTI_GATEWAY_SECRET puuttuu');
    const token = await getAccessToken();
    const res = await fetch(href, { headers: { Authorization: `Bearer ${token}`, 'x-gateway-secret': POSTI_GATEWAY_SECRET } });
    if (!res.ok)
        throw new Error(`Osoitetarran haku epäonnistui: ${res.status}`);
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
}
// ---------------------------------------------------------------------------------------
// Sending Code API - ERI, ERILLINEN Posti-tuote kuin OmaPosti Pro API v2 yllä (vahvistettu
// 2026-09-03, ks. CLAUDE.md "Lähetysintegraatio" + omistajan toimittama "Sending Code API.txt").
// Toimii OLEMASSA OLEVAN trackingNumberin päällä (esim. createShippingOrder():n palauttama
// parcelNo) - palauttaa lyhyen aakkosnumeerisen koodin (6-10 merkkiä) jonka voi kirjoittaa
// käsin pakettiin PDF-tarran SIJAAN. Tämä VAHVISTAA että labelless-tavoite ON saavutettavissa,
// mutta kahdessa erillisessä askeleessa (1. luo lähetys OPP v2:lla, 2. hae koodi Sending Code
// API:lla samalle trackingNumberille) - ei yhdellä kutsulla niin kuin alun perin toivottiin.
//
// EI VIELÄ TESTATTU PÄÄSTÄ PÄÄHÄN: nykyiset OAuth2-tunnukset (rooli "shippingapi") EIVÄT
// sisällä pääsyä tähän - testattu suoraan tuotanto-hostia vasten `x-test-environment: true`
// -otsikolla (Sending Code API:n oma, dokumentoitu turvallinen testimekanismi - API:lla ei ole
// erillistä demo-hostia, ks. sen oma "Environments: Production only"), palautti puhtaan
// `403 Unauthorized`:in suoraan Postin API-tasolta (EI CloudFront-estoa kuten OPP v2:n kanssa,
// eli pyyntö tunnistettiin mutta hylättiin puuttuvan tuote-oikeuden takia). Sama tilannekuvio
// kuin Pickup Point -API:lla - vaatii oman erillisen rekisteröinnin developer.posti.com:ssa,
// ei sisälly automaattisesti "shippingapi"-rooliin.
//
// Käyttää AINA tuotannon POSTI_CLIENT_ID/SECRET:iä (ei POSTI_TEST_MODE-kytkintä), koska tällä
// API:lla ei ole omaa demo-hostia - turvallinen testaus tehdään `x-test-environment`-otsikolla
// tuotanto-hostia VASTEN (dokumentoidusti palauttaa mockattua dataa, ei oikeaa backend-dataa).
const POSTI_SENDING_CODE_TOKEN_URL = 'https://gateway-auth.posti.fi/api/v1/token';
const POSTI_SENDING_CODE_URL = 'https://gateway.posti.fi/2026-04/labelless';
const POSTI_SENDING_CODE_CLIENT_ID = process.env.POSTI_CLIENT_ID || '';
const POSTI_SENDING_CODE_CLIENT_SECRET = process.env.POSTI_CLIENT_SECRET || '';
let cachedSendingCodeToken = null;
async function getSendingCodeAccessToken() {
    if (cachedSendingCodeToken && cachedSendingCodeToken.expiresAt > Date.now() + 30000)
        return cachedSendingCodeToken.value;
    if (!POSTI_SENDING_CODE_CLIENT_ID || !POSTI_SENDING_CODE_CLIENT_SECRET) {
        throw new Error('POSTI_CLIENT_ID/SECRET puuttuu (Sending Code API käyttää aina tuotantotunnuksia, ei testitunnuksia)');
    }
    const res = await fetch(POSTI_SENDING_CODE_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ grant_type: 'client_credentials', client_id: POSTI_SENDING_CODE_CLIENT_ID, client_secret: POSTI_SENDING_CODE_CLIENT_SECRET }),
    });
    if (!res.ok)
        throw new Error(`Sending Code -tokenin haku epäonnistui: ${res.status}`);
    const json = await res.json();
    cachedSendingCodeToken = { value: json.access_token, expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000 };
    return cachedSendingCodeToken.value;
}
// testEnvironment: true lisää x-test-environment-otsikon (palauttaa mockattua dataa oikeasta
// tuotanto-hostista käsin, ks. yllä) - käytä tähän AINA kunnes tuote-oikeus on vahvistettu,
// älä koskaan kutsu ilman tätä ennen kuin joku on eksplisiittisesti testannut oikean vastauksen.
async function getSendingCode(trackingNumber, opts = {}) {
    const token = await getSendingCodeAccessToken();
    const res = await fetch(POSTI_SENDING_CODE_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            ...(opts.testEnvironment ? { 'x-test-environment': 'true' } : {}),
        },
        body: JSON.stringify({
            searchCriteria: { trackingNumber },
            ...(opts.noEdiCheck ? { validation: { noEdiCheck: true } } : {}),
        }),
    });
    const text = await res.text();
    if (!res.ok)
        throw new Error(`Sending Code API epäonnistui: ${res.status} ${text.slice(0, 300)}`);
    const json = JSON.parse(text);
    const code = json.shipments?.[0]?.sendingCode;
    if (!code)
        throw new Error('Sending Code API ei palauttanut koodia');
    return code;
}
