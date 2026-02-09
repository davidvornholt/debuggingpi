#!/bin/bash
# Debug Pi Image Builder
# Interactive configuration and build script

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PI_GEN_DIR="$SCRIPT_DIR/pi-gen-src"
CONFIG_DIR="$SCRIPT_DIR/config"
STAGE_DIR="$SCRIPT_DIR/stage2"

echo "==================================="
echo "Debug Pi Image Builder"
echo "==================================="
echo ""

# Check if pi-gen is cloned
if [ ! -d "$PI_GEN_DIR" ]; then
    echo "Cloning pi-gen repository..."
    git clone https://github.com/RPi-Distro/pi-gen "$PI_GEN_DIR"
fi

# Interactive configuration
echo "Please provide the following configuration:"
echo ""

# Prompt for WiFi AP settings
read -p "Access Point SSID [DebugPi]: " SSID
SSID=${SSID:-DebugPi}

while true; do
    read -sp "Access Point Passphrase (8-63 characters): " PASSPHRASE
    echo ""
    if [ ${#PASSPHRASE} -ge 8 ] && [ ${#PASSPHRASE} -le 63 ]; then
        break
    fi
    echo "Error: Passphrase must be between 8 and 63 characters"
done

read -p "WiFi Channel [6]: " CHANNEL
CHANNEL=${CHANNEL:-6}

read -p "Regulatory Domain [US]: " REG_DOMAIN
REG_DOMAIN=${REG_DOMAIN:-US}

# Prompt for network settings
read -p "AP Subnet [192.168.1.1]: " SUBNET
SUBNET=${SUBNET:-192.168.1.1}

read -p "DHCP Range Start [192.168.1.10]: " DHCP_START
DHCP_START=${DHCP_START:-192.168.1.10}

read -p "DHCP Range End [192.168.1.250]: " DHCP_END
DHCP_END=${DHCP_END:-192.168.1.250}

# Prompt for USB tethering
read -p "USB Tether Device Address [192.168.2.1]: " USB_DEVICE_ADDR
USB_DEVICE_ADDR=${USB_DEVICE_ADDR:-192.168.2.1}

read -p "USB Tether Client Address [192.168.2.2]: " USB_CLIENT_ADDR
USB_CLIENT_ADDR=${USB_CLIENT_ADDR:-192.168.2.2}

# Prompt for system settings
read -p "Hostname [debug-pi]: " HOSTNAME
HOSTNAME=${HOSTNAME:-debug-pi}

read -p "Timezone [UTC]: " TIMEZONE
TIMEZONE=${TIMEZONE:-UTC}

# Save configuration to file
CONFIG_FILE="$CONFIG_DIR/user-config.json"
cat > "$CONFIG_FILE" <<EOF
{
  "version": 1,
  "accessPoint": {
    "enabled": true,
    "ssid": "$SSID",
    "passphrase": "$PASSPHRASE",
    "channel": $CHANNEL,
    "regulatoryDomain": "$REG_DOMAIN",
    "subnet": "$SUBNET",
    "subnetMask": "255.255.255.0",
    "dhcpRangeStart": "$DHCP_START",
    "dhcpRangeEnd": "$DHCP_END"
  },
  "usbTethering": {
    "enabled": true,
    "deviceAddress": "$USB_DEVICE_ADDR",
    "clientAddress": "$USB_CLIENT_ADDR",
    "subnetMask": "255.255.255.0"
  },
  "system": {
    "hostname": "$HOSTNAME",
    "timezone": "$TIMEZONE"
  }
}
EOF

echo ""
echo "Configuration saved to $CONFIG_FILE"
echo ""
echo "Building image..."
echo "This may take 30-60 minutes depending on your system."
echo ""

# Copy custom stage to pi-gen
cp -r "$STAGE_DIR/99-debug-pi" "$PI_GEN_DIR/stage2/"

# Copy configuration
cp "$CONFIG_DIR/debug-pi-config" "$PI_GEN_DIR/config"

# Export configuration variables for the build
export SSID PASSPHRASE CHANNEL REG_DOMAIN SUBNET DHCP_START DHCP_END
export USB_DEVICE_ADDR USB_CLIENT_ADDR HOSTNAME TIMEZONE

# Run pi-gen build
cd "$PI_GEN_DIR"
./build.sh

echo ""
echo "==================================="
echo "Build complete!"
echo "Image available in: $PI_GEN_DIR/deploy/"
echo "==================================="
