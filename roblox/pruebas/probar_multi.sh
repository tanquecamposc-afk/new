#!/bin/sh
# Uso: LUAU=/ruta/a/luau sh pruebas/probar_multi.sh   (desde la carpeta roblox)
# Varios jugadores a la vez en supervivencia, Bed Wars, Mazmorras y Leyendas: debe salir «MULTIJUGADOR BIEN».
set -e
T=$(mktemp -d)
python3 pruebas/empaquetar_fuentes.py "$T/fuentes.luau"
cp pruebas/roblox_falso.luau pruebas/arbol.luau pruebas/prueba_multi.luau "$T/"
"${LUAU:-luau}" "$T/prueba_multi.luau"
rm -rf "$T"
