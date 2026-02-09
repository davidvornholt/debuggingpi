# Debug Pi Architecture Overview

## System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                         Raspberry Pi                             │
│                                                                   │
│  ┌────────────────┐     ┌──────────────────┐                    │
│  │ debug-pi-web   │────▶│ debug-pi-server  │                    │
│  │ (React UI)     │     │ (Web API + SSE)  │                    │
│  │ Port: 5173     │     │ Port: 3000       │                    │
│  └────────────────┘     └─────────┬────────┘                    │
│                                    │                              │
│                                    │ Unix Socket                  │
│                                    ▼                              │
│                         ┌──────────────────┐                     │
│                         │ debug-pi-daemon  │                     │
│                         │ (Root Daemon)    │                     │
│                         └─────────┬────────┘                     │
│                                   │                               │
│              ┌────────────────────┼────────────────────┐         │
│              ▼                    ▼                    ▼         │
│         ┌─────────┐         ┌─────────┐         ┌─────────┐    │
│         │ hostapd │         │ dnsmasq │         │nftables │    │
│         │ (WiFi)  │         │ (DHCP)  │         │  (NAT)  │    │
│         └────┬────┘         └────┬────┘         └────┬────┘    │
│              │                   │                    │          │
└──────────────┼───────────────────┼────────────────────┼─────────┘
               │                   │                    │
               ▼                   ▼                    ▼
          ┌─────────┐         ┌─────────┐         ┌─────────┐
          │  wlan0  │         │  usb0   │         │  eth0   │
          │  (AP)   │         │ (Tether)│         │(Uplink) │
          └─────────┘         └─────────┘         └─────────┘
               │                   │                    │
               ▼                   ▼                    │
          WiFi Clients        Pi Zero W                 │
          192.168.1.x         192.168.2.2               │
                                                         │
                                                         ▼
                                                     Internet
```

## Data Flow

### Configuration Update Flow
1. User edits config in Web UI (React)
2. Web UI sends PUT /api/config to debug-pi-server
3. Server validates with Zod schemas
4. Server writes atomically to /etc/debug-pi/config.json
5. Server sends command to debug-pi-daemon via Unix socket
6. Daemon regenerates hostapd/dnsmasq configs from templates
7. Daemon restarts system services
8. Services apply new configuration

### Log Streaming Flow
1. Web UI subscribes to GET /api/logs (SSE endpoint)
2. Server opens EventSource connection
3. Daemon queries journald for logs
4. Logs flow: journald → daemon → server → SSE → web UI
5. UI displays logs in real-time console

### Network Routing Flow
1. Client connects to AP (wlan0, 192.168.1.x)
2. hostapd handles auth, dnsmasq assigns IP
3. Client makes request to internet
4. nftables NATs from wlan0 → eth0
5. Response flows back eth0 → wlan0 → client
6. Same flow for USB tethered devices (usb0, 192.168.2.x)

## Technology Stack

### Frontend
- **React**: UI framework
- **TypeScript**: Type-safe development
- **Vite**: Build tool and dev server
- **CSS**: Custom styling (no framework)

### Backend
- **Effect TS**: Functional effects system for async/error handling
- **Zod**: Runtime schema validation
- **TypeScript**: Strict type checking
- **Bun/Node.js**: Runtime (Bun preferred, Node.js compatible)

### System
- **hostapd**: WiFi access point daemon
- **dnsmasq**: DHCP and DNS server
- **nftables**: Firewall and NAT
- **systemd**: Service management
- **journald**: Centralized logging
- **udev**: USB device detection

### Build & DevOps
- **Turborepo**: Monorepo task orchestration
- **Biome**: Fast linting and formatting
- **TypeScript Compiler**: Build transpilation
- **pi-gen**: Raspberry Pi image builder

## File Locations (Production)

```
/opt/debug-pi/
├── server/         # Web API server files
├── daemon/         # Privileged daemon files
└── web/            # Static web UI files

/etc/debug-pi/
└── config.json     # Runtime configuration (editable)

/etc/systemd/system/
├── debug-pi-server.service
├── debug-pi-daemon.service
└── debug-pi-usb-tether@.service

/etc/udev/rules.d/
└── 99-usb-tether.rules

/etc/sysctl.d/
└── 99-debug-pi.conf

/etc/hostapd/
└── hostapd.conf    # Generated from template

/etc/dnsmasq.conf   # Generated from template

/etc/nftables.conf  # Generated from template

/var/log/journal/   # Persistent logs
```

## Security Model

### Privilege Separation
- **debug-pi-server**: Runs as user `pi`, limited permissions
- **debug-pi-daemon**: Runs as `root`, minimal attack surface
- Communication via Unix socket (file-system permissions)

### Network Isolation
- Web UI only accessible on AP interface (wlan0)
- Firewall drops unexpected traffic
- No authentication (by design, LAN-only access)

### Systemd Hardening
- NoNewPrivileges on user services
- PrivateTmp for isolation
- ProtectSystem/ProtectHome where possible
- Read-only mounts for system directories

## Development Workflow

```bash
# 1. Install dependencies
npm install

# 2. Run in development (all apps hot-reload)
npm run dev

# 3. Make changes to apps/*/src/

# 4. Lint and typecheck
npm run lint
npm run typecheck

# 5. Build for production
npm run build

# 6. Test on Pi or build image
./tools/build-image.sh
```

## Deployment Workflow

```bash
# Option 1: Build and flash image
./tools/build-image.sh
# Follow prompts for config
# Flash deploy/*.img to SD card

# Option 2: Update running system
npm run build
scp -r apps/*/dist/ pi@192.168.1.1:/opt/debug-pi/
ssh pi@192.168.1.1 'sudo systemctl restart debug-pi-*'
```

## Extension Points

### Adding New Configuration Options
1. Update Zod schema in `packages/shared/src/config-schema.ts`
2. TypeScript types are automatically inferred
3. Update React UI in `apps/debug-pi-web/src/app.tsx`
4. Update daemon to handle new config in `apps/debug-pi-daemon/src/main.ts`

### Adding New API Endpoints
1. Add route handler in `apps/debug-pi-server/src/main.ts`
2. Use Effect TS pattern for async operations
3. Validate inputs with Zod
4. Return typed responses

### Adding New System Services
1. Create systemd unit in `systemd/`
2. Update daemon to control service in `apps/debug-pi-daemon/src/main.ts`
3. Update pi-gen installer in `tools/pi-gen/stage2/99-debug-pi/01-install.sh`

## Troubleshooting Guide

See `docs/operations.md` for detailed troubleshooting procedures covering:
- Access point issues
- USB tethering problems
- Network routing failures
- Log persistence
- Service management
- Performance tuning
