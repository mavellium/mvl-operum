#!/usr/bin/env bash
# Restore into private files only. Never selects or writes a database/server.
set -euo pipefail
set +x
umask 077
: "${RESTIC_REPOSITORY:?required}"
: "${RESTIC_PASSWORD_FILE:?required}"
SNAPSHOT_ID=${1:?exact snapshot ID required}
TARGET=${2:?new private absolute directory required}
[[ "$SNAPSHOT_ID" =~ ^[a-f0-9]{8,64}$ ]]
[[ "$TARGET" == /* && "$TARGET" != / && "$TARGET" != *..* && ! -e "$TARGET" ]]
mkdir -m 700 "$TARGET"
restic restore "$SNAPSHOT_ID" --target "$TARGET" --verify
# Restic preserves absolute source hierarchy; find one manifest unambiguously.
mapfile -t manifests < <(find "$TARGET" -name objects.sha256 -type f)
[ "${#manifests[@]}" -eq 1 ]
cd "$(dirname "${manifests[0]}")"
sha256sum -c objects.sha256
[ -s database.dump ]
printf 'Verified files restored to %s; import ONLY into a new isolated PostgreSQL/MinIO environment.\n' "$TARGET"
