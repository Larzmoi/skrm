// TODO: oikea Paytrail-integraatio kun sopimus on kunnossa.
// Tämä on tilapäinen korvike joka mahdollistaa koko ostoskori/tilausvirran
// rakentamisen ja testaamisen ilman oikeaa maksupalvelua. Reitit jotka
// tässä vaiheessa "maksavat" tilauksen kutsuvat POST /orders/:id/mock-pay
// sen sijaan että Paytrail oikeasti veloittaisi ostajaa.

interface PaymentSession {
  paymentId: string
  redirectUrl: string
}

export function createPaymentSession(params: { amount: number; orderId: string; reference: string }): PaymentSession {
  return {
    paymentId: `MOCK-${params.orderId}-${Date.now()}`,
    redirectUrl: `/ostot?mockPayment=${params.orderId}`,
  }
}
