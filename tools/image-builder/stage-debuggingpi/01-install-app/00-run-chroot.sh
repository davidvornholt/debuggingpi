#!/bin/bash -e
# Install the Debugging Pi application

echo "[debuggingpi] Installing Debugging Pi application..."

# Create system user for the service
if ! id -u debuggingpi &>/dev/null; then
    useradd --system --create-home --home-dir /home/debuggingpi \
        --shell /bin/bash debuggingpi
    echo "[debuggingpi] Created system user 'debuggingpi'"
fi

# Create application directory
APP_DIR="/opt/debuggingpi"
mkdir -p "$APP_DIR"

# Copy application files staged in pre-chroot step
if [[ ! -d "/tmp/debuggingpi-app" ]]; then
    echo "[debuggingpi] ERROR: /tmp/debuggingpi-app not found"
    exit 1
fi

cp -a /tmp/debuggingpi-app/. "$APP_DIR/"

if [[ ! -f "$APP_DIR/package.json" ]]; then
    echo "[debuggingpi] ERROR: package.json missing in $APP_DIR"
    exit 1
fi

# Install production dependencies
cd "$APP_DIR"
if command -v bun &>/dev/null; then
    bun install --production 2>/dev/null || bun install
else
    echo "[debuggingpi] WARN: Bun not available in chroot, dependencies will install on first boot"
fi

# Set ownership
chown -R debuggingpi:debuggingpi "$APP_DIR"

# Generate SSH key for connecting to Pi Zero W
SSH_DIR="/home/debuggingpi/.ssh"
mkdir -p "$SSH_DIR"
if [[ ! -f "$SSH_DIR/id_ed25519" ]]; then
    ssh-keygen -t ed25519 -f "$SSH_DIR/id_ed25519" -N "" -C "debuggingpi@debuggingpi"
    echo "[debuggingpi] Generated SSH key for Pi Zero W connection"
    echo "[debuggingpi] Public key (add to Pi Zero W authorized_keys):"
    cat "$SSH_DIR/id_ed25519.pub"
fi
chown -R debuggingpi:debuggingpi "$SSH_DIR"
chmod 700 "$SSH_DIR"
chmod 600 "$SSH_DIR/id_ed25519"
chmod 644 "$SSH_DIR/id_ed25519.pub"

# Create a first-boot script to install deps if needed
cat > /opt/debuggingpi/first-boot.sh << 'FIRSTBOOT'
#!/bin/bash
set -e
MARKER="/opt/debuggingpi/.first-boot-done"
if [[ -f "$MARKER" ]]; then
    exit 0
fi

echo "[debuggingpi] Running first-boot setup..."

cd /opt/debuggingpi
if [[ ! -d "node_modules" ]]; then
    echo "[debuggingpi] Installing dependencies..."
    bun install --production
fi

touch "$MARKER"
echo "[debuggingpi] First-boot setup complete"
FIRSTBOOT
chmod +x /opt/debuggingpi/first-boot.sh

echo "[debuggingpi] Application installed to $APP_DIR"
