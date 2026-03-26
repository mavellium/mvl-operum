import { DropResult } from '@hello-pangea/dnd'
import { KanbanAction } from './kanbanReducer'

export function buildDragAction(result: DropResult): KanbanAction | null {
  const { destination, source, draggableId, type } = result
  if (!destination) return null
  if (destination.droppableId === source.droppableId && destination.index === source.index) return null

  if (type === 'COLUMN') {
    return { type: 'REORDER_COLUMNS', payload: { startIndex: source.index, endIndex: destination.index } }
  }

  return {
    type: 'MOVE_CARD',
    payload: {
      sourceColumnId: source.droppableId,
      destinationColumnId: destination.droppableId,
      sourceIndex: source.index,
      destinationIndex: destination.index,
      cardId: draggableId,
    },
  }
}
