'use client'

import { useReducer, useEffect, useRef } from 'react'
import { BoardState } from '@/types/kanban'
import { kanbanReducer, KanbanAction } from '@/lib/kanbanReducer'
import {
  renameBoardAction,
  addColumnAction,
  renameColumnAction,
  deleteColumnAction,
  reorderColumnsAction,
  addCardAction,
  updateCardAction,
  deleteCardAction,
  moveCardAction,
} from '@/app/actions'

async function syncActionToServer(action: KanbanAction, state: BoardState, boardId: string) {
  switch (action.type) {
    case 'RENAME_PROJECT':
      await renameBoardAction(boardId, action.payload.name)
      break

    case 'ADD_COLUMN': {
      const newCol = state.columns[state.columns.length - 1]
      await addColumnAction(boardId, newCol.id, newCol.title, state.columns.length - 1)
      break
    }

    case 'RENAME_COLUMN':
      await renameColumnAction(action.payload.columnId, action.payload.title)
      break

    case 'DELETE_COLUMN':
      await deleteColumnAction(action.payload.columnId)
      break

    case 'REORDER_COLUMNS':
      await reorderColumnsAction(state.columns.map((c, i) => ({ id: c.id, position: i })))
      break

    case 'ADD_CARD': {
      const col = state.columns.find(c => c.id === action.payload.columnId)!
      const newCardId = col.cardIds[col.cardIds.length - 1]
      const newCard = state.cards[newCardId]
      await addCardAction({
        id: newCard.id,
        columnId: action.payload.columnId,
        title: newCard.title,
        description: newCard.description,
        responsible: newCard.responsible,
        color: newCard.color,
        position: col.cardIds.length - 1,
      })
      break
    }

    case 'UPDATE_CARD': {
      const card = state.cards[action.payload.cardId]
      await updateCardAction(card.id, {
        title: card.title,
        description: card.description,
        responsible: card.responsible,
        color: card.color,
        sprintId: card.sprintId,
        responsibleId: card.responsibleId,
      })
      break
    }

    case 'DELETE_CARD':
      await deleteCardAction(action.payload.cardId)
      break

    case 'MOVE_CARD': {
      const { sourceColumnId, destinationColumnId } = action.payload
      const affectedIds = [...new Set([sourceColumnId, destinationColumnId])]
      const affectedColumns = affectedIds.map(colId => {
        const col = state.columns.find(c => c.id === colId)!
        return { id: col.id, cardIds: col.cardIds }
      })
      await moveCardAction(action.payload.cardId, destinationColumnId, affectedColumns)
      break
    }
  }
}

export function useKanbanState(
  initialState: BoardState,
  boardId: string
): { state: BoardState; dispatch: (action: KanbanAction) => void } {
  const [state, dispatch] = useReducer(kanbanReducer, initialState)
  const lastActionRef = useRef<KanbanAction | null>(null)
  const isFirstRender = useRef(true)
  const boardIdRef = useRef(boardId)

  const syncedDispatch = (action: KanbanAction) => {
    lastActionRef.current = action
    dispatch(action)
  }

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    const action = lastActionRef.current
    if (!action) return
    lastActionRef.current = null
    syncActionToServer(action, state, boardIdRef.current).catch(console.error)
  }, [state])

  return { state, dispatch: syncedDispatch }
}
