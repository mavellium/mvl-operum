#!/usr/bin/env bash
set -euo pipefail
PREFIX="operum-redis-pressure-$$"
cleanup() { for kind in session queue cache; do docker rm -f "$PREFIX-$kind" >/dev/null 2>&1 || true; done; }
trap cleanup EXIT
for kind in session queue cache; do
  policy=noeviction
  if [ "$kind" = cache ]; then policy=allkeys-lru; fi
  docker run -d --name "$PREFIX-$kind" redis:7-alpine redis-server --maxmemory 5mb --maxmemory-policy "$policy" --appendonly yes >/dev/null
  for i in {1..20}; do docker exec "$PREFIX-$kind" redis-cli ping >/dev/null 2>&1 && break; sleep 1; done
done
docker exec "$PREFIX-session" redis-cli set session:jti confirmed >/dev/null
docker exec "$PREFIX-queue" redis-cli rpush bull:notifications:wait job-1 >/dev/null
# Saturate only cache first. Other instances must retain their protected keys.
docker exec "$PREFIX-cache" redis-cli eval 'for i=1,2000 do redis.call("SET","cache:"..i,string.rep("x",16384)) end return "ok"' 0 | grep -E '^ok$'
[ "$(docker exec "$PREFIX-session" redis-cli get session:jti)" = confirmed ]
[ "$(docker exec "$PREFIX-queue" redis-cli lindex bull:notifications:wait 0)" = job-1 ]
for kind in session queue; do
  # Lua is atomic and may exceed maxmemory during the script; probe the next
  # independent write to verify the server's visible noeviction refusal.
  docker exec "$PREFIX-$kind" redis-cli eval 'for i=1,2000 do redis.call("SET","pressure:"..i,string.rep("x",16384)) end return "filled"' 0 >/dev/null
  docker exec "$PREFIX-$kind" redis-cli set pressure-probe rejected | grep -i 'OOM'

done
[ "$(docker exec "$PREFIX-session" redis-cli get session:jti)" = confirmed ]
[ "$(docker exec "$PREFIX-queue" redis-cli lindex bull:notifications:wait 0)" = job-1 ]
# Free pressure, prove writes/retry and persistence after restart.
docker exec "$PREFIX-queue" redis-cli flushdb >/dev/null
docker exec "$PREFIX-queue" redis-cli rpush bull:notifications:wait recovered-job >/dev/null
docker restart "$PREFIX-queue" >/dev/null
sleep 2
[ "$(docker exec "$PREFIX-queue" redis-cli lindex bull:notifications:wait 0)" = recovered-job ]
echo 'Redis eviction isolation, visible OOM, retry and AOF recovery verified'
