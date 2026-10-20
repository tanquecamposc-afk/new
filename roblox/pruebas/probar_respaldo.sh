#!/bin/sh
# Igual que probar_juego.sh, pero sin imágenes ni mallas editables (modo de respaldo)
set -e
T=$(mktemp -d)
python3 pruebas/empaquetar_fuentes.py "$T/fuentes.luau"
cp pruebas/roblox_falso.luau pruebas/arbol.luau "$T/"
cp pruebas/prueba_juego.luau "$T/"
echo 'return true' > "$T/respaldo.luau"
"${LUAU:-luau}" "$T/prueba_juego.luau"
rm -rf "$T"
