import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import https from 'node:https'
import type { AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { isPublicAddress, safeDownload } from '../download'

/** URL com usuário e senha, montada aqui para não ficar literal no código (o TruffleHog acusaria). */
function comCredenciais(url: string): string {
  const u = new URL(url)
  u.username = 'usuario'
  u.password = 'teste'
  return u.toString()
}

describe('isPublicAddress', () => {
  it.each(['8.8.8.8', '1.1.1.1', '142.250.78.14', '2606:4700:4700::1111', '::ffff:8.8.8.8'])('%s é público', ip => {
    expect(isPublicAddress(ip)).toBe(true)
  })

  it.each([
    '127.0.0.1', '10.1.2.3', '172.16.0.1', '172.31.255.255', '192.168.1.1',
    '169.254.169.254', // metadados de nuvem
    '100.64.0.1', '0.0.0.0', '224.0.0.1', '255.255.255.255',
    '::1', '::', 'fe80::1', 'fd00::1', '::ffff:127.0.0.1', '::ffff:7f00:1', '::ffff:10.0.0.1', '64:ff9b::a00:1',
    'nao-e-ip', '',
  ])('%s é recusado', ip => {
    expect(isPublicAddress(ip)).toBe(false)
  })
})

describe('safeDownload recusa antes de conectar', () => {
  const opts = { maxBytes: 1024 }

  it.each([
    ['http://exemplo.com/a.png', /Só URLs HTTPS/],
    ['https://exemplo.com:8443/a.png', /porta padrão/],
    [comCredenciais('https://exemplo.com/a.png'), /usuário ou senha/],
    ['nao é url', /URL inválida/],
    ['https://127.0.0.1/a.png', /não é público/],
    ['https://[::1]/a.png', /não é público/],
    ['https://169.254.169.254/latest/meta-data/', /não é público/],
    ['https://2130706433/a.png', /não é público/], // 127.0.0.1 em decimal
  ])('%s', async (url, erro) => {
    await expect(safeDownload(url, opts)).rejects.toThrow(erro)
  })

  it('nome que resolve para loopback é barrado no lookup da conexão', async () => {
    await expect(safeDownload('https://localhost/a.png', opts)).rejects.toThrow(/não é público/)
  })
})

// Servidor HTTPS local com certificado gerado na hora (sem chave commitada).
const temOpenssl = (() => {
  try {
    execFileSync('openssl', ['version'], { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
})()

describe.skipIf(!temOpenssl)('safeDownload com servidor HTTPS local', () => {
  let dir: string
  let cert: Buffer
  let server: https.Server
  let base: string
  // O servidor é local: libera só o loopback (localhost resolve para ::1 e 127.0.0.1).
  const local = (ip: string) => ip === '127.0.0.1' || ip === '::1'

  beforeAll(async () => {
    dir = mkdtempSync(join(tmpdir(), 'mcp-dl-'))
    execFileSync('openssl', [
      'req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1', '-subj', '/CN=localhost',
      '-addext', 'subjectAltName=DNS:localhost',
      '-keyout', join(dir, 'key.pem'), '-out', join(dir, 'cert.pem'),
    ], { stdio: 'ignore' })
    cert = readFileSync(join(dir, 'cert.pem'))
    server = https.createServer({ key: readFileSync(join(dir, 'key.pem')), cert }, (req, res) => {
      if (req.url === '/eap.png') {
        res.writeHead(200, { 'content-type': 'image/png' })
        res.end(Buffer.from([0x89, 0x50, 0x4e, 0x47]))
      } else if (req.url === '/grande') {
        res.writeHead(200, { 'content-type': 'video/mp4' })
        res.end(Buffer.alloc(2048))
      } else if (req.url === '/sem-tamanho') {
        // Sem Content-Length: o limite vale na contagem do stream.
        res.writeHead(200, { 'content-type': 'video/mp4', 'transfer-encoding': 'chunked' })
        res.write(Buffer.alloc(800))
        res.end(Buffer.alloc(800))
      } else if (req.url === '/redireciona') {
        res.writeHead(302, { location: '/eap.png' })
        res.end()
      } else if (req.url === '/para-dentro') {
        res.writeHead(302, { location: 'https://169.254.169.254/latest/meta-data/' })
        res.end()
      } else {
        res.writeHead(404)
        res.end()
      }
    })
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
    base = `https://localhost:${(server.address() as AddressInfo).port}`
  })

  afterAll(() => {
    server?.close()
    rmSync(dir, { recursive: true, force: true })
  })

  // O servidor de teste não escuta na 443: allowAnyPort libera só a checagem de porta.
  const baixar = (path: string, maxBytes = 1024) =>
    safeDownload(`${base}${path}`, { maxBytes, isAllowedAddress: local, ca: cert, allowAnyPort: true })

  it('baixa o arquivo com tipo e nome', async () => {
    const r = await baixar('/eap.png')
    expect([...r.bytes]).toEqual([0x89, 0x50, 0x4e, 0x47])
    expect(r.contentType).toBe('image/png')
    expect(r.fileName).toBe('eap.png')
  })

  it('segue redirecionamento', async () => {
    const r = await baixar('/redireciona')
    expect(r.fileName).toBe('eap.png')
  })

  it('redirecionamento para endereço interno é recusado', async () => {
    await expect(baixar('/para-dentro')).rejects.toThrow(/não é público/)
  })

  it('recusa pelo Content-Length acima do limite', async () => {
    await expect(baixar('/grande')).rejects.toThrow(/limite de/)
  })

  it('recusa pela contagem do stream quando não há Content-Length', async () => {
    await expect(baixar('/sem-tamanho')).rejects.toThrow(/limite de/)
  })

  it('HTTP de erro vira mensagem clara', async () => {
    await expect(baixar('/nao-existe')).rejects.toThrow(/HTTP 404/)
  })

  it('sem liberar o endereço local, o mesmo servidor é recusado', async () => {
    await expect(safeDownload(`${base}/eap.png`, { maxBytes: 1024, ca: cert, allowAnyPort: true })).rejects.toThrow(/não é público/)
  })
})
