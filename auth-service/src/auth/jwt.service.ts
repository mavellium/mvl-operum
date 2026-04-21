import { Injectable } from '@nestjs/common'
import { SignJWT, jwtVerify, importPKCS8, importSPKI } from 'jose'
import { v4 as uuidv4 } from 'uuid'

function normalizePem(raw: string): string {
  return raw.replace(/\\n/g, '\n')
}

export interface JwtPayload {
  userId: string
  tenantId: string
  role: string
  tokenVersion: number
  jti: string
  exp?: number
}

const SESSION_DURATION = 7 * 24 * 60 * 60 // 7 days in seconds

@Injectable()
export class JwtService {
  private privateKeyPem: string | null
  private publicKeyPem: string | null

  constructor() {
    this.privateKeyPem = process.env.JWT_PRIVATE_KEY
      ? normalizePem(process.env.JWT_PRIVATE_KEY)
      : null
    this.publicKeyPem = process.env.JWT_PUBLIC_KEY
      ? normalizePem(process.env.JWT_PUBLIC_KEY)
      : null
  }

  async sign(payload: Omit<JwtPayload, 'jti'>): Promise<{ token: string; jti: string }> {
    const jti = uuidv4()

    if (this.privateKeyPem) {
      const privateKey = await importPKCS8(this.privateKeyPem, 'RS256')
      const token = await new SignJWT({ ...payload, jti })
        .setProtectedHeader({ alg: 'RS256' })
        .setIssuedAt()
        .setExpirationTime(`${SESSION_DURATION}s`)
        .setJti(jti)
        .sign(privateKey)
      return { token, jti }
    }

    // HS256 fallback for dev without keys configured
    const secret = process.env.SESSION_SECRET
    if (!secret) throw new Error('FATAL: Neither JWT_PRIVATE_KEY nor SESSION_SECRET is set.')
    const hs256Secret = new TextEncoder().encode(secret)
    const token = await new SignJWT({ ...payload, jti })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(`${SESSION_DURATION}s`)
      .sign(hs256Secret)
    return { token, jti }
  }

  async verify(token: string): Promise<JwtPayload | null> {
    if (this.publicKeyPem) {
      try {
        const publicKey = await importSPKI(this.publicKeyPem, 'RS256')
        const { payload } = await jwtVerify(token, publicKey, { algorithms: ['RS256'] })
        return payload as unknown as JwtPayload
      } catch {
        // fall through
      }
    }

    const secret = process.env.SESSION_SECRET
    if (secret) {
      try {
        const hs256Secret = new TextEncoder().encode(secret)
        const { payload } = await jwtVerify(token, hs256Secret, { algorithms: ['HS256'] })
        return payload as unknown as JwtPayload
      } catch {
        return null
      }
    }

    return null
  }
}
