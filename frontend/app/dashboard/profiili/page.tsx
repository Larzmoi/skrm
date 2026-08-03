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
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  const avatarRef = useRef<HTMLInputElement>(null)

  const [vacationOn, setVacationOn] = useState(false)
  const [vacationUntil, setVacationUntil] = useState('')
  const [vacationMsg, setVacationMsg] = useState('')
  const [showVacForm, setShowVacForm] = useState(false)

  useEffect(() => {
    setName(user?.name ?? '')
    setBio(user?.bio ?? '')
  }, [user])

  useEffect(() => {
    const v = localStorage.getItem('skrm_vacation')
    if (v) {
      const parsed = JSON.parse(v)
      setVacationOn(parsed.on)
      setVacationUntil(parsed.until ?? '')
      setVacationMsg(parsed.msg ?? '')
    }
  }, [])

  function saveVacation() {
    localStorage.setItem('skrm_vacation', JSON.stringify({ on: true, until: vacationUntil, msg: vacationMsg }))
    setVacationOn(true)
    setShowVacForm(false)
  }

  function disableVacation() {
    localStorage.removeItem('skrm_vacation')
    setVacationOn(false)
    setVacationUntil('')
    setVacationMsg('')
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
    try {
      const updated = await userApi.updateProfile({ name, bio })
      updateUser({ name: updated.name, bio: updated.bio })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {}
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
          <div onClick={() => avatarRef.current?.click()} style={{ width: 72, height: 72, borderRadius: '50%', background: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 700, color: '#fff', flexShrink: 0, cursor: 'pointer', overflow: 'hidden', position: 'relative' }}>
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
        <div style={{ marginBottom: 16 }}>
          <label style={lbl}>Bio</label>
          <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} placeholder="Kerro itsestäsi..." style={{ ...inp, resize: 'vertical' as const }} />
        </div>
        <button onClick={saveProfile} disabled={saving} style={{ background: saved ? '#22c55e' : C.accent, color: '#fff', border: 'none', padding: '9px 20px', borderRadius: 7, fontWeight: 700, fontSize: 14, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.7 : 1 }}>
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
            <button onClick={() => vacationOn ? disableVacation() : setShowVacForm(true)} style={{ background: C.accent, color: '#fff', border: `1px solid ${C.accent}`, padding: '8px 16px', borderRadius: 7, fontWeight: 700, fontSize: 13, cursor: 'pointer', marginLeft: 16, whiteSpace: 'nowrap' }}>
              {vacationOn ? 'Poista lomamoodi' : 'Ota käyttöön'}
            </button>
          )}
        </div>

        {vacationOn && (
          <div style={{ background: '#FFF8E8', border: '1px solid #F59E0B33', borderRadius: 8, padding: '12px 14px' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#F59E0B', marginBottom: 4 }}>Lomamoodi on päällä</div>
            <div style={{ fontSize: 13, color: C.textSub }}>Lähetysaika on tällä hetkellä 7 päivää normaalin 48h sijaan.</div>
            {vacationUntil && <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>Päättyy: {vacationUntil}</div>}
            {vacationMsg && <div style={{ fontSize: 12, color: C.muted, marginTop: 4, fontStyle: 'italic' }}>"{vacationMsg}"</div>}
          </div>
        )}

        {showVacForm && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={lbl}>Loma päättyy (valinnainen)</label>
              <input type="date" value={vacationUntil} onChange={e => setVacationUntil(e.target.value)} style={inp} />
            </div>
            <div>
              <label style={lbl}>Viesti ostajille (valinnainen)</label>
              <textarea value={vacationMsg} onChange={e => setVacationMsg(e.target.value)} placeholder="esim. Olen lomalla 10.8. asti, tilaukset lähtevät viimeistään 11.8." rows={2} style={{ ...inp, resize: 'vertical' as const }} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={saveVacation} style={{ background: C.accent, color: '#fff', border: 'none', padding: '9px 20px', borderRadius: 7, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                Tallenna
              </button>
              <button onClick={() => setShowVacForm(false)} style={{ background: C.surface2, color: C.muted, border: `1px solid ${C.border}`, padding: '9px 16px', borderRadius: 7, fontSize: 13, cursor: 'pointer' }}>
                Peruuta
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
