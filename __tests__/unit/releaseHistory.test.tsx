import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ReleaseHistory } from '@/app/sobre/release-history'
import { version } from '../../package.json'

describe('novidades na página Sobre', () => {
  it('destaca as notas da versão instalada e mantém o histórico expansível', () => {
    const { container } = render(<ReleaseHistory version={version} />)
    const current = screen.getByRole('article')
    expect(within(current).getByRole('heading', { name: `Versão ${version}` })).toBeInTheDocument()
    expect(within(current).getByText('Versão atual')).toBeInTheDocument()
    expect(within(current).getByText(/contexto de build/)).toBeInTheDocument()
    const history = container.querySelectorAll('details')
    expect(history.length).toBeGreaterThan(0)
    expect(history[0].querySelector('summary')).toHaveTextContent('Versão 1.11.0')
    expect(history[0].hasAttribute('open')).toBe(false)
    expect(history[history.length - 1].querySelector('summary')).toHaveTextContent('Versão 1.0.0')
  })

  it('não mostra versões futuras quando a versão instalada é anterior', () => {
    render(<ReleaseHistory version="1.10.1" />)
    expect(screen.queryByText('Versão 1.11.0')).not.toBeInTheDocument()
    expect(screen.getByRole('article')).toHaveTextContent('CVE-2026-93687')
  })
})
