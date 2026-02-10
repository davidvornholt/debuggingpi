#!/bin/bash
set -euo pipefail

cd /opt/debug-pi

bun install --frozen-lockfile
bun run --cwd apps/debug-pi-web build
bun run --cwd apps/debug-pi-server build
bun run --cwd apps/debug-pi-daemon build
