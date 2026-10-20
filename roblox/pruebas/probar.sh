#!/bin/sh
# Uso: LUAU=/ruta/a/luau sh pruebas/probar.sh   (desde la carpeta roblox)
# Copia los módulos compartidos cambiando require(script.Parent.X) por require("./X") y ejecuta las pruebas.
set -e
T=$(mktemp -d)
for f in src/compartido/*.luau; do
  sed 's/require(script\.Parent\.\([A-Za-z]*\))/require(".\/\1")/' "$f" > "$T/$(basename "$f")"
done
cp pruebas/prueba_mundo.luau "$T/"
"${LUAU:-luau}" "$T/prueba_mundo.luau"
rm -rf "$T"
