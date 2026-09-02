"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.webhookReceiver = exports.roomService = exports.LIVEKIT_WS_URL_PUBLIC = exports.RTMP_URL = void 0;
exports.roomNameForSeller = roomNameForSeller;
exports.sellerIdFromRoomName = sellerIdFromRoomName;
exports.getOrCreateStreamKey = getOrCreateStreamKey;
exports.regenerateStreamKey = regenerateStreamKey;
exports.createViewerToken = createViewerToken;
exports.createPublisherToken = createPublisherToken;
const livekit_server_sdk_1 = require("livekit-server-sdk");
const protocol_1 = require("@livekit/protocol");
const prisma_1 = require("../db/prisma");
// Ilman eksplisiittistä video-asetusta LiveKit Ingress transkoodaa oletuksena presetillä
// H264_720P_30FPS_3_LAYERS (1280x720, 1900kbps kattona) — RIIPPUMATTA lähteen (OBS/puhelimen
// RTMP-sovelluksen) oikeasta resoluutiosta, koska RTMP-tulo aina puretaan ja koodataan
// uudelleen. Tämä oli suurin yksittäinen syy raportoituun heikkoon laatuun (ks. CLAUDE.md
// "Uudet löydökset 2026-08-13, osa 5" kohta 23) — katto oli 720p vaikka lähde olisi lähettänyt
// 1080p:tä. 3 kerrosta (simulcast) säilyy, joten heikko mobiiliverkko silti pudottaa laatua
// automaattisesti alaspäin tarpeen mukaan — vain YLÄraja nousee.
const SELLER_INGRESS_VIDEO = new protocol_1.IngressVideoOptions({
    encodingOptions: { case: 'preset', value: protocol_1.IngressVideoEncodingPreset.H264_1080P_30FPS_3_LAYERS },
});
// LiveKit-migraatio 2026-08-09 (ks. CLAUDE.md "PÄÄTÖS 2026-08-09: Vaihto MediaMTX -> LiveKit").
// LIVEKIT_URL on sisäinen (palvelin-SDK, ei julkinen), LIVEKIT_WS_URL on se mitä selain käyttää.
const LIVEKIT_URL = process.env.LIVEKIT_URL || 'http://127.0.0.1:7880';
const LIVEKIT_WS_URL = process.env.LIVEKIT_WS_URL || 'wss://stream.skrm.fi';
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;
exports.RTMP_URL = process.env.RTMP_URL || 'rtmp://stream.skrm.fi/x';
exports.LIVEKIT_WS_URL_PUBLIC = LIVEKIT_WS_URL;
const ingressClient = new livekit_server_sdk_1.IngressClient(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);
exports.roomService = new livekit_server_sdk_1.RoomServiceClient(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);
exports.webhookReceiver = new livekit_server_sdk_1.WebhookReceiver(LIVEKIT_API_KEY, LIVEKIT_API_SECRET);
// Huone on kiinteä per myyjä ("seller-{userId}"), ei per Show — sama periaate kuin vanha
// pysyvä User.streamKey: OBS konfiguroidaan kerran, toimii kaikissa tulevissa lähetyksissä.
// Mikä Show on juuri nyt aktiivinen ratkaistaan edelleen samalla logiikalla kuin ennen
// (myyjän SCHEDULED/LIVE-lähetys), webhookin laukaisemana ingress_started/ingress_ended-
// tapahtumista MediaMTX:n runOnAvailable/runOnUnavailable-shell-hookien sijaan.
function roomNameForSeller(userId) {
    return `seller-${userId}`;
}
function sellerIdFromRoomName(roomName) {
    return roomName.startsWith('seller-') ? roomName.slice('seller-'.length) : null;
}
async function createSellerIngress(userId) {
    const ingress = await ingressClient.createIngress(protocol_1.IngressInput.RTMP_INPUT, {
        name: `seller-${userId}`,
        roomName: roomNameForSeller(userId),
        participantIdentity: userId,
        participantName: 'Myyjä',
        video: SELLER_INGRESS_VIDEO,
    });
    await prisma_1.prisma.user.update({
        where: { id: userId },
        data: { streamKey: ingress.streamKey, livekitIngressId: ingress.ingressId },
    });
    return ingress.streamKey;
}
// Hakee myyjän pysyvän stream keyn, luo Ingressin lazily jos puuttuu. Myyjille joiden Ingress
// on luotu ENNEN 1080p-korjausta (ks. yllä), päivitetään video-asetus paikoilleen tässä ilman
// että streamKey/OBS-konfiguraatio muuttuu — ei vaadi myyjältä mitään toimenpiteitä.
async function getOrCreateStreamKey(userId) {
    const user = await prisma_1.prisma.user.findUnique({ where: { id: userId }, select: { streamKey: true, livekitIngressId: true } });
    if (user?.streamKey && user.livekitIngressId) {
        try {
            await ingressClient.updateIngress(user.livekitIngressId, { name: `seller-${userId}`, video: SELLER_INGRESS_VIDEO });
        }
        catch { }
        return user.streamKey;
    }
    return createSellerIngress(userId);
}
// Mitätöi vanhan Ingressin (jos on) ja luo uuden — vanha avain lakkaa toimimasta heti.
async function regenerateStreamKey(userId) {
    const user = await prisma_1.prisma.user.findUnique({ where: { id: userId }, select: { livekitIngressId: true } });
    if (user?.livekitIngressId) {
        try {
            await ingressClient.deleteIngress(user.livekitIngressId);
        }
        catch { }
    }
    return createSellerIngress(userId);
}
// Katsojan/myyjän esikatselun liittymistoken — vain kuuntelu, ei julkaisuoikeutta (myyjä
// julkaisee OBS:n kautta Ingressin välityksellä, ei suoraan selaimesta).
async function createViewerToken(roomName, identity, name) {
    const at = new livekit_server_sdk_1.AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, { identity, name, ttl: '6h' });
    at.addGrant({ roomJoin: true, room: roomName, canSubscribe: true, canPublish: false, canPublishData: false });
    return at.toJwt();
}
// Suora selainjulkaisu ilman OBS:aa/Ingressiä — myyjän puhelin julkaisee kameransa
// suoraan LiveKitiin WebRTC:llä livekit-client-kirjaston kautta (sama kirjasto joka on
// jo käytössä katsojan puolella). Eri identity kuin Ingressin OBS-osallistuja
// ("seller-{userId}" huoneen participantIdentity on plain userId) jottei synny
// identiteettitörmäystä jos joku käyttää OBS:aa ja puhelinta samaan aikaan.
async function createPublisherToken(roomName, userId, name) {
    const at = new livekit_server_sdk_1.AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, { identity: `${userId}-phone`, name, ttl: '6h' });
    at.addGrant({ roomJoin: true, room: roomName, canSubscribe: true, canPublish: true, canPublishData: false });
    return at.toJwt();
}
