#!/bin/bash
# Development helper script for local testing

set -e

echo "Debug Pi Development Helper"
echo "============================"
echo ""

# Check if Bun is installed
if ! command -v bun &> /dev/null; then
    echo "❌ Bun is not installed"
    echo "   Install with: curl -fsSL https://bun.sh/install | bash"
    exit 1
fi

echo "✅ Bun is installed: $(bun --version)"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
bun install

# Type check
echo ""
echo "🔍 Type checking..."
bun run typecheck

# Lint
echo ""
echo "🔧 Linting..."
bun run lint

# Build
echo ""
echo "🏗️  Building..."
bun run build

echo ""
echo "✅ All checks passed!"
echo ""
echo "Next steps:"
echo "  - Run server: cd apps/debug-pi-server && bun run dev"
echo "  - Run daemon: cd apps/debug-pi-daemon && bun run dev"
echo "  - Build image: cd tools && ./build-image.sh"
