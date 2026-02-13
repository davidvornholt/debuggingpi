# Debugging Pi

A headless debugging hub for the **Raspberry Pi 3 Model A+** that turns it into a standalone WiFi access point with a real-time log viewer. Connect a **Pi Zero W** via USB OTG for USB tethering, allowing any device on the WiFi network to SSH into the Pi Zero — no router or internet required.

## Architecture

```text
┌─────────────┐          USB OTG           ┌─────────────────────────┐         WiFi          ┌────────────┐
│  Pi Zero W  │◄──────────────────────────►│   Pi 3 Model A+         │◄─────────────────────►│   Laptop   │
│             │     192.168.7.2            │   (Debugging Pi)        │    10.42.0.x          │   Phone    │
│  usb0       │◄──────────────────────────►│   usb0: 192.168.7.1     │                       │   Tablet   │
│  g_ether    │     Ethernet over USB      │   wlan0: 10.42.0.1      │    SSID: DebuggingPi  │            │
│             │                            │                         │    Pass: debuggingpi  │            │
│  SSH server │                            │   Hono API   :8080      │                       │ Dashboard  │
│  Your app   │                            │   React SPA             │                       │ SSH client │
└─────────────┘                            │   IP forwarding + NAT   │                       └────────────┘
                                           └─────────────────────────┘
```

### What it does

1. **WiFi Access Point** — The Pi 3 A+ broadcasts a WPA2 WiFi network (`DebuggingPi`) using its built-in dual-band radio. No internet is provided; this is a self-contained debug network.

2. **Web Dashboard** — A Hono + React application running on port 8080 provides:
   - Live log streaming (SSE) from both the Pi 3 and Pi Zero W
   - Log history search with filtering by level, source, and text
   - System metrics (CPU, memory, temperature, uptime)
   - Network status (WiFi clients, USB link state, Pi Zero reachability)

3. **USB Tethering** — When a Pi Zero W (configured with `g_ether` gadget mode) is plugged into the Pi 3's USB port, it appears as a USB Ethernet device. The Pi 3 assigns it a static IP and enables IP routing so WiFi clients can SSH directly to the Pi Zero.

4. **Auto-start** — Everything starts automatically on boot via systemd services.

## Quick Start

### Prerequisites

- Raspberry Pi 3 Model A+
- microSD card (8GB+)
- Pi Zero W with USB gadget mode configured (optional)
- USB-A to micro-USB cable (for connecting Pi Zero to Pi 3)
- A computer with Docker installed (for building the image)
- [Bun](https://bun.sh) installed

### Building the Image

```bash
# Clone the repository
git clone https://github.com/davidvornholt/debuggingpi.git
cd debuggingpi

# Install dependencies
bun install

# Build the flashable image
chmod +x tools/image-builder/build.sh
./tools/image-builder/build.sh
```

The image will be output to `tools/image-builder/deploy/`.

### Flashing

```bash
# Using dd (Linux/macOS)
sudo dd if=tools/image-builder/deploy/DebuggingPi-lite.img of=/dev/sdX bs=4M status=progress conv=fsync

# Or use Raspberry Pi Imager: https://www.raspberrypi.com/software/
```

### First Boot

1. Insert the microSD into the Pi 3 Model A+ and power it on
2. Wait ~60 seconds for boot and WiFi AP initialization
3. Connect to WiFi network **DebuggingPi** (password: `debuggingpi`)
4. Open `http://10.42.0.1:8080` in a browser

### Connecting a Pi Zero W

The Pi Zero W must have USB gadget mode enabled. Add to its `/boot/firmware/config.txt`:

```
dtoverlay=dwc2
```

And to `/boot/firmware/cmdline.txt` after `rootwait`:

```
modules-load=dwc2,g_ether
```

Configure a static IP on the Pi Zero's `usb0` interface:

```bash
sudo nmcli connection add type ethernet ifname usb0 con-name usb-tether \
  ipv4.method manual ipv4.addresses 192.168.7.2/24 ipv4.gateway 192.168.7.1
```

Connect the Pi Zero's micro-USB **data** port to the Pi 3's USB port. The Debugging Pi will detect the connection and display Pi Zero logs in the dashboard.

To SSH from a WiFi client to the Pi Zero:

```bash
ssh pi@192.168.7.2
```

## Development

### Setup

```bash
bun install
```

### Running locally

```bash
bun run dev
```

This starts both the Hono API (port 8080) and Vite dev server (port 5173) with hot reload. The web app proxies API requests to the backend.

> Note: On a non-Pi machine, `journalctl` will not be available. The API will log a warning and operate without live journal data.

### Building

```bash
bun run build
```

### Linting

```bash
bun run lint
```

### Type checking

```bash
bun run check
```

## Project Structure

```
debuggingpi/
├── apps/
│   ├── api/                      # Hono API server (Bun)
│   │   └── src/
│   │       ├── index.ts          # Entry point + static file serving
│   │       ├── routes/           # API endpoints (logs, status, health)
│   │       ├── services/         # Journal reader, SSH log collector, metrics
│   │       └── lib/              # Ring buffer, SSE broker, config
│   └── web/                      # React SPA (Vite + Tailwind)
│       └── src/
│           ├── app.tsx           # Main layout with tabs
│           ├── components/       # LogViewer, LogSearch, StatusPanel, NetworkPanel
│           └── hooks/            # useSSE (log streaming), useApi (polling)
├── packages/
│   └── shared/                   # Shared Zod schemas & types
│       └── src/
│           ├── log-entry.ts      # LogEntry, LogFilter, LogLevel, LogSource
│           ├── status.ts         # SystemStatus, NetworkStatus, SystemMetrics
│           └── config.ts         # AppConfig with env var loading
├── system/                       # System configuration files
│   ├── systemd/                  # Service files (AP, USB, routing, API)
│   ├── networkmanager/           # NM connection profiles
│   └── sysctl/                   # IP forwarding config
└── tools/
    └── image-builder/            # pi-gen wrapper for building SD card images
        ├── build.sh              # Main build script
        ├── config                # pi-gen configuration
        └── stage-debuggingpi/    # Custom pi-gen stage
            ├── 00-install-bun/
            ├── 01-install-app/
            ├── 02-configure-network/
            ├── 03-configure-services/
            └── 04-finalize/
```

## Network Configuration

| Endpoint | Subnet | Description |
|----------|--------|-------------|
| Pi 3 WiFi AP | `10.42.0.1/24` | DHCP-assigned to connected clients |
| Pi 3 USB | `192.168.7.1` | Static, host side of USB link |
| Pi Zero USB | `192.168.7.2` | Static, device side of USB link |
| Dashboard | `http://10.42.0.1:8080` | Web interface |

IP forwarding and NAT masquerading are enabled so WiFi clients (`10.42.0.x`) can reach the Pi Zero (`192.168.7.2`) directly.

## Services

| Service | Type | Description |
|---------|------|-------------|
| `debuggingpi-ap` | oneshot | Activates the WiFi access point |
| `debuggingpi-usb` | oneshot | Configures USB network when Pi Zero is connected |
| `debuggingpi-routing` | oneshot | Sets up iptables rules for WiFi↔USB routing |
| `debuggingpi-api` | simple | Runs the Hono web server (`Restart=always`) |
| `debuggingpi-first-boot` | oneshot | Installs dependencies on first boot |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DEBUGGINGPI_PORT` | `8080` | API server port |
| `DEBUGGINGPI_HOST` | `0.0.0.0` | API server bind address |
| `DEBUGGINGPI_LOG_BUFFER_SIZE` | `10000` | Max entries in the ring buffer |
| `DEBUGGINGPI_PI_ZERO_HOST` | `192.168.7.2` | Pi Zero IP address |
| `DEBUGGINGPI_PI_ZERO_USER` | `pi` | SSH user for Pi Zero |
| `DEBUGGINGPI_SSH_KEY_PATH` | `/home/debuggingpi/.ssh/id_ed25519` | SSH key path |
| `DEBUGGINGPI_SSH_ENABLED` | `true` | Enable Pi Zero log collection |
| `DEBUGGINGPI_JOURNAL_UNITS` | ` ` | Comma-separated systemd units to follow |
| `DEBUGGINGPI_POLL_INTERVAL_MS` | `5000` | Status polling interval |

## Troubleshooting

### WiFi AP not appearing

```bash
# Check NetworkManager status
sudo systemctl status NetworkManager
sudo nmcli connection show

# Manually activate the AP
sudo nmcli connection up DebuggingPi-AP

# Check the service
sudo journalctl -u debuggingpi-ap.service
```

### USB link not working

```bash
# Check if usb0 interface exists
ip link show usb0

# Check the service
sudo journalctl -u debuggingpi-usb.service

# Check Pi Zero connectivity
ping 192.168.7.2
```

### Cannot SSH to Pi Zero from WiFi client

```bash
# Check IP forwarding is enabled
cat /proc/sys/net/ipv4/ip_forward  # Should be 1

# Check iptables rules
sudo iptables -t nat -L POSTROUTING
sudo iptables -L FORWARD

# Check the routing service
sudo journalctl -u debuggingpi-routing.service
```

### Dashboard not loading

```bash
# Check the API service
sudo systemctl status debuggingpi-api.service
sudo journalctl -u debuggingpi-api.service -f

# Check if the port is listening
ss -tlnp | grep 8080
```

## License

MIT
