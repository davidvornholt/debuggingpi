#!/bin/bash
set -euo pipefail

CONFIG_JSON=/etc/debug-pi/config.json
CONFIG_DIR=$(dirname "$CONFIG_JSON")

mkdir -p "$CONFIG_DIR"

jq -n \
  --arg ssid "$DEBUG_PI_SSID" \
  --arg passphrase "$DEBUG_PI_PASSPHRASE" \
  --arg country "$DEBUG_PI_COUNTRY" \
  --arg subnet "$DEBUG_PI_SUBNET" \
  --arg dhcpStart "$DEBUG_PI_DHCP_START" \
  --arg dhcpEnd "$DEBUG_PI_DHCP_END" \
  --arg usbAddress "$DEBUG_PI_USB_ADDRESS" \
  '{
    ap: {
      ssid: $ssid,
      passphrase: $passphrase,
      country: $country,
      subnet: $subnet,
      dhcpRange: {
        start: $dhcpStart,
        end: $dhcpEnd
      }
    },
    usb: {
      enabled: true,
      address: $usbAddress
    }
  }' > "$CONFIG_JSON"

chmod 600 "$CONFIG_JSON"
