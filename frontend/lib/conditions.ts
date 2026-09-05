// Kuntoluokitukset — jaettu lähde lomakkeelle, bulkkituonnille JA suodattimille, ettei
// samalle asialle voi koskaan syntyä kahta eri koodausta (ks. CLAUDE.md "Kuntoluokitus
// Cardmarket-muotoon irtokorteille 2026-09-01"). Tallennettava arvo on lyhenne.
//
// Puolikunnot (+/-) lisätty 2026-09-05 (ks. CLAUDE.md "WhatsApp-palaute 2026-09-02" kohta 1,
// omistajan/myyjien pyyntö) keskimmäisille asteille — M ja PO eivät tarvitse tarkennusta
// (ei ole "parempaa kuin Mint" tai "huonompaa kuin Poor"). Puhtaasti ADDITIIVINEN lisäys:
// vanhat seitsemän tunnusta (M/NM/EX/GD/LP/PL/PO) pysyvät muuttumattomina, jo tallennettu data
// on yhä validia. Bulkkiparserin validointi (dashboard/tuotteet) käyttää tätä samaa taulukkoa,
// joten uudet tunnukset tulevat automaattisesti hyväksytyiksi ilman erillistä muutosta sinne.
export const CARDMARKET_KUNTOLUOKAT = [
  { id: 'M', nimi: 'Mint (M)' },
  { id: 'NM+', nimi: 'Near Mint+ (NM+)' },
  { id: 'NM', nimi: 'Near Mint (NM)' },
  { id: 'NM-', nimi: 'Near Mint- (NM-)' },
  { id: 'EX+', nimi: 'Excellent+ (EX+)' },
  { id: 'EX', nimi: 'Excellent (EX)' },
  { id: 'EX-', nimi: 'Excellent- (EX-)' },
  { id: 'GD+', nimi: 'Good+ (GD+)' },
  { id: 'GD', nimi: 'Good (GD)' },
  { id: 'GD-', nimi: 'Good- (GD-)' },
  { id: 'LP', nimi: 'Light Played (LP)' },
  { id: 'PL', nimi: 'Played (PL)' },
  { id: 'PO', nimi: 'Poor (PO)' },
]

// Gradattujen korttien (tyyppi === "slabit") luokitusyhtiöt — ei tarvitse kääntää, kaikki
// ovat vakiintuneita kansainvälisiä lyhenteitä. Ks. CLAUDE.md "WhatsApp-palaute 2026-09-02"
// kohta 1 (Product.gradingCompany/grade, eri asia kuin yllä oleva geneerinen/Cardmarket-asteikko).
export const GRADING_COMPANIES = ['PSA', 'BGS', 'CGC', 'SGC', 'Muu']
