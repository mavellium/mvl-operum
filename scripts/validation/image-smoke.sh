#!/usr/bin/env bash
set -euo pipefail
SERVICE=${1:?service}
IMAGE=${2:?image}
[[ "$SERVICE" =~ ^(app|api-gateway|auth-service|project-service|sprint-service|notification-service|file-service|mcp-server)$ ]]
PREFIX="operum-smoke-${SERVICE}-$$"
NET="$PREFIX"
containers=()
cleanup() {
  for c in "${containers[@]}"; do docker rm -f "$c" >/dev/null 2>&1 || true; done
  docker network rm "$NET" >/dev/null 2>&1 || true
}
trap cleanup EXIT
docker build -f scripts/validation/Minio.Dockerfile -t operum-minio-validation .
docker network create "$NET" >/dev/null
start() {
  local name=$1; shift
  containers+=("$name")
  docker run -d --name "$name" --network "$NET" "$@" >/dev/null
}
start "$PREFIX-pg" --network-alias postgres -e POSTGRES_PASSWORD=smoke-local-only -e POSTGRES_USER=operum -e POSTGRES_DB=operum postgres:17-alpine
for i in {1..30}; do docker exec "$PREFIX-pg" pg_isready -U operum >/dev/null 2>&1 && break; sleep 2; done
start "$PREFIX-redis" --network-alias redis --network-alias redis-queue --network-alias redis-cache redis:7-alpine redis-server --requirepass smoke-local-only --maxmemory-policy noeviction
start "$PREFIX-minio" --network-alias minio -e MINIO_ROOT_USER=smoke-user -e MINIO_ROOT_PASSWORD=smoke-local-only operum-minio-validation server /data
# Isolated downstream fixture for gateway/MCP readiness, no application data.
start "$PREFIX-downstream" --network-alias downstream node:22-alpine node -e 'require("http").createServer((q,s)=>{s.setHeader("Content-Type","application/json");s.end("{\"status\":\"ready\"}")}).listen(4000)'
case "$SERVICE" in
 app) PORT=3000; HEALTH=/api/health; READY=/api/health/ready; METRICS=/api/metrics;;
 api-gateway) PORT=4000;; auth-service) PORT=4001;; project-service) PORT=4002;;
 sprint-service) PORT=4003;; notification-service) PORT=4004;; file-service) PORT=4005;; mcp-server) PORT=4006;;
esac
HEALTH=${HEALTH:-/health}; READY=${READY:-/health/ready}; METRICS=${METRICS:-/health/metrics}
SMOKE_DATABASE_PASSWORD=smoke-local-only
SMOKE_DATABASE_URL=$(printf '%s://%s:%s@%s:%s/%s' postgresql operum "$SMOKE_DATABASE_PASSWORD" postgres 5432 operum)
start "$PREFIX-app" -e PORT="$PORT" -e NODE_ENV=production -e DATABASE_URL="$SMOKE_DATABASE_URL" \
  -e INTERNAL_API_KEY=smoke-internal-only -e SESSION_SECRET=smoke-session-secret-with-sufficient-entropy \
  -e REDIS_HOST=redis -e REDIS_QUEUE_HOST=redis-queue -e REDIS_CACHE_HOST=redis-cache -e REDIS_PASSWORD=smoke-local-only \
  -e API_GATEWAY_INTERNAL_URL=http://downstream:4000 -e AUTH_SERVICE_URL=http://downstream:4000 \
  -e PROJECT_SERVICE_URL=http://downstream:4000 -e SPRINT_SERVICE_URL=http://downstream:4000 \
  -e FILE_SERVICE_URL=http://downstream:4000 -e NOTIFICATION_SERVICE_URL=http://downstream:4000 \
  -e MINIO_ENDPOINT=minio -e MINIO_PORT=9000 -e MINIO_ACCESS_KEY=smoke-user -e MINIO_SECRET_KEY=smoke-local-only -e MINIO_BUCKET=smoke "$IMAGE"
check() {
  docker exec "$PREFIX-app" node -e 'const [port,path,status,key]=process.argv.slice(1);fetch(`http://127.0.0.1:${port}${path}`,{headers:key?{authorization:`Bearer ${key}`,"X-Request-ID":"smoke-request"}:{},signal:AbortSignal.timeout(4000)}).then(async r=>{if(r.status!==Number(status))throw Error(`Expected ${status}, got ${r.status}`);if(key&&!(await r.text()).includes("operum_process_uptime_seconds"))throw Error("Missing metrics")}).catch(e=>{console.error(e.message);process.exit(1)})' "$PORT" "$1" "$2" "${3:-}"
}
ready=false
for i in {1..30}; do if check "$READY" 200 >/dev/null 2>&1; then ready=true; break; fi; sleep 2; done
if ! $ready; then docker logs "$PREFIX-app"; echo 'Image never ready'; exit 1; fi
check "$HEALTH" 200
check "$METRICS" 401
check "$METRICS" 200 smoke-internal-only
case "$SERVICE" in
 api-gateway|mcp-server) docker stop "$PREFIX-downstream" >/dev/null;;
 *) docker stop "$PREFIX-pg" >/dev/null;;
esac
check "$HEALTH" 200
check "$READY" 503
printf '%s: final image startup, readiness, private metrics and dependency-failure liveness verified\n' "$SERVICE"
