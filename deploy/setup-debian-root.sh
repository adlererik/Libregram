#!/usr/bin/env bash
# Erik Adler: install Debian prerequisites and the boot service.
set -euo pipefail
source "$(dirname "$0")/context.sh" "${1:-}"
if [ ! -f "$archive_project/.next/BUILD_ID" ] || [ ! -f "$archive_project/.env.local" ]; then
  printf 'Complete the project transfer and production build first.\n' >&2
  exit 1
fi
apt-get update
DEBIAN_FRONTEND=noninteractive apt-get install --no-install-recommends -y ffmpeg git ca-certificates python3
python3 - "$archive_project" "$archive_node" <<'PY'
from pathlib import Path
import sys
project, node = sys.argv[1:]
unit = (Path(project) / 'deploy/libregram@.service').read_text()
unit = unit.replace('/home/%i/libregram/.runtime/node/bin/node', node)
unit = unit.replace('/home/%i/libregram', project)
Path('/etc/systemd/system/libregram@.service').write_text(unit)
PY
systemctl daemon-reload
runuser -u "$archive_user" -- env PATH="$(dirname "$archive_node"):$PATH" "$archive_project/libregram" stop
if systemctl cat "the-archive@$archive_user" >/dev/null 2>&1; then
  systemctl disable --now "the-archive@$archive_user"
fi
systemctl enable --now "libregram@$archive_user"
systemctl is-enabled "libregram@$archive_user"
systemctl is-active "libregram@$archive_user"
printf 'Boot startup is configured.\n'
