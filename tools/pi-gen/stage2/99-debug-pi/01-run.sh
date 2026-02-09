#!/bin/bash -e
# Install Debug Pi apps and services

# Install Bun
curl -fsSL https://bun.sh/install | bash
export PATH="$HOME/.bun/bin:$PATH"

# Create installation directories
mkdir -p /opt/debug-pi/{server,daemon,web}

# Copy built applications
cp -r /tmp/debug-pi-build/apps/debug-pi-server/dist/* /opt/debug-pi/server/
cp -r /tmp/debug-pi-build/apps/debug-pi-daemon/dist/* /opt/debug-pi/daemon/
cp -r /tmp/debug-pi-build/apps/debug-pi-web/dist/* /opt/debug-pi/web/

# Copy shared packages
cp -r /tmp/debug-pi-build/packages/shared /opt/debug-pi/

# Create config directory
mkdir -p /etc/debug-pi

# Install systemd services
cp /tmp/debug-pi-build/systemd/*.service /etc/systemd/system/

# Copy network configuration templates
cp /tmp/debug-pi-build/systemd/*.template /etc/debug-pi/

# Enable services
systemctl enable debug-pi-daemon.service
systemctl enable debug-pi-server.service

# Enable IP forwarding
echo "net.ipv4.ip_forward=1" >> /etc/sysctl.conf

# Configure journald for persistence
mkdir -p /var/log/journal
sed -i 's/#Storage=auto/Storage=persistent/' /etc/systemd/journald.conf

# Install required packages
apt-get update
apt-get install -y hostapd dnsmasq nftables

# Disable default services (we'll manage them via the daemon)
systemctl disable hostapd
systemctl disable dnsmasq

echo "Debug Pi installation complete!"
