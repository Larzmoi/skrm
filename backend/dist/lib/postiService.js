"use strict";
// Lähetyksen LUONTI (createShipment/getShipmentOutput, ent. tässä tiedostossa) siirtyi
// `postiClient.ts`:ään 2026-09-04, kun se vahvistettiin toimivaksi päästä päähän demo-
// ympäristössä ja kytkettiin live-reitille (`POST /orders/:id/create-shipment`, ks.
// routes/orders.ts + CLAUDE.md "Lähetysintegraatio"). Tämä tiedosto sisältää enää sen osan
// jota ei ole vielä korvattu oikealla Postin API:lla - toimitusseurannan tila (Tracking API
// ei ole vielä integroitu, ks. CLAUDE.md "Tekemättä").
Object.defineProperty(exports, "__esModule", { value: true });
exports.POSTI_TRACKING_STEPS = void 0;
exports.getTrackingStatus = getTrackingStatus;
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
