'use client'

import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import DocumentoStakeholders from '@/components/projetos/DocumentoStakeholders'
import DocumentSidebar from './DocumentSidebar'
import ProjectCharterWrapper from './ProjectCharterWrapper'
import DocumentoAtas, { type AtaListItem } from './DocumentoAtas'

const DOCUMENT_MAP = {
  stakeholder: DocumentoStakeholders,
  charter: ProjectCharterWrapper,
  atas: DocumentoAtas,
} as const

type DocType = keyof typeof DOCUMENT_MAP

interface Props {
  projetoId: string
  atas: AtaListItem[]
  gerente: boolean
}

export default function DocumentacaoLayout({ projetoId, atas, gerente }: Props) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const raw = searchParams.get('doc') ?? 'stakeholder'
  const activeDoc: DocType = raw in DOCUMENT_MAP ? (raw as DocType) : 'stakeholder'

  function handleSelect(id: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('doc', id)
    router.replace(`${pathname}?${params.toString()}`)
  }

  return (
    <div data-testid="doc-layout" className="flex flex-1 h-full overflow-hidden">
      <DocumentSidebar activeDoc={activeDoc} onSelect={handleSelect} />
      <div data-testid="doc-content" className="flex-1 min-w-0 overflow-y-auto">
        {activeDoc === 'atas' ? (
          <DocumentoAtas projetoId={projetoId} atas={atas} gerente={gerente} />
        ) : activeDoc === 'charter' ? (
          <ProjectCharterWrapper />
        ) : (
          <DocumentoStakeholders />
        )}
      </div>
    </div>
  )
}
