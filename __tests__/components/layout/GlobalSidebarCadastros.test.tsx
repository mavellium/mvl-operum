import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import GlobalSidebar from '@/components/layout/GlobalSidebar'

let pathname = '/admin/cadastros/funcoes'

vi.mock('next/navigation', () => ({ usePathname: () => pathname }))
vi.mock('@/components/layout/SidebarLayout', () => ({
  default: ({ children, title }: { children: React.ReactNode; title: string }) => <nav aria-label={title}>{children}</nav>,
}))
vi.mock('@/lib/clientFetch', () => ({
  fetchWithSession: vi.fn().mockResolvedValue({ json: async () => ({ user: { role: 'admin' } }) }),
}))

describe('menu lateral do admin: Funções e Departamentos', () => {
  it('cada item abre a própria seção dos Cadastros Globais', async () => {
    render(<GlobalSidebar />)
    expect(await screen.findByRole('link', { name: 'Funções' })).toHaveAttribute('href', '/admin/cadastros/funcoes')
    expect(screen.getByRole('link', { name: 'Departamentos' })).toHaveAttribute('href', '/admin/cadastros/departamentos')
  })

  it('só o item da seção aberta fica destacado', async () => {
    pathname = '/admin/cadastros/funcoes'
    render(<GlobalSidebar />)
    expect(await screen.findByRole('link', { name: 'Funções' })).toHaveClass('bg-blue-50')
    expect(screen.getByRole('link', { name: 'Departamentos' })).not.toHaveClass('bg-blue-50')
    expect(screen.getByRole('navigation', { name: 'Funções' })).toBeInTheDocument()
  })
})
