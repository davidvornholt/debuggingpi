#!/bin/bash -e
# Final image configuration and hardening

echo "[debuggingpi] Running final configuration..."

# Create a banner for SSH login
cat > /etc/motd << 'BANNER'

  ╔══════════════════════════════════════════╗
  ║          🔧 Debugging Pi 🔧              ║
  ║                                          ║
  ║  Dashboard: http://10.42.0.1:8080        ║
  ║  WiFi:      DebuggingPi                  ║
  ║  USB net:   192.168.7.1 <-> 192.168.7.2  ║
  ╚══════════════════════════════════════════╝

BANNER

# Disable Bluetooth (not needed for this use case, saves power)
if ! grep -q "dtoverlay=disable-bt" /boot/firmware/config.txt; then
    echo "dtoverlay=disable-bt" >> /boot/firmware/config.txt
fi

# Optimize for headless operation
# Reduce GPU memory to minimum (headless)
if ! grep -q "gpu_mem=" /boot/firmware/config.txt; then
    echo "gpu_mem=16" >> /boot/firmware/config.txt
fi

# Disable HDMI to save power on headless
cat > /etc/rc.local << 'EOF'
#!/bin/bash
# Disable HDMI output (headless operation)
/usr/bin/tvservice -o 2>/dev/null || true
exit 0
EOF
chmod +x /etc/rc.local

# Set timezone to UTC
ln -sf /usr/share/zoneinfo/UTC /etc/localtime
echo "UTC" > /etc/timezone

# Configure journald for efficient storage on microSD
mkdir -p /etc/systemd/journald.conf.d/
cat > /etc/systemd/journald.conf.d/debuggingpi.conf << 'EOF'
[Journal]
# Limit journal size to preserve microSD space and reduce writes
SystemMaxUse=50M
SystemKeepFree=100M
SystemMaxFileSize=10M
MaxRetentionSec=7day
Compress=yes
# Use volatile storage to reduce SD card wear
Storage=volatile
RuntimeMaxUse=30M
EOF

echo "[debuggingpi] Final configuration complete"
echo "[debuggingpi] Image build stage finished — ready to export"
