import { prisma } from '../db/prisma'
import { notifyUser } from '../lib/notify'

// Sulkee päättyneet perinteiset (ei-live) huutokaupat: merkitsee myydyksi jos varaushinta täyttyi,
// palauttaa muuten myyntiin. Ajetaan minuutin välein index.ts:ssä tarkkuuden vuoksi.
export async function closeExpiredAuctions() {
  const now = new Date()

  const expired = await prisma.product.findMany({
    where: { saleType: 'auction', status: 'PENDING', auctionEndsAt: { lte: now } },
  })

  for (const product of expired) {
    if (product.currentBidderId && product.currentBid) {
      const reserveMet = !product.reservePrice || product.currentBid >= product.reservePrice

      if (reserveMet) {
        await prisma.product.update({
          where: { id: product.id },
          data: { status: 'SOLD', finalPrice: product.currentBid },
        })
        await notifyUser(product.currentBidderId, 'ORDER_WON', 'Voitit huutokaupan!', `Voitit tuotteen ${product.name} hinnalla ${product.currentBid}€. Sinulla on 2h aikaa maksaa.`, `/huutokauppa/${product.id}`)
        await notifyUser(product.sellerId, 'AUCTION_SOLD', 'Tuotteesi myytiin!', `${product.name} myytiin hinnalla ${product.currentBid}€`, '/dashboard/tuotteet')
      } else {
        await prisma.product.update({
          where: { id: product.id },
          data: { status: 'PENDING', auctionEndsAt: null, currentBid: null, currentBidderId: null },
        })
        await notifyUser(product.sellerId, 'AUCTION_ENDED', 'Varaushinta ei täyttynyt', `${product.name} huutokauppa päättyi ilman voittajaa — varaushinta ei täyttynyt.`, '/dashboard/tuotteet')
      }
    } else {
      await prisma.product.update({
        where: { id: product.id },
        data: { status: 'PENDING', auctionEndsAt: null },
      })
      await notifyUser(product.sellerId, 'AUCTION_ENDED', 'Huutokauppa päättyi ilman huutoja', `${product.name} ei saanut huutoja.`, '/dashboard/tuotteet')
    }
  }

  return expired.length
}
