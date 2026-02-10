# Debugging Pi Operations

## Default Network

- AP subnet: `192.168.1.1/24`
- DHCP range: `192.168.1.10` to `192.168.1.200`
- USB tether address: `10.55.0.1/24`

## Config updates

Update the AP and USB settings in the UI. Changes are persisted to `/etc/debug-pi/config.json` and applied by the daemon.

## USB tethering expectations

- The Pi will bridge Wi-Fi to the USB interface when `usb0` appears.
- Ensure the target device uses the same USB gadget mode and is configured as a DHCP client.

## Logs

The web UI streams journald logs via Server-Sent Events. If logs stop, verify:

- `Storage=persistent` in `/etc/systemd/journald.conf`.
- `debug-pi-daemon` is running and `journalctl -f` has output.

## SSH access

- Install your SSH public key in `~/.ssh/authorized_keys`.
- Verify permissions: `chmod 700 ~/.ssh` and `chmod 600 ~/.ssh/authorized_keys`.

## Troubleshooting

- If `usb0` does not appear, check `dmesg` for USB gadget errors.
- If the UI is unreachable, confirm `hostapd` and `dnsmasq` are running and bound to `wlan0`.
