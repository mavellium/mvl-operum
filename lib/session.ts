import { SignJWT, jwtVerify, importPKCS8, importSPKI } from 'jose'
import { v4 as uuidv4 } from 'uuid'
import type { SessionPayload } from '@/types/auth'

// ── HS256 (legacy) ─────────────────────────────────────────────────────────────
// Kept for backward compatibility during the RS256 transition period.
// Existing HS256 sessions (max 7-day TTL) are still accepted by decrypt().
// After 7 days all old sessions expire and this can be removed.
const HS256_SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET ?? 'kanban-dev-secret-key-change-in-production-32c',
)

// ── RS256 (new) ────────────────────────────────────────────────────────────────
// Keys are PEM strings stored in JWT_PRIVATE_KEY / JWT_PUBLIC_KEY env vars.
// In production these are multiline PEMs — newlines can be stored as literal \n.
function normalizePem(raw: string): string {
  return raw.replace(/\\n/g, '\n')
}

const PRIVATE_KEY_PEM = process.env.JWT_PRIVATE_KEY
  ? normalizePem(process.env.JWT_PRIVATE_KEY)
  : null

const PUBLIC_KEY_PEM = process.env.JWT_PUBLIC_KEY
  ? normalizePem(process.env.JWT_PUBLIC_KEY)
  : null

// ── encrypt ────────────────────────────────────────────────────────────────────
// Issues a new RS256 token when keys are available, otherwise falls back to HS256
// (local development without keys configured).
export async function encrypt(payload: SessionPayload): Promise<string> {
  const jti = uuidv4()

  if (PRIVATE_KEY_PEM) {
    const privateKey = await importPKCS8(PRIVATE_KEY_PEM, 'RS256')
    return new SignJWT({ ...payload, jti })
      .setProtectedHeader({ alg: 'RS256' })
      .setIssuedAt()
      .setExpirationTime(payload.expiresAt)
      .setJti(jti)
      .sign(privateKey)
  }

  // HS256 fallback (dev-only — no keys configured)
  return new SignJWT({ ...payload, jti })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(payload.expiresAt)
    .sign(HS256_SECRET)
}

// ── decrypt ────────────────────────────────────────────────────────────────────
// Tries RS256 first (new sessions), then HS256 (legacy sessions).
// This dual-verification allows a seamless transition without logging users out.
export async function decrypt(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null

  // 1. Try RS256 (new tokens)
  if (PUBLIC_KEY_PEM) {
    try {
      const publicKey = await importSPKI(PUBLIC_KEY_PEM, 'RS256')
      const { payload } = await jwtVerify(token, publicKey, { algorithms: ['RS256'] })
      return payload as unknown as SessionPayload
    } catch {
      // Not a valid RS256 token — fall through to HS256
    }
  }

  // 2. Try HS256 (legacy tokens — valid for up to 7 days after migration)
  try {
    const { payload } = await jwtVerify(token, HS256_SECRET, { algorithms: ['HS256'] })
    return payload as unknown as SessionPayload
  } catch {
    return null
  }
}
