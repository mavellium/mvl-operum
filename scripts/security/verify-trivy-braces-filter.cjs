const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { spawnSync } = require('node:child_process')

// Integração com Trivy real: uma exceção global faria os controles negativos falharem.
const hash = '09522a43f9ee4b8d0664494aa5202a8e7e2e26e31aec3caf6e52cc9f882b2637'
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'operum-trivy-braces-'))
try {
  for (const [label, suffix, status] of [
    ['patched', `_patch_hash=${hash}`, 0],
    ['unpatched', '', 1],
    ['other-hash', `_patch_hash=${'0'.repeat(64)}`, 1],
  ]) {
    const root = path.join(dir, label)
    const pkg = path.join(root, `app/node_modules/.pnpm/braces@3.0.3${suffix}/node_modules/braces/package.json`)
    fs.mkdirSync(path.dirname(pkg), { recursive: true })
    // Metadados controlados para testar somente a seleção de caminho/CVE.
    fs.writeFileSync(pkg, JSON.stringify({ name: 'braces', version: '3.0.3', license: 'MIT' }))
    const output = path.join(dir, `${label}.json`)
    const result = spawnSync('trivy', [
      'rootfs', '--skip-db-update', '--scanners', 'vuln', '--severity', 'HIGH,CRITICAL',
      '--exit-code', '1', '--ignorefile', '.trivyignore-gateway.yaml',
      '--format', 'json', '--output', output, root,
    ], { encoding: 'utf8', timeout: 60000 })
    assert.equal(result.status, status, `${label}: resultado Trivy inesperado. ${result.stderr}`)
    const report = JSON.parse(fs.readFileSync(output, 'utf8'))
    const findings = (report.Results ?? []).flatMap(r => r.Vulnerabilities ?? [])
    assert.equal(findings.some(v => v.VulnerabilityID === 'CVE-2026-93687'), status === 1, `${label}: CVE deve permanecer somente nos controles não corrigidos`)
  }
  console.log('Filtro Trivy: cópia corrigida permitida; sem patch/outro hash continuam bloqueados.')
} finally {
  fs.rmSync(dir, { recursive: true, force: true })
}
