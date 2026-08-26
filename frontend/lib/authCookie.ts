// Kirjoittaa/poistaa habahub_token-cookien, jota middleware.ts lukee reittisuojausta varten.
// localStorage pysyy edelleen totuuden lähteenä API-kutsujen Authorization-headerille.
export function setAuthCookie(token: string) {
  document.cookie = `habahub_token=${token}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`
}

export function clearAuthCookie() {
  document.cookie = 'habahub_token=; path=/; max-age=0'
}

export function hasAuthCookie(): boolean {
  return document.cookie.split('; ').some(c => c.startsWith('habahub_token='))
}
