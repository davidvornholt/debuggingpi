#!/bin/bash -e
# Install and enable systemd services

echo "[debuggingpi] Installing systemd services..."

SYSTEMD_DIR="/etc/systemd/system"
SERVICES_STAGING_DIR="/tmp/debuggingpi-services"

if [[ ! -d "$SERVICES_STAGING_DIR" ]]; then
	echo "[debuggingpi] ERROR: $SERVICES_STAGING_DIR not found"
	exit 1
fi

# Install service files
install -m 644 "$SERVICES_STAGING_DIR/debuggingpi-ap.service" "$SYSTEMD_DIR/"
install -m 644 "$SERVICES_STAGING_DIR/debuggingpi-usb.service" "$SYSTEMD_DIR/"
install -m 644 "$SERVICES_STAGING_DIR/debuggingpi-routing.service" "$SYSTEMD_DIR/"
install -m 644 "$SERVICES_STAGING_DIR/debuggingpi-api.service" "$SYSTEMD_DIR/"

# Create a first-boot service that runs dependency installation
cat > "$SYSTEMD_DIR/debuggingpi-first-boot.service" << 'EOF'
[Unit]
Description=Debugging Pi First Boot Setup
After=network-online.target
Wants=network-online.target
Before=debuggingpi-api.service
ConditionPathExists=!/opt/debuggingpi/.first-boot-done

[Service]
Type=oneshot
ExecStart=/opt/debuggingpi/first-boot.sh
User=debuggingpi
Group=debuggingpi
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# Enable all services
systemctl enable debuggingpi-ap.service
systemctl enable debuggingpi-usb.service
systemctl enable debuggingpi-routing.service
systemctl enable debuggingpi-api.service
systemctl enable debuggingpi-first-boot.service

echo "[debuggingpi] Services installed and enabled:"
echo "  - debuggingpi-ap.service (WiFi AP)"
echo "  - debuggingpi-usb.service (USB network)"
echo "  - debuggingpi-routing.service (IP routing)"
echo "  - debuggingpi-api.service (Web dashboard)"
echo "  - debuggingpi-first-boot.service (First boot setup)"
