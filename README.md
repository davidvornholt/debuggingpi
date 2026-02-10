# Debugging Pi

Debugging Pi is a headless access-point toolkit for Raspberry Pi boards. It ships a minimal web UI for AP setup, USB tethering, and live logs.

## Workspace

- Apps live under `apps/` with Bun + Effect TS.
- Shared schemas live under `packages/shared`.
- Systemd templates live under `systemd/`.
- Image build assets live under `tools/pi-gen`.

## Quick Start

```bash
bun install
bun run build
bun run lint
bun run typecheck
```

## Running locally

```bash
bun run --cwd apps/debug-pi-daemon build
bun run --cwd apps/debug-pi-server build
bun run --cwd apps/debug-pi-web build

sudo /usr/bin/bun apps/debug-pi-daemon/dist/main.js
bun apps/debug-pi-server/dist/main.js
```

The UI will be available at `http://localhost:3000`.

## Docs

- [Operations guide](docs/operations.md)
