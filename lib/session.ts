import { SignJWT, jwtVerify } from 'jose'
import type { SessionPayload } from '@/types/auth'

const SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET ?? 'kanban-dev-secret-key-change-in-production-32c',
)
const ALG = 'HS256'

export async function encrypt(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime(payload.expiresAt)
    .sign(SECRET)
}

export async function decrypt(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, SECRET, { algorithms: [ALG] })
    return payload as unknown as SessionPayload
  } catch {
    return null
  }
}
