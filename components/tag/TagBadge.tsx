interface TagBadgeProps {
  name: string
  color: string
  selected?: boolean
  onClick?: () => void
}

export function TagBadge({ name, color, selected, onClick }: TagBadgeProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      data-selected={selected ? 'true' : undefined}
      onClick={onClick}
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium text-white transition-opacity ${
        selected ? 'ring-2 ring-offset-1' : 'opacity-80 hover:opacity-100'
      }`}
      style={{ backgroundColor: color }}
    >
      {name}
    </button>
  )
}
