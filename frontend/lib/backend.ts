// Yksi paikka backendin URL:lle — poistaa mahdollisen loppukauttaviivan,
// jotta esim. NEXT_PUBLIC_BACKEND_URL="https://foo/" ei tuota "https://foo//auth/login" 404:aa
export const BACKEND_URL = (process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:4000').replace(/\/+$/, '')
