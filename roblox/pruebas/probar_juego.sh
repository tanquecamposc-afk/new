#!/bin/sh
# Uso: LUAU=/ruta/a/luau sh pruebas/probar_juego.sh   (desde la carpeta roblox)
set -e
T=$(mktemp -d)
python3 pruebas/empaquetar_fuentes.py "$T/fuentes.luau"
cp pruebas/roblox_falso.luau pruebas/prueba_juego.luau "$T/"
"${LUAU:-luau}" "$T/prueba_juego.luau"
rm -rf "$T"
