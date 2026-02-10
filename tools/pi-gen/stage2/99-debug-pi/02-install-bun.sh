#!/bin/bash
set -euo pipefail

INSTALLER=$(mktemp)
curl -fsSL https://bun.sh/install -o "$INSTALLER"
bash "$INSTALLER" -s "bun-v1.1.38"
rm -f "$INSTALLER"
