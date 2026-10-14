#!/usr/bin/env bash
# Erik Adler: install the verified connector and enable its permanent boot service.
set -euo pipefail
source "$(dirname "$0")/context.sh" "${1:-}"
archive_binary="$archive_project/.runtime/cloudflared/cloudflared"
archive_sha=d33ff2d14475178d2012c2c56beba87389ac5ded27649519f198a7d3134a99db
if [ -f "$archive_binary" ]; then
  printf '%s  %s\n' "$archive_sha" "$archive_binary" | sha256sum --check --status
  install -m 755 "$archive_binary" /usr/local/bin/cloudflared
elif [ ! -x /usr/local/bin/cloudflared ]; then
  printf 'Install official cloudflared at /usr/local/bin/cloudflared first. See docs/PUBLIC-SETUP.md.\n' >&2
  exit 1
fi
install -d -m 755 /usr/local/libexec /etc/libregram-tunnel
# Reuse the existing private named-tunnel configuration on an upgrade.
if [ ! -f /etc/libregram-tunnel/tunnel.env ] && [ -f /etc/the-archive-tunnel/tunnel.env ]; then
  cp -a /etc/the-archive-tunnel/. /etc/libregram-tunnel/
fi
install -m 755 "$archive_project/deploy/libregram-tunnel-run" /usr/local/libexec/libregram-tunnel-run
sed "s/@ARCHIVE_USER@/$archive_user/g" "$archive_project/deploy/libregram-tunnel.service" > /etc/systemd/system/libregram-tunnel.service
chmod 644 /etc/systemd/system/libregram-tunnel.service
if [ ! -f /etc/libregram-tunnel/tunnel.env ]; then
  printf 'TUNNEL_MODE=quick\n' > /etc/libregram-tunnel/tunnel.env
  chmod 644 /etc/libregram-tunnel/tunnel.env
fi
# Preserve a private backup and set HTTPS session cookies and local proxy trust.
python3 - "$archive_project" <<'PY'
import datetime, os, shutil, sys
from pathlib import Path
root = Path(sys.argv[1])
env = root / '.env.local'
stamp = datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
backup = root / '.runtime' / ('env-before-cloudflare-' + stamp)
backup.parent.mkdir(parents=True, exist_ok=True)
shutil.copy2(env, backup)
os.chmod(backup, 0o600)
os.chown(backup, env.stat().st_uid, env.stat().st_gid)
lines = env.read_text().splitlines()
for key in ('SESSION_COOKIE_SECURE', 'TRUST_PROXY'):
    lines = [line for line in lines if not line.startswith(key + '=')]
    lines.append(key + '=true')
env.write_text('\n'.join(lines) + '\n')
os.chmod(env, 0o600)
PY
systemctl daemon-reload
systemctl restart "$archive_service"
# Stop any temporary pre-install connector before starting the boot service.
runuser -u "$archive_user" -- env XDG_RUNTIME_DIR="/run/user/$(id -u "$archive_user")" systemctl --user stop libregram-tunnel-preview.service >/dev/null 2>&1 || true
runuser -u "$archive_user" -- env XDG_RUNTIME_DIR="/run/user/$(id -u "$archive_user")" systemctl --user stop the-archive-tunnel-preview.service >/dev/null 2>&1 || true
if systemctl cat the-archive-tunnel >/dev/null 2>&1; then
  systemctl disable --now the-archive-tunnel
fi
systemctl enable libregram-tunnel
systemctl restart libregram-tunnel
systemctl is-enabled libregram-tunnel
systemctl is-active libregram-tunnel
/usr/local/bin/cloudflared --version
if grep -qx 'TUNNEL_MODE=quick' /etc/libregram-tunnel/tunnel.env; then
  archive_invocation="$(systemctl show libregram-tunnel -p InvocationID --value)"
  for archive_attempt in $(seq 1 20); do
    archive_url="$(journalctl -u libregram-tunnel "_SYSTEMD_INVOCATION_ID=$archive_invocation" --no-pager -o cat | grep -Eo 'https://[a-z0-9-]+\.trycloudflare\.com' | tail -n 1 || true)"
    if [ -n "$archive_url" ]; then printf '\nLIVE HTTPS URL: %s\nCMS LOGIN: %s/admin/login\n' "$archive_url" "$archive_url"; exit 0; fi
    sleep 2
  done
  printf 'Service started; URL not yet received. Check: sudo journalctl -u libregram-tunnel -n 50 --no-pager\n' >&2
fi
