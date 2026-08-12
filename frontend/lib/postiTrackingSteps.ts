// Vastaa backendin lib/postiService.ts:n POSTI_TRACKING_STEPS-järjestystä (MOCK).
export const POSTI_TRACKING_STEPS = ['RECEIVED', 'IN_TRANSIT', 'AT_PICKUP_POINT', 'PICKED_UP'] as const
export type PostiTrackingStep = typeof POSTI_TRACKING_STEPS[number]

export const POSTI_STEP_LABELS: Record<PostiTrackingStep, string> = {
  RECEIVED: 'Vastaanotettu',
  IN_TRANSIT: 'Kuljetuksessa',
  AT_PICKUP_POINT: 'Noutopisteessä',
  PICKED_UP: 'Noudettu',
}
