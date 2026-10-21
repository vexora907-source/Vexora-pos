#!/bin/sh
set -eu
HOST_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
exec "$HOST_DIR/.venv/bin/python" "$HOST_DIR/vexora_host.py"
