#!/usr/bin/env python3
"""Mete el código de src/ en un módulo Luau (la consola de Luau no puede leer archivos)."""
import os, sys
raiz = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'src')
salida = sys.argv[1]
partes = ['return {']
for d, _, fs in sorted(os.walk(raiz)):
    for n in sorted(fs):
        if not n.endswith('.luau'):
            continue
        t = open(os.path.join(d, n), encoding='utf-8').read()
        nivel = 1
        while (']' + '=' * nivel + ']') in t:
            nivel += 1
        eq = '=' * nivel
        clave = os.path.relpath(os.path.join(d, n), raiz)[:-5]
        partes.append('\t["%s"] = [%s[%s]%s],' % (clave, eq, t, eq))
partes.append('}')
open(salida, 'w', encoding='utf-8').write('\n'.join(partes))
