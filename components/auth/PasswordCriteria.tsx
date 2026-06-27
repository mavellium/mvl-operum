export function PasswordCriteria({ value, confirm }: { value: string; confirm?: string }) {
  const criteria = [
    { label: 'Mínimo 8 caracteres', ok: value.length >= 8 },
    { label: 'Pelo menos um número', ok: /\d/.test(value) },
    { label: 'Pelo menos um caractere especial', ok: /[^a-zA-Z0-9]/.test(value) },
    ...(confirm !== undefined
      ? [{ label: 'Senhas coincidem', ok: value.length > 0 && value === confirm }]
      : []),
  ]
  if (!value) return null
  return (
    <ul className="mt-1 flex flex-col gap-1" aria-label="Critérios de senha">
      {criteria.map(({ label, ok }) => (
        <li
          key={label}
          className="flex items-center gap-1.5 text-xs"
          style={{ color: ok ? '#10b981' : 'var(--text-secondary)' }}
        >
          {ok ? (
            <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <span className="h-3.5 w-3.5 shrink-0 rounded-full border border-current inline-block" aria-hidden="true" />
          )}
          <span>{label}</span>
        </li>
      ))}
    </ul>
  )
}
