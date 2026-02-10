#!/bin/bash
set -euo pipefail

CONFIG_JSON=/etc/debug-pi/config.json

cat <<EOF > "$CONFIG_JSON"
{
  "ap": {
    "ssid": "${DEBUG_PI_SSID}",
    "passphrase": "${DEBUG_PI_PASSPHRASE}",
    "country": "${DEBUG_PI_COUNTRY}",
    "subnet": "${DEBUG_PI_SUBNET}",
    "dhcpRange": {
      "start": "${DEBUG_PI_DHCP_START}",
      "end": "${DEBUG_PI_DHCP_END}"
    }
  },
  "usb": {
    "enabled": true,
    "address": "${DEBUG_PI_USB_ADDRESS}"
  }
}
EOF
