#!/bin/bash -e
# Debug Pi custom stage installation script
# This runs during the pi-gen build process

on_chroot << EOF
# Install dependencies
apt-get update
apt-get install -y hostapd dnsmasq nftables

# Install Bun
curl -fsSL https://bun.sh/install | bash
export BUN_INSTALL="/root/.bun"
export PATH="\$BUN_INSTALL/bin:\$PATH"
ln -s /root/.bun/bin/bun /usr/local/bin/bun

# Create installation directories
mkdir -p /opt/debug-pi/server
mkdir -p /opt/debug-pi/daemon
mkdir -p /opt/debug-pi/web
mkdir -p /etc/debug-pi

# Install Debug Pi apps (will be copied by 01-packages)
# Apps are built on the host and copied into the image

# Copy default configuration
cp /tmp/user-config.json /etc/debug-pi/config.json

# Install systemd units
cp /tmp/systemd/*.service /etc/systemd/system/
cp /tmp/systemd/*.rules /etc/udev/rules.d/
cp /tmp/systemd/99-debug-pi.conf /etc/sysctl.d/

# Enable services
systemctl enable debug-pi-daemon.service
systemctl enable debug-pi-server.service

# Disable conflicting services
systemctl disable wpa_supplicant.service || true

# Apply sysctl settings
sysctl -p /etc/sysctl.d/99-debug-pi.conf

# Configure journald for persistent storage
mkdir -p /var/log/journal
systemd-tmpfiles --create --prefix /var/log/journal
sed -i 's/#Storage=auto/Storage=persistent/' /etc/systemd/journald.conf

echo "Debug Pi installation complete"
EOF
