export interface SessionPayload {
  userId: string
  role: string
  expiresAt: Date
}

export type FormState = {
  errors?: Record<string, string | string[]>
  message?: string
} | undefined
