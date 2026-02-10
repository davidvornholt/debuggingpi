#!/bin/bash
set -euo pipefail

install -d /opt/debug-pi
install -d /etc/debug-pi
install -d /etc/systemd/system

cp -r /home/pi/debuggingpi/apps /opt/debug-pi/
cp -r /home/pi/debuggingpi/packages /opt/debug-pi/
install -m 644 -o root -g root /home/pi/debuggingpi/systemd/debug-pi.service /etc/systemd/system/
install -m 644 -o root -g root /home/pi/debuggingpi/systemd/debug-pi-daemon.service /etc/systemd/system/
install -m 644 -o root -g root /home/pi/debuggingpi/systemd/hostapd.conf.template /etc/debug-pi/
install -m 644 -o root -g root /home/pi/debuggingpi/systemd/dnsmasq.conf.template /etc/debug-pi/
install -m 644 -o root -g root /home/pi/debuggingpi/systemd/nftables.conf.template /etc/debug-pi/

systemctl enable debug-pi-daemon.service
systemctl enable debug-pi.service
