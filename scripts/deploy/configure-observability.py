import json, os, sys
from urllib.parse import urlparse
config=json.load(sys.stdin)
env=config['services']['app']['environment']
key=env.get('INTERNAL_API_KEY','')
webhook=env.get('ALERT_WEBHOOK_URL','')
if not key or urlparse(webhook).scheme not in ('http','https') or not urlparse(webhook).hostname:
    raise SystemExit('INTERNAL_API_KEY and ALERT_WEBHOOK_URL required for observability')
os.makedirs('observability/private',mode=0o700,exist_ok=True)
os.chmod('observability/private',0o700)
# UID 65534 in Prometheus must read this; directory stays private to deployment.
with open('observability/private/metrics.token','w') as f: f.write(key)
os.chmod('observability/private/metrics.token',0o644)
with open('observability/private/alertmanager.yml','w') as f:
    f.write('route:\n  receiver: operations\n  group_wait: 30s\nreceivers:\n  - name: operations\n    webhook_configs:\n      - url: '+json.dumps(webhook)+'\n        send_resolved: true\n')
os.chmod('observability/private/alertmanager.yml',0o644)
