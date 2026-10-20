#!/bin/sh
# Uso: LUAU=/ruta/a/luau sh pruebas/probar.sh   (desde la carpeta roblox)
# Compara el generador Luau con muestras del juego web: debe salir «GENERADOR IDENTICO AL WEB».
set -e
T=$(mktemp -d)
python3 pruebas/empaquetar_fuentes.py "$T/fuentes.luau"
cp pruebas/roblox_falso.luau pruebas/arbol.luau pruebas/muestras_web.luau pruebas/prueba_generador.luau "$T/"
"${LUAU:-luau}" "$T/prueba_generador.luau"
rm -rf "$T"
