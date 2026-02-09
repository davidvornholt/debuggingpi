# Debug Pi

A comprehensive debugging and development platform for Raspberry Pi, providing wireless access point functionality, USB tethering, and a web-based management interface.

## Features

- **Wireless Access Point**: Turn your Raspberry Pi into a WiFi hotspot with configurable SSID, passphrase, and regulatory domain
- **USB Tethering**: Share network connectivity with devices connected via USB (ideal for debugging headless devices like Pi Zero W)
- **Web Interface**: Modern, responsive web UI for configuration and monitoring
- **Live Log Streaming**: Real-time system logs via Server-Sent Events
- **System Management**: Reboot and shutdown controls from the web interface
- **Persistent Logging**: Journald configured for persistent storage across reboots
- **Network Routing**: Automatic NAT and routing between AP, USB, and ethernet interfaces

## Architecture

Debug Pi is built as a monorepo with three main applications:

- **debug-pi-server**: Web API server providing REST endpoints and SSE log streaming
- **debug-pi-daemon**: Privileged daemon handling network configuration, hostapd, dnsmasq, and nftables
- **debug-pi-web**: React-based web UI for system management

## Technology Stack

- **Runtime**: Bun (preferred) or Node.js (fallback)
- **Languages**: TypeScript
- **Framework**: Effect TS for server-side logic
- **UI**: React with Vite
- **Validation**: Zod for schema validation
- **Build System**: Turborepo
- **Linting/Formatting**: Biome

## Quick Start

### Development

```bash
# Install dependencies
npm install

# Run all apps in development mode
npm run dev

# Build all apps
npm run build

# Lint and typecheck
npm run lint
npm run typecheck
```

**Note**: While the project is designed for Bun, all build and development scripts work with Node.js/npm for maximum compatibility.

### Building a Raspberry Pi Image

```bash
# Run the interactive image builder
./tools/build-image.sh
```

The builder will prompt for:
- Access Point SSID and passphrase
- WiFi channel and regulatory domain
- Network addressing (AP subnet, DHCP range, USB tether addresses)
- System settings (hostname, timezone)

The build process uses pi-gen and takes 30-60 minutes depending on your system.

### Flashing the Image

```bash
# Use Raspberry Pi Imager or dd
sudo dd if=deploy/DebugPi-*.img of=/dev/sdX bs=4M status=progress
sync
```

## Default Configuration

When the image boots for the first time:

- **Access Point**: `DebugPi` (configurable during build)
- **AP Password**: Set during image build
- **AP IP**: `192.168.1.1`
- **Web UI**: `http://192.168.1.1:3000`
- **SSH**: Enabled, accessible via AP network
- **User**: `pi` (password set during build)

## Hardware Support

- Raspberry Pi 3 A+
- Raspberry Pi 3 B+
- Raspberry Pi 4
- Raspberry Pi Zero W (as tethered device)

## Project Structure

```
debuggingpi/
├── apps/
│   ├── debug-pi-server/    # Web API server
│   ├── debug-pi-daemon/     # Privileged networking daemon
│   └── debug-pi-web/        # React web UI
├── packages/
│   └── shared/              # Shared types and schemas
├── systemd/                 # Service files and config templates
├── tools/
│   ├── build-image.sh       # Image builder script
│   └── pi-gen/              # Pi-gen integration
└── docs/
    └── operations.md        # Operational documentation
```

## Development Guidelines

This project follows strict TypeScript and functional programming conventions:

- Use Effect TS for all async operations and error handling
- Never use `any` type
- Prefer functional patterns over imperative code
- Use Zod for all data validation at boundaries
- Follow the Biome formatting and linting rules

See `.github/instructions/` for detailed coding standards.

## License

MIT

## Contributing

Contributions welcome! Please ensure all code passes linting and typechecking before submitting PRs.
