import { verifySession } from '@/lib/dal'
import prisma from '@/lib/prisma'
import {
  canProjectPermission,
  requireProjectPermission,
} from '@/services/projectAccess'
import { submeterDocumento } from '@/services/documentRevisionService'
import { metaDocumento } from '@/lib/validation/documentRevisionSchemas'
import { documentRevisionErrorResponse } from '@/lib/documentRevisionHttp'
import { revalidatePath } from 'next/cache'

type Ctx = { params: Promise<{ projetoId: string }> }
export async function GET(req: Request, { params }: Ctx) {
  const session = await verifySession()
  try {
    const { projetoId } = await params
    await requireProjectPermission(session, projetoId, 'documentos:ver')
    const search = new URL(req.url).searchParams.get('search')?.trim()
    const versions = await prisma.documentVersion.findMany({
      where: {
        projectId: projetoId,
        documentType: 'CHARTER',
        resourceId: '',
        ...(search
          ? {
              OR: [
                {
                  commitTitle: {
                    contains: search,
                    mode: 'insensitive' as const,
                  },
                },
                {
                  author: {
                    is: {
                      name: { contains: search, mode: 'insensitive' as const },
                    },
                  },
                },
              ],
            }
          : {}),
      },
      include: { author: { select: { name: true } } },
      orderBy: [{ createdAt: 'desc' }, { sequence: 'desc' }],
      take: 200,
    })
    return Response.json(versions, {
      headers: {
        'x-is-manager': String(
          await canProjectPermission(session, projetoId, 'documentos:aprovar'),
        ),
      },
    })
  } catch (error) {
    return documentRevisionErrorResponse(error)
  }
}
export async function POST(req: Request, { params }: Ctx) {
  const session = await verifySession()
  try {
    const { projetoId } = await params
    const body = await req.json()
    const result = await submeterDocumento(
      session,
      projetoId,
      'CHARTER',
      body.payload,
      metaDocumento.parse(body),
    )
    revalidatePath(`/projetos/${projetoId}`, 'layout')
    return Response.json(result, { status: 201 })
  } catch (error) {
    return documentRevisionErrorResponse(error)
  }
}
