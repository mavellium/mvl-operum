import DocumentacaoLayout from '@/components/projetos/documentacao/DocumentacaoLayout'

export const dynamic = 'force-dynamic'

export default function DocumentacaoPage() {
  return (
    <div className="h-full flex flex-col overflow-hidden">
      <DocumentacaoLayout />
    </div>
  )
}
