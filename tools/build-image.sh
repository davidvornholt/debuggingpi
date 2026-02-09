#!/bin/bash
# Debug Pi Image Builder
# This script creates a custom Raspberry Pi OS image with Debug Pi pre-installed

set -e

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}Debug Pi Image Builder${NC}"
echo "======================================"
echo ""

# Check if pi-gen is available
if [ ! -d "pi-gen" ]; then
    echo -e "${YELLOW}Cloning pi-gen...${NC}"
    git clone https://github.com/RPi-Distro/pi-gen.git
fi

cd pi-gen

# Prompt for configuration
echo -e "${YELLOW}Configuration${NC}"
echo "======================================"
echo ""

read -p "Wi-Fi SSID [DebugPi]: " WIFI_SSID
WIFI_SSID=${WIFI_SSID:-DebugPi}

read -sp "Wi-Fi Passphrase (min 8 chars) [debugpi123]: " WIFI_PASSPHRASE
echo ""
WIFI_PASSPHRASE=${WIFI_PASSPHRASE:-debugpi123}

read -p "Regulatory Domain (2-letter country code) [US]: " REGULATORY_DOMAIN
REGULATORY_DOMAIN=${REGULATORY_DOMAIN:-US}

read -p "Hostname [debug-pi]: " HOSTNAME
HOSTNAME=${HOSTNAME:-debug-pi}

read -p "DHCP Range Start [192.168.1.50]: " DHCP_START
DHCP_START=${DHCP_START:-192.168.1.50}

read -p "DHCP Range End [192.168.1.150]: " DHCP_END
DHCP_END=${DHCP_END:-192.168.1.150}

# Create config file
cat > config << EOF
IMG_NAME=debug-pi
RELEASE=bookworm
TARGET_HOSTNAME=${HOSTNAME}
ENABLE_SSH=1
STAGE_LIST="stage0 stage1 stage2"

# Debug Pi specific
DEBUG_PI_SSID=${WIFI_SSID}
DEBUG_PI_PASSPHRASE=${WIFI_PASSPHRASE}
DEBUG_PI_REGULATORY_DOMAIN=${REGULATORY_DOMAIN}
DEBUG_PI_DHCP_START=${DHCP_START}
DEBUG_PI_DHCP_END=${DHCP_END}
EOF

echo ""
echo -e "${GREEN}Configuration saved!${NC}"
echo ""
echo -e "${YELLOW}Building image... This will take a while.${NC}"
echo ""

# Build the image
./build.sh

echo ""
echo -e "${GREEN}Build complete!${NC}"
echo "Image available in deploy/"
