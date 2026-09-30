// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const css = readFileSync(join(process.cwd(), 'app/globals.css'), 'utf8')

describe('app/globals.css (SDD 4.8)', () => {
  it('não troca a cor do texto no modo escuro do sistema: o app só tem tema claro', () => {
    expect(css).not.toMatch(/@media\s*\(prefers-color-scheme:\s*dark\)/)
  })

  it('input sem atributo type também recebe texto escuro', () => {
    expect(css).toMatch(/input:not\(\[type\]\),/)
  })
})
