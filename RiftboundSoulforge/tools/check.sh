#!/usr/bin/env bash
# Runs every offline check available without Roblox Studio.
set -euo pipefail
cd "$(dirname "$0")/.."
echo "== StyLua (format check)"; stylua --check src
echo "== Selene (lint)"; selene src
echo "== Luau compile (syntax)"; (cd tools/luau-check && cargo build --release -q); tools/luau-check/target/release/luau-check check src
echo "== Unit tests"; tools/luau-check/target/release/luau-check test tests/run.luau src
echo "== Cross-module integrity"; python3 tools/integrity_check.py src
echo "== Rojo build"; rojo build default.project.json -o build/RiftboundSoulforge.rbxl
if [ -n "${API_DUMP:-}" ]; then echo "== Roblox API cross-check"; python3 tools/api_check.py "$API_DUMP" src; fi
echo "All checks passed."
