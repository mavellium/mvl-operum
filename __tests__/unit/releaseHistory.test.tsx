import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ReleaseHistory } from '@/app/sobre/release-history'
import { readFileSync } from 'node:fs'
import { parseReleaseNotes } from '@/lib/release-notes'
import { version } from '../../package.json'

describe('novidades na página Sobre', () => {
  it('destaca as notas da versão instalada e mantém o histórico expansível', () => {
    const { container } = render(<ReleaseHistory version={version} />)
    const current = screen.getByRole('article')
    expect(within(current).getByRole('heading', { name: `Versão ${version}` })).toBeInTheDocument()
    expect(within(current).getByText('Versão atual')).toBeInTheDocument()
    const releases = parseReleaseNotes(readFileSync('CHANGELOG.md', 'utf8'))
    const installed = releases.find(r => r.version === version)!
    expect(installed.sections.flatMap(s => s.items).length).toBeGreaterThan(0)
    const firstNote = installed.sections.flatMap(s => s.items)[0].text.replace(/[`*]/g, '')
    expect(current).toHaveTextContent(firstNote)
    const history = container.querySelectorAll('details')
    expect(history.length).toBeGreaterThan(0)
    const previous = releases.find(r => r.version !== version)!
    expect(history[0].querySelector('summary')).toHaveTextContent(`Versão ${previous.version}`)
    expect(history[0].hasAttribute('open')).toBe(false)
    expect(history[history.length - 1].querySelector('summary')).toHaveTextContent('Versão 1.0.0')
  })

  it('não mostra versões futuras quando a versão instalada é anterior', () => {
    render(<ReleaseHistory version="1.10.1" />)
    expect(screen.queryByText('Versão 1.11.0')).not.toBeInTheDocument()
    expect(screen.getByRole('article')).toHaveTextContent('CVE-2026-93687')
  })
})
