#!/bin/sh
# Uso: LUAU=/ruta/a/luau sh pruebas/probar_bw.sh   (desde la carpeta roblox)
# Una partida entera de Bed Wars con kits, caos y muerte súbita: debe salir «BED WARS LARGA BIEN».
set -e
T=$(mktemp -d)
python3 pruebas/empaquetar_fuentes.py "$T/fuentes.luau"
cp pruebas/roblox_falso.luau pruebas/arbol.luau pruebas/prueba_bw.luau "$T/"
"${LUAU:-luau}" "$T/prueba_bw.luau"
rm -rf "$T"
