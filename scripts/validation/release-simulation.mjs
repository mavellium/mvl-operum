import { mkdtempSync, writeFileSync, mkdirSync, readFileSync, cpSync, rmSync, existsSync, readdirSync, chmodSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawnSync, spawn } from 'node:child_process'
import assert from 'node:assert/strict'
import { once } from 'node:events'
const repo = resolve('.'), base = mkdtempSync(join(tmpdir(), 'operum-release-'))
const sha = 'a'.repeat(40), previous = 'b'.repeat(40)
const services = ['APP','API_GATEWAY','AUTH_SERVICE','FILE_SERVICE','NOTIFICATION_SERVICE','PROJECT_SERVICE','SPRINT_SERVICE','MCP_SERVER']
const manifest = (s, compatible = true) => `RELEASE_SHA=${s}\nROLLBACK_COMPATIBLE=${compatible}\n` + services.map(x => `${x}_IMAGE=ghcr.io/mavellium/${x.toLowerCase().replaceAll('_','-')}@sha256:${s[0].repeat(64)}\n`).join('')
try {
  const bin = join(base, 'bin'); mkdirSync(bin)
  writeFileSync(join(bin,'docker'), `#!/usr/bin/env bash
set -eu
printf '%s\\n' "$*" >> "$MOCK_LOG"
if [[ "$*" == login* ]]; then exit 0; fi
if [[ "$*" == "image inspect"* ]]; then echo "$MOCK_IMAGE_SHA"; fi
if [[ "$*" == *"config --format json"* ]]; then echo '{"services":{"app":{"environment":{"INTERNAL_API_KEY":"synthetic-secret","ALERT_WEBHOOK_URL":"http://sink:8080"}}}}'; fi
if [[ "$*" == *"up -d"* && "\${MOCK_FAIL:-}" == up && ! -e "$MOCK_MARKER" ]]; then touch "$MOCK_MARKER"; exit 1; fi
`, { mode: 0o700 })
  const setup = name => {
    const dir=join(base,name);mkdirSync(join(dir,'.deploy-incoming',sha),{recursive:true})
    writeFileSync(join(dir,'.env'),'synthetic-only=true\n')
    writeFileSync(join(dir,'release.env'),manifest(previous))
    writeFileSync(join(dir,'.current-release'),previous+'\n')
    for(const f of ['docker-compose.yml','docker-compose.production.yml']) {
      cpSync(join(repo,f),join(dir,f));cpSync(join(repo,f),join(dir,'.deploy-incoming',sha,f))
    }
    cpSync(join(repo,'observability'),join(dir,'.deploy-incoming',sha,'observability'),{recursive:true})
    for(const f of ['rollback.sh','configure-observability.py','replace-observability.py'])cpSync(join(repo,'scripts/deploy',f),join(dir,'.deploy-incoming',sha,f))
    writeFileSync(join(dir,'.deploy-incoming',sha,'release.env'),manifest(sha))
    return dir
  }
  const run = (dir, extra={}) => spawnSync('bash',[join(repo,'scripts/deploy/remote-deploy.sh'),dir,sha,'mavellium'],{ input:'synthetic-registry-token', timeout:10000, encoding:'utf8',env:{...process.env,PATH:`${bin}:${process.env.PATH}`,MOCK_LOG:join(base,'docker.log'),MOCK_MARKER:join(base,'failed-up'),MOCK_IMAGE_SHA:sha,...extra} })
  const locked=setup('locked'), acquired=join(base,'lock-acquired')
  const holder=spawn('bash',['-c','exec 9>"$1/.deploy.lock"; flock 9; touch "$2"; sleep 2','fixture',locked,acquired])
  const holderExit=once(holder,'exit')
  for(let i=0;i<50&&!existsSync(acquired);i++) await new Promise(resolve=>setTimeout(resolve,20))
  assert.ok(existsSync(acquired))
  assert.equal(run(locked).status,1)
  assert.equal(readFileSync(join(locked,'release.env'),'utf8'),manifest(previous))
  await holderExit
  const healthy=setup('healthy');assert.equal(run(healthy).status,0)
  assert.equal(readFileSync(join(healthy,'.current-release'),'utf8').trim(),sha)
  assert.match(readFileSync(join(healthy,'release.env'),'utf8'),/@sha256:/)
  const readOnly=setup('read-only-assets')
  mkdirSync(join(readOnly,'observability'));writeFileSync(join(readOnly,'observability','prometheus.yml'),'old-assets')
  chmodSync(join(readOnly,'observability','prometheus.yml'),0o400);chmodSync(join(readOnly,'observability'),0o500)
  const readOnlyRun=run(readOnly)
  assert.equal(readOnlyRun.status,0,readOnlyRun.stderr)
  assert.ok(statSync(join(readOnly,'observability')).mode & 0o200)
  const assetRecord=readFileSync(join(readOnly,'.current-release-record'),'utf8').trim()
  const displaced=readdirSync(readOnly).find(x=>x.startsWith('.observability-archived.'))
  assert.equal(readFileSync(join(readOnly,displaced,'prometheus.yml'),'utf8'),'old-assets')
  // Production retains archives. Cleanup is confined to the fixture.
  chmodSync(join(readOnly,displaced),0o700)
  const assetRollback=spawnSync('bash',[join(repo,'scripts/deploy/rollback.sh'),readOnly],{encoding:'utf8',env:{...process.env,PATH:bin+':'+process.env.PATH,MOCK_LOG:join(base,'docker.log')}})
  assert.equal(assetRollback.status,0)
  assert.equal(readFileSync(join(readOnly,'observability','prometheus.yml'),'utf8'),'old-assets')
  assert.match(readFileSync(join(base,'docker.log'),'utf8'),/up -d --force-recreate --no-deps/)
  const failed=setup('failed');assert.equal(run(failed,{MOCK_FAIL:'up'}).status,1)
  assert.equal(readFileSync(join(failed,'release.env'),'utf8'),manifest(previous))
  assert.equal(readFileSync(join(failed,'.current-release'),'utf8').trim(),previous)
  // Same SHA can retry after a failed rollout; its failed snapshot remains intact.
  const retrySnapshot = readdirSync(join(failed,'.releases'))[0]
  const originalManifest=readFileSync(join(failed,'.releases',retrySnapshot,'release.env'),'utf8')
  assert.equal(run(failed).status,0)
  const retryRecord=readFileSync(join(failed,'.current-release-record'),'utf8').trim()
  assert.notEqual(retryRecord,retrySnapshot)
  assert.equal(readFileSync(join(failed,'.releases',retrySnapshot,'release.env'),'utf8'),originalManifest)
  // Legacy SHA-only snapshots also remain immutable and do not block retry.
  const legacy=setup('legacy');mkdirSync(join(legacy,'.releases',sha),{recursive:true})
  writeFileSync(join(legacy,'.releases',sha,'sentinel'),'legacy-snapshot')
  assert.equal(run(legacy).status,0)
  assert.equal(readFileSync(join(legacy,'.releases',sha,'sentinel'),'utf8'),'legacy-snapshot')
  // Repeating a completed release still checks readiness, without overwriting history.
  cpSync(join(legacy,'.releases',readFileSync(join(legacy,'.current-release-record'),'utf8').trim()),join(legacy,'.deploy-incoming',sha),{recursive:true})
  for(const f of ['rollback.sh','configure-observability.py','replace-observability.py'])cpSync(join(repo,'scripts/deploy',f),join(legacy,'.deploy-incoming',sha,f))
  const completedRecord=readFileSync(join(legacy,'.current-release-record'),'utf8')
  assert.equal(run(legacy).status,0)
  const newRecord=readFileSync(join(legacy,'.current-release-record'),'utf8').trim()
  assert.notEqual(newRecord,completedRecord.trim())
  assert.equal(readFileSync(join(legacy,'.releases',newRecord,'previous-release-record'),'utf8'),completedRecord)
  const repeatedRollback=spawnSync('bash',[join(repo,'scripts/deploy/rollback.sh'),legacy],{encoding:'utf8',env:{...process.env,PATH:`${bin}:${process.env.PATH}`,MOCK_LOG:join(base,'docker.log')}})
  assert.equal(repeatedRollback.status,0)
  assert.equal(readFileSync(join(legacy,'.current-release-record'),'utf8'),completedRecord)
  const incompatible=setup('incompatible');writeFileSync(join(incompatible,'.deploy-incoming',sha,'release.env'),manifest(sha,false));rmSync(join(base,'failed-up'))
  assert.equal(run(incompatible,{MOCK_FAIL:'up'}).status,1)
  assert.equal(readFileSync(join(incompatible,'release.env'),'utf8'),manifest(sha,false))
  const invalid=setup('invalid');writeFileSync(join(invalid,'.deploy-incoming',sha,'release.env'),manifest(sha).replace(/@sha256:[a-f0-9]{64}/,':prod'))
  assert.notEqual(run(invalid).status,0)
  const wrongSha=setup('wrong-sha');assert.equal(run(wrongSha,{MOCK_IMAGE_SHA:previous}).status,1)
  assert.equal(readFileSync(join(wrongSha,'release.env'),'utf8'),manifest(previous))
  const rollback=spawnSync('bash',[join(repo,'scripts/deploy/rollback.sh'),healthy],{encoding:'utf8',env:{...process.env,PATH:`${bin}:${process.env.PATH}`,MOCK_LOG:join(base,'docker.log')}})
  assert.equal(rollback.status,0)
  assert.equal(readFileSync(join(healthy,'.current-release'),'utf8').trim(),previous)
  assert.equal(existsSync(join(healthy,'.current-release-record')),false)
  const retryRollback=spawnSync('bash',[join(repo,'scripts/deploy/rollback.sh'),failed],{encoding:'utf8',env:{...process.env,PATH:`${bin}:${process.env.PATH}`,MOCK_LOG:join(base,'docker.log')}})
  assert.equal(retryRollback.status,0)
  assert.equal(readFileSync(join(failed,'.current-release'),'utf8').trim(),previous)
  console.log('Release validation, exact digests, failed rollout recovery and schema rollback guard verified (Docker fixture).')
} finally {
  const unlockFixture = dir => {
    chmodSync(dir,0o700)
    for (const name of readdirSync(dir)) {
      const child=join(dir,name)
      if (statSync(child).isDirectory()) unlockFixture(child)
    }
  }
  unlockFixture(base)
  rmSync(base,{recursive:true,force:true})
}
