import { verifySession } from '@/lib/dal'

export default async function ProjetosLayout({ children }: { children: React.ReactNode }) {
  await verifySession()
  return <>{children}</>
}
