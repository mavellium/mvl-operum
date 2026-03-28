import { decrypt } from '@/lib/session'
import { saveUpload, ValidationError } from '@/services/fileUploadService'

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf']

export async function POST(request: Request) {
  // Auth check
  const cookieHeader = request.headers.get('cookie') ?? ''
  const sessionToken = cookieHeader.match(/session=([^;]+)/)?.[1]
  const session = await decrypt(sessionToken)
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
