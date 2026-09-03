'use client'
import { useState, useEffect, useRef } from 'react'
import { useTheme } from '@/lib/theme-context'
import { useLang } from '@/lib/lang-context'
import { KATEGORIAT, getNakyvatKategoriat, getTyyppiNimi } from '@/lib/kategoriat'
import { CARDMARKET_KUNTOLUOKAT } from '@/lib/conditions'
import { presetApi, ProductPreset } from '@/lib/api'
import { resizeImage } from '@/lib/imageUtils'
import { useIsMobile } from '@/lib/useIsMobile'

// Myyjän omat pohjatuotteet livekäyttöön (ks. CLAUDE.md "WhatsApp-palaute 2026-09-02" kohta 2,
// "Tuotteen syöttäminen kesken liven on liian hidasta"). Manuaalinen hallintanäkymä + bulkkituonti
// — sama ratkaisu jonka omistaja valitsi kysyttäessä (ei automaattista generointia aiemmista
// tuotteista). Käytetään /lahetys-konsolista hakuna, ei täällä suoraan käytössä liven aikana.
export default function EsiasetuksetPage() {
  const { C } = useTheme()
  const { lang, t } = useLang()
  const tp = t.presetsPage
  const isMobile = useIsMobile()

  const KUNTOLUOKAT = [
    { id: 'uusi', nimi: t.dashboardProducts.conditionNew },
    { id: 'erinomainen', nimi: t.dashboardProducts.conditionExcellent },
    { id: 'hyva', nimi: t.dashboardProducts.conditionGood },
    { id: 'tyydyttava', nimi: t.dashboardProducts.conditionFair },
    { id: 'kaytetty', nimi: t.dashboardProducts.conditionUsed },
  ]

  const [presets, setPresets] = useState<ProductPreset[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')

  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [alakategoria, setAlakategoria] = useState('')
  const [tyyppi, setTyyppi] = useState('')
  const [condition, setCondition] = useState('')
  const [description, setDescription] = useState('')
  const [image, setImage] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const [showBulk, setShowBulk] = useState(false)
  const [bulkText, setBulkText] = useState('')
  const [bulkCategory, setBulkCategory] = useState('')
  const [bulkAlakategoria, setBulkAlakategoria] = useState('')
  const [bulkTyyppi, setBulkTyyppi] = useState('')
  const [bulkSaving, setBulkSaving] = useState(false)
  const [bulkResult, setBulkResult] = useState<{ created: number; total: number } | null>(null)

  useEffect(() => { load() }, [])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { const h = setTimeout(load, 300); return () => clearTimeout(h) }, [search])

  async function load() {
    try {
      setLoading(true)
      const data = await presetApi.list(search || undefined)
      setPresets(data)
    } catch { setError(tp.loadFailed) }
    finally { setLoading(false) }
  }

  function reset() {
    setEditId(null); setName(''); setCategory(''); setAlakategoria(''); setTyyppi('')
    setCondition(''); setDescription(''); setImage(null); setError('')
    if (fileRef.current) fileRef.current.value = ''
  }

  function openEdit(p: ProductPreset) {
    setEditId(p.id); setName(p.name)
    setCategory(p.category ?? ''); setAlakategoria(p.alakategoria ?? ''); setTyyppi(p.tyyppi ?? '')
    setCondition(p.condition ?? ''); setDescription(p.description ?? ''); setImage(p.imageUrl ?? null)
    setError(''); setShowForm(true)
  }

  async function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    const r = new FileReader()
    r.onload = async () => { setImage(await resizeImage(r.result as string)) }
    r.readAsDataURL(f)
  }

  async function save() {
    if (!name.trim()) { setError(tp.enterName); return }
    setError(''); setSaving(true)
    const data = {
      name: name.trim(), category: category || undefined, alakategoria: alakategoria || undefined,
      tyyppi: tyyppi || undefined, condition: condition || undefined,
      description: description.trim() || undefined, imageUrl: image ?? undefined,
    }
    try {
      if (editId) await presetApi.update(editId, data)
      else await presetApi.create(data)
      reset(); setShowForm(false)
      await load()
    } catch (e: any) { setError(e.message ?? tp.saveFailed) }
    setSaving(false)
  }

  async function toggleFavorite(p: ProductPreset) {
    setPresets(prev => prev.map(x => x.id === p.id ? { ...x, favorite: !x.favorite } : x))
    try { await presetApi.update(p.id, { favorite: !p.favorite }) } catch { await load() }
  }

  async function remove(id: string) {
    if (!confirm(tp.confirmDelete)) return
    try { await presetApi.remove(id); setPresets(prev => prev.filter(p => p.id !== id)) } catch { setError(tp.deleteFailed) }
  }

  async function saveBulk() {
    if (!bulkText.trim()) { setError(tp.enterText); return }
    setBulkSaving(true); setError(''); setBulkResult(null)
    try {
      const res = await presetApi.bulkCreate(bulkText, { category: bulkCategory || undefined, alakategoria: bulkAlakategoria || undefined, tyyppi: bulkTyyppi || undefined })
      setBulkResult({ created: res.created, total: res.total })
      setBulkText('')
      await load()
    } catch (e: any) { setError(e.message ?? tp.saveFailed) }
    setBulkSaving(false)
  }

  const currentKat = KATEGORIAT.find(k => k.id === category)
  const currentAla: any = currentKat?.alakategoriat.find((a: any) => a.id === alakategoria)
  const bulkCurrentKat = KATEGORIAT.find(k => k.id === bulkCategory)
  const bulkCurrentAla: any = bulkCurrentKat?.alakategoriat.find((a: any) => a.id === bulkAlakategoria)

  const inp: React.CSSProperties = { width: '100%', background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 7, padding: '9px 12px', color: C.text, fontSize: 13, outline: 'none', boxSizing: 'border-box' }
  const lbl: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: C.muted, display: 'block', marginBottom: 4 }

  return (
    <div style={{ color: C.text }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text }}>{tp.title}</h1>
          <p style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>{tp.subtitle}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button onClick={() => { setShowBulk(true); setShowForm(false) }} style={{ background: 'none', border: 'none', color: C.textSub, fontSize: 13, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3 }}>
            {tp.bulkImport}
          </button>
          <button onClick={() => { reset(); setShowForm(true); setShowBulk(false) }} style={{ background: C.accentSolid, color: C.accentText, border: 'none', padding: '10px 20px', borderRadius: 7, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
            {tp.addPreset}
          </button>
        </div>
      </div>

      {error && <div style={{ background: '#FFF0F0', border: '1px solid #FFCCCC', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: '#CC0000', fontSize: 13 }}>{error}</div>}

      {showBulk && (
        <div style={{ background: C.surface, borderRadius: 9, border: `1px solid ${C.border}`, padding: 16, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 1 }}>{tp.bulkImport}</div>
            <button onClick={() => { setShowBulk(false); setBulkText(''); setBulkResult(null) }} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 16 }}>✕</button>
          </div>
          <p style={{ fontSize: 12, color: C.textSub, lineHeight: 1.5, marginBottom: 12 }}>{tp.bulkHint}</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8, marginBottom: 12 }}>
            <div>
              <label style={lbl}>{t.dashboardProducts.categoryLabel}</label>
              <select value={bulkCategory} onChange={e => { setBulkCategory(e.target.value); setBulkAlakategoria(''); setBulkTyyppi('') }} style={inp}>
                <option value="">{t.dashboardProducts.selectPlaceholder}</option>
                {getNakyvatKategoriat().map(k => <option key={k.id} value={k.id}>{k.nimi[lang as 'fi' | 'en'] ?? k.nimi.fi}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>{t.dashboardProducts.subcategoryLabel}</label>
              <select value={bulkAlakategoria} onChange={e => { setBulkAlakategoria(e.target.value); setBulkTyyppi('') }} style={inp} disabled={!bulkCurrentKat || bulkCurrentKat.alakategoriat.length === 0}>
                <option value="">{t.dashboardProducts.selectPlaceholder}</option>
                {bulkCurrentKat?.alakategoriat.map((a: any) => <option key={a.id} value={a.id}>{a.nimi[lang as 'fi' | 'en'] ?? a.nimi.fi}</option>)}
              </select>
            </div>
            {bulkCurrentAla?.tyypit?.length > 0 && (
              <div>
                <label style={lbl}>{t.dashboardProducts.typeLabel}</label>
                <select value={bulkTyyppi} onChange={e => setBulkTyyppi(e.target.value)} style={inp}>
                  <option value="">{t.dashboardProducts.selectPlaceholder}</option>
                  {bulkCurrentAla.tyypit.map((ty: any) => <option key={ty.id} value={ty.id}>{getTyyppiNimi(ty, lang as any)}</option>)}
                </select>
              </div>
            )}
          </div>
          <textarea
            value={bulkText}
            onChange={e => setBulkText(e.target.value)}
            placeholder={'Charizard ex (WP 38)\nNM\nMap T1\n\nPikachu\nEX'}
            rows={8}
            style={{ ...inp, resize: 'vertical' as const }}
          />
          {bulkResult && (
            <div style={{ background: C.accentLight, border: `1px solid ${C.accent}33`, borderRadius: 7, padding: '8px 12px', marginTop: 10, fontSize: 12, color: C.accent }}>
              {tp.bulkCreated}: {bulkResult.created}/{bulkResult.total}
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            <button onClick={saveBulk} disabled={bulkSaving} style={{ background: C.accentSolid, color: C.accentText, border: 'none', padding: '8px 16px', borderRadius: 7, fontSize: 13, fontWeight: 700, cursor: bulkSaving ? 'not-allowed' : 'pointer', opacity: bulkSaving ? 0.7 : 1 }}>
              {bulkSaving ? tp.saving : tp.saveAll}
            </button>
          </div>
        </div>
      )}

      {showForm && (
        <div style={{ background: C.surface, borderRadius: 9, border: `1px solid ${C.border}`, padding: 16, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 1 }}>{editId ? tp.editPreset : tp.addPreset}</div>
            <button onClick={() => { reset(); setShowForm(false) }} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 16 }}>✕</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div><label style={lbl}>{tp.nameLabel}</label><input value={name} onChange={e => setName(e.target.value)} placeholder={tp.namePlaceholder} style={inp} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <label style={lbl}>{t.dashboardProducts.categoryLabel}</label>
                <select value={category} onChange={e => { setCategory(e.target.value); setAlakategoria(''); setTyyppi('') }} style={inp}>
                  <option value="">{t.dashboardProducts.selectPlaceholder}</option>
                  {getNakyvatKategoriat().map(k => <option key={k.id} value={k.id}>{k.nimi[lang as 'fi' | 'en'] ?? k.nimi.fi}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>{t.dashboardProducts.subcategoryLabel}</label>
                <select value={alakategoria} onChange={e => { setAlakategoria(e.target.value); setTyyppi('') }} style={inp} disabled={!currentKat || currentKat.alakategoriat.length === 0}>
                  <option value="">{t.dashboardProducts.selectPlaceholder}</option>
                  {currentKat?.alakategoriat.map((a: any) => <option key={a.id} value={a.id}>{a.nimi[lang as 'fi' | 'en'] ?? a.nimi.fi}</option>)}
                </select>
              </div>
            </div>
            {currentAla?.tyypit?.length > 0 && (
              <div>
                <label style={lbl}>{t.dashboardProducts.typeLabel}</label>
                <select value={tyyppi} onChange={e => { setTyyppi(e.target.value); setCondition('') }} style={inp}>
                  <option value="">{t.dashboardProducts.selectPlaceholder}</option>
                  {currentAla.tyypit.map((ty: any) => <option key={ty.id} value={ty.id}>{getTyyppiNimi(ty, lang as any)}</option>)}
                </select>
              </div>
            )}
            {tyyppi !== 'sealed' && (
              <div>
                <label style={lbl}>{t.dashboardProducts.conditionLabel}</label>
                <select value={condition} onChange={e => setCondition(e.target.value)} style={inp}>
                  <option value="">{t.dashboardProducts.selectPlaceholder}</option>
                  {(tyyppi === 'irtokortit' ? CARDMARKET_KUNTOLUOKAT : KUNTOLUOKAT).map(k => <option key={k.id} value={k.id}>{k.nimi}</option>)}
                </select>
              </div>
            )}
            <div>
              <label style={lbl}>{tp.descriptionLabel}</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder={tp.descriptionPlaceholder} rows={2} style={{ ...inp, resize: 'vertical' as const }} />
            </div>
            <div>
              <label style={lbl}>{tp.imageLabel}</label>
              <div onClick={() => fileRef.current?.click()} style={{ width: 80, height: 80, borderRadius: 8, border: `1px dashed ${C.border}`, background: C.surface2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                {image ? <img src={image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 20, color: C.dim }}>+</span>}
              </div>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleImage} style={{ display: 'none' }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button onClick={save} disabled={saving} style={{ background: C.accentSolid, color: C.accentText, border: 'none', padding: '8px 16px', borderRadius: 7, fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
              {saving ? tp.saving : tp.save}
            </button>
          </div>
        </div>
      )}

      <input value={search} onChange={e => setSearch(e.target.value)} placeholder={tp.searchPlaceholder} style={{ ...inp, marginBottom: 14, maxWidth: 320 }} />

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: C.muted }}>{tp.loading}</div>
      ) : presets.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: C.muted, fontSize: 14 }}>{tp.empty}</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
          {presets.map(p => (
            <div key={p.id} style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 9, padding: 12, display: 'flex', gap: 10 }}>
              <div style={{ width: 44, height: 44, borderRadius: 7, overflow: 'hidden', flexShrink: 0, background: C.surface, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {p.imageUrl ? <img src={p.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ color: C.dim }}>+</span>}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                <div style={{ fontSize: 11, color: C.muted, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {p.condition && <span>{p.condition}</span>}
                  {p.description && <span>· {p.description}</span>}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                  <button onClick={() => toggleFavorite(p)} title={tp.favorite} style={{ background: 'none', border: 'none', color: p.favorite ? '#F59E0B' : C.dim, cursor: 'pointer', fontSize: 14, padding: 0 }}>★</button>
                  <button onClick={() => openEdit(p)} style={{ background: 'none', border: 'none', color: C.accent, cursor: 'pointer', fontSize: 11, fontWeight: 600, padding: 0 }}>{tp.edit}</button>
                  <button onClick={() => remove(p.id)} style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: 11, fontWeight: 600, padding: 0 }}>{tp.delete}</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
