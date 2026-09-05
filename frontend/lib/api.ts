import { BACKEND_URL as BACKEND } from './backend'

function getToken() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('habahub_token')
}

async function request(path: string, options: RequestInit = {}) {
  const token = getToken()
  const res = await fetch(`${BACKEND}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? 'Virhe')
  return data
}

export const api = {
  getProducts: (params?: Record<string, string>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : ''
    return request(`/products${q}`)
  },
  getMyProducts: () => request('/products/mine'),
  getProduct: (id: string) => request(`/products/${id}`),
  createProduct: (data: any) => request('/products', { method: 'POST', body: JSON.stringify(data) }),
  updateProduct: (id: string, data: any) => request(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProduct: (id: string) => request(`/products/${id}`, { method: 'DELETE' }),
  prebid: (id: string, amount: number) => request(`/products/${id}/prebid`, { method: 'POST', body: JSON.stringify({ amount }) }),
  bulkCreateProducts: (
    products: { name: string; startPrice: number; quantity?: number; condition?: string; description?: string }[],
    batch?: { category?: string; alakategoria?: string; tyyppi?: string; saleType?: 'buy_now' | 'both' },
  ) =>
    request('/products/bulk', { method: 'POST', body: JSON.stringify({ products, ...batch }) }),
}

export const userApi = {
  updateProfile: (data: { name?: string; bio?: string; phone?: string; address?: string; postalCode?: string; city?: string; businessId?: string; email?: string; username?: string; avatarUrl?: string; vacationUntil?: string | null; vacationMessage?: string | null; newsletterOptIn?: boolean }) =>
    request('/users/me', { method: 'PATCH', body: JSON.stringify(data) }),
  getPublic: (username: string) => request(`/users/${encodeURIComponent(username)}`),
  follow: (username: string) => request(`/users/${encodeURIComponent(username)}/follow`, { method: 'POST' }),
  getReviews: (username: string) => request(`/users/${encodeURIComponent(username)}/reviews`),
  getFollowers: (username: string) => request(`/users/${encodeURIComponent(username)}/followers`),
  getStreamInfo: () => request('/users/me/stream-info'),
  regenerateStreamKey: () => request('/users/me/stream-key/regenerate', { method: 'POST' }),
  getPublishToken: () => request('/users/me/publish-token', { method: 'POST' }),
}

export const cartApi = {
  add: (productId: string, source: 'live' | 'direct', quantity: number = 1) => request('/cart/add', { method: 'POST', body: JSON.stringify({ productId, source, quantity }) }),
  get: () => request('/cart'),
  remove: (itemId: string) => request(`/cart/${itemId}`, { method: 'DELETE' }),
  checkout: (sellerId: string) => request('/cart/checkout', { method: 'POST', body: JSON.stringify({ sellerId }) }),
}

export const orderApi = {
  mine: () => request('/orders/mine'),
  selling: () => request('/orders/selling'),
  selectShipping: (orderId: string, pakettikokoId: string, pickupPointId?: string) => request(`/orders/${orderId}/select-shipping`, { method: 'POST', body: JSON.stringify({ pakettikokoId, pickupPointId }) }),
  pay: (orderId: string) => request(`/orders/${orderId}/pay`, { method: 'POST' }),
  addTracking: (orderId: string, trackingCode: string) => request(`/orders/${orderId}/tracking`, { method: 'POST', body: JSON.stringify({ trackingCode }) }),
  createShipment: (orderId: string, pakettikoko: 'PIENI' | 'ISO') => request(`/orders/${orderId}/create-shipment`, { method: 'POST', body: JSON.stringify({ pakettikoko }) }),
  confirmPickup: (orderId: string, code: string) => request(`/orders/${orderId}/confirm-pickup`, { method: 'POST', body: JSON.stringify({ code }) }),
  confirmDelivery: (orderId: string) => request(`/orders/${orderId}/confirm-delivery`, { method: 'POST' }),
  dispute: (orderId: string, reason: string) => request(`/orders/${orderId}/dispute`, { method: 'POST', body: JSON.stringify({ reason }) }),
  review: (orderId: string, rating: number, comment?: string) => request(`/orders/${orderId}/review`, { method: 'POST', body: JSON.stringify({ rating, comment }) }),
  refund: (orderId: string, itemIds?: string[]) => request(`/orders/${orderId}/refund`, { method: 'POST', body: JSON.stringify({ itemIds }) }),
  // Postin osoitetarran PDF ei voi olla plain <a href> - reitti vaatii JWT:n Authorization-
  // headerissa, jota selain ei lähetä pelkän linkin klikkauksella. Haetaan siis fetch+blob:na
  // ja avataan uudessa välilehdessä object URL:na, ks. CLAUDE.md "Lähetysintegraatio" 2026-09-04.
  openLabelPdf: async (orderId: string) => {
    const token = getToken()
    const res = await fetch(`${BACKEND}/orders/${orderId}/label-pdf`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error ?? 'Osoitetarran haku epäonnistui')
    }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
  },
}

export interface PickupPoint { id: string; name: string; address: string; city: string; postalCode: string }

export const postiApi = {
  // Korvaa lib/postiPickupPoints.ts:n 5 mock-pistettä oikealla noutopistelistalla,
  // ks. CLAUDE.md "48H JULKAISUPAINE" 2026-09-04 + "Iso testauskierros" kohta 2 (koko maan
  // kattava sivutuskorjaus 2026-09-05, oli aiemmin vain pääkaupunkiseutu).
  pickupPoints: (): Promise<PickupPoint[]> => request('/posti/pickup-points'),
}

// Järjestää noutopisteet ostajan oman postinumeron mukaan lähimmät ensin - yksinkertainen,
// riippuvuudeton "läheisyys"-arvio (yhteisten alkunumeroiden määrä postinumeroissa) ilman
// koordinaatteja/geokoodausta, koska Suomen postinumerot on jaettu hierarkkisesti alueittain
// (esim. 00xxx=Helsinki, 90xxx=Oulu) - toimii hyvin "sama kaupunki/seutu ensin" -tarkoitukseen.
export function sortPickupPointsByProximity(points: PickupPoint[], buyerPostalCode?: string | null): PickupPoint[] {
  const buyer = (buyerPostalCode ?? '').trim()
  if (!buyer) return points
  function matchLen(pc: string) {
    let n = 0
    while (n < buyer.length && n < pc.length && buyer[n] === pc[n]) n++
    return n
  }
  return [...points].sort((a, b) => matchLen(b.postalCode) - matchLen(a.postalCode) || a.city.localeCompare(b.city))
}

export interface AdSlot {
  id: string; enabled: boolean
  eyebrow: string; title: string; body: string; ctaText: string; ctaHref: string
  imageUrl: string | null
}

export const adApi = {
  // Julkinen, ei vaadi kirjautumista - etusivun mainosbanneri (ks. CLAUDE.md "Iso
  // testauskierros 2026-09-04" kohta 6). Palauttaa null jos ei konfiguroitu/pois päältä.
  get: (): Promise<AdSlot | null> => request('/ad'),
}

export const showApi = {
  create: (data: { title: string; category?: string; alakategoria?: string; city?: string; scheduledAt?: string; thumbnailUrl?: string }) => request('/shows', { method: 'POST', body: JSON.stringify(data) }),
  mine: () => request('/shows/mine'),
  getStreamInfo: (id: string) => request(`/shows/${id}/stream-info`),
  setStatus: (id: string, status: 'LIVE' | 'ENDED', thumbnailUrl?: string) => request(`/shows/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status, thumbnailUrl }) }),
  remove: (id: string) => request(`/shows/${id}`, { method: 'DELETE' }),
  claimProducts: (id: string) => request(`/shows/${id}/claim-products`, { method: 'POST' }),
}

export const auctionApi = {
  list: (params?: Record<string, string>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : ''
    return request(`/auctions${q}`)
  },
  get: (id: string) => request(`/auctions/${id}`),
  bid: (id: string, amount: number) => request(`/auctions/${id}/bid`, { method: 'POST', body: JSON.stringify({ amount }) }),
  autobid: (id: string, maxAmount: number) => request(`/auctions/${id}/autobid`, { method: 'POST', body: JSON.stringify({ maxAmount }) }),
  buyNow: (id: string) => request(`/auctions/${id}/buy-now`, { method: 'POST' }),
}

export const notificationApi = {
  list: () => request('/notifications'),
  markRead: (id?: string) => request('/notifications/read', { method: 'POST', body: JSON.stringify(id ? { id } : {}) }),
  remove: (id: string) => request(`/notifications/${id}`, { method: 'DELETE' }),
}

export const pushApi = {
  subscribe: (endpoint: string, p256dh: string, auth: string) =>
    request('/push/subscribe', { method: 'POST', body: JSON.stringify({ endpoint, keys: { p256dh, auth } }) }),
  unsubscribe: (endpoint: string) => request('/push/unsubscribe', { method: 'POST', body: JSON.stringify({ endpoint }) }),
}

export const reportApi = {
  create: (targetType: 'product' | 'show' | 'user', targetId: string, reason: string, description?: string) =>
    request('/reports', { method: 'POST', body: JSON.stringify({ targetType, targetId, reason, description }) }),
}

export const adminApi = {
  reports: (status?: 'PENDING' | 'REVIEWED') => request(`/admin/reports${status ? `?status=${status}` : ''}`),
  markReviewed: (id: string) => request(`/admin/reports/${id}`, { method: 'PATCH' }),
  deleteProduct: (id: string, reason: string) => request(`/admin/products/${id}`, { method: 'DELETE', body: JSON.stringify({ reason }) }),
  deleteShow: (id: string, reason: string) => request(`/admin/shows/${id}`, { method: 'DELETE', body: JSON.stringify({ reason }) }),
  listUsers: (params: { search?: string; page?: number; pageSize?: number } = {}) => {
    const q = new URLSearchParams()
    if (params.search) q.set('search', params.search)
    q.set('page', String(params.page ?? 1))
    q.set('pageSize', String(params.pageSize ?? 30))
    return request(`/admin/users?${q.toString()}`)
  },
  banUser: (id: string, reason: string, days: number) => request(`/admin/users/${id}/ban`, { method: 'POST', body: JSON.stringify({ reason, days }) }),
  updateUser: (id: string, data: { canStream?: boolean; customCommissionRate?: number | null; customCommissionCap?: number | null }) =>
    request(`/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  removeBan: (id: string) => request(`/admin/users/${id}/ban`, { method: 'DELETE' }),
  sendPasswordReset: (id: string) => request(`/admin/users/${id}/send-password-reset`, { method: 'POST' }),
  getAd: (): Promise<AdSlot> => request('/admin/ad'),
  updateAd: (data: Partial<Omit<AdSlot, 'id'>>): Promise<AdSlot> => request('/admin/ad', { method: 'PATCH', body: JSON.stringify(data) }),
}

export interface ProductPreset {
  id: string; name: string; condition?: string | null
  category?: string | null; alakategoria?: string | null; tyyppi?: string | null
  imageUrl?: string | null; description?: string | null
  favorite: boolean; lastUsedAt?: string | null; createdAt: string
}

export const presetApi = {
  list: (search?: string) => request(`/presets${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  create: (data: { name: string; condition?: string; category?: string; alakategoria?: string; tyyppi?: string; imageUrl?: string; description?: string }) =>
    request('/presets', { method: 'POST', body: JSON.stringify(data) }),
  bulkCreate: (text: string, batch?: { category?: string; alakategoria?: string; tyyppi?: string }) =>
    request('/presets/bulk', { method: 'POST', body: JSON.stringify({ text, ...batch }) }),
  update: (id: string, data: Partial<{ name: string; condition: string | null; category: string | null; alakategoria: string | null; tyyppi: string | null; imageUrl: string | null; description: string | null; favorite: boolean }>) =>
    request(`/presets/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  markUsed: (id: string) => request(`/presets/${id}/use`, { method: 'POST' }),
  remove: (id: string) => request(`/presets/${id}`, { method: 'DELETE' }),
}

export const messageApi = {
  conversations: () => request('/messages'),
  thread: (userId: string) => request(`/messages/${userId}`),
  send: (receiverId: string, body: string, productId?: string) => request('/messages', { method: 'POST', body: JSON.stringify({ receiverId, body, productId }) }),
}
