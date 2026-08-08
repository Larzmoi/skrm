'use client'
import { use, useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { useTheme } from '@/lib/theme-context'
import { useLang } from '@/lib/lang-context'
import { useAuth } from '@/lib/auth-context'
import { BACKEND_URL as BACKEND } from '@/lib/backend'
import { userApi } from '@/lib/api'
import { StarRatingDisplay } from '@/components/StarRating'
import ReportModal from '@/components/ReportModal'
import { formatShowTime } from '@/lib/formatShowTime'

export default function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username: rawUsername } = use(params)
  const username = decodeURIComponent(rawUsername)
  const { C } = useTheme()
  const { t, lang } = useLang()
  const { user: currentUser } = useAuth()
  const router = useRouter()

  const [profile, setProfile] = useState<any>(null)
  const [products, setProducts] = useState<any[]>([])
  const [reviews, setReviews] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [following, setFollowing] = useState(false)
  const [followerCount, setFollowerCount] = useState(0)
  const [followBusy, setFollowBusy] = useState(false)
  const [showReport, setShowReport] = useState(false)

  useEffect(() => {
    // Haetaan käyttäjä, hänen tuotteensa ja arvostelunsa
    Promise.all([
      fetch(`${BACKEND}/users/${encodeURIComponent(username)}`).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`${BACKEND}/products?seller=${encodeURIComponent(username)}`).then(r => r.ok ? r.json() : []).catch(() => []),
      userApi.getReviews(username).catch(() => []),
    ]).then(([user, prods, revs]) => {
      setProfile(user)
      setFollowing(!!user?.isFollowing)
      setFollowerCount(user?.followerCount ?? 0)
      setProducts(Array.isArray(prods) ? prods : [])
      setReviews(Array.isArray(revs) ? revs : [])
    }).finally(() => setLoading(false))
  }, [username])

  async function toggleFollow() {
    if (!currentUser) {
      router.push('/login')
      return
    }
    setFollowBusy(true)
    try {
      const data = await userApi.follow(username)
      setFollowing(data.following)
      setFollowerCount(data.followerCount)
    } catch {}
    setFollowBusy(false)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: C.bg }}>
      <Navbar />
      <div style={{ textAlign: 'center', padding: 60, color: C.muted }}>Ladataan...</div>
    </div>
  )

  const displayName = profile?.name ?? username
  const initial = displayName?.[0]?.toUpperCase() ?? '?'

  return (
    <div style={{ minHeight: '100vh', background: C.bg }}>
      <Navbar />
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>

        {/* Lomamoodi */}
        {profile?.onVacation && (
          <div style={{ background: '#FFF8E8', border: '1px solid #F59E0B', borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <div>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#92400E' }}>{t.profile.vacationActive}</span>
              {profile.vacationUntil && <span style={{ fontSize: 13, color: '#92400E' }}> — {t.profile.vacationUntil} {new Date(profile.vacationUntil).toLocaleDateString(lang === 'en' ? 'en-GB' : 'fi-FI')}</span>}
              {profile.vacationMessage && <div style={{ fontSize: 13, color: '#92400E', marginTop: 2, fontStyle: 'italic' }}>"{profile.vacationMessage}"</div>}
            </div>
          </div>
        )}

        {/* Profiilikortti */}
        <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 14, padding: '28px', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, flex: '1 1 220px', minWidth: 0 }}>
              <div style={{ width: 80, height: 80, borderRadius: '50%', background: C.accent, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                {profile?.avatarUrl
                  ? <img src={profile.avatarUrl} alt={username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : initial
                }
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</h1>
                <div style={{ fontSize: 14, color: C.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>@{username}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              {currentUser && currentUser.username !== username && (
                <Link
                  href={`/viestit/${encodeURIComponent(username)}`}
                  style={{ background: C.surface2, color: C.textSub, border: `1px solid ${C.border}`, padding: '9px 20px', borderRadius: 8, fontWeight: 700, fontSize: 14, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
                >
                  {t.profile.message}
                </Link>
              )}
              {(!currentUser || currentUser.username !== username) && (
                <button
                  onClick={toggleFollow}
                  disabled={followBusy}
                  style={{ background: following ? C.surface2 : C.accent, color: following ? C.textSub : '#fff', border: `1px solid ${following ? C.border : C.accent}`, padding: '9px 20px', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: followBusy ? 'default' : 'pointer', opacity: followBusy ? 0.7 : 1 }}
                >
                  {following ? `✓ ${t.profile.following}` : t.profile.follow}
                </button>
              )}
              {currentUser && currentUser.username !== username && profile?.id && (
                <button
                  onClick={() => setShowReport(true)}
                  style={{ background: 'none', border: `1px solid ${C.border}`, color: C.muted, padding: '9px 14px', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
                >
                  ⚑ {t.report.titleUser}
                </button>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            {[
              { label: t.profile.followers, value: followerCount.toString() },
              { label: t.profile.trades, value: products.length.toString() },
              { label: t.profile.rating, value: profile?.avgRating ? `${profile.avgRating.toFixed(1)} (${profile.reviewCount})` : '—' },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: C.text }}>{s.value}</div>
                <div style={{ fontSize: 12, color: C.muted }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Tulevat lähetykset ja huutokaupat — korostettu, jotta ostaja löytää ennakkotarjousta varten */}
        {((profile?.upcomingShows?.length ?? 0) > 0 || (profile?.activeAuctions?.length ?? 0) > 0) && (
          <div style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 14 }}>{t.profile.upcomingSection}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
              {profile.upcomingShows.map((s: any) => (
                <Link key={s.id} href={`/live/${s.id}`} style={{ background: C.accentLight, border: `1px solid ${C.accent}`, borderRadius: 10, overflow: 'hidden', textDecoration: 'none', display: 'block' }}>
                  <div style={{ aspectRatio: '16/9', background: C.surface, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    {s.thumbnailUrl
                      ? <img src={s.thumbnailUrl} alt={s.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <span style={{ fontSize: 11, color: C.accent, fontWeight: 700 }}>LIVE</span>
                    }
                  </div>
                  <div style={{ padding: '10px 12px' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</div>
                    <div style={{ fontSize: 12, color: C.accent, fontWeight: 600 }}>{formatShowTime(s.scheduledAt, t, lang as any)}</div>
                  </div>
                </Link>
              ))}
              {profile.activeAuctions.map((a: any) => (
                <Link key={a.id} href={`/huutokauppa/${a.id}`} style={{ background: C.accentLight, border: `1px solid ${C.accent}`, borderRadius: 10, overflow: 'hidden', textDecoration: 'none', display: 'block' }}>
                  <div style={{ aspectRatio: '1', background: C.surface, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    {a.imageUrl
                      ? <img src={a.imageUrl.split('|||')[0]} alt={a.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <span style={{ fontSize: 32, color: C.dim }}>+</span>
                    }
                  </div>
                  <div style={{ padding: '10px 12px' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: C.text }}>{(a.currentBid ?? a.startPrice).toLocaleString('fi-FI')}€</div>
                    <div style={{ fontSize: 11, color: C.accent, fontWeight: 600 }}>{t.auction.endsIn} {formatShowTime(a.auctionEndsAt, t, lang as any)}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Tuotteet myynnissä */}
        {products.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 14 }}>{t.profile.selling}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
              {products.map((p: any) => (
                <Link key={p.id} href={`/tuotteet/${p.id}`} style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden', textDecoration: 'none', display: 'block' }}>
                  <div style={{ aspectRatio: '1', background: C.surface, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    {p.imageUrl
                      ? <img src={p.imageUrl.split('|||')[0]} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <span style={{ fontSize: 32, color: C.dim }}>+</span>
                    }
                  </div>
                  <div style={{ padding: '10px 12px' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: C.text }}>{p.startPrice?.toLocaleString('fi-FI')}€</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {products.length === 0 && !loading && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: C.muted, fontSize: 14 }}>
            {t.profile.noProducts}
          </div>
        )}

        {/* Arvostelut */}
        {reviews.length > 0 && (
          <div style={{ marginTop: 28 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 14 }}>{t.profile.reviews} <span style={{ color: C.muted, fontWeight: 400 }}>({reviews.length})</span></h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {reviews.map((r: any) => (
                <div key={r.id} style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, gap: 10 }}>
                    <Link href={`/u/${r.reviewer.username}`} style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', minWidth: 0 }}>
                      <div style={{ width: 24, height: 24, borderRadius: '50%', background: C.accent, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                        {r.reviewer.avatarUrl
                          ? <img src={r.reviewer.avatarUrl} alt={r.reviewer.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : r.reviewer.name?.[0]?.toUpperCase()
                        }
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>@{r.reviewer.username}</span>
                    </Link>
                    <span style={{ fontSize: 12, color: C.muted, flexShrink: 0 }}>{new Date(r.createdAt).toLocaleDateString('fi-FI')}</span>
                  </div>
                  <StarRatingDisplay rating={r.rating} />
                  {r.comment && <p style={{ fontSize: 13, color: C.textSub, marginTop: 6, lineHeight: 1.5 }}>{r.comment}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <Footer />
      {showReport && profile?.id && <ReportModal targetType="user" targetId={profile.id} onClose={() => setShowReport(false)} />}
    </div>
  )
}
