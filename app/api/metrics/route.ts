import { metrics } from '@/lib/operationalTelemetry'
export async function GET(request: Request) {
  if (!process.env.INTERNAL_API_KEY || request.headers.get('authorization') !== `Bearer ${process.env.INTERNAL_API_KEY}`) return new Response(null, { status: 401 })
  return new Response(metrics(), { headers: { 'Content-Type': 'text/plain; version=0.0.4' } })
}
