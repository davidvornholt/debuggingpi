# Debugging Pi Image Pipeline

This folder contains a custom pi-gen stage that installs Debugging Pi, drops systemd units, and writes the initial config.

## Environment variables

Set these when running pi-gen:

- `DEBUG_PI_SSID`
- `DEBUG_PI_PASSPHRASE`
- `DEBUG_PI_COUNTRY`
- `DEBUG_PI_SUBNET`
- `DEBUG_PI_DHCP_START`
- `DEBUG_PI_DHCP_END`
- `DEBUG_PI_USB_ADDRESS`
