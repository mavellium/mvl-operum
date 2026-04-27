import { NextResponse } from 'next/server'
import { verifyRouteSession } from '@/lib/routeAuth'
import { cardsApi } from '@/lib/api-client'

const ALLOWED_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]

const FILE_SERVICE_URL = (process.env.FILE_SERVICE_URL ?? '').replace(/\/$/, '')
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY ?? ''

export async function POST(request: Request) {
  const session = await verifyRouteSession(request)
  if (!session?.userId) {
    return Response.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const formData = await request.formData()
  const cardId = formData.get('cardId') as string | null
  const file = formData.get('file') as File | null

  if (!cardId) return Response.json({ error: 'cardId é obrigatório' }, { status: 400 })
  if (!file) return Response.json({ error: 'Arquivo é obrigatório' }, { status: 400 })
  if (!ALLOWED_TYPES.includes(file.type)) {
    return Response.json({ error: `Tipo de arquivo não permitido. Use: ${ALLOWED_TYPES.join(', ')}` }, { status: 400 })
  }

  // Verify card exists and is accessible
  const card = await cardsApi.get(cardId).catch(() => null)
  if (!card) return Response.json({ error: 'Acesso negado' }, { status: 403 })

  if (!FILE_SERVICE_URL) {
    return Response.json({ error: 'Serviço de arquivos não configurado' }, { status: 503 })
  }

  const upstream = new FormData()
  upstream.append('file', file)
  const res = await fetch(`${FILE_SERVICE_URL}/files/upload?cardId=${encodeURIComponent(cardId)}`, {
    method: 'POST',
    headers: {
      'X-Internal-Api-Key': INTERNAL_API_KEY,
      'X-User-Id': session.userId as string,
      'X-Tenant-Id': session.tenantId as string,
    },
    body: upstream,
  })
  const body = await res.json().catch(() => ({}))
  return Response.json(body, { status: res.ok ? 201 : res.status })
}

export async function DELETE(request: Request) {
  const session = await verifyRouteSession(request)
  if (!session?.userId) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const url = new URL(request.url)
  const attachmentId = url.searchParams.get('id')
  if (!attachmentId) {
    return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 })
  }

  if (!FILE_SERVICE_URL) {
    return NextResponse.json({ error: 'Serviço de arquivos não configurado' }, { status: 503 })
  }

  const res = await fetch(`${FILE_SERVICE_URL}/files/${encodeURIComponent(attachmentId)}`, {
    method: 'DELETE',
    headers: {
      'X-Internal-Api-Key': INTERNAL_API_KEY,
      'X-User-Id': session.userId as string,
    },
  })
  if (res.status === 204) return new Response(null, { status: 204 })
  const body = await res.json().catch(() => ({}))
  return NextResponse.json(body, { status: res.status })
}
