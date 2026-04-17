export interface SessionPayload {
  userId: string
  role: string
  tenantId: string
  expiresAt: Date
  tokenVersion?: number
  /** JWT ID — used as Redis session key for instant revocation (RS256 sessions) */
  jti?: string
}

export type FormState = {
  errors?: Record<string, string | string[]>
  message?: string
} | undefined
