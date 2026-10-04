import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { compareVersions, parseReleaseNotes } from '@/lib/release-notes'
import { version } from '../../package.json'

describe('histórico de versões', () => {
  it('ignora itens não lançados e preserva seções, subitens e continuação', () => {
    const releases = parseReleaseNotes(`# Changelog\n## [Não lançado]\n- Não publicado\n## [1.11.0] — 2026-10-04\n### Interface\n- **Sobre:** histórico\n  com datas\n  - Detalhes\n## [1.10.1] — 2026-10-04\n- Segurança\n`)
    expect(releases).toEqual([
      { version: '1.11.0', label: '2026-10-04', sections: [{ title: 'Interface', items: [{ text: '**Sobre:** histórico com datas', children: [{ text: 'Detalhes', children: [] }] }] }] },
      { version: '1.10.1', label: '2026-10-04', sections: [{ items: [{ text: 'Segurança', children: [] }] }] },
    ])
  })

  it('ordena versões numericamente, inclusive minor de dois dígitos', () => {
    expect(['1.9.1', '1.10.1', '1.10.0'].sort((a, b) => compareVersions(b, a))).toEqual(['1.10.1', '1.10.0', '1.9.1'])
    expect(compareVersions('1.11.0', '1.11.0')).toBe(0)
  })

  it('o changelog real contém a versão do produto e todo o histórico publicado', () => {
    const releases = parseReleaseNotes(readFileSync('CHANGELOG.md', 'utf8'))
    expect(releases.find(release => release.version === version)?.sections[0].items.length).toBeGreaterThan(0)
    expect(releases.at(-1)?.version).toBe('1.0.0')
    expect(releases.every(release => release.sections.some(section => section.items.length > 0))).toBe(true)
    expect(new Set(releases.map(release => release.version)).size).toBe(releases.length)
  })
})
