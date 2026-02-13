#!/bin/bash -e

SERVICES_STAGING_DIR="${ROOTFS_DIR}/tmp/debuggingpi-services"

rm -rf "$SERVICES_STAGING_DIR"
mkdir -p "$SERVICES_STAGING_DIR"

cp -a files/. "$SERVICES_STAGING_DIR/"
