"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.POSTI_TRACKING_STEPS = exports.POSTI_PROD_URL = exports.POSTI_CUST_NO = void 0;
exports.buildShippingOrderRequest = buildShippingOrderRequest;
exports.createShipment = createShipment;
exports.getShipmentOutput = getShipmentOutput;
exports.getTrackingStatus = getTrackingStatus;
const crypto_1 = __importDefault(require("crypto"));
// MOCK-toteutus, rakennettu OmaPosti Pro API:n VAHVISTETUN skeeman mukaan (ks. CLAUDE.md
// "Lähetysintegraatio" -osion "✅ VAHVISTUS 2026-08-26" ja "Eteneminen 2026-08-26"). Pyyntö
// rakennetaan tarkalleen oikeaan JSON-muotoon (sender/receiver/senderPartners/service/
// parcels/agent.quickId) mutta ei vielä lähetetä minnekään - kun oikea API-avain/
// testiympäristö saadaan Postilta (LogEDI@posti.com), ainoa muutos on HTTP-kutsun
// lisääminen näiden funktioiden sisään, ei kutsujan koodi eikä datan muoto.
exports.POSTI_CUST_NO = '691317'; // logistiikkasopimusnumero (Muistikuva Oy), ks. CLAUDE.md
exports.POSTI_PROD_URL = 'https://gateway.posti.fi/shippingapi/api/v1/shipping/order'; // EI vielä käytössä, vain rakenteen malli
// Postin palvelumatriisista (posti.fi/en/for-businesses/service-channels/service-matrix)
// pitäisi valita oikeat palvelukoodit - ei vielä tehty (ks. CLAUDE.md "Eteneminen
// 2026-08-26", avoin kohta). Nämä ovat PAIKKAMERKKEJÄ jotka näyttävät oikealta muodolta,
// eivät vahvistettuja oikeita koodeja - päivitä kun palvelukoodi on valittu.
const SERVICE_ID_BY_PAKETTIKOKO = {
    PIENI: 'PO2102',
    ISO: 'PO2103',
};
const PACKAGE_CODE_BY_PAKETTIKOKO = {
    PIENI: 'PIKKUPAKETTI',
    ISO: 'PAKETTI',
};
const WEIGHT_KG_BY_PAKETTIKOKO = {
    PIENI: 1,
    ISO: 5,
};
function toParty(p) {
    return {
        name: p.name || 'Tuntematon',
        streetAddress: p.streetAddress || '',
        postalCode: p.postalCode || '',
        city: p.city || '',
        countryCode: p.countryCode ?? 'FI',
        ...(p.phone ? { phone: p.phone } : {}),
        ...(p.email ? { email: p.email } : {}),
    };
}
function buildShippingOrderRequest(params) {
    return {
        shipment: {
            sender: toParty(params.sender),
            receiver: toParty(params.receiver),
            senderPartners: [{ id: 'POSTI', custNo: exports.POSTI_CUST_NO }],
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
    };
}
function randomDigits(length) {
    let out = '';
    for (let i = 0; i < length; i++)
        out += crypto_1.default.randomInt(0, 10);
    return out;
}
function randomHex(length) {
    const chars = '0123456789ABCDEF';
    let out = '';
    for (let i = 0; i < length; i++)
        out += chars[crypto_1.default.randomInt(0, chars.length)];
    return out;
}
// Vastine POST /shipping/order:lle. Palauttaa parcels[].parcelNo:n (= trackingNumber) ja
// lähetyksen oman tunnisteen. Oikea API:n vastaus sisältää myös pdfs[]-taulukon, mutta se
// haetaan tässä erikseen getShipmentOutput()-funktiolla (ks. sen oma kommentti miksi
// eriytetty) - ei sidota tähän kutsuun.
function createShipment(params) {
    const request = buildShippingOrderRequest(params);
    const trackingNumber = `JJFI${randomDigits(17)}`;
    const shipmentId = `MOCK${randomHex(12)}`;
    return { shipmentId, trackingNumber, request };
}
// ⚠️ Vaihda tämä kun Posti vastaa avoimeen kysymykseen (ks. CLAUDE.md "AVOIN KYSYMYS,
// selvitettävä Postilta ennen koodausta") - kumpaa muotoa lähetys oikeasti näytetään
// myyjälle/ostajalle. 'code' vastaa tavoiteltua Vinted-tyylistä labelless-virtaa,
// 'label_pdf' sitä että OmaPosti Pro API on puhtaasti tarrapohjainen. Koko UI
// (dashboard/tilaukset, ostot) tukee jo molempia yhtä hyvin - tämän arvon vaihtaminen on
// AINOA koodimuutos joka tarvitaan kumpaan tahansa vastaukseen.
const MOCK_OUTPUT_TYPE = 'code';
// Erillinen kutsu createShipment():sta, koska emme vielä tiedä palauttaako Posti koodin/
// tarran suoraan luontivastauksessa vai vaatiiko se oman hakukutsun (esim. Sending Code
// API erikseen trackingNumberilla, ks. CLAUDE.md kohta 3 "API:t ja tarkat endpointit").
// Pitämällä nämä erillään vaihto oikeaan API:in ei vaadi createShipmentin omaa rakennetta
// muutettavaksi kumpaan suuntaan tahansa kysymys ratkeaa.
function getShipmentOutput(shipmentId, trackingNumber) {
    if (MOCK_OUTPUT_TYPE === 'label_pdf') {
        // Oikeassa API:ssa linkki vaatii saman API-avaimen autentikoinnin ja on voimassa 1h
        // (ks. CLAUDE.md) - mockissa pelkkä esimerkkiosoite, ei oikeasti toimiva PDF.
        return { type: 'label_pdf', url: `https://mock-posti.local/labels/${shipmentId}.pdf` };
    }
    // Labelless-koodi: 6 merkkiä, numerot 0-9 + kirjaimet A-F (Sending Code API:n dokumentoitu
    // muoto) - deterministinen samalle trackingNumberille, ei satunnainen joka kutsulla,
    // koska oikeakin API palauttaisi saman jo luodun koodin uudestaan.
    const chars = '0123456789ABCDEF';
    let seed = 0;
    for (const ch of trackingNumber)
        seed = (seed * 31 + ch.charCodeAt(0)) % 1000000;
    let code = '';
    let n = seed;
    for (let i = 0; i < 6; i++) {
        code += chars[n % 16];
        n = Math.floor(n / 16) + i * 7;
    }
    return { type: 'code', value: code };
}
// Kanoninen järjestys - jaettu frontendin kanssa seurantanäkymän askelten piirtoon.
exports.POSTI_TRACKING_STEPS = ['RECEIVED', 'IN_TRANSIT', 'AT_PICKUP_POINT', 'PICKED_UP'];
// Vastine Tracking API:lle - staattinen esimerkkitila, ei oikeaa reaaliaikaista Posti-dataa.
// Etenee ajan kuluessa lähetyksen luontihetkestä (shippedAt) demoa/testausta varten, jotta
// koko UI-virta on nähtävissä toiminnassa ilman että kukaan käy manuaalisesti muuttamassa tilaa.
function getTrackingStatus(trackingNumber, shippedAt) {
    const hoursElapsed = (Date.now() - shippedAt.getTime()) / (1000 * 60 * 60);
    let status = 'RECEIVED';
    if (hoursElapsed >= 36)
        status = 'PICKED_UP';
    else if (hoursElapsed >= 20)
        status = 'AT_PICKUP_POINT';
    else if (hoursElapsed >= 2)
        status = 'IN_TRANSIT';
    return { trackingNumber, status };
}
