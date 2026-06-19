import { redirect } from 'next/navigation'
import { resolveProjectDestination } from '@/lib/dal'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const destination = await resolveProjectDestination()
  redirect(destination ?? '/no-project')
}
