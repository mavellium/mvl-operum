#!/usr/bin/env bash
set -euo pipefail
export COMPOSE_PROJECT_NAME="operum-ops-validation-${GITHUB_RUN_ID:-$$}"
for key in APP API_GATEWAY AUTH_SERVICE PROJECT_SERVICE SPRINT_SERVICE NOTIFICATION_SERVICE FILE_SERVICE MCP_SERVER; do
  export "${key}_IMAGE=ghcr.io/validation/image@sha256:$(printf '0%.0s' {1..64})"
done
export REDIS_PASSWORD=validation-only GRAFANA_PASSWORD=validation-only BASE_DOMAIN=validation.invalid
printf '%s' '{"services":{"app":{"environment":{"INTERNAL_API_KEY":"validation-only","ALERT_WEBHOOK_URL":"http://sink:8080"}}}}' | python3 scripts/deploy/configure-observability.py
COMPOSE=(docker compose -f docker-compose.validation.yml)
cleanup() { "${COMPOSE[@]}" down -v --remove-orphans >/dev/null; rm -rf observability/private; }
trap cleanup EXIT
"${COMPOSE[@]}" up -d
probe() {
  "${COMPOSE[@]}" exec -T docker-log-proxy node -e "$1"
}
for i in {1..30}; do
  if probe 'fetch("http://localhost:2375/_ping").then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))'; then break; fi
  sleep 1
  [ "$i" -ne 30 ]
done
probe 'fetch("http://localhost:2375/containers/create",{method:"POST"}).then(r=>{if(r.status!==403)process.exit(1)})'
probe 'fetch("http://localhost:2375/containers/json").then(r=>r.json()).then(async x=>{if(!x.length)throw Error("No scoped containers");const r=await fetch(`http://localhost:2375/containers/${x[0].Id}/json`);const d=await r.json();if(d.Config?.Env||d.Mounts||d.Path)throw Error("Sensitive inspect data exposed")}).catch(()=>process.exit(1))'
# Validate all 8 synthetic metrics targets + 3 real Redis exporters, empty provisioning.
for i in {1..45}; do
  if probe 'fetch("http://prometheus:9090/api/v1/query?query=up").then(r=>r.json()).then(x=>{if(x.data.result.length!==11||x.data.result.some(t=>t.value[1]!=="1"))process.exit(1)}).catch(()=>process.exit(1))'; then break; fi
  sleep 2
  [ "$i" -ne 45 ]
done
probe 'fetch("http://grafana:3000/api/health").then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))'
"${COMPOSE[@]}" exec -T fixture node -e 'fetch("http://localhost:3000/test",{headers:{"X-Request-ID":"operum-observability-trace"}})'
for i in {1..30}; do
  if probe 'fetch("http://loki:3100/loki/api/v1/query?query="+encodeURIComponent("{job=\"operum\"} |= \"operum-observability-trace\"")).then(r=>r.json()).then(x=>{if(!x.data.result.length)process.exit(1)}).catch(()=>process.exit(1))'; then break; fi
  sleep 2
  [ "$i" -ne 30 ]
done
"${COMPOSE[@]}" stop fixture
for i in {1..90}; do
  if "${COMPOSE[@]}" logs --no-color sink | grep -E 'ALERT_RECEIVED.*OperumTargetDown'; then break; fi
  sleep 2
  [ "$i" -ne 90 ]
done
echo 'Fresh provisioning, 11 UP targets, collected trace and synthetic alert delivery verified'
