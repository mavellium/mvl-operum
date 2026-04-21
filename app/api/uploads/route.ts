import { NextResponse } from 'next/server'
import { verifyRouteSession } from '@/lib/routeAuth'
import { saveUpload, deleteUpload, ValidationError } from '@/services/fileUploadService'
import prisma from '@/lib/prisma'

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

  if (!cardId) {
    return Response.json({ error: 'cardId é obrigatório' }, { status: 400 })
  }

  if (!file) {
    return Response.json({ error: 'Arquivo é obrigatório' }, { status: 400 })
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return Response.json(
      { error: `Tipo de arquivo não permitido. Use: ${ALLOWED_TYPES.join(', ')}` },
      { status: 400 },
    )
  }

  // Verify card belongs to the user's tenant
  const card = await prisma.card.findUnique({
    where: { id: cardId },
    select: { sprint: { select: { project: { select: { tenantId: true } } } } },
  })
  if (!card || card.sprint?.project?.tenantId !== session.tenantId) {
    return Response.json({ error: 'Acesso negado' }, { status: 403 })
  }

  // Proxy to file-service when configured
  if (FILE_SERVICE_URL) {
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

  try {
    const attachment = await saveUpload(file, cardId)
    return Response.json(attachment, { status: 201 })
  } catch (err) {
    if (err instanceof ValidationError) {
      return Response.json({ error: err.message }, { status: 400 })
    }
    throw err
  }
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

  // Proxy to file-service when configured
  if (FILE_SERVICE_URL) {
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

  const attachment = await prisma.attachment.findUnique({ where: { id: attachmentId } })
  if (!attachment) {
    return NextResponse.json({ error: 'Anexo não encontrado' }, { status: 404 })
  }

  try {
    await deleteUpload(attachmentId, session.userId as string)
    return new Response(null, { status: 204 })
  } catch (err) {
    if (err instanceof Error) {
      const statusCode = (err as Error & { status?: number }).status
      if (statusCode === 403 || err.message.includes('permiss') || err.message.toLowerCase().includes('forbid')) {
        return NextResponse.json({ error: err.message }, { status: 403 })
      }
    }
    throw err
  }
}
