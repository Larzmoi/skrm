// Selauslistojen (/selaa, /huutokaupat) scroll-position tallennus/palautus takaisin-
// navigoinnissa. Kaksi eri juurisyytä paljastui oikealla selaimella testaamalla (ks.
// CLAUDE.md "Etusivu/haku: huutokaupat eivät löytyneet haulla..." 2026-09-13, ja saman
// päivän jatkokorjaus /huutokaupat:lle):
//
// 1. Jatkuva `scroll`-tapahtumankuuntelija ei siivoudu synkronisesti navigoinnin yhteydessä
//    - uuden sivun oma "vieritä ylös" ehtii laueta ja ylikirjoittaa juuri tallennetun
//    sijainnin ennen kuin vanha kuuntelija irtoaa. Ratkaisu: tallenna VAIN klikkaushetkellä.
//
// 2. Sivukohtainen (komponentin oma useEffect:iin sidottu) popstate-kuuntelija ei aina ehdi
//    rekisteröityä ajoissa - jos React purkaa/luo komponentin JUURI popstate-tapahtuman
//    laukaisemana, kuuntelijan piti olla olemassa JO ENNEN tapahtumaa, ei sen jälkeen.
//    Ratkaisu: YKSI globaali kuuntelija joka rekisteröidään ClientLayoutista (pysyy
//    mountattuna koko sovelluksen session ajan, ei minkään yksittäisen sivun elinkaaren
//    mukaan) - toimii riippumatta siitä remounttaako Next.js/React kohdesivun vai ei.

function scrollStorageKey(pathname: string, search: string) {
  return `hb_scroll:${pathname}${search}`
}

// Kutsu tuotekortin/-rivin klikkaushetkellä (onClickCapture, ajoittuu ennen Next.js:n
// Link-navigointia) - EI jatkuvasti kesken selauksen (ks. yllä kohta 1).
export function saveScrollPosition() {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(scrollStorageKey(window.location.pathname, window.location.search), String(window.scrollY))
}

function restoreScrollPosition() {
  const saved = sessionStorage.getItem(scrollStorageKey(window.location.pathname, window.location.search))
  if (!saved) return
  const target = Number(saved)
  let attempts = 0
  const id = setInterval(() => {
    window.scrollTo(0, target)
    attempts++
    if (attempts >= 20 || Math.abs(window.scrollY - target) < 4) clearInterval(id)
  }, 50)
}

// Kutsutaan KERRAN ClientLayoutista (ks. yllä kohta 2) - ei koskaan tarvitse purkaa,
// sivu on olemassa koko selainvälilehden session ajan.
export function initScrollRestore() {
  if (typeof window === 'undefined' || !('scrollRestoration' in window.history)) return
  window.history.scrollRestoration = 'manual'
  window.addEventListener('popstate', restoreScrollPosition)
}
