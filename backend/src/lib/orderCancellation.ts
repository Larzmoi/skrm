// Jaettu tilauksen peruutus-/varastonpalautuslogiikka, käyttää sekä 2h-maksuajan umpeutumisen
// (webhooks.ts checkExpiredPayments — LISÄÄ myös PaymentViolationin/bannin, koska umpeutuminen on
// LUKITTU-säännön mukainen rike) että ostajan oman vapaaehtoisen peruutuksen (orders.ts POST
// /:id/cancel — EI koskaan PaymentViolationia/bannia, koska ostaja on rehellisesti kertonut ettei
// aio maksaa sen sijaan että vain jättäisi reagoimatta). Sama Prisma-transaktio-osien rakennus
// kummassakin, jotta kahta hieman eri kirjoitettua kopiota ei ajaudu eriytymään toisistaan ajan myötä.
import { Prisma } from '@prisma/client'
import { prisma } from '../db/prisma'

export function buildStockRestoreOps(order: {
  id: string
  items: { productId: string; quantity: number; product: { saleType: string } }[]
}): Prisma.PrismaPromise<unknown>[] {
  return [
    prisma.order.update({ where: { id: order.id }, data: { status: 'CANCELLED' } }),
    // Huutokauppatuote ei palaa PENDING-tilaan (auctionEndsAt on jo mennyt — closeAuctions
    // poimisi sen heti uudelleen ja yrittäisi ilmoittaa samalle voittajalle loputtomasti).
    // Merkitään lopullisesti myymättömäksi, myyjä listaa uudestaan manuaalisesti jos haluaa.
    ...order.items.map(item => item.product.saleType === 'auction'
      ? prisma.product.update({
          where: { id: item.productId },
          data: { status: 'UNSOLD', finalPrice: null, currentBid: null, currentBidderId: null, auctionEndsAt: null },
        })
      : prisma.product.update({
          where: { id: item.productId },
          data: { quantity: { increment: item.quantity }, status: 'PENDING', finalPrice: null },
        })
    ),
  ]
}
