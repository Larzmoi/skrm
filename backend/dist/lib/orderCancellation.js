"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildStockRestoreOps = buildStockRestoreOps;
const prisma_1 = require("../db/prisma");
function buildStockRestoreOps(order) {
    return [
        prisma_1.prisma.order.update({ where: { id: order.id }, data: { status: 'CANCELLED' } }),
        // Huutokauppatuote ei palaa PENDING-tilaan (auctionEndsAt on jo mennyt — closeAuctions
        // poimisi sen heti uudelleen ja yrittäisi ilmoittaa samalle voittajalle loputtomasti).
        // Merkitään lopullisesti myymättömäksi, myyjä listaa uudestaan manuaalisesti jos haluaa.
        ...order.items.map(item => item.product.saleType === 'auction'
            ? prisma_1.prisma.product.update({
                where: { id: item.productId },
                data: { status: 'UNSOLD', finalPrice: null, currentBid: null, currentBidderId: null, auctionEndsAt: null },
            })
            : prisma_1.prisma.product.update({
                where: { id: item.productId },
                data: { quantity: { increment: item.quantity }, status: 'PENDING', finalPrice: null },
            })),
    ];
}
