export interface PakettikokoOption {
  id: string
  nimi: string
  hinta: number
}

// Sama taulukko kuin frontend/app/dashboard/tuotteet/page.tsx:n PAKETTIKOOT — hinta lasketaan
// aina täältä palvelinpuolella, ei luoteta clientin lähettämään hintaan.
export const PAKETTIKOOT: PakettikokoOption[] = [
  { id: 'xxs', nimi: 'Pikkupaketti (XXS)', hinta: 9.90 },
  { id: 's', nimi: 'S-paketti', hinta: 11.90 },
  { id: 'm', nimi: 'M-paketti', hinta: 13.90 },
  { id: 'l', nimi: 'L-paketti', hinta: 18.90 },
  { id: 'xl', nimi: 'XL-paketti', hinta: 24.90 },
  { id: 'xxl', nimi: 'XXL-paketti', hinta: 46.90 },
  { id: 'nouto', nimi: 'Nouto myyjältä', hinta: 0 },
]

export function getShippingPrice(pakettikokoId: string): number | null {
  const match = PAKETTIKOOT.find(p => p.id === pakettikokoId)
  return match ? match.hinta : null
}
