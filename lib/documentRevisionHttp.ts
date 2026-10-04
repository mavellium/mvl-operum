import { z } from 'zod'
import { SemPermissaoError } from '@/services/authz'
import { DocumentRevisionError } from './documentRevisionError'

export function documentRevisionErrorResponse(error: unknown) {
  if (error instanceof SemPermissaoError)
    return Response.json({ error: error.message }, { status: 403 })
  if (error instanceof DocumentRevisionError)
    return Response.json({ error: error.message }, { status: error.status })
  if (error instanceof z.ZodError)
    return Response.json(
      { error: error.issues[0]?.message ?? 'Dados inválidos' },
      { status: 400 },
    )
  if (error instanceof SyntaxError)
    return Response.json({ error: 'JSON inválido' }, { status: 400 })
  console.error('[document revisions]', error)
  return Response.json(
    { error: 'Não foi possível processar o documento' },
    { status: 500 },
  )
}
