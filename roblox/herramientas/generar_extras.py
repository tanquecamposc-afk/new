#!/usr/bin/env python3
"""Convierte export/extras.json (exportar_extras.js) en módulos Luau: encantamientos y botín.

Uso: python3 generar_extras.py <carpeta_export> <carpeta_salida (src/compartido/Datos)>
"""
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lua_util import lua, escribir

EXP, SAL = sys.argv[1], sys.argv[2]
x = json.load(open(os.path.join(EXP, 'extras.json')))
G = 'generar_extras.py'
escribir(SAL, 'Encantos', 'encantamientos del juego web (en el mismo orden)', 'return {\n\tlista = %s,\n\tpoder = %s,\n\tsoloYunque = %s,\n\tcategorias = %s,\n\tencantabilidad = %s,\n\tlibroEncantado = %d,\n}\n' % (
    lua(x['enc']).replace('}, {', '},\n\t\t{'), lua(x['poder']), lua(x['soloYunque']), lua(x['cats']), lua(x['encab']), x['libroEncantado']), G)
# Botín: {tipo = {{t = {mín, máx}, e = {{id, mín, máx, peso, extra}}}}}; id -1 = nada
escribir(SAL, 'Botin', 'tablas de botín de los cofres (por grupos, como en la edición Java)', 'return %s\n' % lua(x['loot']).replace('}}}, ', '}}},\n\t'), G)
