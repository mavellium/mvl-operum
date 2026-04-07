export interface SessionPayload {
  userId: string
  role: string
  tenantId: string
  expiresAt: Date
  tokenVersion?: number
}

export type FormState = {
  errors?: Record<string, string | string[]>
  message?: string
} | undefined
