import { mkdtempSync, readFileSync, existsSync, statSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import assert from 'node:assert/strict'

const base=mkdtempSync(join(tmpdir(),'operum-observability-config-'))
const script=resolve('scripts/deploy/configure-observability.py')
const secret='synthetic-private-metrics-key'
const run=(environment,args=[])=>spawnSync('python3',[script,...args],{
  cwd:base,input:JSON.stringify({services:{app:{environment}}}),encoding:'utf8',
})
try {
  const absent=run({})
  assert.notEqual(absent.status,0)
  assert.match(absent.stderr,/INTERNAL_API_KEY/)
  assert.equal(existsSync(join(base,'observability')),false)
  for (const url of ['not-a-url','ftp://sink/path','http://sink:bad','http://sink:99999','http://sink/with space']) {
    const invalid=run({INTERNAL_API_KEY:secret,ALERT_WEBHOOK_URL:url})
    assert.notEqual(invalid.status,0)
    assert.match(invalid.stderr,/ALERT_WEBHOOK_URL/)
    assert.equal(invalid.stderr.includes(secret),false)
    assert.equal(invalid.stderr.includes(url),false)
    assert.equal(existsSync(join(base,'observability')),false)
  }
  assert.equal(run({INTERNAL_API_KEY:secret},['--check']).status,0)
  assert.equal(existsSync(join(base,'observability')),false)
  const local=run({INTERNAL_API_KEY:secret})
  assert.equal(local.status,0)
  assert.match(local.stderr,/envio externo não configurado/)
  assert.equal(local.stderr.includes(secret),false)
  const privateDir=join(base,'observability/private')
  assert.equal(readFileSync(join(privateDir,'metrics.token'),'utf8'),secret)
  assert.equal(statSync(privateDir).mode&0o777,0o700)
  assert.equal(statSync(join(privateDir,'metrics.token')).mode&0o777,0o644)
  assert.equal(readFileSync(join(privateDir,'alertmanager.yml'),'utf8').includes('webhook_configs'),false)
  const delivered=run({INTERNAL_API_KEY:secret,ALERT_WEBHOOK_URL:'https://sink.example/alert?token=synthetic'})
  assert.equal(delivered.status,0)
  assert.equal(delivered.stderr,'')
  assert.match(readFileSync(join(privateDir,'alertmanager.yml'),'utf8'),/webhook_configs:/)
  assert.equal(run({INTERNAL_API_KEY:secret,ALERT_WEBHOOK_URL:'   '}).status,0)
  assert.equal(readFileSync(join(privateDir,'alertmanager.yml'),'utf8').includes('webhook_configs'),false)
  console.log('Required metrics key, local alerts, webhook validation and secret-safe diagnostics verified.')
} finally { rmSync(base,{recursive:true,force:true}) }
