'use client'
import { useTheme } from '@/lib/theme-context'
import { useLang } from '@/lib/lang-context'
import { KATEGORIAT, getKatNimi, getAlaNimi, getTyyppiNimi, getNakyvatKategoriat } from '@/lib/kategoriat'

interface CategorySidebarProps {
  items: { category?: string | null; alakategoria?: string | null; tyyppi?: string | null }[]
  activeKat: string
  setActiveKat: (id: string) => void
  activeAla?: string
  setActiveAla?: (id: string) => void
  activeTyyppi?: string
  setActiveTyyppi?: (id: string) => void
  isMobile: boolean
}

// Sama kategoriasuodatus kuin /selaa-sivulla — jaettu komponentti /huutokaupat ja /live-kaikki -sivuille.
// Kolmas taso (Tyyppi) näkyy vain kun kutsuja antaa activeTyyppi/setActiveTyyppi-propsit (esim. huutokaupat —
// live-kaikki suodattaa Show-malleja joilla ei ole yksittäistä tyyppiä, joten se jättää nämä propsit antamatta).
export default function CategorySidebar({ items, activeKat, setActiveKat, activeAla, setActiveAla, activeTyyppi, setActiveTyyppi, isMobile }: CategorySidebarProps) {
  const { C } = useTheme()
  const { lang, t } = useLang()
  const allKats = [{ id: 'kaikki', nimi: { fi: t.selaa.allCategories, en: t.selaa.allCategories } }, ...getNakyvatKategoriat()]

  function selectKat(id: string) {
    setActiveKat(id)
    setActiveAla?.('')
    setActiveTyyppi?.('')
  }

  if (isMobile) {
    const activeAlakategoriat = activeKat !== 'kaikki' ? (KATEGORIAT.find(k => k.id === activeKat)?.alakategoriat ?? []) : []
    return (
      <div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {allKats.map(kat => (
            <button key={kat.id} onClick={() => selectKat(kat.id)} style={{ padding: '6px 12px', borderRadius: 20, border: `1px solid ${activeKat === kat.id ? C.accent : C.border}`, background: activeKat === kat.id ? C.accentLight : C.cardBg, color: activeKat === kat.id ? C.accent : C.textSub, fontSize: 13, fontWeight: activeKat === kat.id ? 700 : 400, cursor: 'pointer' }}>
              {getKatNimi(kat as any, lang as any)}
            </button>
          ))}
        </div>
        {setActiveAla && activeAlakategoriat.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8, background: C.surface, borderRadius: 10, padding: 8 }}>
            {activeAlakategoriat.map((ala: any) => (
              <button key={ala.id} onClick={() => { setActiveAla(activeAla === ala.id ? '' : ala.id); setActiveTyyppi?.('') }} style={{ padding: '5px 10px', borderRadius: 20, border: `1px solid ${activeAla === ala.id ? C.accent : C.border}`, background: activeAla === ala.id ? C.accentLight : C.surface2, color: activeAla === ala.id ? C.accent : C.textSub, fontSize: 12, fontWeight: activeAla === ala.id ? 700 : 400, cursor: 'pointer' }}>
                {getAlaNimi(ala, lang as any)}
              </button>
            ))}
          </div>
        )}
        {setActiveTyyppi && activeAla && (() => {
          const tyypit = (activeAlakategoriat as any[]).find(a => a.id === activeAla)?.tyypit ?? []
          return tyypit.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6, background: C.surface2, borderRadius: 10, padding: 8 }}>
              {tyypit.map((ty: any) => (
                <button key={ty.id} onClick={() => setActiveTyyppi(activeTyyppi === ty.id ? '' : ty.id)} style={{ padding: '4px 9px', borderRadius: 20, border: `1px solid ${activeTyyppi === ty.id ? C.accent : C.border}`, background: activeTyyppi === ty.id ? C.accentLight : C.cardBg, color: activeTyyppi === ty.id ? C.accent : C.muted, fontSize: 11, fontWeight: activeTyyppi === ty.id ? 700 : 400, cursor: 'pointer' }}>
                  {getTyyppiNimi(ty, lang as any)}
                </button>
              ))}
            </div>
          ) : null
        })()}
      </div>
    )
  }

  return (
    <div style={{ width: 200, flexShrink: 0, padding: '20px 12px', borderRight: `1px solid ${C.border}`, position: 'sticky', top: 58, height: 'calc(100vh - 58px)', overflowY: 'auto' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 10 }}>{t.selaa.category}</div>
      {allKats.map(kat => {
        const count = kat.id === 'kaikki' ? items.length : items.filter(p => p.category === kat.id).length
        return (
          <div key={kat.id}>
            <button onClick={() => selectKat(kat.id)} style={{ width: '100%', textAlign: 'left', padding: '8px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: activeKat === kat.id ? 700 : 400, color: activeKat === kat.id ? C.accent : C.textSub, background: activeKat === kat.id ? C.accentLight : 'transparent', marginBottom: 2, display: 'flex', justifyContent: 'space-between' }}>
              <span>{getKatNimi(kat as any, lang as any)}</span>
              {count > 0 && <span style={{ fontSize: 11, color: C.muted }}>{count}</span>}
            </button>
            {setActiveAla && activeKat === kat.id && kat.id !== 'kaikki' && (KATEGORIAT.find(k => k.id === kat.id)?.alakategoriat ?? []).length > 0 && (
              <div style={{ marginLeft: 8, marginBottom: 4, background: C.surface, borderRadius: 8, padding: '4px', borderLeft: `2px solid ${C.border}` }}>
                {(KATEGORIAT.find(k => k.id === kat.id)?.alakategoriat ?? []).map((ala: any) => {
                  const alaCount = items.filter(p => p.alakategoria === ala.id).length
                  return (
                    <div key={ala.id}>
                      <button onClick={() => { setActiveAla(activeAla === ala.id ? '' : ala.id); setActiveTyyppi?.('') }} style={{ width: '100%', textAlign: 'left', padding: '5px 10px 5px 16px', borderRadius: 5, border: 'none', cursor: 'pointer', fontSize: 12, color: activeAla === ala.id ? C.accent : C.muted, background: activeAla === ala.id ? C.accentLight : 'transparent', marginBottom: 1, display: 'flex', justifyContent: 'space-between' }}>
                        <span>{getAlaNimi(ala, lang as any)}</span>
                        {alaCount > 0 && <span style={{ fontSize: 11 }}>{alaCount}</span>}
                      </button>
                      {setActiveTyyppi && activeAla === ala.id && ala.tyypit?.length > 0 && (
                        <div style={{ marginLeft: 10, marginBottom: 2, background: C.surface, borderRadius: 6, padding: '2px 0' }}>
                          {ala.tyypit.map((ty: any) => {
                            const tyCount = items.filter(p => p.tyyppi === ty.id).length
                            return (
                              <button key={ty.id} onClick={() => setActiveTyyppi(activeTyyppi === ty.id ? '' : ty.id)} style={{ width: '100%', textAlign: 'left', padding: '4px 10px 4px 16px', borderRadius: 4, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: activeTyyppi === ty.id ? 700 : 400, color: activeTyyppi === ty.id ? C.accent : C.muted, background: activeTyyppi === ty.id ? C.accentLight : 'transparent', display: 'flex', justifyContent: 'space-between' }}>
                                <span>{getTyyppiNimi(ty, lang as any)}</span>
                                {tyCount > 0 && <span style={{ fontSize: 10 }}>{tyCount}</span>}
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
