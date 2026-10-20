#!/bin/sh
# Compara chunks con estructuras (y del Nether y el End) con el juego web: debe salir «ESTRUCTURAS IDENTICAS AL WEB».
set -e
T=$(mktemp -d)
python3 pruebas/empaquetar_fuentes.py "$T/fuentes.luau"
cp pruebas/roblox_falso.luau pruebas/arbol.luau pruebas/muestras_estructuras.luau pruebas/prueba_estructuras.luau "$T/"
"${LUAU:-luau}" "$T/prueba_estructuras.luau"
rm -rf "$T"
