#!/bin/bash -e

NETWORK_STAGING_DIR="${ROOTFS_DIR}/tmp/debuggingpi-network"

rm -rf "$NETWORK_STAGING_DIR"
mkdir -p "$NETWORK_STAGING_DIR"

cp -a files/. "$NETWORK_STAGING_DIR/"
