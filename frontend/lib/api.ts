import { BACKEND_URL as BACKEND } from './backend'

function getToken() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('skrm_token')
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
}

export const userApi = {
  updateProfile: (data: { name?: string; bio?: string; phone?: string; address?: string; postalCode?: string; city?: string; businessId?: string; email?: string; username?: string; avatarUrl?: string; vacationUntil?: string | null; vacationMessage?: string | null }) =>
    request('/users/me', { method: 'PATCH', body: JSON.stringify(data) }),
  getPublic: (username: string) => request(`/users/${encodeURIComponent(username)}`),
  follow: (username: string) => request(`/users/${encodeURIComponent(username)}/follow`, { method: 'POST' }),
  getReviews: (username: string) => request(`/users/${encodeURIComponent(username)}/reviews`),
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
  createShipment: (orderId: string) => request(`/orders/${orderId}/create-shipment`, { method: 'POST' }),
  confirmPickup: (orderId: string, code: string) => request(`/orders/${orderId}/confirm-pickup`, { method: 'POST', body: JSON.stringify({ code }) }),
  confirmDelivery: (orderId: string) => request(`/orders/${orderId}/confirm-delivery`, { method: 'POST' }),
  dispute: (orderId: string, reason: string) => request(`/orders/${orderId}/dispute`, { method: 'POST', body: JSON.stringify({ reason }) }),
  review: (orderId: string, rating: number, comment?: string) => request(`/orders/${orderId}/review`, { method: 'POST', body: JSON.stringify({ rating, comment }) }),
  refund: (orderId: string, itemIds?: string[]) => request(`/orders/${orderId}/refund`, { method: 'POST', body: JSON.stringify({ itemIds }) }),
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
  searchUsers: (search: string) => request(`/admin/users?search=${encodeURIComponent(search)}`),
  banUser: (id: string, reason: string, days: number) => request(`/admin/users/${id}/ban`, { method: 'POST', body: JSON.stringify({ reason, days }) }),
}

export const messageApi = {
  conversations: () => request('/messages'),
  thread: (userId: string) => request(`/messages/${userId}`),
  send: (receiverId: string, body: string, productId?: string) => request('/messages', { method: 'POST', body: JSON.stringify({ receiverId, body, productId }) }),
}
