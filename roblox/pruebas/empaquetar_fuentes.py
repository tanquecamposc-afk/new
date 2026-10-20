#!/usr/bin/env python3
"""Mete el código de src/ en un módulo Luau (la consola de Luau no puede leer archivos)."""
import os, sys
raiz = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'src')
salida = sys.argv[1]
partes = ['return {']
for carpeta in sorted(os.listdir(raiz)):
    for n in sorted(os.listdir(os.path.join(raiz, carpeta))):
        if not n.endswith('.luau'):
            continue
        t = open(os.path.join(raiz, carpeta, n), encoding='utf-8').read()
        nivel = 1
        while (']' + '=' * nivel + ']') in t:
            nivel += 1
        eq = '=' * nivel
        clave = carpeta + '/' + n[:-5]
        partes.append('\t["%s"] = [%s[%s]%s],' % (clave, eq, t, eq))
partes.append('}')
open(salida, 'w', encoding='utf-8').write('\n'.join(partes))
