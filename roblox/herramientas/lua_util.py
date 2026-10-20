"""Escribe valores de Python como tablas Luau (lo usan los generadores de datos)."""
import os, re

IDENT = re.compile(r'^[A-Za-z_][A-Za-z0-9_]*$')
RESERVADAS = {'and', 'break', 'do', 'else', 'elseif', 'end', 'false', 'for', 'function', 'if', 'in', 'local', 'nil',
              'not', 'or', 'repeat', 'return', 'then', 'true', 'until', 'while', 'continue', 'type', 'export'}


def lua(v):
    if v is None:
        return 'nil'
    if v is True:
        return 'true'
    if v is False:
        return 'false'
    if isinstance(v, int):
        return str(v)
    if isinstance(v, float):
        if v == int(v) and abs(v) < 1e15:
            return str(int(v))
        return repr(round(v, 6))
    if isinstance(v, str):
        return '"' + v.replace('\\', '\\\\').replace('"', '\\"').replace('\n', '\\n') + '"'
    if isinstance(v, list):
        return '{' + ', '.join(lua(x) for x in v) + '}'
    if isinstance(v, dict):
        partes = []
        for k, x in v.items():
            if x is None:
                continue
            if isinstance(k, int) or (isinstance(k, str) and k.lstrip('-').isdigit()):
                partes.append('[%s] = %s' % (int(k), lua(x)))
            elif IDENT.match(k) and k not in RESERVADAS:
                partes.append('%s = %s' % (k, lua(x)))
            else:
                partes.append('[%s] = %s' % (lua(k), lua(x)))
        return '{' + ', '.join(partes) + '}'
    raise TypeError(type(v))


def escribir(carpeta, nombre, cabecera, cuerpo, generador):
    ruta = os.path.join(carpeta, nombre + '.luau')
    with open(ruta, 'w', encoding='utf-8') as f:
        f.write('--[[\n\tBlockverse para Roblox · ' + cabecera + '\n\tGENERADO por herramientas/' + generador + ' a partir del juego web. No editar a mano.\n]]\n')
        f.write(cuerpo)
    print('  ', nombre, os.path.getsize(ruta) // 1024, 'KB')
