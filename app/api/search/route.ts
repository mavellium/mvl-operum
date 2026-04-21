import { verifyRouteSession } from '@/lib/routeAuth'
import { cardsApi } from '@/lib/api-client'

export async function GET(request: Request) {
  const session = await verifyRouteSession(request)
  if (!session?.userId) {
    return Response.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const url = new URL(request.url)
  const q = url.searchParams.get('q')?.trim() ?? ''
  if (q.length < 2) {
    return Response.json({ error: 'Consulta muito curta (mínimo 2 caracteres)' }, { status: 400 })
  }

  try {
    const results = await cardsApi.search(q)
    return Response.json({ results })
  } catch {
    return Response.json({ results: [] })
  }
}
