# Debug Pi Operations Guide

This guide covers setup, configuration, and troubleshooting for Debug Pi.

## Initial Setup

### First Boot

1. Flash the Debug Pi image to an SD card
2. Insert the SD card into your Raspberry Pi
3. Power on the device
4. Wait 2-3 minutes for the system to fully boot
5. Connect to the WiFi network with the SSID you configured during build
6. Navigate to `http://192.168.1.1:3000` (or your configured AP IP)

### SSH Access

SSH is enabled by default:

```bash
ssh pi@192.168.1.1
# Password is what you configured during image build
```

To install your SSH key:

```bash
# From your development machine
ssh-copy-id pi@192.168.1.1
```

### Changing Default Credentials

```bash
# On the Raspberry Pi
passwd
```

## Configuration

### Access Point Settings

Changes can be made via the web UI at `http://192.168.1.1:3000` or by editing the config file:

```bash
sudo nano /etc/debug-pi/config.json
```

After making changes, restart the daemon:

```bash
sudo systemctl restart debug-pi-daemon.service
sudo systemctl restart hostapd.service
sudo systemctl restart dnsmasq.service
```

### USB Tethering

USB tethering is automatically configured when a USB OTG device connects.

#### Setting up Pi Zero W as a Tethered Device

On the Pi Zero W:

1. Enable USB gadget mode by adding to `/boot/config.txt`:
   ```
   dtoverlay=dwc2
   ```

2. Add to `/boot/cmdline.txt` after `rootwait`:
   ```
   modules-load=dwc2,g_ether
   ```

3. Configure static IP on the Pi Zero W:
   ```bash
   sudo nano /etc/dhcpcd.conf
   ```
   Add:
   ```
   interface usb0
   static ip_address=192.168.2.2/24
   static routers=192.168.2.1
   static domain_name_servers=192.168.2.1
   ```

4. Reboot both devices

5. From an AP client, you should be able to SSH to the Pi Zero:
   ```bash
   ssh pi@192.168.2.2
   ```

### Network Routing

Debug Pi automatically routes traffic between:
- AP clients ↔ Ethernet (internet access)
- USB tethered devices ↔ Ethernet (internet access)
- AP clients ↔ USB tethered devices (direct communication)

No additional configuration required.

## Monitoring

### Web UI

The web UI provides:
- System status (uptime, memory, temperature)
- Live log streaming
- Configuration management
- System control (reboot/shutdown)

### System Logs

View logs via the web UI or command line:

```bash
# Follow all logs
sudo journalctl -f

# Filter by service
sudo journalctl -u debug-pi-server.service -f
sudo journalctl -u debug-pi-daemon.service -f

# View logs from last boot
sudo journalctl -b
```

### Service Status

Check service health:

```bash
sudo systemctl status debug-pi-server.service
sudo systemctl status debug-pi-daemon.service
sudo systemctl status hostapd.service
sudo systemctl status dnsmasq.service
```

## Troubleshooting

### Access Point Not Starting

Check hostapd status:
```bash
sudo systemctl status hostapd.service
sudo journalctl -u hostapd.service -n 50
```

Common issues:
- **Wrong regulatory domain**: Check `country_code` in `/etc/hostapd/hostapd.conf`
- **Channel not allowed**: Try channel 6 (works in most regions)
- **Interface conflict**: Ensure wpa_supplicant is disabled

Fix interface conflict:
```bash
sudo systemctl disable wpa_supplicant.service
sudo systemctl stop wpa_supplicant.service
sudo reboot
```

### USB Interface Not Detected

Check if usb0 appears:
```bash
ip addr show usb0
```

If not present:
- Verify the USB OTG cable is connected
- Check that the tethered device has USB gadget mode enabled
- Review udev logs: `sudo journalctl -u systemd-udevd.service`

Manually bring up the interface:
```bash
sudo ip link set usb0 up
sudo ip addr add 192.168.2.1/24 dev usb0
```

### Web UI Not Accessible

Check server status:
```bash
sudo systemctl status debug-pi-server.service
sudo journalctl -u debug-pi-server.service -n 50
```

Verify port is listening:
```bash
sudo netstat -tuln | grep 3000
```

Try accessing from the Pi itself:
```bash
curl http://localhost:3000/api/status
```

### Logs Not Persisting Across Reboots

Verify journald storage:
```bash
sudo journalctl --disk-usage
ls -la /var/log/journal
```

If `/var/log/journal` doesn't exist:
```bash
sudo mkdir -p /var/log/journal
sudo systemd-tmpfiles --create --prefix /var/log/journal
sudo systemctl restart systemd-journald.service
```

### Internet Routing Not Working

Check IP forwarding:
```bash
sysctl net.ipv4.ip_forward
# Should return: net.ipv4.ip_forward = 1
```

Check nftables rules:
```bash
sudo nft list ruleset
```

Reload nftables:
```bash
sudo nft -f /etc/nftables.conf
```

Verify ethernet interface is up:
```bash
ip addr show eth0
```

### High CPU Usage

Check running processes:
```bash
top
# or
htop
```

Common causes:
- Log streaming with many connected clients
- Excessive log generation

Limit log verbosity in systemd services if needed.

### Configuration Changes Not Applied

After editing `/etc/debug-pi/config.json`, you must restart the daemon:

```bash
sudo systemctl restart debug-pi-daemon.service
```

If hostapd or dnsmasq configs were regenerated, restart those too:
```bash
sudo systemctl restart hostapd.service
sudo systemctl restart dnsmasq.service
```

## Maintenance

### Updating Debug Pi Apps

```bash
# Stop services
sudo systemctl stop debug-pi-server.service
sudo systemctl stop debug-pi-daemon.service

# Backup configuration
sudo cp /etc/debug-pi/config.json /etc/debug-pi/config.json.backup

# Copy new builds to /opt/debug-pi/
# (specific steps depend on your update method)

# Restart services
sudo systemctl start debug-pi-daemon.service
sudo systemctl start debug-pi-server.service
```

### Backing Up Configuration

```bash
sudo cp /etc/debug-pi/config.json ~/config-backup.json
```

### Restoring Configuration

```bash
sudo cp ~/config-backup.json /etc/debug-pi/config.json
sudo systemctl restart debug-pi-daemon.service
```

## Performance Tuning

### For Pi 3 A+ / Limited Memory

Edit systemd services to limit memory:

```bash
sudo systemctl edit debug-pi-server.service
```

Add:
```ini
[Service]
MemoryMax=128M
```

### For High Traffic

Increase connection limits in server code or use a reverse proxy like nginx.

## Security Considerations

- **No Authentication**: The web UI has no authentication by design (as per project requirements)
- **Restrict Access**: Only expose the AP interface, not ethernet or other networks
- **Change Default Passwords**: Always change the default `pi` user password
- **Firewall**: nftables rules restrict access to necessary ports only
- **Updates**: Keep the base OS updated: `sudo apt update && sudo apt upgrade`

## Additional Resources

- Project Repository: https://github.com/davidvornholt/debuggingpi
- Pi-gen Documentation: https://github.com/RPi-Distro/pi-gen
- Raspberry Pi Documentation: https://www.raspberrypi.com/documentation/
