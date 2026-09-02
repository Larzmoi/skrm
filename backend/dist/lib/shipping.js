"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PAKETTIKOOT = void 0;
exports.getShippingPrice = getShippingPrice;
// Sama taulukko kuin frontend/app/dashboard/tuotteet/page.tsx:n PAKETTIKOOT — hinta lasketaan
// aina täältä palvelinpuolella, ei luoteta clientin lähettämään hintaan.
exports.PAKETTIKOOT = [
    { id: 'postitus', nimi: 'Postitus 6,9€', hinta: 6.90 },
    { id: 'nouto', nimi: 'Nouto myyjältä', hinta: 0 },
];
function getShippingPrice(pakettikokoId) {
    const match = exports.PAKETTIKOOT.find(p => p.id === pakettikokoId);
    return match ? match.hinta : null;
}
