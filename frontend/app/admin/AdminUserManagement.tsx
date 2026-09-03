'use client'

import { useEffect, useState } from 'react'
import { useTheme } from '@/lib/theme-context'
import { useLang } from '@/lib/lang-context'
import { adminApi } from '@/lib/api'

type Ban = {
  id: string
  reason: string
  endsAt: string
  createdAt?: string
}

type AdminUser = {
  id: string
  name: string
  username: string
  email: string
  role: 'USER' | 'ADMIN'
  canStream: boolean
  customCommissionRate: number | null
  customCommissionCap: number | null
  activeBan: Ban | null
  createdAt: string
  verified: boolean
}

const PAGE_SIZE = 30

// Kytketty INTEGRATION.md:n suunnitelman mukaisesti oikeisiin adminApi-kutsuihin 2026-09-02
// (ks. CLAUDE.md) — searchUsers/banUser käyttävät jo olemassa olevia adminApi-metodeja
// sellaisenaan, updateUser/removeBan/sendPasswordReset ovat uusia metodeja jotka vastaavat
// uusia backend-reittejä (PATCH/DELETE/POST /admin/users/:id/...).

const DEFAULT_RATE = 3.5
const DEFAULT_CAP = 35

function isActiveBan(ban: Ban | null) {
  return !!ban && new Date(ban.endsAt).getTime() > Date.now()
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('fi-FI')
}

async function listUsers(search: string, page: number): Promise<{ users: AdminUser[]; total: number }> {
  return adminApi.listUsers({ search: search || undefined, page, pageSize: PAGE_SIZE })
}

async function updateUser(id: string, data: {
  canStream?: boolean
  customCommissionRate?: number | null
  customCommissionCap?: number | null
}) {
  return adminApi.updateUser(id, data)
}

async function banUser(id: string, reason: string, days: number) {
  return adminApi.banUser(id, reason, days)
}

async function removeBan(id: string) {
  return adminApi.removeBan(id)
}

async function sendPasswordReset(id: string) {
  return adminApi.sendPasswordReset(id)
}

function UserRow({
  user,
  t,
  C,
  onReload,
}: {
  user: AdminUser
  t: any
  C: any
  onReload: () => void
}) {
  const [canStream, setCanStream] = useState(user.canStream)
  const [rate, setRate] = useState(user.customCommissionRate?.toString() ?? '')
  const [cap, setCap] = useState(user.customCommissionCap?.toString() ?? '')
  const [banReason, setBanReason] = useState('')
  const [banDays, setBanDays] = useState('30')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  const activeBan = isActiveBan(user.activeBan)

  useEffect(() => {
    setCanStream(user.canStream)
    setRate(user.customCommissionRate?.toString() ?? '')
    setCap(user.customCommissionCap?.toString() ?? '')
  }, [user])

  async function saveSettings() {
    setBusy(true)
    setMessage('')
    try {
      await updateUser(user.id, {
        canStream,
        customCommissionRate: rate.trim() === '' ? null : Number(rate),
        customCommissionCap: cap.trim() === '' ? null : Number(cap),
      })
      setMessage(t.admin.userSettingsSaved)
      onReload()
    } catch (error: any) {
      setMessage(error?.message ?? t.admin.userSettingsError)
    } finally {
      setBusy(false)
    }
  }

  async function doBan() {
    if (!banReason.trim()) return
    const days = Number(banDays)
    if (!Number.isFinite(days) || days < 1) return

    setBusy(true)
    setMessage('')
    try {
      await banUser(user.id, banReason.trim(), days)
      setBanReason('')
      setMessage(t.admin.banSuccess)
      onReload()
    } catch (error: any) {
      setMessage(error?.message ?? t.admin.banError)
    } finally {
      setBusy(false)
    }
  }

  async function doRemoveBan() {
    setBusy(true)
    setMessage('')
    try {
      await removeBan(user.id)
      setMessage(t.admin.banRemoved)
      onReload()
    } catch (error: any) {
      setMessage(error?.message ?? t.admin.banError)
    } finally {
      setBusy(false)
    }
  }

  async function doReset() {
    setBusy(true)
    setMessage('')
    try {
      await sendPasswordReset(user.id)
      setMessage(t.admin.passwordResetSent)
    } catch (error: any) {
      setMessage(error?.message ?? t.admin.passwordResetError)
    } finally {
      setBusy(false)
    }
  }

  function setSuperuserValues() {
    setRate('3.0')
    setCap('25')
  }

  const inputStyle = {
    width: '100%',
    boxSizing: 'border-box' as const,
    background: C.surface,
    border: `1px solid ${C.border}`,
    color: C.text,
    borderRadius: 7,
    padding: '8px 9px',
    fontSize: 13,
  }

  const buttonStyle = {
    background: C.surface,
    border: `1px solid ${C.border}`,
    color: C.textSub,
    borderRadius: 7,
    padding: '8px 11px',
    fontSize: 12,
    fontWeight: 650,
    cursor: 'pointer',
  }

  return (
    <div
      style={{
        background: C.cardBg,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        padding: 16,
      }}
    >
      {/* overflowX: auto - ruudukon minmax-sarakkeilla on kiinteä minimileveys (yht. ~550px+),
          eivät rivity useammalle riville kapealla näytöllä kuten auto-fit/auto-fill tekisi.
          Tämä pitää mahdollisen ylivuodon oman laatikkonsa sisällä eikä koko sivun leveydellä
          (ks. sivuston LUKITTU "ei sivuttaissvollausta" -periaate). */}
      <div style={{ overflowX: 'auto' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(180px, 1.4fr) minmax(130px, .7fr) minmax(120px, .7fr) minmax(120px, .7fr)',
          gap: 14,
          alignItems: 'start',
          minWidth: 560,
        }}
      >
        <div>
          <div style={{ color: C.text, fontWeight: 750, fontSize: 14 }}>
            {user.name}
          </div>
          <div style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>
            @{user.username}
          </div>
          <div style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>
            {user.email}
          </div>
          <div style={{ color: C.muted, fontSize: 11, marginTop: 4 }}>
            {t.admin.joined} {formatDate(user.createdAt)}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
            {user.role === 'ADMIN' && (
              <div
                style={{
                  display: 'inline-block',
                  padding: '3px 7px',
                  borderRadius: 6,
                  background: C.accentLight,
                  color: C.accent,
                  fontSize: 10,
                  fontWeight: 750,
                }}
              >
                ADMIN
              </div>
            )}
            <div
              style={{
                display: 'inline-block',
                padding: '3px 7px',
                borderRadius: 6,
                background: user.verified ? C.accentLight : C.surface2,
                color: user.verified ? C.accent : C.muted,
                fontSize: 10,
                fontWeight: 750,
              }}
            >
              {user.verified ? t.admin.verifiedYes : t.admin.verifiedNo}
            </div>
          </div>
        </div>

        <label style={{ color: C.textSub, fontSize: 12 }}>
          {t.admin.canStream}
          <div style={{ marginTop: 7 }}>
            <button
              type="button"
              onClick={() => setCanStream(value => !value)}
              aria-pressed={canStream}
              style={{
                width: 52,
                height: 28,
                borderRadius: 20,
                border: `1px solid ${canStream ? C.accent : C.border}`,
                background: canStream ? C.accentSolid : C.surface2,
                cursor: 'pointer',
                position: 'relative',
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  top: 3,
                  left: canStream ? 27 : 3,
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  background: canStream ? C.accentText : C.muted,
                  transition: 'left .15s ease',
                }}
              />
            </button>
          </div>
        </label>

        <label style={{ color: C.textSub, fontSize: 12 }}>
          {t.admin.commissionRate}
          <input
            type="number"
            min="0"
            max="100"
            step="0.1"
            value={rate}
            onChange={e => setRate(e.target.value)}
            placeholder={`${DEFAULT_RATE}`}
            style={{ ...inputStyle, marginTop: 7 }}
          />
        </label>

        <label style={{ color: C.textSub, fontSize: 12 }}>
          {t.admin.commissionCap}
          <input
            type="number"
            min="0"
            step="0.01"
            value={cap}
            onChange={e => setCap(e.target.value)}
            placeholder={`${DEFAULT_CAP}`}
            style={{ ...inputStyle, marginTop: 7 }}
          />
        </label>
      </div>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 8,
          flexWrap: 'wrap',
          alignItems: 'center',
          marginTop: 14,
          paddingTop: 14,
          borderTop: `1px solid ${C.border}`,
        }}
      >
        <button type="button" onClick={setSuperuserValues} style={buttonStyle}>
          {t.admin.setSuperuserValues}
        </button>

        <button
          type="button"
          onClick={saveSettings}
          disabled={busy}
          style={{
            ...buttonStyle,
            background: C.accentSolid,
            color: C.accentText,
            borderColor: C.accentSolid,
          }}
        >
          {t.admin.saveUserSettings}
        </button>

        <button type="button" onClick={doReset} disabled={busy} style={buttonStyle}>
          {t.admin.sendPasswordReset}
        </button>
      </div>

      <div style={{ marginTop: 14 }}>
        <div style={{ color: C.textSub, fontSize: 12, fontWeight: 700, marginBottom: 7 }}>
          {t.admin.banStatus}
        </div>

        {activeBan ? (
          <div
            style={{
              display: 'flex',
              gap: 10,
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              background: C.warnLight,
              border: `1px solid ${C.warn}`,
              borderRadius: 8,
              padding: '9px 11px',
            }}
          >
            <div style={{ color: C.text, fontSize: 12 }}>
              <strong>{t.admin.banned}</strong>
              {' · '}
              {t.admin.banUntil} {formatDate(user.activeBan!.endsAt)}
              <div style={{ color: C.textSub, marginTop: 3 }}>
                {user.activeBan!.reason}
              </div>
            </div>

            <button
              type="button"
              onClick={doRemoveBan}
              disabled={busy}
              style={{
                ...buttonStyle,
                color: C.red,
                borderColor: C.red,
              }}
            >
              {t.admin.removeBan}
            </button>
          </div>
        ) : (
          <div style={{ color: C.muted, fontSize: 12 }}>
            {t.admin.notBanned}
          </div>
        )}
      </div>

      {!activeBan && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(160px, 1fr) 90px auto',
            gap: 8,
            marginTop: 10,
          }}
        >
          <input
            value={banReason}
            onChange={e => setBanReason(e.target.value)}
            placeholder={t.admin.banReasonPlaceholder}
            style={inputStyle}
          />
          <input
            type="number"
            min="1"
            value={banDays}
            onChange={e => setBanDays(e.target.value)}
            aria-label={t.admin.banDays}
            style={inputStyle}
          />
          <button
            type="button"
            onClick={doBan}
            disabled={busy || !banReason.trim()}
            style={{
              ...buttonStyle,
              color: C.red,
              borderColor: C.red,
              opacity: busy || !banReason.trim() ? .55 : 1,
            }}
          >
            {t.admin.ban}
          </button>
        </div>
      )}

      {message && (
        <div
          style={{
            marginTop: 10,
            color: C.textSub,
            fontSize: 12,
          }}
        >
          {message}
        </div>
      )}
    </div>
  )
}

export default function AdminUserManagement() {
  const { C } = useTheme()
  const { t } = useLang()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)

  async function loadUsers(searchValue: string, pageValue: number) {
    setLoading(true)
    try {
      const result = await listUsers(searchValue.trim(), pageValue)
      setUsers(result.users)
      setTotal(result.total)
    } finally {
      setLoading(false)
    }
  }

  // Näytä kaikki käyttäjät oletuksena (ei enää vaadi vähintään 2-merkkistä hakua) — hakua
  // käytetään vain suodattamaan, ei ehtona sille näytetäänkö mitään ollenkaan. `search`-inputin
  // onChange nollaa `page`:n samassa tapahtumakäsittelijässä (ks. alempana), jotta molemmat
  // tilamuutokset batchautuvat yhteen renderiin eikä välissä ehdi hakea väärällä sivunumerolla.
  useEffect(() => {
    const timer = setTimeout(() => loadUsers(search, page), 300)
    return () => clearTimeout(timer)
  }, [search, page])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <section>
      <div style={{ marginBottom: 18 }}>
        <h2 style={{ margin: 0, color: C.text, fontSize: 18, fontWeight: 800 }}>
          {t.admin.userManagementTitle}
        </h2>
        <p style={{ margin: '5px 0 0', color: C.muted, fontSize: 13 }}>
          {t.admin.userManagementSubtitle}
        </p>
      </div>

      <input
        value={search}
        onChange={e => { setSearch(e.target.value); setPage(1) }}
        placeholder={t.admin.userSearchPlaceholder}
        style={{
          width: '100%',
          boxSizing: 'border-box',
          background: C.surface,
          border: `1px solid ${C.border}`,
          color: C.text,
          borderRadius: 8,
          padding: '11px 13px',
          fontSize: 14,
          marginBottom: 12,
        }}
      />

      {!loading && (
        <div style={{ color: C.muted, fontSize: 12, marginBottom: 10 }}>
          {t.admin.totalUsers.replace('{count}', String(total))}
        </div>
      )}

      {loading && (
        <div style={{ color: C.muted, fontSize: 13, padding: '14px 0' }}>
          {t.admin.loadingUsers}
        </div>
      )}

      {!loading && users.length === 0 && (
        <div style={{ color: C.muted, fontSize: 13, padding: '14px 0' }}>
          {t.admin.noUsersFound}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {users.map(user => (
          <UserRow
            key={user.id}
            user={user}
            t={t}
            C={C}
            onReload={() => loadUsers(search, page)}
          />
        ))}
      </div>

      {!loading && totalPages > 1 && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'center', marginTop: 18 }}>
          <button
            type="button"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              color: C.textSub,
              borderRadius: 7,
              padding: '8px 14px',
              fontSize: 12,
              fontWeight: 650,
              cursor: page <= 1 ? 'default' : 'pointer',
              opacity: page <= 1 ? 0.5 : 1,
            }}
          >
            {t.admin.prevPage}
          </button>
          <span style={{ color: C.muted, fontSize: 12 }}>
            {t.admin.pageInfo.replace('{page}', String(page)).replace('{total}', String(totalPages))}
          </span>
          <button
            type="button"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              color: C.textSub,
              borderRadius: 7,
              padding: '8px 14px',
              fontSize: 12,
              fontWeight: 650,
              cursor: page >= totalPages ? 'default' : 'pointer',
              opacity: page >= totalPages ? 0.5 : 1,
            }}
          >
            {t.admin.nextPage}
          </button>
        </div>
      )}
    </section>
  )
}
