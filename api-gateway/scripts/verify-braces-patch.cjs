const assert = require('node:assert/strict')
const { createRequire } = require('node:module')

// Funciona por stdin na imagem final e no checkout com cwd=api-gateway.
const gateway = createRequire(`${process.cwd()}/package.json`)
const proxy = createRequire(gateway.resolve('http-proxy-middleware'))
const micromatch = createRequire(proxy.resolve('micromatch'))
const resolved = micromatch.resolve('braces')
const patchHash = '09522a43f9ee4b8d0664494aa5202a8e7e2e26e31aec3caf6e52cc9f882b2637'
assert.ok(resolved.includes(`braces@3.0.3_patch_hash=${patchHash}/`), 'braces precisa carregar o patch registrado no filtro Trivy')
const braces = micromatch('braces')
const controlledError = { name: 'SyntaxError', message: /nesting depth exceeds security limit/ }

for (const [open, close] of [['{', '}'], ['(', ')']]) {
  // Abaixo do limite de tamanho: verifica profundidade, não comprimento.
  const input = open.repeat(4000) + 'a' + close.repeat(4000)
  assert.throws(() => braces.parse(input), controlledError)
}
for (const method of ['compile', 'expand', 'stringify']) {
  let ast = { type: 'text', value: 'a', nodes: [] }
  for (let i = 0; i < 2000; i++) ast = { type: 'root', nodes: [ast] }
  assert.throws(() => braces[method](ast), controlledError)
}
assert.deepEqual(braces.expand('file{1..3}'), ['file1', 'file2', 'file3'])
assert.deepEqual(proxy('micromatch')(['src/app/index.ts', 'public/a.js'], 'src/{app,services}/**/*.ts'), ['src/app/index.ts'])
assert.doesNotThrow(() => braces.compile('{'.repeat(126) + 'a,b' + '}'.repeat(126)))
console.log('braces: hash conferido; entradas profundas/AST rejeitadas; globs usuais preservados.')
