import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { useRecoverableDraft } from '@/hooks/useRecoverableDraft'
import { fetchWithSession } from '@/lib/clientFetch'
import type { AutosaveStatus } from '@/hooks/useAutosave'
vi.mock('@/lib/clientFetch', () => ({ fetchWithSession: vi.fn() }))
beforeEach(() => { sessionStorage.clear(); vi.mocked(fetchWithSession).mockResolvedValue(Response.json({ user: { id: 'owner' } })) })
it('recupera somente cópia do dono/projeto, preserva falha e limpa após confirmação', async () => {
  sessionStorage.setItem('operum:charter-draft:other:p1', JSON.stringify({ value: 'privado de outro', updatedAt: Date.now() }))
  sessionStorage.setItem('operum:charter-draft:owner:p1', JSON.stringify({ value: 'recuperar', updatedAt: Date.now() }))
  const { result, rerender } = renderHook(({ status }) => useRecoverableDraft('p1', 'texto atual', status, true), { initialProps: { status: 'idle' as AutosaveStatus } })
  await waitFor(() => expect(result.current.backup).toBe('recuperar'))
  rerender({ status: 'error' })
  expect(JSON.parse(sessionStorage.getItem('operum:charter-draft:owner:p1')!).value).toBe('texto atual')
  rerender({ status: 'saved' })
  expect(sessionStorage.getItem('operum:charter-draft:owner:p1')).toBeNull()
  expect(sessionStorage.getItem('operum:charter-draft:other:p1')).not.toBeNull()
  expect(result.current.backup).toBeNull()
})
it('sem identidade confirmada ou sem permissão não lê conteúdo privado', async () => {
  sessionStorage.setItem('operum:charter-draft:owner:p1', JSON.stringify({ value: 'privado', updatedAt: Date.now() }))
  vi.mocked(fetchWithSession).mockResolvedValue(Response.json({}, { status: 401 }))
  const { result } = renderHook(() => useRecoverableDraft('p1', '', 'idle', true))
  await act(async () => { await Promise.resolve() })
  expect(result.current.backup).toBeNull()
  const disabled = renderHook(() => useRecoverableDraft('p1', '', 'idle', false))
  expect(disabled.result.current.backup).toBeNull()
})
it('cópia expirada não é restaurada', async () => {
  sessionStorage.setItem('operum:charter-draft:owner:p1', JSON.stringify({ value: 'antigo', updatedAt: Date.now() - 86400001 }))
  const { result } = renderHook(() => useRecoverableDraft('p1', '', 'idle', true))
  await act(async () => { await Promise.resolve() })
  expect(result.current.backup).toBeNull()
  expect(sessionStorage.getItem('operum:charter-draft:owner:p1')).toBeNull()
})
