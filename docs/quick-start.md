# Quick Start Guide

Get your Debug Pi up and running in minutes!

## Prerequisites

- Raspberry Pi 3 A+ (recommended) or compatible model
- microSD card (8GB minimum, 16GB+ recommended)
- USB cable for power
- Computer for flashing and initial setup

## Step 1: Build the Image

### Clone the Repository
```bash
git clone https://github.com/davidvornholt/debuggingpi.git
cd debuggingpi
```

### Install Dependencies
```bash
# Install Bun if not already installed
curl -fsSL https://bun.sh/install | bash

# Install project dependencies
bun install
```

### Build the Applications
```bash
# Build all packages
bun run build

# Verify build succeeded
ls -la apps/*/dist packages/*/dist
```

### Create the Pi Image
```bash
cd tools
./build-image.sh
```

You'll be prompted for:
- **Wi-Fi SSID**: The name of your debug AP (default: `DebugPi`)
- **Wi-Fi Passphrase**: WPA2 password, min 8 chars (default: `debugpi123`)
- **Regulatory Domain**: 2-letter country code (default: `US`)
- **Hostname**: Device hostname (default: `debug-pi`)
- **DHCP Range**: IP range for AP clients (default: `192.168.1.50-150`)

⏱️ **Note**: Image building takes 30-60 minutes depending on your system.

## Step 2: Flash the Image

### Locate the Image
```bash
cd pi-gen/deploy
ls -lh *.img
```

### Flash to SD Card

**Linux/macOS:**
```bash
# Find your SD card device
lsblk  # or diskutil list on macOS

# Flash (replace /dev/sdX with your SD card)
sudo dd if=debug-pi.img of=/dev/sdX bs=4M status=progress conv=fsync

# Eject safely
sudo sync
sudo eject /dev/sdX
```

**Windows:**
Use [Balena Etcher](https://www.balena.io/etcher/) or [Win32DiskImager](https://sourceforge.net/projects/win32diskimager/)

## Step 3: Boot the Pi

1. Insert the SD card into your Raspberry Pi
2. Connect power (5V 2.5A minimum)
3. Wait ~60 seconds for boot and initialization
4. Look for the Wi-Fi network you configured

💡 **First boot takes longer** as the system initializes and starts services.

## Step 4: Connect and Access

### Connect to the AP
1. On your laptop/phone, open Wi-Fi settings
2. Connect to your Debug Pi network (e.g., `DebugPi`)
3. Enter the passphrase you configured
4. You should receive an IP in the configured range (e.g., `192.168.1.x`)

### Access the Web UI
Open your browser and navigate to:
```
http://192.168.1.1:3000
```

You should see the Debug Pi dashboard!

### SSH Access (Optional)
```bash
ssh pi@192.168.1.1
# Default password: raspberry
```

⚠️ **Change the default password immediately:**
```bash
passwd
```

## Step 5: Verify Everything Works

### Check System Status
In the Web UI, verify:
- ✅ Hostname is correct
- ✅ Services show "active" (hostapd, dnsmasq)
- ✅ Memory and CPU stats are updating

### Test Log Streaming
Scroll to the "System Logs" panel:
- ✅ Logs should be appearing
- ✅ New entries should appear every few seconds
- ✅ Logs should include systemd and kernel messages

### Test Configuration Changes
1. Go to "Access Point Configuration"
2. Change the SSID (e.g., append "-test")
3. Click "Update AP Config"
4. Wait ~10 seconds
5. ✅ New SSID should appear in Wi-Fi list
6. Reconnect with the same passphrase

## Step 6: Test USB Tethering (Optional)

If you have a Pi Zero W:

1. Enable USB tethering in the Web UI
2. Connect Pi Zero W via USB data cable
3. Wait ~20 seconds for detection
4. From your laptop (connected to the AP):
   ```bash
   ssh pi@192.168.2.10
   ```
5. ✅ You should be able to SSH to the Pi Zero

## Troubleshooting

### AP Not Appearing
**Symptom**: Wi-Fi network doesn't show up

**Solutions**:
1. Wait longer (first boot can take 2-3 minutes)
2. Check if Pi has power LED on
3. Connect monitor and keyboard to see boot messages
4. Verify the regulatory domain is correct for your region

### Can't Access Web UI
**Symptom**: `http://192.168.1.1:3000` doesn't load

**Solutions**:
1. Verify you're connected to the correct Wi-Fi
2. Check your IP address (`ipconfig` or `ifconfig`)
3. Try `http://debug-pi.local:3000` (if mDNS works)
4. SSH to the Pi and check service status:
   ```bash
   sudo systemctl status debug-pi-server
   ```

### USB Tethering Not Working
**Symptom**: Can't SSH to Pi Zero

**Solutions**:
1. Verify USB cable supports data (not power-only)
2. Check if Pi Zero has USB OTG enabled
3. On Debug Pi, check if `usb0` interface exists:
   ```bash
   ip link show usb0
   ```
4. Check logs for USB detection:
   ```bash
   dmesg | grep usb
   ```

### Logs Not Updating
**Symptom**: Log panel shows old/static entries

**Solutions**:
1. Refresh the browser page
2. Check browser console for errors (F12)
3. Verify daemon is running:
   ```bash
   sudo systemctl status debug-pi-daemon
   ```
4. Test journald directly:
   ```bash
   sudo journalctl -n 10 --no-pager
   ```

## Next Steps

### Customize Configuration
- Update DHCP range for more/fewer clients
- Change timezone in system settings
- Adjust Wi-Fi channel if experiencing interference

### Install SSH Keys
For passwordless access:
```bash
ssh-copy-id pi@192.168.1.1
```

### Add Ethernet Uplink
Connect an Ethernet cable to share internet access with AP clients:
```bash
# On Debug Pi
sudo systemctl restart debug-pi-daemon
```

The daemon automatically configures NAT when eth0 is connected.

### Monitor Performance
Keep an eye on:
- CPU temperature: `vcgencmd measure_temp`
- Memory usage: `free -h`
- Disk space: `df -h`

### Update the System
```bash
ssh pi@192.168.1.1
sudo apt update && sudo apt upgrade -y
```

## Common Use Cases

### Debugging IoT Devices
1. Connect IoT device to Debug Pi AP
2. Monitor its traffic with tcpdump
3. View logs in real-time
4. SSH to device if it supports it

### Pi Zero Development
1. Connect Pi Zero via USB
2. Edit code on your laptop
3. Deploy and test via SSH
4. Monitor logs on Debug Pi

### Network Experimentation
1. Create isolated test network
2. Experiment with routing/NAT
3. Test DNS configurations
4. Monitor network behavior

## Tips & Tricks

### View More Logs
By default, the UI shows the last 50 lines. To see more:
```bash
ssh pi@192.168.1.1
sudo journalctl -f  # Follow logs in real-time
```

### Backup Configuration
```bash
scp pi@192.168.1.1:/etc/debug-pi/config.json ./backup-config.json
```

### Restore Configuration
```bash
scp ./backup-config.json pi@192.168.1.1:/tmp/config.json
ssh pi@192.168.1.1 "sudo mv /tmp/config.json /etc/debug-pi/config.json && sudo systemctl restart debug-pi-daemon"
```

### Multiple Debug Pis
Give each a unique SSID and hostname during image build to run multiple units without conflicts.

### Add Custom Services
```bash
# Add your service to /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable your-service
sudo systemctl start your-service
```

## Support & Resources

- **Documentation**: See `docs/` folder
- **Architecture**: See `docs/architecture.md`
- **Operations**: See `docs/operations.md`
- **Issues**: GitHub issue tracker
- **Discussions**: GitHub discussions

Happy debugging! 🐛✨
