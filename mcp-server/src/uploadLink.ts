import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import { UserError } from './errors.js'
export const UPLOAD_TTL_MS = 10 * 60_000
export class UploadLinkError extends Error { constructor(readonly status: number) { super(status === 410 ? 'Link expirado ou já utilizado.' : 'Link inválido.') } }
export interface UploadGrant { pat: string; taskId: string; tenantId: string; exp: number; nonce: string; fileName?: string }
export class UploadLinks {
  private readonly nonces = new Map<string, number>()
  constructor(private readonly env: NodeJS.ProcessEnv = process.env, private readonly now = Date.now) {}
  private key() {
    const raw = this.env.MCP_UPLOAD_SECRET ?? ''
    if (!/^[A-Za-z0-9+/]{43}=$/.test(raw) || Buffer.from(raw,'base64').length !== 32) throw new UserError('Configure MCP_UPLOAD_SECRET com 32 bytes aleatórios em base64.')
    return Buffer.from(raw,'base64')
  }
  issue(pat: string, taskId: string, tenantId: string, fileName?: string) {
    const key = this.key()
    let base: URL
    try { base = new URL(this.env.MCP_PUBLIC_URL ?? '') } catch { throw new UserError('Configure MCP_PUBLIC_URL com a URL pública HTTPS do MCP.') }
    if (base.protocol !== 'https:' || base.username || base.password || base.search || base.hash || base.pathname !== '/') throw new UserError('MCP_PUBLIC_URL deve ser uma origem HTTPS, sem credenciais, caminho ou query.')
    for (const [nonce, exp] of this.nonces) if (exp <= this.now()) this.nonces.delete(nonce)
    if (this.nonces.size >= 10_000) throw new UserError('Limite de links pendentes atingido; tente novamente depois.')
    const nonce = randomBytes(24).toString('base64url'), exp = this.now()+UPLOAD_TTL_MS
    const grant: UploadGrant = { pat, taskId, tenantId, exp, nonce, fileName }
    const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm',key,iv)
    const ciphertext = Buffer.concat([cipher.update(JSON.stringify(grant),'utf8'),cipher.final()])
    const token = Buffer.concat([iv,cipher.getAuthTag(),ciphertext]).toString('base64url')
    this.nonces.set(nonce,exp)
    const upload_url = new URL(`/uploads/${token}`,base).href
    return { upload_url, expires_at: new Date(exp).toISOString(), curl: `curl --fail-with-body -F 'file=@<caminho>' '${upload_url}'`, single_use: true }
  }
  consume(token: string): UploadGrant {
    let grant: UploadGrant
    try {
      if (!/^[A-Za-z0-9_-]{40,4096}$/.test(token)) throw Error()
      const bytes = Buffer.from(token,'base64url'), decipher = createDecipheriv('aes-256-gcm',this.key(),bytes.subarray(0,12))
      decipher.setAuthTag(bytes.subarray(12,28))
      grant = JSON.parse(Buffer.concat([decipher.update(bytes.subarray(28)),decipher.final()]).toString())
      if (!/^opr_pat_[A-Za-z0-9]{8,128}$/.test(grant.pat) || !/^[A-Za-z0-9_-]{1,64}$/.test(grant.taskId) || typeof grant.tenantId !== 'string' || !Number.isFinite(grant.exp) || typeof grant.nonce !== 'string') throw Error()
    } catch { throw new UploadLinkError(400) }
    const expires = this.nonces.get(grant.nonce)
    this.nonces.delete(grant.nonce) // reservation is atomic, even parallel requests cannot replay
    if (grant.exp <= this.now() || expires !== grant.exp) throw new UploadLinkError(410)
    return grant
  }
}
export const uploadLinks = new UploadLinks()
