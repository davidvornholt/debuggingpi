#!/bin/bash -e
# Copy Debug Pi packages into the image

# Build the apps on host before copying
echo "Building Debug Pi apps..."
cd "${SCRIPT_DIR}/../../../"
npm install
npm run build

# Copy built artifacts
on_chroot << EOF
# Apps are copied from host build
EOF

# Copy server
install -d "${ROOTFS_DIR}/opt/debug-pi/server"
install -m 755 "${SCRIPT_DIR}/../../../apps/debug-pi-server/dist/"* "${ROOTFS_DIR}/opt/debug-pi/server/"

# Copy daemon
install -d "${ROOTFS_DIR}/opt/debug-pi/daemon"
install -m 755 "${SCRIPT_DIR}/../../../apps/debug-pi-daemon/dist/"* "${ROOTFS_DIR}/opt/debug-pi/daemon/"

# Copy web (built static files)
install -d "${ROOTFS_DIR}/opt/debug-pi/web"
cp -r "${SCRIPT_DIR}/../../../apps/debug-pi-web/dist/"* "${ROOTFS_DIR}/opt/debug-pi/web/"

# Copy systemd files
install -d "${ROOTFS_DIR}/tmp/systemd"
cp "${SCRIPT_DIR}/../../../systemd/"* "${ROOTFS_DIR}/tmp/systemd/"

# Copy user configuration
cp "${SCRIPT_DIR}/../../config/user-config.json" "${ROOTFS_DIR}/tmp/user-config.json"

echo "Debug Pi packages copied to image"
