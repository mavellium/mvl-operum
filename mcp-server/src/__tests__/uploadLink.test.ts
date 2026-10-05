// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { randomBytes } from 'node:crypto'
import { UploadLinks, UPLOAD_TTL_MS } from '../uploadLink.js'
const pat = 'opr_pat_TestTestTest12345'
describe('link cifrado de upload',()=>{
  it('não expõe PAT, vincula tarefa/tenant e aceita uma única reserva',()=>{
    const links = new UploadLinks({ MCP_UPLOAD_SECRET: randomBytes(32).toString('base64'), MCP_PUBLIC_URL: 'https://mcp.example.test' })
    const link = links.issue(pat,'task1','tenant1','eap.png')
    expect(link.upload_url).not.toContain(pat)
    const token = link.upload_url.split('/').at(-1)!
    expect(links.consume(token)).toMatchObject({ pat, taskId: 'task1', tenantId: 'tenant1', fileName: 'eap.png' })
    expect(()=>links.consume(token)).toThrow('Link expirado ou já utilizado.')
  })
  it('expiração, adulteração e reinício não permitem reutilização',()=>{
    let now = 0; const env = { MCP_UPLOAD_SECRET: randomBytes(32).toString('base64'), MCP_PUBLIC_URL: 'https://mcp.example.test' }
    const links = new UploadLinks(env,()=>now), token = links.issue(pat,'task1','tenant1').upload_url.split('/').at(-1)!
    expect(()=>new UploadLinks(env).consume(token)).toThrow('Link expirado ou já utilizado.')
    expect(()=>links.consume(`${token.slice(0,30)}${token[30] === 'A' ? 'B' : 'A'}${token.slice(31)}`)).toThrow('Link inválido.')
    now += UPLOAD_TTL_MS
    expect(()=>links.consume(token)).toThrow('Link expirado ou já utilizado.')
  })
  it('configuração ausente e origem não HTTPS produzem erro acionável',()=>{
    expect(()=>new UploadLinks({}).issue(pat,'task1','tenant1')).toThrow('MCP_UPLOAD_SECRET')
    expect(()=>new UploadLinks({ MCP_UPLOAD_SECRET: randomBytes(32).toString('base64'), MCP_PUBLIC_URL:'http://example.test' }).issue(pat,'task1','tenant1')).toThrow('MCP_PUBLIC_URL')
  })
})
