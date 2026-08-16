import DocumentacaoLayout from '@/components/projetos/documentacao/DocumentacaoLayout'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Documentação' }

export default function DocumentacaoPage() {
  return (
    <div className="h-full flex flex-col overflow-hidden">
      <DocumentacaoLayout />
    </div>
  )
}
