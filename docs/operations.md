# Debug Pi Operations Guide

## Initial Setup

### First Boot

1. **Flash the Image**
   ```bash
   sudo dd if=debug-pi.img of=/dev/sdX bs=4M status=progress
   sync
   ```

2. **Boot the Pi**
   - Insert SD card into Raspberry Pi 3 A+
   - Connect power
   - Wait ~60 seconds for initialization

3. **Connect to AP**
   - Look for the Wi-Fi network (default: "DebugPi")
   - Enter the passphrase you configured during image build
   - Your device should receive an IP in the 192.168.1.50-150 range

4. **Access the Web UI**
   - Open browser: `http://192.168.1.1:3000`
   - You should see the Debug Pi dashboard

## Configuration Changes

### Updating AP Settings

1. Navigate to the "Access Point Configuration" section
2. Update the desired fields:
   - SSID: Network name (1-32 characters)
   - Passphrase: WPA2 password (8-63 characters)
   - Channel: Wi-Fi channel (1-13)
   - Regulatory Domain: 2-letter country code
   - Hidden: Whether to broadcast SSID
3. Click "Update AP Config"
4. The system will restart hostapd (brief disconnection expected)
5. Reconnect with new credentials

### Configuring USB Tethering

1. Navigate to "USB Tethering" section
2. Check "Enable USB Tethering"
3. Configure DHCP range if needed
4. Click "Update USB Config"
5. Connect target Pi Zero W via USB

### Viewing Logs

- Logs stream automatically in the "System Logs" panel
- Last 50 lines are displayed
- Updates every 2 seconds
- Logs persist across reboots

## SSH Access

### To the Debug Pi

```bash
ssh pi@192.168.1.1
# Default password: raspberry (change immediately!)
```

### To Tethered Device

```bash
# From any device on the AP network
ssh pi@192.168.2.10
```

## Troubleshooting

### AP Not Appearing

1. Check hostapd status:
   ```bash
   ssh pi@192.168.1.1
   sudo systemctl status hostapd
   ```

2. View hostapd logs:
   ```bash
   sudo journalctl -u hostapd -n 50
   ```

3. Common issues:
   - Incorrect regulatory domain
   - Channel conflict with nearby networks
   - WiFi hardware not supported

4. Restart hostapd:
   ```bash
   sudo systemctl restart hostapd
   ```

### USB Interface Not Detected

1. Check if usb0 exists:
   ```bash
   ip link show usb0
   ```

2. Check dmesg for USB events:
   ```bash
   dmesg | grep usb
   ```

3. Verify the connected device:
   - Pi Zero/Zero W: USB data port (not power-only)
   - USB OTG mode must be enabled on the target device

4. Check USB tether status:
   ```bash
   sudo systemctl status debug-pi-usb-tether
   ```

### Logs Not Persisting

1. Check journald configuration:
   ```bash
   grep Storage /etc/systemd/journald.conf
   # Should be: Storage=persistent
   ```

2. Verify log directory:
   ```bash
   ls -la /var/log/journal/
   ```

3. Restart journald:
   ```bash
   sudo systemctl restart systemd-journald
   ```

### Services Not Starting

1. Check daemon status:
   ```bash
   sudo systemctl status debug-pi-daemon
   sudo systemctl status debug-pi-server
   ```

2. View logs:
   ```bash
   sudo journalctl -u debug-pi-daemon -n 100
   sudo journalctl -u debug-pi-server -n 100
   ```

3. Common issues:
   - Missing dependencies (Bun not installed)
   - Permission issues on Unix socket
   - Port 3000 already in use

4. Restart services:
   ```bash
   sudo systemctl restart debug-pi-daemon
   sudo systemctl restart debug-pi-server
   ```

### Web UI Not Loading

1. Check if server is running:
   ```bash
   sudo netstat -tlnp | grep 3000
   ```

2. Test from the Pi itself:
   ```bash
   curl http://localhost:3000/api/status
   ```

3. Verify firewall rules:
   ```bash
   sudo nft list ruleset
   ```

4. Check browser console for errors

### Network Performance Issues

1. Check CPU load:
   ```bash
   top
   ```

2. Monitor network interfaces:
   ```bash
   ifconfig wlan0
   ifconfig usb0
   ```

3. Test throughput:
   ```bash
   iperf3 -s  # On Debug Pi
   iperf3 -c 192.168.1.1  # On client
   ```

## Maintenance

### Installing SSH Keys

For passwordless access:

```bash
# From your workstation
ssh-copy-id pi@192.168.1.1
```

### Updating the System

```bash
ssh pi@192.168.1.1
sudo apt update
sudo apt upgrade
```

### Backing Up Configuration

```bash
# Config file location
sudo cat /etc/debug-pi/config.json

# Copy to external location
scp pi@192.168.1.1:/etc/debug-pi/config.json ./debug-pi-backup.json
```

### Restoring Configuration

```bash
scp ./debug-pi-backup.json pi@192.168.1.1:/tmp/config.json
ssh pi@192.168.1.1 "sudo mv /tmp/config.json /etc/debug-pi/config.json"
```

## Advanced Usage

### Custom Network Setup

Edit `/etc/debug-pi/config.json`:

```json
{
  "version": "1.0",
  "ap": {
    "ssid": "MyDebugPi",
    "passphrase": "mysecurepassword",
    "channel": 11,
    "regulatoryDomain": "DE",
    "hidden": false
  },
  "dhcp": {
    "subnet": "192.168.1.0",
    "netmask": "255.255.255.0",
    "rangeStart": "192.168.1.100",
    "rangeEnd": "192.168.1.200",
    "leaseDuration": "24h"
  },
  "usbTether": {
    "enabled": true,
    "interface": "usb0",
    "address": "192.168.2.1",
    "netmask": "255.255.255.0",
    "dhcpRangeStart": "192.168.2.10",
    "dhcpRangeEnd": "192.168.2.50"
  },
  "system": {
    "hostname": "debug-pi",
    "timezone": "Europe/Berlin"
  }
}
```

Then restart services:
```bash
sudo systemctl restart debug-pi-daemon
sudo systemctl restart debug-pi-server
```

### Monitoring System Resources

```bash
# CPU temperature
vcgencmd measure_temp

# Memory
free -h

# Disk space
df -h

# Network stats
ifconfig
```

### Debugging Connection Issues

```bash
# Check which devices are connected to AP
iw dev wlan0 station dump

# Monitor DHCP leases
cat /var/lib/misc/dnsmasq.leases

# Check routing
ip route

# Test DNS
nslookup google.com
```

## Performance Tips

1. **Reduce Log Volume**: Configure specific services to log in the UI instead of "all"
2. **Optimize AP Channel**: Use `iw dev wlan0 scan` to find least congested channel
3. **Limit Concurrent Connections**: Keep to 5-10 devices on the AP
4. **Use Ethernet Uplink**: Connect eth0 for better NAT performance

## Safety

- Always use proper ESD precautions when handling the Pi
- Ensure adequate cooling for prolonged operation
- Use quality power supply (5V 2.5A minimum for Pi 3 A+)
- Safely shutdown before removing power when possible
