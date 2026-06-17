import { createHash, randomInt, timingSafeEqual } from 'crypto'

/** Charset sem ambíguos: sem 0/O, 1/I, L */
export const RESET_CODE_CHARSET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
export const RESET_CODE_LENGTH = 8

export function generateResetCode(): string {
  return Array.from({ length: RESET_CODE_LENGTH }, () =>
    RESET_CODE_CHARSET[randomInt(0, RESET_CODE_CHARSET.length)],
  ).join('')
}

export function hashResetCode(code: string): string {
  return createHash('sha256').update(code).digest('hex')
}

/** Comparação em tempo constante para prevenir timing attacks. */
export function compareResetCode(code: string, storedHash: string): boolean {
  const codeHash = Buffer.from(hashResetCode(code), 'hex')
  const stored = Buffer.from(storedHash, 'hex')
  if (codeHash.length !== stored.length) return false
  return timingSafeEqual(codeHash, stored)
}
