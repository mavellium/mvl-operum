// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import express from 'express'
import type { Server } from 'node:http'
import { randomBytes } from 'node:crypto'
import { UploadLinks } from '../uploadLink.js'
import { registerUploadRoute } from '../uploadRoute.js'
import type { Gateway } from '../gateway.js'
let server: Server, base: string, links: UploadLinks, upstream: ReturnType<typeof vi.fn>, gw: Gateway
const pat = 'opr_pat_TestTestTest12345'
const token = () => links.issue(pat,'card1','tenant1').upload_url.split('/').at(-1)!
async function send(value: string, filename = 'eap.png', size = 800) { const form = new FormData(); form.append('file',new Blob([new Uint8Array(size)],{ type:'image/png' }),filename); return fetch(`${base}/uploads/${value}`,{ method:'POST',body:form }) }
beforeEach(async()=>{
  links = new UploadLinks({ MCP_UPLOAD_SECRET: randomBytes(32).toString('base64'), MCP_PUBLIC_URL:'https://mcp.example.test' })
  upstream = vi.fn(async (_url,options) => { const body = await new Response(options.body).arrayBuffer(); expect(body.byteLength).toBeGreaterThan(800); return Response.json({ id:'attachment1',cardId:'card1' }) })
  gw = { get: vi.fn(async path=> path==='/auth/me' ? { tenantId:'tenant1' } : { id:'card1' }), post:vi.fn(async()=>({})), patch:vi.fn(),delete:vi.fn(),upload:vi.fn() } as unknown as Gateway
  const app = express(); registerUploadRoute(app,{ links, fetch:upstream as unknown as typeof fetch, gateway:()=>gw, maxBytes:1024 })
  await new Promise<void>(resolve=> { server=app.listen(0,'127.0.0.1',resolve) }); const address = server.address() as { port:number }; base=`http://127.0.0.1:${address.port}`
})
afterEach(async()=>{ server.closeAllConnections(); await new Promise<void>(resolve=>server.close(()=>resolve())) })
describe('upload HTTP multipart',()=>{
  it('encaminha stream ao card correto e rejeita replay antes de escrever',async()=>{
    const value=token(), response=await send(value)
    expect(response.status).toBe(200); expect(await response.json()).toMatchObject({ id:'attachment1' })
    expect(upstream.mock.calls[0][0]).toContain('/files/upload?cardId=card1')
    expect(upstream.mock.calls[0][1].headers.Authorization).toBe(`Bearer ${pat}`)
    expect((await send(value)).status).toBe(410); expect(upstream).toHaveBeenCalledTimes(1)
  })
  it('adulterado é genérico, não verifica gateway nem lê arquivo',async()=>{
    const response=await send('invalid')
    expect(response.status).toBe(400); expect(await response.json()).toEqual({ error:'Link inválido.' }); expect(gw.get).not.toHaveBeenCalled(); expect(upstream).not.toHaveBeenCalled()
  })
  it('tamanho, tipo e campo adicional são recusados sem escrita upstream',async()=>{
    expect((await send(token(),'eap.png',1025)).status).toBe(413)
    const form=new FormData(); form.append('file',new Blob(['exec'],{type:'application/x-executable'}),'file.exe')
    expect((await fetch(`${base}/uploads/${token()}`,{method:'POST',body:form})).status).toBe(400)
    const extra=new FormData(); extra.append('file',new Blob(['ok'],{type:'image/png'}),'eap.png'); extra.append('cardId','other')
    expect((await fetch(`${base}/uploads/${token()}`,{method:'POST',body:extra})).status).toBe(400); expect(upstream).not.toHaveBeenCalled()
  })
  it('revogação e tenant errado falham antes de ler multipart',async()=>{
    vi.mocked(gw.get).mockResolvedValue({tenantId:'other'})
    expect((await send(token())).status).toBe(403); expect(upstream).not.toHaveBeenCalled()
  })
  it('falha upstream consome link e não revela erro interno/PAT',async()=>{
    const value=token(); upstream.mockRejectedValue(new Error(`internal ${pat}`))
    const response=await send(value); expect(response.status).toBe(502); expect(await response.text()).not.toContain(pat)
    expect((await send(value)).status).toBe(410)
  })
  it('limita tentativas por endereço mesmo com X-Forwarded-For forjado',async()=>{
    for(let i=0;i<10;i++) await fetch(`${base}/uploads/invalid`,{method:'POST',headers:{'X-Forwarded-For':`1.1.1.${i}`}})
    expect((await fetch(`${base}/uploads/invalid`,{method:'POST',headers:{'X-Forwarded-For':'2.2.2.2'}})).status).toBe(429)
  })
})

it('dois envios concorrentes do mesmo link produzem somente uma escrita',async()=>{
  const value=token(), results=await Promise.all([send(value),send(value)])
  expect(results.map(r=>r.status).sort()).toEqual([200,410]); expect(upstream).toHaveBeenCalledTimes(1)
})

it('encaminha multipart por HTTP real preservando os bytes do arquivo',async()=>{
  const { createServer }=await import('node:http'), { default: Busboy }=await import('busboy')
  let received: Buffer | undefined
  const actual=createServer((req,res)=>{
    const parser=Busboy({headers:req.headers}), chunks:Buffer[]=[]
    parser.on('file',(field,file,info)=>{
      expect(field).toBe('file'); expect(info.filename).toBe('eap.png')
      file.on('data',chunk=>chunks.push(chunk))
    })
    parser.on('close',()=>{received=Buffer.concat(chunks);res.setHeader('content-type','application/json');res.end(JSON.stringify({id:'real-attachment'}))})
    req.pipe(parser)
  })
  await new Promise<void>(resolve=>actual.listen(0,'127.0.0.1',resolve))
  vi.stubEnv('API_GATEWAY_INTERNAL_URL',`http://127.0.0.1:${(actual.address() as {port:number}).port}`)
  upstream.mockImplementation((url,options)=>fetch(url,options))
  try {
    const response=await send(token()); expect(response.status).toBe(200)
    expect(await response.json()).toEqual({id:'real-attachment'}); expect(received).toEqual(Buffer.alloc(800))
  } finally { vi.unstubAllEnvs(); actual.closeAllConnections(); await new Promise<void>(resolve=>actual.close(()=>resolve())) }
})
