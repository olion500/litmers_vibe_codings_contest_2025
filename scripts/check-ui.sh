#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"
# Flag raw button/input usage inside app/ excluding generated UI primitives.
if rg --hidden --no-heading --glob 'app/**' --glob '!app/api/**' --glob '!app/**/layout.tsx' "<button" >/tmp/ui-raw.txt; then
  echo "Found raw <button> usage (use @/components/ui/button instead):" >&2
  cat /tmp/ui-raw.txt >&2
  exit 1
fi
exit 0
