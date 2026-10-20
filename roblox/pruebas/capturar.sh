#!/bin/sh
# Uso: LUAU=/ruta/a/luau sh pruebas/capturar.sh carpeta_salida   (desde la carpeta roblox; necesita Python con numpy y Pillow)
# Ejecuta el juego en el «Roblox de mentira», entra en Bed Wars, Mazmorras y Leyendas y saca imágenes
# de lo que dibuja el cliente (mallas con texturas, criaturas, carteles) y de la interfaz.
set -e
SAL=${1:-capturas}
mkdir -p "$SAL"
T=$(mktemp -d)
python3 pruebas/empaquetar_fuentes.py "$T/fuentes.luau"
cp pruebas/roblox_falso.luau pruebas/arbol.luau pruebas/captura.luau "$T/"
"${LUAU:-luau}" "$T/captura.luau" > "$T/volcado.txt"
cd "$SAL"
python3 "$OLDPWD/herramientas/vista/render.py" "$T/volcado.txt"
for n in menu bw_hud bw_tiendaUI bw_tiendaUI3 mz_hud mz_jefeUI ly_hud; do
	case $n in bw_hud) f=bw_isla.png;; bw_tienda*) f=bw_tienda.png;; mz_hud) f=mz_sala.png;; mz_jefeUI) f=mz_jefe.png;; ly_hud) f=ly_aldea.png;; *) f="";; esac
	python3 "$OLDPWD/herramientas/vista/gui.py" "$T/volcado.txt" $n $f
done
rm -rf "$T"
