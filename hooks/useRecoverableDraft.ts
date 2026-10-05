'use client'
import { useEffect, useState } from 'react'
import { fetchWithSession } from '@/lib/clientFetch'
import type { AutosaveStatus } from './useAutosave'

/** Same-tab recovery; owner and project are verified before reading private content. */
export function useRecoverableDraft(projectId: string, value: string, status: AutosaveStatus, enabled: boolean) {
  const [key, setKey] = useState<string | null>(null)
  const [backup, setBackup] = useState<string | null>(null)
  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    void fetchWithSession('/api/me').then(async response => {
      if (!response.ok) return
      const { user } = await response.json()
      if (cancelled || typeof user?.id !== 'string') return
      const storageKey = `operum:charter-draft:${user.id}:${projectId}`
      try {
        const raw = sessionStorage.getItem(storageKey)
        if (raw) {
          const stored = JSON.parse(raw)
          if (typeof stored.value === 'string' && typeof stored.updatedAt === 'number' && Date.now() - stored.updatedAt < 86400000) setBackup(stored.value)
          else sessionStorage.removeItem(storageKey)
        }
        setKey(storageKey)
      } catch { /* Exit warning and server draft still remain available. */ }
    }).catch(() => {})
    return () => { cancelled = true }
  }, [enabled, projectId])
  useEffect(() => {
    if (!key || !enabled || !key.endsWith(`:${projectId}`)) return
    try {
      if (status === 'pending' || status === 'saving' || status === 'error') sessionStorage.setItem(key, JSON.stringify({ value, updatedAt: Date.now() }))
      else if (status === 'saved') {
        sessionStorage.removeItem(key)
        // Synchronize the recovery offer with confirmed removal from external storage.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setBackup(null)
      }
    } catch { /* Storage can be unavailable in private browsing. */ }
  }, [key, enabled, status, value, projectId])
  function discard() {
    if (key) { try { sessionStorage.removeItem(key) } catch {} }
    setBackup(null)
  }
  return { backup: enabled && key?.endsWith(`:${projectId}`) ? backup : null, discard }
}
