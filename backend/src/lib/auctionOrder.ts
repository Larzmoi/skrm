import { prisma } from '../db/prisma'
import { createPaymentSession } from './paytrail'

const SHIPPING_MERGE_WINDOW_MS = 6 * 60 * 60 * 1000 // 6h yhdistämisikkuna — sama sääntö kuin cart/checkout

// Luo (tai liittää olemassaolevaan, kesken olevaan yhdistettyyn lähetykseen) Order-rivin
// voitetulle huutokaupalle/osta heti -ostokselle. Ilman tätä huutokaupan voittaja ei pääse
// koskaan maksamaan — closeAuctions ja buy-now vain merkitsivät tuotteen myydyksi ja
// lähettivät ilmoituksen "sinulla on aikaa maksaa", mutta Orderia ei koskaan syntynyt.
export async function createOrderForAuctionWin(buyerId: string, sellerId: string, productId: string, price: number, paymentWindowMs: number) {
  const now = new Date()
  const existingOrder = await prisma.order.findFirst({
    where: { buyerId, sellerId, status: 'PENDING_SHIPPING_SELECTION', shippingWindowEnd: { gt: now } },
    orderBy: { createdAt: 'desc' },
  })

  const session = createPaymentSession({ amount: price, orderId: existingOrder?.id ?? 'new', reference: `auction-${productId}-${Date.now()}` })

  if (existingOrder) {
    return prisma.order.update({
      where: { id: existingOrder.id },
      data: {
        productTotal: existingOrder.productTotal + price,
        paytrailPaymentId: session.paymentId,
        items: { create: [{ productId, price, quantity: 1 }] },
      },
    })
  }

  return prisma.order.create({
    data: {
      buyerId, sellerId,
      status: 'PENDING_PAYMENT',
      productTotal: price,
      paytrailPaymentId: session.paymentId,
      paymentDeadline: new Date(now.getTime() + paymentWindowMs),
      shippingWindowEnd: new Date(now.getTime() + SHIPPING_MERGE_WINDOW_MS),
      items: { create: [{ productId, price, quantity: 1 }] },
    },
  })
}
