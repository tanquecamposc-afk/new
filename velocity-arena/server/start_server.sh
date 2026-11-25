#!/usr/bin/env bash
# Starts a dedicated VELOCITY ARENA server. Configuration via environment:
#   VA_PORT (7777)  VA_REGION (local)  VA_SERVER_NAME  VA_SNAPSHOT_RATE (60)
#   VA_GODOT (godot)  VA_PROJECT (directory containing project.godot)
set -euo pipefail
GODOT="${VA_GODOT:-godot}"
PROJECT="${VA_PROJECT:-$(cd "$(dirname "$0")/.." && pwd)}"
exec "$GODOT" --headless --path "$PROJECT" -- --server \
  --port "${VA_PORT:-7777}" \
  --region "${VA_REGION:-local}" \
  --server-name "${VA_SERVER_NAME:-Servidor Velocity Arena}" \
  --snapshot-rate "${VA_SNAPSHOT_RATE:-60}" \
  --heartbeat /tmp/va_heartbeat
