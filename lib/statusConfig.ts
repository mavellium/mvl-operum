export const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  ACTIVE:     { label: 'Ativo',     cls: 'bg-green-100 text-green-700' },
  INACTIVE:   { label: 'Inactive',   cls: 'bg-gray-100 text-gray-500' },
  COMPLETED: { label: 'Concluído', cls: 'bg-blue-100 text-blue-700' },
  ARCHIVED:  { label: 'Arquivado', cls: 'bg-amber-100 text-amber-700' },
}
