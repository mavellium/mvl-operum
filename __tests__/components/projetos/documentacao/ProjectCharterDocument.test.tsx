import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ProjectCharterDocument from '@/components/projetos/documentacao/ProjectCharterDocument'

const base = {
  nomeProjeto: 'Projeto Operum', gerenteProjeto: 'Marcelo', elaboradoPor: 'Agnes', aprovadoPor: 'Marcelo',
  versao: '1.0', dataAprovacao: '15/02/2010', justificativa: 'Porque sim', objetivos: 'Facilitar', metodologia: '',
  descricaoProduto: 'Site', premissas: 'Prazo', restricoes: 'Backup', limitesAutoridade: 'Definir equipe',
  principaisEnvolvidos: 'Instituição: Fatec\nProfessor: Fábio\nPatrocinador: IBM', membros: [{ name: 'Ana' }],
  fases: [{ id: 'f1', fase: '1.1 Requisitos', dataLimite: '2010-02-06', custo: '124,4' }],
}

describe('ProjectCharterDocument — igual ao modelo do professor', () => {
  it('títulos sem numeração nem sublinhado, e justificativa/objetivos/produto dentro de caixa com borda', () => {
    render(<ProjectCharterDocument {...base} />)
    const titulo = screen.getByText('Justificativa do projeto')
    expect(titulo.style.borderBottom).toBe('')
    expect(titulo.style.textTransform).toBe('')
    for (const t of ['Porque sim', 'Facilitar', 'Site']) {
      expect(screen.getByText(t).style.border).toContain('1px solid')
    }
  })

  it('cabeçalho: instituição na linha cinza, rótulos do quadro e custos sem símbolo de moeda', () => {
    render(<ProjectCharterDocument {...base} />)
    expect(screen.getByText('Fatec', { selector: 'td' })).toBeInTheDocument()
    expect(screen.getByText('Nome do projeto:')).toBeInTheDocument()
    expect(screen.getAllByText('124,40').length).toBeGreaterThan(0)
    expect(screen.queryAllByText(/R\$/)).toHaveLength(0)
  })

  it('principais envolvidos agrupados, com os integrantes depois do professor', () => {
    const { container } = render(<ProjectCharterDocument {...base} />)
    const rotulos = [...container.querySelectorAll('div[style*="bold"]')].map(e => e.textContent)
    expect(rotulos).toEqual(['Instituição', 'Professor', 'Integrantes do Grupo', 'Patrocinador'])
  })

  it('metodologia só aparece se preenchida (não existe no modelo)', () => {
    const { rerender } = render(<ProjectCharterDocument {...base} />)
    expect(screen.queryByText('Metodologia do projeto')).not.toBeInTheDocument()
    rerender(<ProjectCharterDocument {...base} metodologia="Scrum" />)
    expect(screen.getByText('Metodologia do projeto')).toBeInTheDocument()
  })
})
