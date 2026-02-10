# Debugging Pi Image Pipeline

This folder contains a custom pi-gen stage that installs Debugging Pi, drops systemd units, and writes the initial config.

## Environment variables

Set these when running pi-gen:

- `DEBUG_PI_SSID` (required, Wi-Fi SSID, max 32 chars, example: "DebugPi")
- `DEBUG_PI_PASSPHRASE` (required, WPA2 passphrase 8-63 chars, example: "debug-pi-change-me")
- `DEBUG_PI_COUNTRY` (required, ISO 3166-1 alpha-2, example: "US")
- `DEBUG_PI_SUBNET` (required, CIDR, example: "10.0.0.1/24")
- `DEBUG_PI_DHCP_START` (required, IPv4, example: "10.0.0.10")
- `DEBUG_PI_DHCP_END` (required, IPv4, example: "10.0.0.200")
- `DEBUG_PI_USB_ADDRESS` (required, CIDR, example: "10.55.0.1/24")
