#!/usr/bin/env bash
set -euo pipefail

HOST_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
VENV_DIR="$HOST_DIR/.venv"
MANIFEST_DIR="${HOME}/.mozilla/native-messaging-hosts"
MANIFEST_PATH="$MANIFEST_DIR/com.vexora.print.json"

if ! python3 -c 'import sys; raise SystemExit(sys.version_info < (3, 10))'; then
  echo "Se requiere Python 3.10 o superior."
  exit 1
fi

python3 -m venv "$VENV_DIR"
"$VENV_DIR/bin/python" -m pip install --upgrade pip
"$VENV_DIR/bin/python" -m pip install -r "$HOST_DIR/requirements.txt"

if [[ ! -f "$HOST_DIR/config.json" ]]; then
  cp "$HOST_DIR/config.example.json" "$HOST_DIR/config.json"
fi

chmod +x "$HOST_DIR/vexora_host.sh"
mkdir -p "$MANIFEST_DIR"
"$VENV_DIR/bin/python" "$HOST_DIR/write_native_manifest.py" "$HOST_DIR/vexora_host.sh" "$MANIFEST_PATH"
printf '\nHost instalado. Configura vendor_id y product_id en:\n%s\n' "$HOST_DIR/config.json"
printf 'Luego carga vexora-extension/ en Firefox desde about:debugging.\n'
