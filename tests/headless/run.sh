#!/usr/bin/env bash
# Ejecuta las pruebas de integracion fuera de Roblox Studio.
#
#   ./tests/headless/run.sh
#
# Requiere el binario `luau` (https://github.com/luau-lang/luau/releases).
# El arnes aplana src/ a un directorio temporal, sustituye los require por
# instancia por require por ruta e inyecta stubs de las APIs de Roblox que
# usan los servicios. La LOGICA que se prueba es la real, sin modificar.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
LUAU="${LUAU:-luau}"
LUAU_COMPILE="${LUAU_COMPILE:-luau-compile}"
BUILD_DIR="${BUILD_DIR:-$ROOT/.headless-build}"

if ! command -v "$LUAU" >/dev/null 2>&1; then
	echo "No se encontro el binario 'luau'. Instalalo o exporta LUAU=/ruta/a/luau" >&2
	exit 127
fi

echo "== Comprobacion de sintaxis =="
status=0
while IFS= read -r file; do
	if ! out="$("$LUAU_COMPILE" --binary "$file" 2>&1 >/dev/null)"; then
		echo "$file: $out"
		status=1
	elif [ -n "$out" ]; then
		echo "$file: $out"
		status=1
	fi
done < <(find "$ROOT/src" -name '*.luau' | sort)
[ "$status" -eq 0 ] && echo "OK"

echo "== Pruebas de integracion =="
rm -rf "$BUILD_DIR"
python3 "$ROOT/tests/headless/build.py" "$ROOT" "$BUILD_DIR"
cp "$ROOT/tests/headless/roblox_stub.luau" "$BUILD_DIR/roblox_stub.luau"
"$LUAU" "$BUILD_DIR/main.luau"
