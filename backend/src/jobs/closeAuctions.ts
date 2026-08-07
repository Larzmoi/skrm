import { prisma } from '../db/prisma'
import { notifyUser } from '../lib/notify'
import { createOrderForAuctionWin } from '../lib/auctionOrder'

// Perinteinen huutokauppa voi päättyä milloin vain kellonajasta riippumatta (esim. yöllä) —
// voittaja ei ole aktiivisesti läsnä kuten live-huudossa tai osta heti -ostoksessa, joten
// maksuaika on tavallista 2h pidempi. Päätetty tietoisesti LUKITTU-säännöstä poiketen.
const AUCTION_PAYMENT_WINDOW_MS = 24 * 60 * 60 * 1000

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
        await createOrderForAuctionWin(product.currentBidderId, product.sellerId, product.id, product.currentBid, AUCTION_PAYMENT_WINDOW_MS)
        await notifyUser(product.currentBidderId, 'ORDER_WON', 'Voitit huutokaupan!', `Voitit tuotteen ${product.name} hinnalla ${product.currentBid}€. Sinulla on 24h aikaa maksaa.`, '/ostot')
        await notifyUser(product.sellerId, 'AUCTION_SOLD', 'Tuotteesi myytiin!', `${product.name} myytiin hinnalla ${product.currentBid}€`, '/dashboard/tilaukset')
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
