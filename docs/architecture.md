# Debug Pi Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      Raspberry Pi 3 A+                       │
│                                                              │
│  ┌─────────────┐      ┌─────────────┐      ┌────────────┐  │
│  │  Wi-Fi AP   │      │  Web UI     │      │  USB Port  │  │
│  │  (wlan0)    │◄────►│  Port 3000  │      │  (usb0)    │  │
│  │192.168.1.1  │      │             │      │192.168.2.1 │  │
│  └─────────────┘      └─────────────┘      └────────────┘  │
│         │                     │                    │         │
│         └─────────────────────┴────────────────────┘         │
│                               │                              │
│                    ┌──────────▼─────────┐                    │
│                    │  debug-pi-server   │                    │
│                    │  (Effect TS)       │                    │
│                    │  - Config API      │                    │
│                    │  - Status API      │                    │
│                    │  - Log streaming   │                    │
│                    │  User: pi          │                    │
│                    └──────────┬─────────┘                    │
│                               │                              │
│                        Unix Socket                           │
│                    /var/run/debug-pi-                        │
│                       daemon.sock                            │
│                               │                              │
│                    ┌──────────▼─────────┐                    │
│                    │  debug-pi-daemon   │                    │
│                    │  (Effect TS)       │                    │
│                    │  - hostapd mgmt    │                    │
│                    │  - dnsmasq mgmt    │                    │
│                    │  - nftables NAT    │                    │
│                    │  - journald logs   │                    │
│                    │  User: root        │                    │
│                    └──────────┬─────────┘                    │
│                               │                              │
│              ┌────────────────┼────────────────┐             │
│              │                │                │             │
│        ┌─────▼────┐    ┌─────▼────┐    ┌─────▼────┐        │
│        │ hostapd  │    │ dnsmasq  │    │ nftables │        │
│        └──────────┘    └──────────┘    └──────────┘        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Component Communication

```
┌──────────────┐
│   Client     │  HTTP Requests
│   Browser    ├──────────────────┐
└──────────────┘                  │
                                  ▼
┌──────────────────────────────────────────┐
│         debug-pi-server                  │
│  ┌──────────────────────────────────┐    │
│  │  HTTP Router (Effect TS)         │    │
│  │  - GET  /                        │    │
│  │  - GET  /api/config              │    │
│  │  - POST /api/config              │    │
│  │  - PATCH /api/config             │    │
│  │  - GET  /api/status              │    │
│  │  - GET  /api/logs/stream (SSE)   │    │
│  │  - POST /api/reboot              │    │
│  │  - POST /api/shutdown            │    │
│  └──────────────────────────────────┘    │
│              │                            │
│              │ IPC via Unix Socket        │
│              ▼                            │
└──────────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────┐
│         debug-pi-daemon                  │
│  ┌──────────────────────────────────┐    │
│  │  Unix Socket Server              │    │
│  │  Request Types:                  │    │
│  │  - get-status                    │    │
│  │  - get-logs                      │    │
│  │  - restart-ap                    │    │
│  │  - restart-dhcp                  │    │
│  │  - configure-usb-tether          │    │
│  │  - reboot                        │    │
│  │  - shutdown                      │    │
│  └──────────────────────────────────┘    │
│              │                            │
│              │ System calls              │
│              ▼                            │
│  ┌──────────────────────────────────┐    │
│  │  System Services                 │    │
│  │  - systemctl (service mgmt)      │    │
│  │  - journalctl (log access)       │    │
│  │  - Network configuration         │    │
│  └──────────────────────────────────┘    │
└──────────────────────────────────────────┘
```

## Data Flow

### Configuration Update Flow
```
1. User submits form in Web UI
2. UI sends PATCH /api/config
3. Server validates with Zod schema
4. Server writes to /etc/debug-pi/config.json (atomic)
5. Server sends daemon request via Unix socket
6. Daemon regenerates hostapd/dnsmasq configs
7. Daemon restarts services
8. Server returns updated config to UI
```

### Log Streaming Flow
```
1. UI connects to /api/logs/stream (SSE)
2. Server sends get-logs request to daemon
3. Daemon queries journalctl
4. Daemon returns log lines
5. Server streams to UI as SSE events
6. Repeat every 2 seconds
```

### Status Update Flow
```
1. UI polls /api/status every 5 seconds
2. Server sends get-status request to daemon
3. Daemon collects:
   - System uptime (/proc/uptime)
   - Memory usage (free)
   - CPU load (/proc/loadavg)
   - Service status (systemctl)
   - Network info (ip, iw)
4. Daemon returns consolidated status
5. Server returns JSON to UI
```

## Technology Stack

### Build & Development
- **Package Manager**: Bun 1.2+
- **Build System**: Turborepo
- **Linting/Formatting**: Biome
- **Language**: TypeScript 5.7+

### Backend (Server & Daemon)
- **Runtime**: Bun
- **Framework**: Effect TS 3.x
- **HTTP Server**: @effect/platform
- **Validation**: Zod 3.24+
- **IPC**: Node.js net (Unix sockets)

### Frontend (Web UI)
- **Framework**: React 18.3+
- **Build**: Bun bundler
- **Styling**: Pure CSS (no framework)
- **State**: React hooks
- **API**: Fetch API + EventSource (SSE)

### System Services
- **Access Point**: hostapd
- **DHCP**: dnsmasq
- **Firewall/NAT**: nftables
- **Logging**: systemd-journald
- **Init**: systemd

### Image Building
- **Base**: pi-gen (official Raspberry Pi OS builder)
- **Distribution**: Raspberry Pi OS Lite (Bookworm)
- **Custom Stage**: stage2/99-debug-pi

## File Structure

```
debuggingpi/
├── apps/
│   ├── debug-pi-server/      # Web server (port 3000)
│   │   ├── src/
│   │   │   ├── main.ts       # HTTP server entry point
│   │   │   ├── config.ts     # Config file management
│   │   │   └── daemon-client.ts  # IPC with daemon
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── debug-pi-daemon/      # Privileged daemon
│   │   ├── src/
│   │   │   └── main.ts       # Unix socket server
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── debug-pi-web/         # React UI
│       ├── src/
│       │   ├── index.tsx     # React app
│       │   ├── styles.css    # Styling
│       │   └── index.html    # HTML shell
│       ├── package.json
│       └── tsconfig.json
│
├── packages/
│   └── shared/               # Shared types & schemas
│       ├── src/
│       │   ├── config-schema.ts  # Zod schemas
│       │   └── index.ts
│       ├── package.json
│       └── tsconfig.json
│
├── systemd/                  # System service configs
│   ├── debug-pi-server.service
│   ├── debug-pi-daemon.service
│   ├── hostapd.conf.template
│   ├── dnsmasq.conf.template
│   └── nftables.conf.template
│
├── tools/                    # Image builder
│   ├── build-image.sh        # Interactive builder
│   └── pi-gen/
│       └── stage2/99-debug-pi/
│           └── 01-run.sh     # Installation script
│
├── docs/
│   └── operations.md         # Operator guide
│
├── package.json              # Root workspace
├── turbo.json                # Turborepo config
├── tsconfig.json             # TypeScript config
├── biome.json                # Biome config
└── README.md                 # Project overview
```

## Network Topology

```
┌─────────────────────────────────────────────┐
│  Internet                                   │
└───────────────┬─────────────────────────────┘
                │
    ┌───────────▼───────────┐
    │  Home Router          │
    │  DHCP: 192.168.0.x    │
    └───────────┬───────────┘
                │
                │ eth0 (optional uplink)
                │
    ┌───────────▼───────────┐
    │  Debug Pi             │
    │  - eth0: DHCP client  │
    │  - wlan0: 192.168.1.1 │
    │  - usb0: 192.168.2.1  │
    └───────┬───────┬───────┘
            │       │
            │       └─────────┐
            │                 │ USB OTG
            │                 │
   ┌────────▼────────┐   ┌────▼──────────┐
   │  Laptop/Phone   │   │  Pi Zero W    │
   │  Wi-Fi Client   │   │  usb0 gadget  │
   │  192.168.1.x    │   │  192.168.2.10 │
   └─────────────────┘   └───────────────┘
```

## Security Model

### Trust Boundaries
1. **Public Network** (eth0) - Untrusted
2. **AP Network** (wlan0) - Trusted (authenticated via WPA2)
3. **USB Network** (usb0) - Trusted (physical connection)

### Privilege Separation
- **daemon** (root): System operations only
- **server** (pi): User-facing API, no direct system access
- Communication via validated Unix socket

### Attack Surface
- Web UI: No auth (by design, AP-only access)
- Unix Socket: File permissions (root/pi only)
- Network: nftables rules limit exposure
- Services: Minimal surface (hostapd, dnsmasq)

### Hardening Recommendations
1. Change default AP passphrase
2. Use strong WPA2 passphrase (15+ chars)
3. Don't connect eth0 to untrusted networks
4. Keep Raspberry Pi OS updated
5. Monitor logs for anomalies
