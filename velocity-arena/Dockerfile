# Dedicated VELOCITY ARENA game server (headless, UDP).
FROM debian:bookworm-slim

ARG GODOT_VERSION=4.4.1
ARG GODOT_SHA512=ef4e76880a514257175544952c61191106fdef3095b909bafed9fcbeb230c3e5533920a0f3012882dd4bbde83028a67549825794e2d2c3cf76eba7918b71370e

RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates curl unzip libfontconfig1 \
 && rm -rf /var/lib/apt/lists/*

# Official Godot release, verified against the published SHA-512.
RUN curl -fsSL -o /tmp/godot.zip \
      "https://github.com/godotengine/godot/releases/download/${GODOT_VERSION}-stable/Godot_v${GODOT_VERSION}-stable_linux.x86_64.zip" \
 && echo "${GODOT_SHA512}  /tmp/godot.zip" | sha512sum -c - \
 && unzip -q /tmp/godot.zip -d /opt \
 && mv /opt/Godot_v${GODOT_VERSION}-stable_linux.x86_64 /usr/local/bin/godot \
 && rm /tmp/godot.zip

RUN useradd --create-home --uid 10001 va
WORKDIR /game
COPY --chown=va:va . /game
USER va
# Generate the class cache / imports once at build time.
RUN godot --headless --path /game --import >/dev/null 2>&1 || true

ENV VA_PORT=7777 VA_REGION=local VA_SERVER_NAME="Servidor Velocity Arena" VA_SNAPSHOT_RATE=60
EXPOSE 7777/udp 7778/udp
HEALTHCHECK --interval=15s --timeout=3s --start-period=20s --retries=3 \
  CMD test $(( $(date +%s) - $(cat /tmp/va_heartbeat 2>/dev/null | cut -d. -f1 || echo 0) )) -lt 20
ENTRYPOINT ["/game/server/start_server.sh"]
