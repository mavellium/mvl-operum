'use client'

import { createContext, useContext, useReducer, type Dispatch } from 'react'
import { wbsReducer, type WbsAction } from '@/lib/wbsReducer'
import type { WbsTreeState } from '@/types/wbs'
import type { GetTreeResult } from '@/services/wbsService'

interface WbsContextValue {
  state: WbsTreeState
  dispatch: Dispatch<WbsAction>
}

const WbsContext = createContext<WbsContextValue | null>(null)

export function WbsProvider({
  children,
  initialTree,
}: {
  children: React.ReactNode
  initialTree: GetTreeResult
}) {
  const [state, dispatch] = useReducer(wbsReducer, undefined, () => ({
    nodes: initialTree.nodes,
    rootId: initialTree.rootId,
    selectedNodeIds: [],
    editingNodeId: null,
    clipboard: { nodes: [], copiedStyle: null, actionType: null },
    history: { past: [], future: [] },
    viewport: { zoom: 1, panX: 40, panY: 40 },
    sync: { status: 'IDLE' as const, lastSavedAt: null, serverVersion: initialTree.serverVersion },
  }))

  return <WbsContext.Provider value={{ state, dispatch }}>{children}</WbsContext.Provider>
}

export function useWbs() {
  const ctx = useContext(WbsContext)
  if (!ctx) throw new Error('useWbs deve ser usado dentro de WbsProvider')
  return ctx
}
