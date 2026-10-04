import { verifySession } from '@/lib/dal'
import { revisarDocumento } from '@/services/documentRevisionService'
import { documentRevisionErrorResponse } from '@/lib/documentRevisionHttp'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ projetoId: string; versionId: string }> },
) {
  const session = await verifySession()
  try {
    const { projetoId, versionId } = await params
    const { action } = z
      .object({ action: z.enum(['approve', 'reject']) })
      .parse(await req.json())
    const result = await revisarDocumento(session, projetoId, versionId, action)
    revalidatePath(`/projetos/${projetoId}`, 'layout')
    return Response.json(result)
  } catch (error) {
    return documentRevisionErrorResponse(error)
  }
}
