'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { saveDraftAction } from '@/app/actions/drafts'

export type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface MacroFase {
  fase: string
  dataLimite: string
  custo: string
}

interface UseAutosaveOptions {
  form: Record<string, unknown>
  macroFases: MacroFase[]
  projectId: string | null
  enabled: boolean
}

interface UseAutosaveResult {
  status: AutosaveStatus
  draftDbId: string | null
}

const DEBOUNCE_MS = 0

export function useAutosave({
  form,
  macroFases,
  projectId,
  enabled,
}: UseAutosaveOptions): UseAutosaveResult {
  const [status, setStatus] = useState<AutosaveStatus>('idle')
  const [draftDbId, setDraftDbId] = useState<string | null>(null)
  const [, startTransition] = useTransition()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Serialize to stable strings for effect dependency
  const formJson = JSON.stringify(form)
  const fasesJson = JSON.stringify(macroFases)

  useEffect(() => {
    if (!enabled) return

    if (timerRef.current) clearTimeout(timerRef.current)

    timerRef.current = setTimeout(() => {
      startTransition(async () => {
        setStatus('saving')

        const result = await saveDraftAction({
          projectId,
          data: { form, macroFases },
        })

        if ('error' in result) {
          setStatus('error')
        } else {
          setDraftDbId(result.draftId)
          setStatus('saved')
        }
      })
    }, DEBOUNCE_MS)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formJson, fasesJson, projectId, enabled])

  return { status, draftDbId }
}
