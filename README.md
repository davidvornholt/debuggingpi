# Debug Pi

**Raspberry Pi Debugging Platform**

A turnkey debugging platform for Raspberry Pi that provides:
- Wi-Fi Access Point for direct device connection
- Web-based management interface
- Live system log streaming
- USB tethering for debugging other Pi devices
- Headless operation with no authentication required

## Features

- **Access Point Mode**: Creates a Wi-Fi AP on startup for easy connection
- **Web UI**: Simple, responsive interface accessible from any device on the AP
- **Log Streaming**: Real-time system logs via Server-Sent Events (SSE)
- **USB Tethering**: Connect a Pi Zero W via USB for SSH access and debugging
- **Configuration Management**: Update AP settings, DHCP ranges, and more via the UI
- **System Controls**: Reboot and shutdown the system from the web interface
- **Persistent Logging**: All logs survive reboots via journald

## Quick Start

### Building an Image

1. Clone this repository:
   ```bash
   git clone https://github.com/davidvornholt/debuggingpi.git
   cd debuggingpi
   ```

2. Build the packages:
   ```bash
   bun install
   bun run build
   ```

3. Create a Pi image:
   ```bash
   cd tools
   ./build-image.sh
   ```

4. Follow the prompts to configure:
   - Wi-Fi SSID
   - Wi-Fi passphrase
   - Regulatory domain (country code)
   - Hostname
   - DHCP range

5. Flash the generated image to an SD card:
   ```bash
   sudo dd if=pi-gen/deploy/debug-pi.img of=/dev/sdX bs=4M status=progress
   ```

### Using the Debug Pi

1. Insert the SD card into your Raspberry Pi 3 A+ and power it on
2. Wait ~60 seconds for boot and AP initialization
3. Connect to the Wi-Fi network (default: "DebugPi")
4. Open a web browser and navigate to: `http://192.168.1.1:3000`
5. Use the web interface to:
   - View system status
   - Monitor logs in real-time
   - Update AP configuration
   - Configure USB tethering
   - Reboot or shutdown the system

### USB Tethering

To debug a Pi Zero W:

1. Enable USB tethering in the web UI
2. Connect the Pi Zero W to the Debug Pi via USB
3. Wait for the `usb0` interface to appear
4. SSH to the Pi Zero from any device on the AP:
   ```bash
   ssh pi@192.168.2.10
   ```

## Architecture

The system consists of three main components:

1. **debug-pi-server**: Web server and API (runs as user `pi`)
   - Serves the web UI
   - Provides REST API for configuration
   - Streams logs via SSE

2. **debug-pi-daemon**: Privileged daemon (runs as `root`)
   - Manages networking (hostapd, dnsmasq, nftables)
   - Controls system services
   - Provides access to system logs
   - Handles reboot/shutdown requests

3. **debug-pi-web**: React-based web UI
   - Status dashboard
   - Configuration forms
   - Live log console
   - System controls

## Tech Stack

- **Runtime**: Bun
- **Build System**: Turborepo
- **Linting/Formatting**: Biome
- **Language**: TypeScript
- **Framework**: Effect TS
- **Validation**: Zod
- **UI**: React
- **Networking**: hostapd, dnsmasq, nftables
- **Logging**: systemd-journald

## Development

### Prerequisites

- Bun 1.2+
- Node.js (for compatibility)

### Setup

```bash
# Install dependencies
bun install

# Build all packages
bun run build

# Type check
bun run typecheck

# Lint
bun run lint

# Format code
bun run format
```

### Project Structure

```
debuggingpi/
├── apps/
│   ├── debug-pi-server/    # Web server and API
│   ├── debug-pi-daemon/    # Privileged daemon
│   └── debug-pi-web/       # React UI
├── packages/
│   └── shared/             # Shared types and schemas
├── systemd/                # Service units and templates
├── tools/                  # Image builder
└── docs/                   # Documentation
```

## Security

⚠️ **Important Security Notes**:

- This platform is designed for development/debugging use only
- No authentication is required by design for ease of use
- The web UI is exposed only on the AP subnet (192.168.1.0/24)
- Do not expose the Debug Pi directly to untrusted networks
- Change the default AP passphrase after first boot

## License

MIT

## Contributing

Contributions are welcome! Please open an issue or pull request.

## Support

For issues, questions, or feature requests, please use the GitHub issue tracker.
