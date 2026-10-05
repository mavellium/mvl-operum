import { decrypt } from './session'
import { authServiceVerify } from './authClient'

/** Signature plus current authority proof for all Next server-side entrypoints. */
export async function validatedSession(token: string | undefined) {
  const session = await decrypt(token)
  if (!session || process.env.NODE_ENV !== 'production') return session
  if (!token || !session.jti) return null
  const identity = await authServiceVerify(token)
  if (!identity || identity.userId !== session.userId || identity.tenantId !== session.tenantId) return null
  return { ...session, role: identity.role }
}
