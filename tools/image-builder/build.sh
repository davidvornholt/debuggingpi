#!/usr/bin/env bash
# =============================================================================
# Debugging Pi — Image Builder
#
# Builds a custom Raspberry Pi OS Lite 64-bit (Debian Trixie) image with the
# Debugging Pi application pre-installed, configured, and ready to boot.
#
# Prerequisites:
#   - Docker (for pi-gen Docker build)
#   - Bun (for building the application)
#   - Git
#   - ~10GB free disk space
#
# Usage:
#   ./build.sh [--clean] [--skip-app-build] [--config <path>]
#
# Output:
#   deploy/image_<date>-DebuggingPi-lite.img.xz
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BUILD_DIR="$SCRIPT_DIR/build"
PIGEN_DIR="$BUILD_DIR/pi-gen"
DEPLOY_DIR="$SCRIPT_DIR/deploy"
STAGE_DIR="$SCRIPT_DIR/stage-debuggingpi"
CONFIG_FILE="$SCRIPT_DIR/config"
APP_BUNDLE_DIR="$BUILD_DIR/app-bundle"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info()    { echo -e "${BLUE}[INFO]${NC} $*"; }
log_success() { echo -e "${GREEN}[OK]${NC} $*"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC} $*"; }
log_error()   { echo -e "${RED}[ERROR]${NC} $*" >&2; }

# ---------------------------------------------------------------------------
# CLI argument parsing
# ---------------------------------------------------------------------------
CLEAN=false
SKIP_APP_BUILD=false
CUSTOM_CONFIG=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        --clean)
            CLEAN=true
            shift
            ;;
        --skip-app-build)
            SKIP_APP_BUILD=true
            shift
            ;;
        --config)
            CUSTOM_CONFIG="$2"
            shift 2
            ;;
        --help|-h)
            echo "Usage: $0 [--clean] [--skip-app-build] [--config <path>]"
            echo ""
            echo "Options:"
            echo "  --clean           Remove build directory before starting"
            echo "  --skip-app-build  Skip building the application (use existing bundle)"
            echo "  --config <path>   Use a custom pi-gen config file"
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# ---------------------------------------------------------------------------
# Preflight checks
# ---------------------------------------------------------------------------
preflight_checks() {
    log_info "Running preflight checks..."

    if ! command -v docker &>/dev/null; then
        log_error "Docker is required but not installed."
        log_error "Install: https://docs.docker.com/engine/install/"
        exit 1
    fi

    if ! docker info &>/dev/null; then
        log_error "Docker daemon is not running or current user lacks permissions."
        log_error "Try: sudo systemctl start docker && sudo usermod -aG docker \$USER"
        exit 1
    fi

    if ! command -v git &>/dev/null; then
        log_error "Git is required but not installed."
        exit 1
    fi

    if ! command -v bun &>/dev/null && [[ "$SKIP_APP_BUILD" == "false" ]]; then
        log_error "Bun is required to build the application."
        log_error "Install: curl -fsSL https://bun.sh/install | bash"
        exit 1
    fi

    local available_space
    available_space=$(df --output=avail -BG "$SCRIPT_DIR" | tail -1 | tr -dc '0-9')
    if [[ "$available_space" -lt 10 ]]; then
        log_warn "Low disk space: ${available_space}GB available (10GB recommended)"
    fi

    log_success "Preflight checks passed"
}

# ---------------------------------------------------------------------------
# Clean build directory
# ---------------------------------------------------------------------------
clean_build() {
    if [[ "$CLEAN" == "true" ]]; then
        log_info "Cleaning build directory..."
        rm -rf "$BUILD_DIR"
        log_success "Build directory cleaned"
    fi
}

# ---------------------------------------------------------------------------
# Build the Debugging Pi application
# ---------------------------------------------------------------------------
build_application() {
    if [[ "$SKIP_APP_BUILD" == "true" ]]; then
        if [[ ! -d "$APP_BUNDLE_DIR" ]]; then
            log_error "No existing app bundle found at $APP_BUNDLE_DIR"
            log_error "Run without --skip-app-build first"
            exit 1
        fi
        log_info "Skipping app build (using existing bundle)"
        return
    fi

    log_info "Building Debugging Pi application..."

    cd "$PROJECT_ROOT"

    # Install dependencies
    log_info "Installing dependencies..."
    bun install --frozen-lockfile 2>/dev/null || bun install

    # Build all packages
    log_info "Building packages..."
    bun run build

    # Prepare app bundle
    log_info "Preparing app bundle..."
    rm -rf "$APP_BUNDLE_DIR"
    mkdir -p "$APP_BUNDLE_DIR"

    # Copy API app
    mkdir -p "$APP_BUNDLE_DIR/apps/api"
    cp -r "$PROJECT_ROOT/apps/api/src" "$APP_BUNDLE_DIR/apps/api/"
    cp "$PROJECT_ROOT/apps/api/package.json" "$APP_BUNDLE_DIR/apps/api/"
    cp "$PROJECT_ROOT/apps/api/tsconfig.json" "$APP_BUNDLE_DIR/apps/api/"

    # Copy built web assets
    mkdir -p "$APP_BUNDLE_DIR/apps/web"
    if [[ -d "$PROJECT_ROOT/apps/web/dist" ]]; then
        cp -r "$PROJECT_ROOT/apps/web/dist" "$APP_BUNDLE_DIR/apps/web/"
    else
        log_warn "Web dist not found — building web separately..."
        cd "$PROJECT_ROOT/apps/web"
        bun run build
        cp -r "$PROJECT_ROOT/apps/web/dist" "$APP_BUNDLE_DIR/apps/web/"
    fi

    # Copy shared package
    mkdir -p "$APP_BUNDLE_DIR/packages/shared"
    cp -r "$PROJECT_ROOT/packages/shared/src" "$APP_BUNDLE_DIR/packages/shared/"
    cp "$PROJECT_ROOT/packages/shared/package.json" "$APP_BUNDLE_DIR/packages/shared/"
    cp "$PROJECT_ROOT/packages/shared/tsconfig.json" "$APP_BUNDLE_DIR/packages/shared/"
    if [[ -d "$PROJECT_ROOT/packages/shared/dist" ]]; then
        cp -r "$PROJECT_ROOT/packages/shared/dist" "$APP_BUNDLE_DIR/packages/shared/"
    fi

    # Root workspace files
    cp "$PROJECT_ROOT/package.json" "$APP_BUNDLE_DIR/"
    cp "$PROJECT_ROOT/tsconfig.json" "$APP_BUNDLE_DIR/"

    log_success "Application bundle created at $APP_BUNDLE_DIR"
}

# ---------------------------------------------------------------------------
# Clone / update pi-gen
# ---------------------------------------------------------------------------
setup_pigen() {
    log_info "Setting up pi-gen..."

    mkdir -p "$BUILD_DIR"

    if [[ -d "$PIGEN_DIR" ]]; then
        log_info "Updating existing pi-gen..."
        cd "$PIGEN_DIR"
        git fetch origin
        git checkout arm64
        git reset --hard origin/arm64
    else
        log_info "Cloning pi-gen (arm64 branch)..."
        git clone --branch arm64 --depth 1 \
            https://github.com/RPi-Distro/pi-gen.git "$PIGEN_DIR"
    fi

    log_success "pi-gen ready at $PIGEN_DIR"
}

# ---------------------------------------------------------------------------
# Configure pi-gen
# ---------------------------------------------------------------------------
configure_pigen() {
    log_info "Configuring pi-gen..."

    # Use custom config or default
    local config_source="${CUSTOM_CONFIG:-$CONFIG_FILE}"
    if [[ ! -f "$config_source" ]]; then
        log_error "Config file not found: $config_source"
        exit 1
    fi

    cp "$config_source" "$PIGEN_DIR/config"

    # Skip desktop stages (we only want Lite + our custom stage)
    touch "$PIGEN_DIR/stage3/SKIP" "$PIGEN_DIR/stage3/SKIP_IMAGES"
    touch "$PIGEN_DIR/stage4/SKIP" "$PIGEN_DIR/stage4/SKIP_IMAGES"
    touch "$PIGEN_DIR/stage5/SKIP" "$PIGEN_DIR/stage5/SKIP_IMAGES"

    # Ensure Stage 2 produces an image (Lite baseline)
    touch "$PIGEN_DIR/stage2/SKIP_IMAGES"

    # Copy our custom stage into pi-gen (symlinks break inside Docker)
    local pigen_stage="$PIGEN_DIR/stage-debuggingpi"
    rm -rf "$pigen_stage"
    cp -r "$STAGE_DIR" "$pigen_stage"

    # Ensure the custom stage exports an image
    touch "$pigen_stage/EXPORT_IMAGE"
    rm -f "$pigen_stage/SKIP" 2>/dev/null || true

    # Copy the app bundle into the stage files directory
    local stage_app_dir="$pigen_stage/01-install-app/files/debuggingpi"
    rm -rf "$stage_app_dir"
    mkdir -p "$(dirname "$stage_app_dir")"
    cp -r "$APP_BUNDLE_DIR" "$stage_app_dir"

    # Copy system config files
    local stage_net_dir="$pigen_stage/02-configure-network/files"
    mkdir -p "$stage_net_dir"
    cp "$PROJECT_ROOT/system/networkmanager/debuggingpi-ap.nmconnection" "$stage_net_dir/"
    cp "$PROJECT_ROOT/system/networkmanager/usb-zero.nmconnection" "$stage_net_dir/"
    cp "$PROJECT_ROOT/system/sysctl/debuggingpi-forwarding.conf" "$stage_net_dir/"

    local stage_svc_dir="$pigen_stage/03-configure-services/files"
    mkdir -p "$stage_svc_dir"
    cp "$PROJECT_ROOT/system/systemd/"*.service "$stage_svc_dir/"

    log_success "pi-gen configured"
}

# ---------------------------------------------------------------------------
# Build the image
# ---------------------------------------------------------------------------
build_image() {
    log_info "Building Raspberry Pi OS image (this may take 30-60 minutes)..."

    cd "$PIGEN_DIR"

    # If a previous container exists, continue from it (preserves cache).
    # On a --clean build the container was already removed.
    local continue_flag=0
    if docker container inspect pigen_work &>/dev/null; then
        if [[ "$CLEAN" == "true" ]]; then
            log_info "Removing stale pi-gen container..."
            docker rm -v pigen_work >/dev/null
        else
            log_info "Resuming from existing pi-gen container..."
            continue_flag=1
        fi
    fi

    PRESERVE_CONTAINER=1 CONTINUE=$continue_flag ./build-docker.sh

    log_success "Image build complete"
}

# ---------------------------------------------------------------------------
# Collect output
# ---------------------------------------------------------------------------
collect_output() {
    log_info "Collecting build output..."

    mkdir -p "$DEPLOY_DIR"

    local image_found=false
    for img in "$PIGEN_DIR/deploy/"*.img*; do
        if [[ -f "$img" ]]; then
            local filename
            filename=$(basename "$img")
            cp "$img" "$DEPLOY_DIR/$filename"
            log_success "Image: $DEPLOY_DIR/$filename"
            image_found=true
        fi
    done

    if [[ "$image_found" == "false" ]]; then
        log_error "No image files found in $PIGEN_DIR/deploy/"
        log_error "Check the build log for errors"
        exit 1
    fi

    # Copy build info
    local info_file="$DEPLOY_DIR/build-info.txt"
    {
        echo "Debugging Pi Image Build"
        echo "========================"
        echo "Date: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
        echo "Git commit: $(cd "$PROJECT_ROOT" && git rev-parse --short HEAD 2>/dev/null || echo 'unknown')"
        echo "Git branch: $(cd "$PROJECT_ROOT" && git branch --show-current 2>/dev/null || echo 'unknown')"
        echo "pi-gen commit: $(cd "$PIGEN_DIR" && git rev-parse --short HEAD 2>/dev/null || echo 'unknown')"
        echo ""
        echo "Network Configuration:"
        echo "  WiFi SSID: DebuggingPi"
        echo "  WiFi Password: debuggingpi"
        echo "  AP IP: 10.42.0.1"
        echo "  USB subnet: 192.168.7.0/24"
        echo "  Pi Zero IP: 192.168.7.2"
        echo "  Dashboard: http://10.42.0.1:8080"
        echo ""
        echo "Default credentials:"
        echo "  User: pi"
        echo "  Password: debuggingpi"
        echo "  SSH: enabled"
    } > "$info_file"

    log_success "Build info saved to $info_file"
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
main() {
    echo ""
    echo -e "${GREEN}╔══════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║       Debugging Pi — Image Builder       ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════╝${NC}"
    echo ""

    preflight_checks
    clean_build
    build_application
    setup_pigen
    configure_pigen
    build_image
    collect_output

    echo ""
    echo -e "${GREEN}╔══════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║           Build Complete!                ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════╝${NC}"
    echo ""
    echo "Flash the image to a microSD card:"
    echo ""
    echo "  # Linux/macOS:"
    echo "  sudo dd if=$DEPLOY_DIR/<image>.img of=/dev/sdX bs=4M status=progress conv=fsync"
    echo ""
    echo "  # Or use Raspberry Pi Imager:"
    echo "  https://www.raspberrypi.com/software/"
    echo ""
}

main "$@"
