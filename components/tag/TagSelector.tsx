'use client'

import { TagBadge } from './TagBadge'

interface Tag {
  id: string
  name: string
  color: string
}

interface TagSelectorProps {
  tags: Tag[]
  selectedTagIds: string[]
  onToggle: (tagId: string) => void
}

export function TagSelector({ tags, selectedTagIds, onToggle }: TagSelectorProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => (
        <TagBadge
          key={tag.id}
          name={tag.name}
          color={tag.color}
          selected={selectedTagIds.includes(tag.id)}
          onClick={() => onToggle(tag.id)}
        />
      ))}
      {tags.length === 0 && (
        <p className="text-xs text-gray-500">Nenhuma tag disponível</p>
      )}
    </div>
  )
}
