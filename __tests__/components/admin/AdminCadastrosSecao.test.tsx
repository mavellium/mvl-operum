import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import AdminCadastrosClient from '@/components/admin/AdminCadastrosClient'

vi.mock('@/components/permissoes/PermissoesFuncoes', () => ({ default: () => <div>matriz de permissões</div> }))
vi.mock('@/app/actions/departments', () => ({
  getOrCreateDepartmentAction: vi.fn(), updateDepartmentNameAction: vi.fn(), deleteDepartmentAction: vi.fn(),
}))
vi.mock('@/app/actions/roles', () => ({
  getOrCreateRoleAction: vi.fn(), updateRoleNameAction: vi.fn(), deleteRoleAction: vi.fn(),
}))

const props = {
  departamentosIniciais: [{ id: 'd1', name: 'Tecnologia', description: null }],
  funcoesIniciais: [{ id: 'r1', name: 'Gerente de Projetos', scope: 'global', description: null }],
}

describe('Cadastros Globais por seção', () => {
  it('abre direto em Funções quando a seção é funcoes', () => {
    render(<AdminCadastrosClient {...props} section="funcoes" />)
    expect(screen.getByText('Catálogo global de Funções')).toBeInTheDocument()
    expect(screen.queryByText('Catálogo global de Departamentos')).toBeNull()
    expect(screen.getByText('matriz de permissões')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Funções' })).toHaveAttribute('aria-current', 'page')
  })

  it('abre em Departamentos e as abas levam ao endereço de cada seção', () => {
    render(<AdminCadastrosClient {...props} section="departamentos" />)
    expect(screen.getByText('Catálogo global de Departamentos')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Departamentos' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Funções' })).toHaveAttribute('href', '/admin/cadastros/funcoes')
  })
})
