#!/usr/bin/env bash
# Erik Adler: switch the installed service to a stable account-owned tunnel.
set -euo pipefail
if [ "$(id -u)" -ne 0 ]; then printf 'Run using sudo.\n' >&2; exit 1; fi
archive_tunnel_config=/etc/libregram-tunnel
archive_tunnel_service=libregram-tunnel
if [ ! -f "$archive_tunnel_config/tunnel.env" ] && [ -f /etc/the-archive-tunnel/tunnel.env ]; then
  archive_tunnel_config=/etc/the-archive-tunnel
  archive_tunnel_service=the-archive-tunnel
fi
if [ ! -f "$archive_tunnel_config/tunnel.env" ]; then printf 'Install the tunnel service first.\n' >&2; exit 1; fi
read -r -s -p 'Paste only the Cloudflare tunnel token (hidden): ' archive_token
printf '\n'
if [ -z "$archive_token" ] || [[ "$archive_token" =~ [[:space:]] ]]; then printf 'Invalid token format.\n' >&2; exit 1; fi
umask 077
printf '%s' "$archive_token" > "$archive_tunnel_config/token"
unset archive_token
archive_user="$(systemctl show "$archive_tunnel_service" -p User --value)"
getent passwd "$archive_user" >/dev/null
chown "$archive_user:$(id -gn "$archive_user")" "$archive_tunnel_config/token"
chmod 600 "$archive_tunnel_config/token"
printf 'TUNNEL_MODE=named\n' > "$archive_tunnel_config/tunnel.env"
chmod 644 "$archive_tunnel_config/tunnel.env"
systemctl restart "$archive_tunnel_service"
systemctl is-active "$archive_tunnel_service"
printf 'Named tunnel connector started. Add its published application route in Cloudflare.\n'
