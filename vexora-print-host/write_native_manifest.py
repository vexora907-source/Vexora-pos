#!/usr/bin/env python3
"""Create the Firefox Native Messaging manifest for this installation."""

import argparse
import json
from pathlib import Path

HOST_NAME = "com.vexora.print"
EXTENSION_ID = "vexora-print@vexoraia.com"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("host_path", type=Path)
    parser.add_argument("manifest_path", type=Path)
    args = parser.parse_args()

    host_path = args.host_path.resolve()
    manifest_path = args.manifest_path.resolve()
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    manifest = {
        "name": HOST_NAME,
        "description": "Vexora POS USB Print Host",
        "path": str(host_path),
        "type": "stdio",
        "allowed_extensions": [EXTENSION_ID],
    }
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"Native host manifest: {manifest_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
