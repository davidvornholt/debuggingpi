#!/bin/bash -e
# Install Bun runtime for aarch64

echo "[debuggingpi] Installing Bun runtime..."

# Install Bun using the official installer (runs in chroot, detects aarch64)
curl -fsSL https://bun.sh/install | bash

# Create a system-wide symlink
BUN_PATH="/root/.bun/bin/bun"
if [[ -f "$BUN_PATH" ]]; then
    cp "$BUN_PATH" /usr/local/bin/bun
    chmod 755 /usr/local/bin/bun
    echo "[debuggingpi] Bun installed: $(bun --version)"
else
    echo "[debuggingpi] ERROR: Bun binary not found at $BUN_PATH"
    exit 1
fi

# Also install for the debuggingpi user (created in step 01)
echo "[debuggingpi] Bun installation complete"
