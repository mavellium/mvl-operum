// @vitest-environment node
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const root = createRequire(`${process.cwd()}/package.json`)
const gateway = createRequire(root.resolve('./api-gateway/package.json'))
const proxy = createRequire(gateway.resolve('http-proxy-middleware'))
const eslint = createRequire(root.resolve('eslint-config-next'))
const plugin = createRequire(eslint.resolve('@next/eslint-plugin-next'))
const glob = createRequire(plugin.resolve('fast-glob'))

describe.each([['gateway', proxy], ['lint', glob]] as const)('braces corrigido: %s', (_name, consumer) => {
  const micromatch = createRequire(consumer.resolve('micromatch'))
  const braces = micromatch('braces')

  it.each(['{', '('])('rejeita milhares de níveis de %s antes de esgotar a pilha', (open) => {
    const close = open === '{' ? '}' : ')'
    // Abaixo do limite de tamanho do parser: exercita a profundidade, não o tamanho.
    const input = open.repeat(4000) + 'a' + close.repeat(4000)
    expect(() => braces.parse(input)).toThrow(SyntaxError)
    expect(() => braces.parse(input)).toThrow('nesting depth exceeds security limit')
  })

  it.each(['compile', 'expand', 'stringify'])('protege %s mesmo com AST fornecida diretamente', (operation) => {
    let ast: Record<string, unknown> = { type: 'text', value: 'a', nodes: [] }
    for (let i = 0; i < 2000; i++) ast = { type: 'root', nodes: [ast] }
    expect(() => braces[operation](ast)).toThrow(SyntaxError)
  })

  it('preserva globs usuais, ranges e aninhamento moderado', () => {
    expect(braces.expand('src/{app,{services,components}}/*.{ts,tsx}')).toEqual([
      'src/app/*.ts', 'src/app/*.tsx', 'src/services/*.ts', 'src/services/*.tsx',
      'src/components/*.ts', 'src/components/*.tsx',
    ])
    expect(braces.expand('file{1..3}')).toEqual(['file1', 'file2', 'file3'])
    expect(() => braces.compile('{'.repeat(126) + 'a,b' + '}'.repeat(126))).not.toThrow()
    expect(consumer('micromatch')(['src/app/a.ts', 'public/a.js'], 'src/{app,services}/**/*.ts')).toEqual(['src/app/a.ts'])
  })
})

it('mantém o patch do Docker isolado idêntico ao workspace', () => {
  expect(readFileSync('api-gateway/patches/braces@3.0.3.patch', 'utf8'))
    .toBe(readFileSync('patches/braces@3.0.3.patch', 'utf8'))
})
