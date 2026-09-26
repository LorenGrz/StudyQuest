#!/usr/bin/env bash
# Lightsail "Launch script" (cloud-init user-data) for an Ubuntu 24.04, 2 GB,
# x86_64 instance. Installs Docker Engine + Compose plugin, adds a 2 GB
# swapfile, enables unattended-upgrades, and clones the repo to /opt/studyquest.
#
# Safe to re-run (e.g. if cloud-init re-executes it): every step checks for an
# existing result before acting.
set -euo pipefail

REPO_URL="https://github.com/LorenGrz/StudyQuest.git"
REPO_BRANCH="dev"
REPO_DIR="/opt/studyquest"
SWAP_FILE="/swapfile"

export DEBIAN_FRONTEND=noninteractive

# --- Docker Engine + Compose plugin (official apt repo) ---
if ! command -v docker >/dev/null 2>&1; then
  apt-get update
  apt-get install -y ca-certificates curl gnupg

  install -m 0755 -d /etc/apt/keyrings
  if [ ! -f /etc/apt/keyrings/docker.asc ]; then
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
    chmod a+r /etc/apt/keyrings/docker.asc
  fi

  ARCH="$(dpkg --print-architecture)"
  CODENAME="$(. /etc/os-release && echo "$VERSION_CODENAME")"
  echo "deb [arch=${ARCH} signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu ${CODENAME} stable" \
    > /etc/apt/sources.list.d/docker.list

  apt-get update
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
else
  echo "Docker already installed, skipping."
fi

systemctl enable --now docker

# --- ubuntu user in the docker group ---
if ! id -nG ubuntu | grep -qw docker; then
  usermod -aG docker ubuntu
fi

# --- 2 GB swapfile (a 2 GB instance runs out of memory building images otherwise) ---
if [ ! -f "$SWAP_FILE" ]; then
  fallocate -l 2G "$SWAP_FILE"
  chmod 600 "$SWAP_FILE"
  mkswap "$SWAP_FILE"
  swapon "$SWAP_FILE"
fi
if ! grep -q "^${SWAP_FILE} " /etc/fstab; then
  echo "${SWAP_FILE} none swap sw 0 0" >> /etc/fstab
fi

# --- unattended-upgrades ---
apt-get update
apt-get install -y unattended-upgrades
systemctl enable --now unattended-upgrades
dpkg-reconfigure -f noninteractive unattended-upgrades

# --- clone the repo ---
if ! command -v git >/dev/null 2>&1; then
  apt-get update
  apt-get install -y git
fi

if [ ! -d "${REPO_DIR}/.git" ]; then
  mkdir -p "$(dirname "$REPO_DIR")"
  git clone --branch "$REPO_BRANCH" "$REPO_URL" "$REPO_DIR"
  chown -R ubuntu:ubuntu "$REPO_DIR"
else
  echo "${REPO_DIR} already cloned, skipping."
fi

echo "user-data.sh done. Next: fill deploy/lightsail/.env and run deploy/lightsail/deploy.sh."
