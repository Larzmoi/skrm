'use client'
import { useState, useEffect, useRef } from 'react'
import { useTheme } from '@/lib/theme-context'
import { useAuth } from '@/lib/auth-context'
import { useAvatar } from '@/lib/avatar-context'
import { userApi } from '@/lib/api'

export default function ProfiiliPage() {
  const { C } = useTheme()
  const { user, updateUser } = useAuth()
  const { avatar, setAvatar } = useAvatar()

  const [name, setName] = useState(user?.name ?? '')
  const [bio, setBio] = useState(user?.bio ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [username, setUsername] = useState(user?.username ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [address, setAddress] = useState(user?.address ?? '')
  const [postalCode, setPostalCode] = useState(user?.postalCode ?? '')
  const [city, setCity] = useState(user?.city ?? '')
  const [businessId, setBusinessId] = useState(user?.businessId ?? '')
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const usernameChangedAt = user?.usernameChangedAt ? new Date(user.usernameChangedAt) : null
  const nextUsernameChange = usernameChangedAt ? new Date(usernameChangedAt.getTime() + 365 * 24 * 60 * 60 * 1000) : null
  const usernameLocked = !!(nextUsernameChange && nextUsernameChange > new Date())

  const avatarRef = useRef<HTMLInputElement>(null)

  const vacationOn = !!(user?.vacationUntil && new Date(user.vacationUntil) > new Date())
  const [vacationUntil, setVacationUntil] = useState('')
  const [vacationMsg, setVacationMsg] = useState('')
  const [showVacForm, setShowVacForm] = useState(false)
  const [vacationBusy, setVacationBusy] = useState(false)
  const [vacationError, setVacationError] = useState('')
  const [newsletterBusy, setNewsletterBusy] = useState(false)
  const [newsletterError, setNewsletterError] = useState('')

  useEffect(() => {
    setName(user?.name ?? '')
    setBio(user?.bio ?? '')
    setEmail(user?.email ?? '')
    setUsername(user?.username ?? '')
    setPhone(user?.phone ?? '')
    setAddress(user?.address ?? '')
    setPostalCode(user?.postalCode ?? '')
    setCity(user?.city ?? '')
    setBusinessId(user?.businessId ?? '')
  }, [user])

  useEffect(() => {
    setVacationUntil(user?.vacationUntil ? user.vacationUntil.slice(0, 10) : '')
    setVacationMsg(user?.vacationMessage ?? '')
  }, [user])

  async function saveVacation() {
    if (!vacationUntil) return
    setVacationBusy(true); setVacationError('')
    try {
      const updated = await userApi.updateProfile({ vacationUntil, vacationMessage: vacationMsg || null })
      updateUser({ vacationUntil: updated.vacationUntil, vacationMessage: updated.vacationMessage })
      setShowVacForm(false)
    } catch (e: any) {
      setVacationError(e.message ?? 'Tallennus epäonnistui')
    }
    setVacationBusy(false)
  }

  async function disableVacation() {
    setVacationBusy(true); setVacationError('')
    try {
      const updated = await userApi.updateProfile({ vacationUntil: null, vacationMessage: null })
      updateUser({ vacationUntil: updated.vacationUntil, vacationMessage: updated.vacationMessage })
      setVacationUntil('')
      setVacationMsg('')
    } catch (e: any) {
      setVacationError(e.message ?? 'Poisto epäonnistui')
    }
    setVacationBusy(false)
  }

  async function toggleNewsletter() {
    setNewsletterBusy(true); setNewsletterError('')
    try {
      const updated = await userApi.updateProfile({ newsletterOptIn: !user?.newsletterOptIn })
      updateUser({ newsletterOptIn: updated.newsletterOptIn })
    } catch (e: any) {
      setNewsletterError(e.message ?? 'Tallennus epäonnistui')
    }
    setNewsletterBusy(false)
  }

  function handleAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    const r = new FileReader()
    r.onload = () => setAvatar(r.result as string)
    r.readAsDataURL(f)
  }

  async function saveProfile() {
    setSaving(true)
    setError('')
    try {
      const updated = await userApi.updateProfile({ name, bio, email, username, phone, address, postalCode, city, businessId })
      updateUser({
        name: updated.name, bio: updated.bio, email: updated.email, username: updated.username,
        usernameChangedAt: updated.usernameChangedAt, phone: updated.phone,
        address: updated.address, postalCode: updated.postalCode,
        city: updated.city, businessId: updated.businessId,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e: any) {
      setError(e.message ?? 'Tallennus epäonnistui')
    }
    setSaving(false)
  }

  const inp: React.CSSProperties = { width: '100%', background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 7, padding: '9px 12px', color: C.text, fontSize: 13, outline: 'none', boxSizing: 'border-box' as const }
  const lbl: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: C.muted, display: 'block', marginBottom: 5 }

  return (
    <div style={{ color: C.text, maxWidth: 600 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 24 }}>Profiili</h1>

      <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 12, padding: '20px', marginBottom: 20 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Perustiedot</h2>
        <div style={{ display: 'flex', gap: 16, marginBottom: 14 }}>
          <div onClick={() => avatarRef.current?.click()} style={{ width: 72, height: 72, borderRadius: '50%', background: C.accentSolid, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 700, color: C.accentText, flexShrink: 0, cursor: 'pointer', overflow: 'hidden', position: 'relative' }}>
            {avatar ? <img src={avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : user?.name?.[0]?.toUpperCase()}
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s' }} onMouseEnter={e => (e.currentTarget.style.opacity = '1')} onMouseLeave={e => (e.currentTarget.style.opacity = '0')}>
              <span style={{ fontSize: 11, color: '#fff', fontWeight: 600 }}>Vaihda</span>
            </div>
          </div>
          <input ref={avatarRef} type="file" accept="image/*" onChange={handleAvatar} style={{ display: 'none' }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{user?.name}</div>
            <div style={{ fontSize: 13, color: C.muted }}>@{user?.username}</div>
            <div style={{ fontSize: 13, color: C.muted }}>{user?.email}</div>
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={lbl}>Nimi</label>
          <input value={name} onChange={e => setName(e.target.value)} style={inp} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={lbl}>Käyttäjänimi</label>
          <input value={username} onChange={e => setUsername(e.target.value)} disabled={usernameLocked} style={usernameLocked ? { ...inp, opacity: 0.6, cursor: 'not-allowed' } : inp} />
          <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>
            {usernameLocked
              ? `Voit vaihtaa käyttäjänimen taas ${nextUsernameChange!.toLocaleDateString('fi-FI')}.`
              : 'Käyttäjänimen voi vaihtaa kerran vuodessa.'}
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={lbl}>Sähköposti</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} style={inp} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={lbl}>Bio</label>
          <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} placeholder="Kerro itsestäsi..." style={{ ...inp, resize: 'vertical' as const }} />
        </div>
        {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 7, padding: '9px 12px', marginBottom: 12, color: '#EF4444', fontSize: 13 }}>{error}</div>}
        <button onClick={saveProfile} disabled={saving} style={{ background: saved ? C.accentBright : C.accentSolid, color: C.accentText, border: 'none', padding: '9px 20px', borderRadius: 7, fontWeight: 700, fontSize: 14, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.7 : 1 }}>
          {saved ? '✓ Tallennettu' : saving ? 'Tallennetaan...' : 'Tallenna'}
        </button>
      </div>

      <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 12, padding: '20px', marginBottom: 20 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Yhteystiedot</h2>
        <div style={{ marginBottom: 12 }}>
          <label style={lbl}>Puhelinnumero</label>
          <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="040 1234567" style={inp} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={lbl}>Osoite</label>
          <input value={address} onChange={e => setAddress(e.target.value)} placeholder="Esimerkkikatu 1" style={inp} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
          <div>
            <label style={lbl}>Postinumero</label>
            <input value={postalCode} onChange={e => setPostalCode(e.target.value)} placeholder="00100" style={inp} />
          </div>
          <div>
            <label style={lbl}>Kaupunki</label>
            <input value={city} onChange={e => setCity(e.target.value)} placeholder="Helsinki" style={inp} />
          </div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={lbl}>Y-tunnus (valinnainen, yritysmyyjille)</label>
          <input value={businessId} onChange={e => setBusinessId(e.target.value)} placeholder="1234567-8" style={inp} />
        </div>
        {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 7, padding: '9px 12px', marginBottom: 12, color: '#EF4444', fontSize: 13 }}>{error}</div>}
        <button onClick={saveProfile} disabled={saving} style={{ background: saved ? C.accentBright : C.accentSolid, color: C.accentText, border: 'none', padding: '9px 20px', borderRadius: 7, fontWeight: 700, fontSize: 14, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.7 : 1 }}>
          {saved ? '✓ Tallennettu' : saving ? 'Tallennetaan...' : 'Tallenna'}
        </button>
      </div>

      <div style={{ background: C.cardBg, border: `1px solid ${vacationOn ? '#F59E0B' : C.border}`, borderRadius: 12, padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: vacationOn || showVacForm ? 16 : 0 }}>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: vacationOn ? '#F59E0B' : C.text, marginBottom: 4 }}>
              Lomamoodi
            </h2>
            <p style={{ fontSize: 13, color: C.muted }}>Lähetysaika pitenee 7 päivään.</p>
          </div>
          {!showVacForm && (
            <button onClick={() => vacationOn ? disableVacation() : setShowVacForm(true)} disabled={vacationBusy} style={{ background: C.accentSolid, color: C.accentText, border: `1px solid ${C.accent}`, padding: '8px 16px', borderRadius: 7, fontWeight: 700, fontSize: 13, cursor: vacationBusy ? 'default' : 'pointer', opacity: vacationBusy ? 0.7 : 1, marginLeft: 16, whiteSpace: 'nowrap' }}>
              {vacationOn ? 'Poista lomamoodi' : 'Ota käyttöön'}
            </button>
          )}
        </div>

        {vacationError && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 7, padding: '9px 12px', marginBottom: 12, color: '#EF4444', fontSize: 13 }}>{vacationError}</div>}

        {vacationOn && !showVacForm && (
          <div style={{ background: '#FFF8E8', border: '1px solid #F59E0B33', borderRadius: 8, padding: '12px 14px' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#F59E0B', marginBottom: 4 }}>Lomamoodi on päällä</div>
            <div style={{ fontSize: 13, color: C.textSub }}>Lähetysaika on tällä hetkellä 7 päivää normaalin 48h sijaan. Näkyy myös julkisessa profiilissasi.</div>
            {vacationUntil && <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>Päättyy: {vacationUntil}</div>}
            {vacationMsg && <div style={{ fontSize: 12, color: C.muted, marginTop: 4, fontStyle: 'italic' }}>"{vacationMsg}"</div>}
          </div>
        )}

        {showVacForm && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={lbl}>Loma päättyy</label>
              <input type="date" value={vacationUntil} onChange={e => setVacationUntil(e.target.value)} style={inp} />
            </div>
            <div>
              <label style={lbl}>Viesti ostajille (valinnainen)</label>
              <textarea value={vacationMsg} onChange={e => setVacationMsg(e.target.value)} placeholder="esim. Olen lomalla 10.8. asti, tilaukset lähtevät viimeistään 11.8." rows={2} style={{ ...inp, resize: 'vertical' as const }} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={saveVacation} disabled={vacationBusy || !vacationUntil} style={{ background: C.accentSolid, color: C.accentText, border: 'none', padding: '9px 20px', borderRadius: 7, fontWeight: 700, fontSize: 13, cursor: vacationBusy || !vacationUntil ? 'default' : 'pointer', opacity: vacationBusy || !vacationUntil ? 0.7 : 1 }}>
                Tallenna
              </button>
              <button onClick={() => setShowVacForm(false)} disabled={vacationBusy} style={{ background: C.surface2, color: C.muted, border: `1px solid ${C.border}`, padding: '9px 16px', borderRadius: 7, fontSize: 13, cursor: 'pointer' }}>
                Peruuta
              </button>
            </div>
          </div>
        )}
      </div>

      <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 12, padding: '20px', marginTop: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 4 }}>
              Uutiskirje
            </h2>
            <p style={{ fontSize: 13, color: C.muted }}>Myyntivinkkejä ja päivityksiä suoraan sähköpostiisi.</p>
          </div>
          <button onClick={toggleNewsletter} disabled={newsletterBusy} style={{ background: user?.newsletterOptIn ? C.surface2 : C.accentSolid, color: user?.newsletterOptIn ? C.muted : C.accentText, border: `1px solid ${user?.newsletterOptIn ? C.border : C.accent}`, padding: '8px 16px', borderRadius: 7, fontWeight: 700, fontSize: 13, cursor: newsletterBusy ? 'default' : 'pointer', opacity: newsletterBusy ? 0.7 : 1, marginLeft: 16, whiteSpace: 'nowrap' }}>
            {user?.newsletterOptIn ? 'Peru tilaus' : 'Tilaa uutiskirje'}
          </button>
        </div>
        {newsletterError && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 7, padding: '9px 12px', marginTop: 12, color: '#EF4444', fontSize: 13 }}>{newsletterError}</div>}
      </div>
    </div>
  )
}
