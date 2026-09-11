'use client'

import { useEffect, useState } from 'react'
import { useTheme } from '@/lib/theme-context'
import { adminApi, AdSlot } from '@/lib/api'
import { resizeImage } from '@/lib/imageUtils'
import ConfirmDialog from '@/components/ConfirmDialog'

// Etusivun mainostilan hallintalomake (ks. CLAUDE.md "Iso testauskierros 2026-09-04" kohta 6,
// muutettu karuselliksi 2026-09-11) — omistaja voi lisätä/muokata/poistaa useamman mainoksen
// jotka pyörivät automaattisesti etusivulla ilman koodimuutosta/deployta. Yksi kortti per
// mainos, jokainen tallentaa itsenäisesti.
const MAX_VIDEO_BYTES = 8 * 1024 * 1024

function AdEditor({ ad, onDeleted, onSaved, C }: { ad: AdSlot; onDeleted: (id: string) => void; onSaved: (ad: AdSlot) => void; C: Record<string, string> }) {
  const [draft, setDraft] = useState<AdSlot>(ad)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState('')

  function update(field: keyof AdSlot, value: string | boolean | null) {
    setDraft(prev => ({ ...prev, [field]: value }))
    setSaved(false)
  }

  async function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async () => {
      // Kuva täyttää nyt koko mainoslaatikon (ei enää pieni 56px kuvake, ks. CLAUDE.md) -
      // 400px oli riittävä kuvakkeelle mutta venyisi rakeiseksi koko leveän bannerin taustalla.
      const resized = await resizeImage(reader.result as string, 1600)
      update('imageUrl', resized)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  // Loopattava GIF/MP4 - EI resizeImage()-käsittelyä: canvas+toDataURL tuhoaisi GIF-animaation
  // (vain 1 kehys jäisi jäljelle) eikä osaa käsitellä videotiedostoja ollenkaan - tallennetaan
  // raakana base64:na. Rajataan tiedostokoko client-puolella jotta lopullinen JSON-pyyntö
  // mahtuu mukavasti palvelimen 20mb-rajaan (ks. backend/src/index.ts) muidenkin kenttien kanssa.
  async function handleVideo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > MAX_VIDEO_BYTES) {
      setError(`Tiedosto on liian iso (${(file.size / 1024 / 1024).toFixed(1)}MB) - enintään 8MB, pidä video lyhyenä ja pakattuna.`)
      e.target.value = ''
      return
    }
    setError('')
    const reader = new FileReader()
    reader.onload = () => update('videoUrl', reader.result as string)
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  async function save() {
    setSaving(true)
    setError('')
    try {
      const updated = await adminApi.updateAd(draft.id, {
        enabled: draft.enabled, eyebrow: draft.eyebrow, title: draft.title, body: draft.body,
        ctaText: draft.ctaText, ctaHref: draft.ctaHref, imageUrl: draft.imageUrl, videoUrl: draft.videoUrl,
      })
      setDraft(updated)
      onSaved(updated)
      setSaved(true)
    } catch {
      setError('Tallennus epäonnistui')
    }
    setSaving(false)
  }

  async function doDelete() {
    setConfirmDelete(false)
    setDeleting(true)
    try {
      await adminApi.deleteAd(draft.id)
      onDeleted(draft.id)
    } catch {
      setError('Poisto epäonnistui')
      setDeleting(false)
    }
  }

  const inputStyle: React.CSSProperties = { width: '100%', padding: '9px 12px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.surface, color: C.text, fontSize: 14, boxSizing: 'border-box' }
  const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: C.muted, marginBottom: 5, display: 'block' }

  return (
    <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 12, padding: 18, marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, padding: '12px 16px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{draft.title || draft.eyebrow || 'Nimetön mainos'}</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{draft.enabled ? 'Näkyy karusellissa' : 'Piilossa - kytke päälle kun sisältö on valmis'}</div>
        </div>
        <button
          onClick={() => update('enabled', !draft.enabled)}
          style={{ width: 44, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer', background: draft.enabled ? C.accent : C.border, position: 'relative', flexShrink: 0 }}
        >
          <span style={{ position: 'absolute', top: 3, left: draft.enabled ? 21 : 3, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 0.15s' }} />
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label style={labelStyle}>Yläteksti (valinnainen, esim. "Viikon kohokohdat")</label>
          <input style={inputStyle} value={draft.eyebrow} onChange={e => update('eyebrow', e.target.value)} maxLength={60} />
        </div>
        <div>
          <label style={labelStyle}>Otsikko</label>
          <input style={inputStyle} value={draft.title} onChange={e => update('title', e.target.value)} maxLength={100} />
        </div>
        <div>
          <label style={labelStyle}>Kuvausteksti</label>
          <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 60, fontFamily: 'inherit' }} value={draft.body} onChange={e => update('body', e.target.value)} maxLength={200} />
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Napin teksti</label>
            <input style={inputStyle} value={draft.ctaText} onChange={e => update('ctaText', e.target.value)} maxLength={40} placeholder="Selaa huutokauppoja" />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Napin linkki (sivuston oma polku, ulkoinen osoite, tai mailto: sähköpostille)</label>
            <input style={inputStyle} value={draft.ctaHref} onChange={e => update('ctaHref', e.target.value)} placeholder="/huutokaupat tai https://... tai mailto:support@habahub.com" />
          </div>
        </div>
        <div>
          <label style={labelStyle}>Kuva (valinnainen — täyttää koko mainoslaatikon taustana, tumma liukuväri pitää tekstin luettavana päällä. Jos ei kuvaa, näytetään oletusikoni.)</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ width: 220, height: 90, borderRadius: 10, background: C.surface, border: `1px solid ${C.border}`, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {draft.imageUrl ? <img src={draft.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 11, color: C.dim }}>Ei kuvaa</span>}
            </div>
            <input type="file" accept="image/*" onChange={handleImage} style={{ fontSize: 13, color: C.text }} />
            {draft.imageUrl && (
              <button onClick={() => update('imageUrl', null)} style={{ background: 'none', border: `1px solid ${C.border}`, color: C.muted, padding: '6px 10px', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>
                Poista kuva
              </button>
            )}
          </div>
        </div>

        <div>
          <label style={labelStyle}>Loop-video/GIF (valinnainen — lyhyt, itsestään toistuva video tai GIF. Korvaa yllä olevan kuvan jos asetettu, enintään 8MB.)</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ width: 220, height: 90, borderRadius: 10, background: C.surface, border: `1px solid ${C.border}`, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {draft.videoUrl ? (
                draft.videoUrl.startsWith('data:video/')
                  ? <video src={draft.videoUrl} autoPlay loop muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <img src={draft.videoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : <span style={{ fontSize: 11, color: C.dim }}>Ei videota</span>}
            </div>
            <input type="file" accept="video/mp4,image/gif" onChange={handleVideo} style={{ fontSize: 13, color: C.text }} />
            {draft.videoUrl && (
              <button onClick={() => update('videoUrl', null)} style={{ background: 'none', border: `1px solid ${C.border}`, color: C.muted, padding: '6px 10px', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>
                Poista video
              </button>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
          <button onClick={save} disabled={saving} style={{ background: C.accent, color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Tallennetaan...' : 'Tallenna'}
          </button>
          <button onClick={() => setConfirmDelete(true)} disabled={deleting} style={{ background: 'none', border: '1px solid rgba(239,68,68,0.4)', color: '#EF4444', padding: '10px 16px', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: deleting ? 'default' : 'pointer', opacity: deleting ? 0.6 : 1 }}>
            {deleting ? 'Poistetaan...' : 'Poista mainos'}
          </button>
          {saved && <span style={{ fontSize: 13, color: C.accent, fontWeight: 600 }}>Tallennettu</span>}
          {error && <span style={{ fontSize: 13, color: '#EF4444' }}>{error}</span>}
        </div>
      </div>

      {confirmDelete && (
        <ConfirmDialog
          message="Poistetaanko tämä mainos pysyvästi? Tätä ei voi perua."
          danger
          onConfirm={doDelete}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </div>
  )
}

export default function AdminAdManagement() {
  const { C } = useTheme()
  const [ads, setAds] = useState<AdSlot[] | null>(null)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    adminApi.listAds().then(setAds).catch(() => setError('Mainosten haku epäonnistui'))
  }, [])

  async function addAd() {
    setCreating(true)
    setError('')
    try {
      const created = await adminApi.createAd()
      setAds(prev => [...(prev ?? []), created])
    } catch {
      setError('Mainoksen luonti epäonnistui')
    }
    setCreating(false)
  }

  function handleSaved(updated: AdSlot) {
    setAds(prev => prev ? prev.map(a => a.id === updated.id ? updated : a) : prev)
  }

  function handleDeleted(id: string) {
    setAds(prev => prev ? prev.filter(a => a.id !== id) : prev)
  }

  if (!ads) return <div style={{ color: C.muted, fontSize: 14, padding: '20px 0' }}>{error || 'Ladataan...'}</div>

  return (
    <div style={{ maxWidth: 620 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>
          Useampi aktiivinen ({'"'}Näkyy karusellissa{'"'}) mainos pyörii automaattisesti etusivulla muutaman sekunnin välein.
        </p>
        <button onClick={addAd} disabled={creating} style={{ background: C.accent, color: '#fff', border: 'none', padding: '9px 18px', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: creating ? 'default' : 'pointer', opacity: creating ? 0.7 : 1, whiteSpace: 'nowrap', flexShrink: 0, marginLeft: 12 }}>
          {creating ? 'Lisätään...' : '+ Lisää mainos'}
        </button>
      </div>

      {error && <div style={{ fontSize: 13, color: '#EF4444', marginBottom: 12 }}>{error}</div>}

      {ads.length === 0 ? (
        <div style={{ color: C.muted, fontSize: 14, padding: '20px 0' }}>Ei vielä yhtään mainosta — lisää ensimmäinen yllä olevasta napista.</div>
      ) : (
        ads.map(ad => <AdEditor key={ad.id} ad={ad} onSaved={handleSaved} onDeleted={handleDeleted} C={C} />)
      )}
    </div>
  )
}
