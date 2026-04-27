import { verifySession } from '@/lib/dal'
import { redirect } from 'next/navigation'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { role } = await verifySession()
  if (role !== 'admin') {
    redirect('/projetos')
  }
  return <>{children}</>
}
