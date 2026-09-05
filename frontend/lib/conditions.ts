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

// Gradattujen korttien (tyyppi === "slabit") luokitusyhtiöt — ei tarvitse kääntää, kaikki
// ovat vakiintuneita kansainvälisiä lyhenteitä. Ks. CLAUDE.md "WhatsApp-palaute 2026-09-02"
// kohta 1 (Product.gradingCompany/grade, eri asia kuin yllä oleva geneerinen/Cardmarket-asteikko).
export const GRADING_COMPANIES = ['PSA', 'BGS', 'CGC', 'SGC', 'Muu']
