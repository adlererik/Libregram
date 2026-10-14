#!/usr/bin/env bash
# Compatibility entry point for existing installations.
set -euo pipefail
exec bash "$(dirname -- "${BASH_SOURCE[0]}")/rebuild-libregram-root.sh" "$@"
