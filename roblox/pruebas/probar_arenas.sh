#!/bin/sh
# Uso: LUAU=/ruta/a/luau sh pruebas/probar_arenas.sh   (desde la carpeta roblox)
# Genera las arenas de Bed Wars, Mazmorras y Leyendas: debe salir «ARENAS BIEN».
set -e
T=$(mktemp -d)
python3 pruebas/empaquetar_fuentes.py "$T/fuentes.luau"
cp pruebas/roblox_falso.luau pruebas/arbol.luau pruebas/prueba_arenas.luau "$T/"
"${LUAU:-luau}" "$T/prueba_arenas.luau"
rm -rf "$T"
