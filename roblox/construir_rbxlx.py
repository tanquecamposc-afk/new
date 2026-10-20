#!/usr/bin/env python3
"""Crea Blockverse.rbxlx (un lugar de Roblox Studio listo para abrir) con todos los scripts."""
import os, sys
from xml.sax.saxutils import escape

RAIZ = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(RAIZ, 'src')
salida = sys.argv[1] if len(sys.argv) > 1 else os.path.join(RAIZ, 'Blockverse.rbxlx')

ref = [0]
def nuevo_ref():
    ref[0] += 1
    return 'RBX%08X' % ref[0]

def cdata(texto):
    return '<![CDATA[' + texto.replace(']]>', ']]]]><![CDATA[>') + ']]>'

def leer(ruta):
    with open(os.path.join(SRC, ruta), encoding='utf-8') as f:
        return f.read()

def item(clase, nombre, props='', hijos='', fuente=None):
    p = '<string name="Name">%s</string>' % escape(nombre) + props
    if fuente is not None:
        p += '<ProtectedString name="Source">%s</ProtectedString>' % cdata(fuente)
    return '<Item class="%s" referent="%s"><Properties>%s</Properties>%s</Item>\n' % (clase, nuevo_ref(), p, hijos)

def modulos(carpeta, excluir=()):
    """ModuleScripts de una carpeta; las subcarpetas (como Datos) se vuelven Folder."""
    xml = ''
    for n in sorted(os.listdir(os.path.join(SRC, carpeta))):
        ruta = os.path.join(carpeta, n)
        if os.path.isdir(os.path.join(SRC, ruta)):
            xml += item('Folder', n, hijos=modulos(ruta))
        elif n.endswith('.luau') and n not in excluir:
            xml += item('ModuleScript', n[:-5], fuente=leer(ruta))
    return xml

partes = []
partes.append(item('Workspace', 'Workspace', '<bool name="StreamingEnabled">false</bool><float name="FallenPartsDestroyHeight">-500</float>'))
partes.append(item('Lighting', 'Lighting', '<token name="Technology">4</token><bool name="GlobalShadows">true</bool>'))
partes.append(item('ReplicatedStorage', 'ReplicatedStorage', hijos=item('Folder', 'Blockverse', hijos=modulos('compartido'))))
partes.append(item('ServerScriptService', 'ServerScriptService', hijos=item(
    'Script', 'Servidor', '<bool name="Disabled">false</bool>',
    hijos=modulos('servidor', ('init.server.luau',)), fuente=leer('servidor/init.server.luau'))))
cliente = item('LocalScript', 'Cliente', '<bool name="Disabled">false</bool>',
               hijos=modulos('cliente', ('init.client.luau',)), fuente=leer('cliente/init.client.luau'))
salud = item('Script', 'Health', '<bool name="Disabled">false</bool>', fuente=leer('personaje/Health.server.luau'))
partes.append(item('StarterPlayer', 'StarterPlayer',
                   '<float name="CharacterWalkSpeed">14</float><bool name="CharacterUseJumpPower">false</bool><float name="CharacterJumpHeight">4.6</float>',
                   hijos=item('StarterPlayerScripts', 'StarterPlayerScripts', hijos=cliente)
                   + item('StarterCharacterScripts', 'StarterCharacterScripts', hijos=salud)))

xml = ('<roblox xmlns:xmime="http://www.w3.org/2005/05/xmlmime" '
       'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" '
       'xsi:noNamespaceSchemaLocation="http://www.roblox.com/roblox.xsd" version="4">\n'
       + ''.join(partes) + '</roblox>\n')
with open(salida, 'w', encoding='utf-8') as f:
    f.write(xml)
print('Creado', salida, len(xml.encode('utf-8')) // 1024, 'KB')
