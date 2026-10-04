import { readdir, readFile, access } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const removed = ['lib/projectClient.ts', 'lib/sprintClient.ts', 'services/departmentService.ts', 'services/departamentoService.ts', 'lib/validation/departmentSchemas.ts']
const skipped = new Set(['node_modules', '.git', '.next', 'dist', 'generated', '.claude', '.codex', '.agents', 'research_notes', 'reports', 'docs'])
async function files(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  return (await Promise.all(entries.filter(entry => !skipped.has(entry.name)).map(entry => {
    const full = path.join(dir, entry.name)
    return entry.isDirectory() ? files(full) : /\.(tsx?|[cm]?js)$/.test(entry.name) ? [full] : []
  }))).flat()
}
const options = { baseUrl: root, paths: { '@/*': ['./*'] }, moduleResolution: ts.ModuleResolutionKind.Node10 }
const inventory = new Map()
const violations = []
const dynamic = []
const sources = await files(root)
for (const file of sources) {
  const name = path.relative(root, file).replaceAll(path.sep, '/')
  const source = await readFile(file, 'utf8')
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true)
  function record(specifier) {
    const normalized = specifier.replaceAll('\\', '/').replace(/\.(tsx?|[cm]?js)$/, '')
    if (removed.some(module => normalized.endsWith(module.replace(/\.ts$/, '')) || normalized.endsWith('/' + path.basename(module, '.ts')))) violations.push(`${name}: importa módulo retirado ${specifier}`)
    const resolved = ts.resolveModuleName(specifier, file, options, ts.sys).resolvedModule?.resolvedFileName
    if (!resolved) return
    const target = path.relative(root, resolved).replaceAll(path.sep, '/')
    if (!target.startsWith('services/') && !removed.includes(target)) return
    const entries = inventory.get(target) ?? { runtime: [], tests: [] }
    const category = /(__tests__|\.test\.|\.spec\.)/.test(name) ? 'tests' : 'runtime'
    if (!entries[category].includes(name)) entries[category].push(name)
    inventory.set(target, entries)
  }
  function visit(node) {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) record(node.moduleSpecifier.text)
    if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(node.expression) && node.expression.text === 'require'))) {
      if (node.arguments[0] && ts.isStringLiteralLike(node.arguments[0])) record(node.arguments[0].text)
      else if (node.expression.kind === ts.SyntaxKind.ImportKeyword) dynamic.push(name)
    }
    ts.forEachChild(node, visit)
  }
  visit(tree)
  if (/^(app|components|services|lib)\//.test(name) && /process\.env\.(PROJECT_SERVICE_URL|SPRINT_SERVICE_URL)/.test(source)) violations.push(`${name}: acesso HTTP direto a serviço de domínio; use lib/api-client via gateway`)
}
for (const file of removed) {
  try { await access(path.join(root, file)); violations.push(`${file}: módulo retirado foi reintroduzido`) } catch (error) { if (error.code !== 'ENOENT') throw error }
}
if (process.argv.includes('--inventory')) {
  const modules = (await files(path.join(root, 'services'))).filter(file => file.endsWith('.ts')).map(file => path.relative(root, file).replaceAll(path.sep, '/'))
  process.stdout.write(JSON.stringify({ filesScanned: sources.length, dynamicNonLiteral: [...new Set(dynamic)], modules: Object.fromEntries(modules.sort().map(module => [module, inventory.get(module) ?? { runtime: [], tests: [] }])) }, null, 2) + '\n')
} else if (!violations.length) console.log(`Fronteiras verificadas em ${sources.length} fontes: nenhum cliente direto ou módulo retirado.`)
if (violations.length) {
  console.error(violations.join('\n'))
  process.exitCode = 1
}
