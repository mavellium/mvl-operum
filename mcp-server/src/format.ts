const MAX_RESPONSE_CHARS = 8000

/** Trunca uma resposta formatada para o limite de ~8k caracteres do SDD 6.4. */
export function truncateResponse(text: string): string {
  if (text.length <= MAX_RESPONSE_CHARS) return text
  return text.slice(0, MAX_RESPONSE_CHARS) + '\n\n…resposta truncada, refine a busca.'
}

/** Envolve conteúdo gerado pelo usuário (títulos, descrições, comentários) como dado — mitiga prompt injection (SDD 6.4/13). */
export function delimitUserContent(tag: string, content: string | null | undefined): string {
  if (!content) return ''
  return `<${tag}>${content}</${tag}>`
}

interface WhoamiData {
  id: string
  name: string
  email: string
  role: string
  tenantId: string
  cargo?: string | null
  departamento?: string | null
}

export function formatWhoami(user: WhoamiData): string {
  const lines = [
    `${user.name} <${user.email}>`,
    `id: ${user.id}`,
    `papel: ${user.role}`,
    `tenant: ${user.tenantId}`,
  ]
  if (user.cargo) lines.push(`cargo: ${user.cargo}`)
  if (user.departamento) lines.push(`departamento: ${user.departamento}`)
  return lines.join('\n')
}

interface UserProjectItem {
  projectId: string
  project: { id: string; name: string; status: string }
}

const MAX_LIST_ITEMS = 50

export function formatProjectList(items: UserProjectItem[]): string {
  if (items.length === 0) return 'Nenhum projeto encontrado.'

  const shown = items.slice(0, MAX_LIST_ITEMS)
  const lines = shown.map(item => `- ${item.project.name} [${item.project.status}] — id: ${item.project.id}`)

  if (items.length > MAX_LIST_ITEMS) {
    lines.push(`\n+${items.length - MAX_LIST_ITEMS} resultados, refine a busca.`)
  }

  return truncateResponse(lines.join('\n'))
}
