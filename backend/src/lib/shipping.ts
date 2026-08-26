export interface PakettikokoOption {
  id: string
  nimi: string
  hinta: number
}

// Sama taulukko kuin frontend/app/dashboard/tuotteet/page.tsx:n PAKETTIKOOT — hinta lasketaan
// aina täältä palvelinpuolella, ei luoteta clientin lähettämään hintaan.
export const PAKETTIKOOT: PakettikokoOption[] = [
  { id: 'postitus', nimi: 'Postitus 6,9€', hinta: 6.90 },
  { id: 'nouto', nimi: 'Nouto myyjältä', hinta: 0 },
]

export function getShippingPrice(pakettikokoId: string): number | null {
  const match = PAKETTIKOOT.find(p => p.id === pakettikokoId)
  return match ? match.hinta : null
}
