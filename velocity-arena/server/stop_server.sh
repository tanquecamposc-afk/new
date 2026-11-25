#!/usr/bin/env bash
# Stops a locally started dedicated server (SIGTERM, then SIGKILL after 10 s).
set -u
PORT="${VA_PORT:-7777}"
PIDS=$(pgrep -f -- "--server --port ${PORT}" || true)
[ -z "$PIDS" ] && { echo "No hay servidor en el puerto ${PORT}"; exit 0; }
kill $PIDS; for i in $(seq 10); do sleep 1; pgrep -f -- "--server --port ${PORT}" >/dev/null || { echo "Servidor detenido"; exit 0; }; done
kill -9 $PIDS; echo "Servidor forzado a detenerse"
