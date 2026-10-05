import json, os, sys
from urllib.parse import urlparse
config=json.load(sys.stdin)
env=config['services']['app']['environment']
key=env.get('INTERNAL_API_KEY') or ''
webhook=(env.get('ALERT_WEBHOOK_URL') or '').strip()
if not key.strip():
    raise SystemExit('INTERNAL_API_KEY obrigatória no .env da VPS para métricas privadas')
try:
    destination=urlparse(webhook)
    valid=destination.scheme in ('http','https') and bool(destination.hostname)
    if destination.port is not None:
        valid=valid and 0 < destination.port <= 65535
except ValueError:
    valid=False
if webhook and (not valid or any(c.isspace() for c in webhook)):
    raise SystemExit('ALERT_WEBHOOK_URL inválida: configure uma URL HTTP(S) ou deixe vazia para alertas locais')
if '--check' in sys.argv[1:]:
    raise SystemExit(0)
if not webhook:
    print('::warning::ALERT_WEBHOOK_URL ausente; alertas locais ativos, envio externo não configurado',file=sys.stderr)
os.makedirs('observability/private',mode=0o700,exist_ok=True)
os.chmod('observability/private',0o700)
# UID 65534 in Prometheus must read this; directory stays private to deployment.
with open('observability/private/metrics.token','w') as f: f.write(key)
os.chmod('observability/private/metrics.token',0o644)
with open('observability/private/alertmanager.yml','w') as f:
    f.write('route:\n  receiver: operations\n  group_wait: 30s\nreceivers:\n  - name: operations\n')
    if webhook:
        f.write('    webhook_configs:\n      - url: '+json.dumps(webhook)+'\n        send_resolved: true\n')
os.chmod('observability/private/alertmanager.yml',0o644)
