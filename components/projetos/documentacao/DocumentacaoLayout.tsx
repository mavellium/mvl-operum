'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import DocumentoStakeholders from '@/components/projetos/DocumentoStakeholders'
import HistoricoDocumento from './HistoricoDocumento'
import DocumentSidebar from './DocumentSidebar'
import ProjectCharterWrapper from './ProjectCharterWrapper'
import DocumentoAtas, { type AtaListItem } from './DocumentoAtas'
import EapDocument from './EapDocument'
import type { MembroEquipeOption } from './MembroEquipeSelect'

const DOCUMENT_MAP = {
  stakeholder: DocumentoStakeholders,
  charter: ProjectCharterWrapper,
  eap: EapDocument,
  atas: DocumentoAtas,
} as const

type DocType = keyof typeof DOCUMENT_MAP

interface Props {
  projetoId: string
  atas: AtaListItem[]
  gerente: boolean
  /** Membros da equipe — responsáveis/aprovadores dos documentos devem ser membros */
  membros?: MembroEquipeOption[]
}

export default function DocumentacaoLayout({ projetoId, atas, gerente, membros = [] }: Props) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const raw = searchParams.get('doc') ?? 'stakeholder'
  const activeDoc: DocType = raw in DOCUMENT_MAP ? (raw as DocType) : 'stakeholder'

  const [publication, setPublication] = useState(0)
  useEffect(() => {
    const refresh = (event: Event) => {
      const detail = (event as CustomEvent<{ projetoId: string }>).detail
      if (detail?.projetoId === projetoId) setPublication(value => value + 1)
    }
    window.addEventListener('operum:document-published', refresh)
    return () => window.removeEventListener('operum:document-published', refresh)
  }, [projetoId])

  function handleSelect(id: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('doc', id)
    router.replace(`${pathname}?${params.toString()}`)
  }

  return (
    <div data-testid="doc-layout" className="flex flex-1 h-full overflow-hidden">
      <DocumentSidebar activeDoc={activeDoc} onSelect={handleSelect} />
      <div data-testid="doc-content" className="flex-1 min-w-0 overflow-y-auto">
        <HistoricoDocumento key={activeDoc} projetoId={projetoId} type={{ atas: 'ATA', charter: 'CHARTER', eap: 'EAP', stakeholder: 'STAKEHOLDER' }[activeDoc]} />
        {activeDoc === 'atas' ? (
          <DocumentoAtas projetoId={projetoId} atas={atas} gerente={gerente} />
        ) : activeDoc === 'charter' ? (
          <ProjectCharterWrapper key={publication} membros={membros} />
        ) : activeDoc === 'eap' ? (
          <EapDocument key={publication} />
        ) : (
          <DocumentoStakeholders key={publication} membros={membros} />
        )}
      </div>
    </div>
  )
}