'use client'
import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { useTheme } from '@/lib/theme-context'
import { useLang } from '@/lib/lang-context'
import { useAuth } from '@/lib/auth-context'
import { useCart } from '@/lib/cart-context'
import { cartApi, orderApi, postiApi, PickupPoint, sortPickupPointsByProximity } from '@/lib/api'
import { computeProcessingFeeEuros } from '@/lib/pakettikoot'

function timeLeftLabel(ms: number) {
  if (ms <= 0) return '0:00'
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

export default function KoriPage() {
  const { C } = useTheme()
  const { t } = useLang()
  const { user } = useAuth()
  const router = useRouter()
  const { groups, pakettikoot, loading, refresh } = useCart()
  const [now, setNow] = useState(Date.now())
  const [selectedSize, setSelectedSize] = useState<Record<string, string>>({})
  const [selectedPickupPoint, setSelectedPickupPoint] = useState<Record<string, string>>({})
  const [payingAll, setPayingAll] = useState(false)
  const [notice, setNotice] = useState('')
  const [pickupPoints, setPickupPoints] = useState<PickupPoint[]>([])
  const [pickupSearch, setPickupSearch] = useState('')

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  // Haetaan kerran, jaettu kaikille myyjäryhmille - ks. CLAUDE.md "48H JULKAISUPAINE" 2026-09-04
  useEffect(() => {
    postiApi.pickupPoints().then(setPickupPoints).catch(() => {})
  }, [])

  // Lähimmät ensin (ostajan oman postinumeron mukaan) + hakusuodatus - ks. CLAUDE.md
  // "Iso testauskierros" kohta 2 (koko maan noutopistelista on nyt ~3300 pistettä, ei enää
  // pelkkä pääkaupunkiseutu, joten haku/järjestys on tarpeen että lista on käytännössä käytettävä).
  const sortedPickupPoints = useMemo(() => sortPickupPointsByProximity(pickupPoints, user?.postalCode), [pickupPoints, user?.postalCode])
  const filteredPickupPoints = useMemo(() => {
    const q = pickupSearch.trim().toLowerCase()
    if (!q) return sortedPickupPoints
    return sortedPickupPoints.filter(p => p.name.toLowerCase().includes(q) || p.city.toLowerCase().includes(q) || p.address.toLowerCase().includes(q) || p.postalCode.includes(q))
  }, [sortedPickupPoints, pickupSearch])

  // Jos jokin live-tuote vanhenee, päivitetään kori (backend siivoaa lennossa)
  useEffect(() => {
    const anyExpired = groups.some(g => g.items.some(i => i.expiresAt && new Date(i.expiresAt).getTime() <= now))
    if (anyExpired) {
      setNotice(t.kori.liveExpiredNotice)
      refresh()
      setTimeout(() => setNotice(''), 5000)
    }
  }, [now, groups, refresh])

  // Ryhmän (= tulevan Orderin) todella tarjolla olevat toimitustavat — jos yksikin ryhmän
  // tuote on rajannut jommankumman pois, sitä ei näytetä vaihtoehtona ollenkaan (ks. CLAUDE.md
  // "Kaksi UX-löydöstä 2026-09-02" kohta 2). Backendin select-shipping ei validoi tätä erikseen
  // (tarkoituksella, ks. sama osio) — rajaus tapahtuu tässä, näyttämällä vain sallitut vaihtoehdot.
  function optionsFor(group: { allowShipping: boolean; allowPickup: boolean }) {
    return pakettikoot.filter(p => (p.id === 'postitus' ? group.allowShipping : p.id === 'nouto' ? group.allowPickup : true))
  }

  function sizeFor(group: { sellerId: string; suggestedPakettikoko: string | null; allowShipping: boolean; allowPickup: boolean }) {
    const options = optionsFor(group)
    const chosen = selectedSize[group.sellerId]
    if (chosen && options.some(o => o.id === chosen)) return chosen
    if (group.suggestedPakettikoko && options.some(o => o.id === group.suggestedPakettikoko)) return group.suggestedPakettikoko
    return options[0]?.id ?? ''
  }

  function shippingPriceFor(group: { sellerId: string; suggestedPakettikoko: string | null; allowShipping: boolean; allowPickup: boolean }) {
    const id = sizeFor(group)
    return pakettikoot.find(p => p.id === id)?.hinta ?? 0
  }

  // Yhdistetty ostoskorimaksu (ks. CLAUDE.md "Yhdistetty ostoskorimaksu" 2026-09-11) - kaikki
  // myyjäryhmät maksetaan YHDELLÄ Stripe Checkout Sessionilla yhden "Maksa kaikki" -painalluksen
  // takaa, korvaa aiemmat per-myyjä "Maksa"-napit. Käy ryhmät läpi PERÄKKÄIN (ei rinnakkain) -
  // yksinkertaisempi virheenkäsittely, ei riskiä että jaetun ostoskorin poisto-transaktiot
  // (ks. backend/cart.ts checkout) törmäisivät keskenään.
  async function payAll() {
    setPayingAll(true)
    setNotice('')
    try {
      const orderIds: string[] = []
      for (const group of groups) {
        const pakettikokoId = sizeFor(group)
        if (!pakettikokoId) throw new Error(t.kori.deliveryConflict)
        // Tuote ja toimitus maksetaan aina yhdessä, samaan tapaan kuin ennenkin per myyjä - vain
        // itse maksun aloitus (viimeinen rivi tämän silmukan jälkeen) yhdistyy nyt yhdeksi
        // Stripe Checkout Sessioniksi kaikille myyjille kerralla.
        const { order } = await cartApi.checkout(group.sellerId)
        await orderApi.selectShipping(order.id, pakettikokoId, pakettikokoId === 'postitus' ? selectedPickupPoint[group.sellerId] : undefined)
        orderIds.push(order.id)
      }
      const { redirectUrl } = await orderApi.payMultiple(orderIds)
      if (redirectUrl) {
        // Ulkoinen Stripe Checkout -osoite - koko sivun navigointi, ei Next.js-routeria
        window.location.href = redirectUrl
        return
      }
      await refresh()
      router.push('/ostot')
    } catch (e: any) {
      setNotice(e.message ?? t.kori.payFailed)
      setTimeout(() => setNotice(''), 5000)
    }
    setPayingAll(false)
  }

  async function removeItem(itemId: string) {
    try {
      await cartApi.remove(itemId)
      await refresh()
    } catch {}
  }

  const grandTotal = groups.reduce((sum, g) => {
    const sub = g.total + shippingPriceFor(g)
    return sum + sub + computeProcessingFeeEuros(sub)
  }, 0)
  const totalItems = groups.reduce((sum, g) => sum + g.items.length, 0)
  // "Maksa kaikki" estetään jos MIKÄ TAHANSA ryhmä on aidosti ristiriitainen (ks. options.length
  // === 0 -kommentti alla) - ei voi muodostaa yhtenäistä maksua jos yksikin Order jäisi ilman
  // kelvollista toimitustapaa.
  const hasDeliveryConflict = groups.some(g => optionsFor(g).length === 0)

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'transparent' }}>
      <Navbar />
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 24px', flex: 1, width: '100%', boxSizing: 'border-box' }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text, marginBottom: 24 }}>{t.kori.title}</h1>

        {notice && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: '#EF4444', fontSize: 13 }}>{notice}</div>}

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: C.muted }}>{t.auth.loading}</div>
        ) : groups.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: C.text, marginBottom: 8 }}>{t.kori.empty}</div>
            <Link href="/selaa" style={{ background: C.accentSolid, color: C.accentText, padding: '10px 24px', borderRadius: 8, fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>
              {t.kori.browseProducts}
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {groups.map(group => {
              const options = optionsFor(group)
              const size = sizeFor(group)
              const shippingPrice = shippingPriceFor(group)
              return (
                <div key={group.sellerId} style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 12, padding: '18px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: C.accentSolid, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: C.accentText }}>
                      {group.seller.name?.[0]?.toUpperCase()}
                    </div>
                    <Link href={`/u/${group.seller.username}`} style={{ fontSize: 14, fontWeight: 700, color: C.text, textDecoration: 'none' }}>{group.seller.name}</Link>
                    <span style={{ fontSize: 12, color: C.muted }}>@{group.seller.username}</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
                    {group.items.map(item => {
                      const remaining = item.expiresAt ? new Date(item.expiresAt).getTime() - now : null
                      const isUrgent = remaining !== null && remaining < 30 * 60 * 1000
                      return (
                        <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 44, height: 44, borderRadius: 7, overflow: 'hidden', flexShrink: 0, background: C.surface, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {item.imageUrl ? <img src={item.imageUrl} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ color: C.dim }}>+</span>}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {item.name}{item.quantity > 1 ? ` × ${item.quantity}` : ''}
                            </div>
                            {remaining !== null && (
                              <div style={{ fontSize: 11, fontWeight: 700, color: isUrgent ? '#EF4444' : C.muted }}>
                                {remaining > 0 ? `${t.kori.liveTimeLeft} ${timeLeftLabel(remaining)}` : t.kori.timeUp}
                              </div>
                            )}
                          </div>
                          <div style={{ fontSize: 14, fontWeight: 800, color: C.text, flexShrink: 0 }}>{(item.price * item.quantity).toLocaleString('fi-FI')}€</div>
                          <button onClick={() => removeItem(item.id)} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 16, flexShrink: 0 }}>✕</button>
                        </div>
                      )
                    })}
                  </div>

                  {options.length === 0 ? (
                    // Aidosti ristiriitainen ryhmä: yksi tuote sallii vain postituksen, toinen
                    // vain noudon, samassa myyjän 6h-yhdistämisikkunassa - harvinainen reunatapaus,
                    // ei estä maksamista (backend ei vaadi validointia tähän, ks. CLAUDE.md), mutta
                    // kerrotaan ostajalle miksi eikä näytetä tyhjää pudotusvalikkoa selittämättä.
                    <div style={{ fontSize: 12, color: '#EF4444', marginBottom: 12 }}>{t.kori.deliveryConflict}</div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: size === 'postitus' ? 8 : 12 }}>
                      <label style={{ fontSize: 12, color: C.muted, flexShrink: 0 }}>{t.product.delivery}</label>
                      <select value={size} onChange={e => setSelectedSize(s => ({ ...s, [group.sellerId]: e.target.value }))} style={{ flex: 1, minWidth: 0, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 6, padding: '7px 10px', fontSize: 13, color: C.text, boxSizing: 'border-box' as const }}>
                        {options.map(p => <option key={p.id} value={p.id}>{p.nimi} {p.hinta > 0 ? `— ${p.hinta.toLocaleString('fi-FI')}€` : t.kori.free}</option>)}
                      </select>
                    </div>
                  )}

                  {size === 'postitus' && (
                    // Noutopiste - oikea Postin Pickup Point -lista, koko maa (~3300 pistettä,
                    // ks. lib/api.ts postiApi.pickupPoints, CLAUDE.md "Iso testauskierros" kohta 2).
                    // p.id vastaa OmaPosti Pro API:n shipment.agent.quickId-kenttää lähetystä
                    // luotaessa. minWidth:0 flex-lapsessa - ilman sitä <select> ei suostu
                    // kutistumaan flex:1-tilaansa pitkien noutopistenimien takia ja laatikko
                    // jatkuu näytön ulkopuolelle mobiilissa (sama laatikko kuin yllä, mutta
                    // yläpuolisen postitus/nouto-valinnan lyhyt teksti ei koskaan paljastanut
                    // samaa flexbox-bugia).
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                        <label style={{ fontSize: 12, color: C.muted, flexShrink: 0 }}>Noutopiste</label>
                        <select value={selectedPickupPoint[group.sellerId] ?? ''} onChange={e => setSelectedPickupPoint(s => ({ ...s, [group.sellerId]: e.target.value }))} style={{ flex: 1, minWidth: 0, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 6, padding: '7px 10px', fontSize: 13, color: C.text, boxSizing: 'border-box' as const }}>
                          <option value="">Valitse noutopiste...</option>
                          {filteredPickupPoints.map(p => <option key={p.id} value={p.id}>{p.name} — {p.city}</option>)}
                        </select>
                      </div>
                      <input
                        value={pickupSearch}
                        onChange={e => setPickupSearch(e.target.value)}
                        placeholder="Hae noutopistettä (kaupunki, postinumero, nimi)..."
                        style={{ width: '100%', boxSizing: 'border-box' as const, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 6, padding: '6px 10px', fontSize: 12, color: C.text }}
                      />
                    </div>
                  )}

                  <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
                    <div style={{ fontSize: 13, color: C.muted }}>
                      {t.kori.products} {group.total.toLocaleString('fi-FI')}€ + {t.kori.shipping} {shippingPrice.toLocaleString('fi-FI')}€ + {t.kori.processingFee} {computeProcessingFeeEuros(group.total + shippingPrice).toLocaleString('fi-FI')}€
                      <div style={{ fontSize: 16, fontWeight: 800, color: C.text }}>{(group.total + shippingPrice + computeProcessingFeeEuros(group.total + shippingPrice)).toLocaleString('fi-FI')}€</div>
                    </div>
                  </div>
                </div>
              )
            })}

            <div style={{ background: C.surface, borderRadius: 10, padding: '16px 20px', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 14 }}>
              <div>
                <span style={{ fontSize: 13, color: C.muted, display: 'block' }}>{t.kori.total} ({totalItems} {t.kori.items}, {t.kori.allSellers})</span>
                <span style={{ fontSize: 20, fontWeight: 900, color: C.text }}>{grandTotal.toLocaleString('fi-FI')}€</span>
              </div>
              <button onClick={payAll} disabled={payingAll || hasDeliveryConflict} style={{ background: C.accentSolid, color: C.accentText, border: 'none', padding: '12px 26px', borderRadius: 8, fontWeight: 700, fontSize: 15, cursor: (payingAll || hasDeliveryConflict) ? 'default' : 'pointer', opacity: (payingAll || hasDeliveryConflict) ? 0.7 : 1 }}>
                {payingAll ? t.kori.processing : t.kori.payAll}
              </button>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  )
}
