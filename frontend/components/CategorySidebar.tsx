'use client'
import { useTheme } from '@/lib/theme-context'
import { useLang } from '@/lib/lang-context'
import { KATEGORIAT, getKatNimi, getAlaNimi } from '@/lib/kategoriat'

interface CategorySidebarProps {
  items: { category?: string | null; alakategoria?: string | null }[]
  activeKat: string
  setActiveKat: (id: string) => void
  activeAla?: string
  setActiveAla?: (id: string) => void
  isMobile: boolean
}

// Sama kategoriasuodatus kuin /selaa-sivulla — jaettu komponentti /huutokaupat ja /live-kaikki -sivuille
export default function CategorySidebar({ items, activeKat, setActiveKat, activeAla, setActiveAla, isMobile }: CategorySidebarProps) {
  const { C } = useTheme()
  const { lang, t } = useLang()
  const allKats = [{ id: 'kaikki', nimi: { fi: t.selaa.allCategories, en: t.selaa.allCategories } }, ...KATEGORIAT]

  function selectKat(id: string) {
    setActiveKat(id)
    setActiveAla?.('')
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
              <button key={ala.id} onClick={() => setActiveAla(activeAla === ala.id ? '' : ala.id)} style={{ padding: '5px 10px', borderRadius: 20, border: `1px solid ${activeAla === ala.id ? C.accent : C.border}`, background: activeAla === ala.id ? C.accentLight : C.surface2, color: activeAla === ala.id ? C.accent : C.textSub, fontSize: 12, fontWeight: activeAla === ala.id ? 700 : 400, cursor: 'pointer' }}>
                {getAlaNimi(ala, lang as any)}
              </button>
            ))}
          </div>
        )}
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
                    <button key={ala.id} onClick={() => setActiveAla(activeAla === ala.id ? '' : ala.id)} style={{ width: '100%', textAlign: 'left', padding: '5px 10px 5px 16px', borderRadius: 5, border: 'none', cursor: 'pointer', fontSize: 12, color: activeAla === ala.id ? C.accent : C.muted, background: activeAla === ala.id ? C.accentLight : 'transparent', marginBottom: 1, display: 'flex', justifyContent: 'space-between' }}>
                      <span>{getAlaNimi(ala, lang as any)}</span>
                      {alaCount > 0 && <span style={{ fontSize: 11 }}>{alaCount}</span>}
                    </button>
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
