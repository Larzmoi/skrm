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
// MOCK-toteutus - ei enää käytä v1-oletusta (ks. `postiClient.ts`, kirjoitettu 2026-09-03
// Postin oman "How to test OmaPosti Pro API v2" -ohjeen ja testitunnusten mukaan, joka on
// OIKEA, testattu (token-taso) integraatio v2:een). Tämä tiedosto pysyy mockina siihen asti
// kunnes `POSTI_GATEWAY_SECRET` saadaan Postilta ja `postiClient.createShippingOrder()` on
// vahvistettu toimivaksi päästä päähän demo-ympäristössä - vasta sen jälkeen tämä korvataan.
//
// ✅ PÄIVITETTY 2026-09-03 Postin oman v2-ohjeen mukaan (ks. CLAUDE.md): service PO2103,
// packageCode "PKT" ja MOCK_OUTPUT_TYPE='label_pdf' ovat nyt VAHVISTETTUJA oikeita arvoja,
// eivät enää arvauksia - poimittu suoraan Postin dokumentoidusta curl-esimerkistä.
exports.POSTI_CUST_NO = '691317'; // tuotannon logistiikkasopimusnumero (Muistikuva Oy), ks. CLAUDE.md - testiympäristön oma on 677503, ks. postiClient.ts
exports.POSTI_PROD_URL = 'https://gateway.posti.fi/shippingapi/api/v2/shipping/order'; // EI vielä käytössä tässä mockissa, vain rakenteen malli - oikea kutsu on postiClient.ts:ssä
// PO2103 VAHVISTETTU 2026-09-03 suoraan Postin omasta curl-esimerkistä (ISO-pakettikoolle).
// PO2102 on yhä vahvistamaton arvaus PIENI-koolle - Postin esimerkki käytti vain yhtä kokoa.
const SERVICE_ID_BY_PAKETTIKOKO = {
    PIENI: 'PO2102',
    ISO: 'PO2103',
};
// "PKT" VAHVISTETTU 2026-09-03 Postin omasta esimerkistä - korvaa aiemmat arvatut
// "PIKKUPAKETTI"/"PAKETTI"-arvot. Esimerkissä sama koodi käytössä painosta riippumatta,
// joten käytetään samaa molemmille kokoluokille kunnes toisin vahvistetaan.
const PACKAGE_CODE_BY_PAKETTIKOKO = {
    PIENI: 'PKT',
    ISO: 'PKT',
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
// ✅ RATKAISTU 2026-09-03 - Postin oma "How to test OmaPosti Pro API v2" -ohje vahvistaa
// vastauksen sisältävän prints[]-taulukon jossa pdf_type:"ADDRESSLABEL" ja shipment.status:
// "PRINTED" - OmaPosti Pro API v2 on siis PUHTAASTI TARRAPOHJAINEN, ei koskaan palauta
// Vinted-tyylistä labelless-koodia. "Sending Code API" (jos sitä ylipäätään tarvitaan) olisi
// eri, erillinen Postin tuote - ei tämän saman kutsun sivutuote. TÄMÄ ON TUOTEPÄÄTÖS, EI VAIN
// TEKNINEN YKSITYISKOHTA: myyjä joutuu tulostamaan ja kiinnittämään fyysisen osoitetarran,
// ei voi enää kirjoittaa koodia käsin pakettiin - kerrottu omistajalle, ei toteutettu UI:hin
// vielä koska POSTI_GATEWAY_SECRET puuttuu eikä oikeaa vastausta ole nähty käytännössä.
const MOCK_OUTPUT_TYPE = 'label_pdf';
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
