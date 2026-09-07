import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'
export function firebaseApp() {
  const c = useRuntimeConfig()
  if (!c.firebaseProjectId || !c.firebaseClientEmail || !c.firebasePrivateKey) throw createError({ statusCode: 503, statusMessage: 'Firebase no está configurado' })
  return getApps()[0] ?? initializeApp({ credential: cert({ projectId: c.firebaseProjectId, clientEmail: c.firebaseClientEmail, privateKey: c.firebasePrivateKey.replace(/\\n/g, '\n') }) })
}
export const database = () => getFirestore(firebaseApp())
export async function requireAdmin(event: import('h3').H3Event) {
  const token = getHeader(event, 'authorization')?.match(/^Bearer (.+)$/)?.[1]
  if (!token) throw createError({ statusCode: 401, statusMessage: 'Inicia sesión' })
  let claims
  try { claims = await getAuth(firebaseApp()).verifyIdToken(token, true) } catch { throw createError({ statusCode: 401, statusMessage: 'Sesión inválida' }) }
  if (claims.admin !== true) throw createError({ statusCode: 403, statusMessage: 'Acceso restringido' })
  return claims
}
