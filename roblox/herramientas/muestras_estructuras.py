#!/usr/bin/env python3
"""Convierte export/estructuras.{bin,json} en pruebas/muestras_estructuras.luau (chunks del juego web)."""
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import codec
EXP = sys.argv[1]
salida = sys.argv[2]
todo = json.load(open(os.path.join(EXP, 'estructuras.json')))
meta = todo['meta']
blob = open(os.path.join(EXP, 'estructuras.bin'), 'rb').read()
TAM = 16 * 16 * 192 * 2
partes = ['-- GENERADO por herramientas/muestras_estructuras.py: chunks del juego web con estructuras (semilla 12345)', 'return {']
for m in meta:
    d = blob[m['o']:m['o'] + TAM]
    t = codec.a_texto(d)
    partes.append('\t{ dim = "%s", cx = %d, cz = %d, motivo = "%s", datos = "%s" },' % (m['dim'], m['cx'], m['cz'], m['motivo'], t))
partes.append('\tcofres = {')
for k, v in todo['cofres'].items():
    dim, pos = k.split(':')
    x, y, z = pos.split(',')
    cont = ', '.join('{%d, %d}' % (q[0], q[1]) if q else 'false' for q in v)
    partes.append('\t\t{ dim = "%s", x = %s, y = %s, z = %s, c = { %s } },' % (dim, x, y, z, cont))
partes.append('\t},')
partes.append('}')
open(salida, 'w').write('\n'.join(partes) + '\n')
print('ok', len(meta), os.path.getsize(salida) // 1024, 'KB')
