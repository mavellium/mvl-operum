'use client'

interface Sprint {
  id: string
  name: string
}

interface SprintFilterBarProps {
  sprints: Sprint[]
  activeSprintId: string | null
  onFilterChange: (sprintId: string | null) => void
}

export default function SprintFilterBar({ sprints, activeSprintId, onFilterChange }: SprintFilterBarProps) {
  return (
    <div className="flex items-center gap-2 px-6 py-2 overflow-x-auto border-b border-gray-100 bg-white/60">
      <button
        aria-pressed={activeSprintId === null}
        onClick={() => onFilterChange(null)}
        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap
          ${activeSprintId === null
            ? 'bg-blue-500 text-white'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
      >
        Todos
      </button>
      {sprints.map(sprint => (
        <button
          key={sprint.id}
          aria-pressed={activeSprintId === sprint.id}
          onClick={() => onFilterChange(sprint.id)}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap
            ${activeSprintId === sprint.id
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
        >
          {sprint.name}
        </button>
      ))}
    </div>
  )
}
