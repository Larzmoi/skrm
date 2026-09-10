'use client'

import { useEffect, useState } from 'react'
import { useTheme } from '@/lib/theme-context'
import { adminApi, AdSlot } from '@/lib/api'
import { resizeImage } from '@/lib/imageUtils'

// Etusivun mainosbannerin hallintalomake (ks. CLAUDE.md "Iso testauskierros 2026-09-04"
// kohta 6) — omistaja voi vaihtaa tekstin ja kuvan ilman koodimuutosta/deployta. Tarkoituksella
// yksinkertainen: yksi rivi (AdSlot, id "main"), ei versiohistoriaa/ajastusta/monta mainosta.
export default function AdminAdManagement() {
  const { C } = useTheme()
  const [ad, setAd] = useState<AdSlot | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    adminApi.getAd().then(setAd).catch(() => setError('Mainoksen haku epäonnistui'))
  }, [])

  function update(field: keyof AdSlot, value: string | boolean | null) {
    setAd(prev => prev ? { ...prev, [field]: value } as AdSlot : prev)
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

  // Loopattava GIF/MP4 - LISÄTTY 2026-09-10, omistajan pyyntö. EI resizeImage()-käsittelyä:
  // canvas+toDataURL tuhoaisi GIF-animaation (vain 1 kehys jäisi jäljelle) eikä osaa käsitellä
  // videotiedostoja ollenkaan - tallennetaan raakana base64:na. Rajataan tiedostokoko client-
  // puolella (8MB raaka -> n. 10,7MB base64) jotta lopullinen JSON-pyyntö mahtuu mukavasti
  // palvelimen 20mb-rajaan (ks. backend/src/index.ts) muidenkin lomakekenttien kanssa.
  const MAX_VIDEO_BYTES = 8 * 1024 * 1024
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
    if (!ad) return
    setSaving(true)
    setError('')
    try {
      const updated = await adminApi.updateAd({
        enabled: ad.enabled, eyebrow: ad.eyebrow, title: ad.title, body: ad.body,
        ctaText: ad.ctaText, ctaHref: ad.ctaHref, imageUrl: ad.imageUrl, videoUrl: ad.videoUrl,
      })
      setAd(updated)
      setSaved(true)
    } catch {
      setError('Tallennus epäonnistui')
    }
    setSaving(false)
  }

  if (!ad) return <div style={{ color: C.muted, fontSize: 14, padding: '20px 0' }}>{error || 'Ladataan...'}</div>

  const inputStyle: React.CSSProperties = { width: '100%', padding: '9px 12px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.surface, color: C.text, fontSize: 14, boxSizing: 'border-box' }
  const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: C.muted, marginBottom: 5, display: 'block' }

  return (
    <div style={{ maxWidth: 560 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, padding: '12px 16px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Mainos näkyvissä etusivulla</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Kytke pois jos et halua mainosta näkyviin väliaikaisesti</div>
        </div>
        <button
          onClick={() => update('enabled', !ad.enabled)}
          style={{ width: 44, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer', background: ad.enabled ? C.accent : C.border, position: 'relative', flexShrink: 0 }}
        >
          <span style={{ position: 'absolute', top: 3, left: ad.enabled ? 21 : 3, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 0.15s' }} />
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label style={labelStyle}>Yläteksti (valinnainen, esim. "Viikon kohokohdat")</label>
          <input style={inputStyle} value={ad.eyebrow} onChange={e => update('eyebrow', e.target.value)} maxLength={60} />
        </div>
        <div>
          <label style={labelStyle}>Otsikko</label>
          <input style={inputStyle} value={ad.title} onChange={e => update('title', e.target.value)} maxLength={100} />
        </div>
        <div>
          <label style={labelStyle}>Kuvausteksti</label>
          <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 60, fontFamily: 'inherit' }} value={ad.body} onChange={e => update('body', e.target.value)} maxLength={200} />
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Napin teksti</label>
            <input style={inputStyle} value={ad.ctaText} onChange={e => update('ctaText', e.target.value)} maxLength={40} placeholder="Selaa huutokauppoja" />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Napin linkki (sivuston oma polku, ulkoinen osoite, tai mailto: sähköpostille)</label>
            <input style={inputStyle} value={ad.ctaHref} onChange={e => update('ctaHref', e.target.value)} placeholder="/huutokaupat tai https://... tai mailto:support@habahub.com" />
          </div>
        </div>
        <div>
          <label style={labelStyle}>Kuva (valinnainen — täyttää koko mainoslaatikon taustana, tumma liukuväri pitää tekstin luettavana päällä. Jos ei kuvaa, näytetään oletusikoni.)</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ width: 220, height: 90, borderRadius: 10, background: C.surface, border: `1px solid ${C.border}`, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {ad.imageUrl ? <img src={ad.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 11, color: C.dim }}>Ei kuvaa</span>}
            </div>
            <input type="file" accept="image/*" onChange={handleImage} style={{ fontSize: 13, color: C.text }} />
            {ad.imageUrl && (
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
              {ad.videoUrl ? (
                ad.videoUrl.startsWith('data:video/')
                  ? <video src={ad.videoUrl} autoPlay loop muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <img src={ad.videoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : <span style={{ fontSize: 11, color: C.dim }}>Ei videota</span>}
            </div>
            <input type="file" accept="video/mp4,image/gif" onChange={handleVideo} style={{ fontSize: 13, color: C.text }} />
            {ad.videoUrl && (
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
          {saved && <span style={{ fontSize: 13, color: C.accent, fontWeight: 600 }}>Tallennettu</span>}
          {error && <span style={{ fontSize: 13, color: '#EF4444' }}>{error}</span>}
        </div>
      </div>
    </div>
  )
}
