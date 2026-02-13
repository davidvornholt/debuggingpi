#!/bin/bash -e

APP_STAGING_DIR="${ROOTFS_DIR}/tmp/debuggingpi-app"

rm -rf "$APP_STAGING_DIR"
mkdir -p "$APP_STAGING_DIR"

cp -a files/debuggingpi/. "$APP_STAGING_DIR/"
