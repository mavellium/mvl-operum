import { createHash, randomBytes, randomInt, timingSafeEqual } from 'crypto'

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

// ── Personal Access Tokens (PAT) ──────────────────────────────────────────────

export const API_TOKEN_PREFIX = 'opr_pat_'
const API_TOKEN_RANDOM_BYTES = 32
const BASE62_CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

/** Codifica um buffer como base62, tratando-o como um inteiro grande em base 256. */
function base62Encode(buffer: Buffer): string {
  let value = BigInt('0x' + (buffer.toString('hex') || '0'))
  if (value === 0n) return BASE62_CHARSET[0]
  const base = BigInt(BASE62_CHARSET.length)
  let out = ''
  while (value > 0n) {
    const remainder = Number(value % base)
    out = BASE62_CHARSET[remainder] + out
    value /= base
  }
  return out
}

/**
 * Gera um novo Personal Access Token no formato `opr_pat_<base62>`.
 * O token é retornado em texto plano apenas nesta chamada — só o hash
 * (ver `hashApiToken`) é persistido.
 */
export function generateApiToken(): { token: string; prefix: string } {
  const raw = base62Encode(randomBytes(API_TOKEN_RANDOM_BYTES))
  const token = `${API_TOKEN_PREFIX}${raw}`
  return { token, prefix: token.slice(0, 12) }
}

/** SHA-256 hex — lookup O(1) por hash único; o token já tem alta entropia. */
export function hashApiToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}
