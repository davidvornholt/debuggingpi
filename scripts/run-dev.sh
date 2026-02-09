#!/bin/bash
# Run local development environment
# Note: This won't have actual system access, but useful for testing UI/API

set -e

echo "Starting Debug Pi development environment..."
echo ""

# Check if deps are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies first..."
    bun install
fi

# Build packages first
echo "🏗️  Building packages..."
bun run build

# Start server in background
echo "🚀 Starting server on port 3000..."
cd apps/debug-pi-server
bun run dev &
SERVER_PID=$!

# Trap to cleanup on exit
trap "echo 'Stopping server...'; kill $SERVER_PID 2>/dev/null" EXIT

echo ""
echo "✅ Server running on http://localhost:3000"
echo ""
echo "Note: System features (networking, logs) won't work in dev mode"
echo "      These require actual Pi hardware with root privileges"
echo ""
echo "Press Ctrl+C to stop"

# Wait
wait $SERVER_PID
