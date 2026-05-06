'use client'

import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import DocumentoStakeholders from '@/components/projetos/DocumentoStakeholders'
import DocumentSidebar from './DocumentSidebar'
import ProjectCharterWrapper from './ProjectCharterWrapper'

const DOCUMENT_MAP = {
  stakeholder: DocumentoStakeholders,
  charter: ProjectCharterWrapper,
} as const

type DocType = keyof typeof DOCUMENT_MAP

export default function DocumentacaoLayout() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const raw = searchParams.get('doc') ?? 'stakeholder'
  const activeDoc: DocType = raw in DOCUMENT_MAP ? (raw as DocType) : 'stakeholder'
  const ActiveComponent = DOCUMENT_MAP[activeDoc]

  function handleSelect(id: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('doc', id)
    router.replace(`${pathname}?${params.toString()}`)
  }

  return (
    <div data-testid="doc-layout" className="flex flex-1 h-full overflow-hidden">
      <DocumentSidebar activeDoc={activeDoc} onSelect={handleSelect} />
      <div data-testid="doc-content" className="flex-1 min-w-0 overflow-y-auto">
        <ActiveComponent />
      </div>
    </div>
  )
}
