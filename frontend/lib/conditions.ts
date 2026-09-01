// Kuntoluokitukset — jaettu lähde lomakkeelle, bulkkituonnille JA suodattimille, ettei
// samalle asialle voi koskaan syntyä kahta eri koodausta (ks. CLAUDE.md "Kuntoluokitus
// Cardmarket-muotoon irtokorteille 2026-09-01"). Tallennettava arvo on lyhenne.
export const CARDMARKET_KUNTOLUOKAT = [
  { id: 'M', nimi: 'Mint (M)' },
  { id: 'NM', nimi: 'Near Mint (NM)' },
  { id: 'EX', nimi: 'Excellent (EX)' },
  { id: 'GD', nimi: 'Good (GD)' },
  { id: 'LP', nimi: 'Light Played (LP)' },
  { id: 'PL', nimi: 'Played (PL)' },
  { id: 'PO', nimi: 'Poor (PO)' },
]
