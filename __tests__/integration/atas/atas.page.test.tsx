// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => { throw new Error(`NEXT_REDIRECT ${url}`) }),
}))

import AtasPage from '@/app/projetos/[projetoId]/atas/page'
import { redirect } from 'next/navigation'

describe('rota antiga /projetos/:id/atas', () => {
  it('redireciona para Documentação > Atas de Reunião (não dá 404)', async () => {
    await expect(AtasPage({ params: Promise.resolve({ projetoId: 'p1' }) })).rejects.toThrow('NEXT_REDIRECT')
    expect(redirect).toHaveBeenCalledWith('/projetos/p1/documentacao?doc=atas')
  })

  it('"← Voltar às atas" da Nova Ata e da Ata levam para a Documentação', () => {
    for (const pagina of ['nova/page.tsx', '[ataId]/page.tsx']) {
      const fonte = readFileSync(join(process.cwd(), 'app/projetos/[projetoId]/atas', pagina), 'utf8')
      expect(fonte).toContain('href={`/projetos/${projetoId}/documentacao?doc=atas`}')
      expect(fonte).not.toContain('href={`/projetos/${projetoId}/atas`}')
    }
  })
})
