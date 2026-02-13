#!/bin/bash -e
# Configure networking: WiFi AP, USB network, IP forwarding

echo "[debuggingpi] Configuring network..."

NETWORK_STAGING_DIR="/tmp/debuggingpi-network"
if [[ ! -d "$NETWORK_STAGING_DIR" ]]; then
	echo "[debuggingpi] ERROR: $NETWORK_STAGING_DIR not found"
	exit 1
fi

# Install NetworkManager connection profiles
NM_DIR="/etc/NetworkManager/system-connections"
mkdir -p "$NM_DIR"

# WiFi Access Point profile
install -m 600 "$NETWORK_STAGING_DIR/debuggingpi-ap.nmconnection" "$NM_DIR/debuggingpi-ap.nmconnection"

# USB network profile for Pi Zero W
install -m 600 "$NETWORK_STAGING_DIR/usb-zero.nmconnection" "$NM_DIR/usb-zero.nmconnection"

echo "[debuggingpi] NetworkManager profiles installed"

# IP forwarding
install -m 644 "$NETWORK_STAGING_DIR/debuggingpi-forwarding.conf" /etc/sysctl.d/90-debuggingpi.conf

echo "[debuggingpi] IP forwarding configured"

# Ensure NetworkManager manages all interfaces
cat > /etc/NetworkManager/conf.d/10-debuggingpi.conf << 'EOF'
[main]
plugins=ifupdown,keyfile

[ifupdown]
managed=true

[device]
wifi.scan-rand-mac-address=no
wifi.backend=wpa_supplicant
EOF

echo "[debuggingpi] Network configuration complete"
