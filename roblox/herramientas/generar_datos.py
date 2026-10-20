#!/usr/bin/env python3
"""Convierte lo exportado del juego web (exportar_web.js y exportar_mobs.js) en módulos Luau.

Uso: python3 generar_datos.py <carpeta_export> <carpeta_salida (src/compartido/Datos)>
"""
import json, os, re, struct, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import codec

EXP, SAL = sys.argv[1], sys.argv[2]
os.makedirs(SAL, exist_ok=True)
d = json.load(open(os.path.join(EXP, 'datos.json')))
atlas = open(os.path.join(EXP, 'atlas.bin'), 'rb').read()
AW = json.load(open(os.path.join(EXP, 'atlas.json')))['w']
TS = 16

IDENT = re.compile(r'^[A-Za-z_][A-Za-z0-9_]*$')
RESERVADAS = {'and', 'break', 'do', 'else', 'elseif', 'end', 'false', 'for', 'function', 'if', 'in', 'local', 'nil',
              'not', 'or', 'repeat', 'return', 'then', 'true', 'until', 'while', 'continue', 'type', 'export'}


def lua(v, ind=''):
    if v is None:
        return 'nil'
    if v is True:
        return 'true'
    if v is False:
        return 'false'
    if isinstance(v, (int,)):
        return str(v)
    if isinstance(v, float):
        if v == int(v) and abs(v) < 1e15:
            return str(int(v))
        return repr(round(v, 6))
    if isinstance(v, str):
        return '"' + v.replace('\\', '\\\\').replace('"', '\\"').replace('\n', '\\n') + '"'
    if isinstance(v, list):
        return '{' + ', '.join(lua(x, ind) for x in v) + '}'
    if isinstance(v, dict):
        partes = []
        for k, x in v.items():
            if x is None:
                continue
            if isinstance(k, int) or (isinstance(k, str) and k.lstrip('-').isdigit()):
                partes.append('[%s] = %s' % (int(k), lua(x, ind)))
            elif IDENT.match(k) and k not in RESERVADAS:
                partes.append('%s = %s' % (k, lua(x, ind)))
            else:
                partes.append('[%s] = %s' % (lua(k), lua(x, ind)))
        return '{' + ', '.join(partes) + '}'
    raise TypeError(type(v))


def escribir(nombre, cabecera, cuerpo):
    with open(os.path.join(SAL, nombre + '.luau'), 'w', encoding='utf-8') as f:
        f.write('--[[\n\tBlockverse para Roblox · ' + cabecera + '\n\tGENERADO por herramientas/generar_datos.py a partir del juego web. No editar a mano.\n]]\n')
        f.write(cuerpo)
    print('  ', nombre, os.path.getsize(os.path.join(SAL, nombre + '.luau')) // 1024, 'KB')


def texto_en_trozos(blob, tam=180000):
    """Comprime y devuelve una lista Luau de trozos base64 (para no tener una sola línea gigante)."""
    t = codec.a_texto(blob)
    trozos = [t[i:i + tam] for i in range(0, len(t), tam)]
    return '{\n' + ''.join('\t"%s",\n' % x for x in trozos) + '}'


# ------------------------------------------------------------------
# Texturas de los bloques
# ------------------------------------------------------------------
def pixeles(t):
    ox, oy = (t % 16) * TS, (t // 16) * TS
    return [list(atlas[((oy + y) * AW + ox + x) * 4:((oy + y) * AW + ox + x) * 4 + 4]) for y in range(TS) for x in range(TS)]


def hex3(h):
    return [((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255]


nombre_tile = {v: k for k, v in d['nombresT'].items()}
TINTE_DEF = {'pasto': [.57, .74, .35], 'follaje': [.47, .67, .18], 'abedul': d['biomas']['abedul'], 'abeto': d['biomas']['abeto'], 'agua': [.25, .46, .9]}

bloques = d['bloques']
caras_de = {}
uso = {}  # tile -> lista de bloques


def caras(b):
    if b.get('texCaras'):
        return list(b['texCaras'])
    return [b['lado'], b['lado'], b['abajo'], b['arriba'], b['lado'], b['lado']]


for b in bloques:
    c = caras(b)
    caras_de[b['id']] = c
    for t in c:
        if t is not None:
            uso.setdefault(t, []).append(b)

info_tile = {}
for t, bs in uso.items():
    px = pixeles(t)
    tinte = next((b.get('tinte') for b in bs if b.get('tinte') and b.get('tinte') != 'agua'), None)
    hoja = any(re.match(r'^hojas', b['clave']) or (b.get('tinte') == 'follaje' and b['forma'] == 'cubo') for b in bs)
    marcados = [p for p in px if p[3] == 250]
    visibles = [p for p in px if p[3] > 0]
    gris = bool(tinte) and len(marcados) > 0 and len(marcados) >= len(visibles) * 0.9
    col = d['tinteIcono'].get(nombre_tile.get(t, ''), TINTE_DEF.get(tinte, [1, 1, 1])) if tinte else [1, 1, 1]
    nuevo = []
    for p in px:
        r, g, b_, a = p
        if a == 250:
            if tinte and not gris:
                r, g, b_ = r * col[0], g * col[1], b_ * col[2]
            a = 255
        nuevo.append([r, g, b_, a])
    alfa = any(p[3] < 250 for p in nuevo)
    if alfa and hoja:
        # Hojas opacas (como en gráficos «rápidos»): los huecos se rellenan de un tono oscuro
        vis = [p for p in nuevo if p[3] > 0] or [[60, 90, 40, 255]]
        m = [sum(p[k] for p in vis) / len(vis) * 0.5 for k in range(3)]
        nuevo = [p if p[3] > 0 else [m[0], m[1], m[2], 255] for p in nuevo]
        alfa = False
    info_tile[t] = {'px': nuevo, 'gris': gris, 'alfa': alfa}

CELDA, POR_FILA = 68, 15  # 64 px + 2 de margen a cada lado, 15 x 15 por imagen de 1024
opacos = sorted(t for t in info_tile if not info_tile[t]['alfa'])
alfas = sorted(t for t in info_tile if info_tile[t]['alfa'])
POR_ATLAS = POR_FILA * POR_FILA
asign = {}
for k, t in enumerate(opacos):
    asign[t] = (1 + k // POR_ATLAS, k % POR_ATLAS)
base_alfa = 1 + (len(opacos) + POR_ATLAS - 1) // POR_ATLAS
for k, t in enumerate(alfas):
    asign[t] = (base_alfa + k // POR_ATLAS, k % POR_ATLAS)
n_atlas = base_alfa + (len(alfas) + POR_ATLAS - 1) // POR_ATLAS - 1
orden = opacos + alfas
blob = bytearray()
for t in orden:
    for p in info_tile[t]['px']:
        blob.extend(bytes(max(0, min(255, int(round(v)))) for v in p))
meta = {}
for i, t in enumerate(orden):
    a, celda = asign[t]
    meta[t] = {'a': a, 'c': celda, 'o': i, 'g': info_tile[t]['gris'] or None, 'al': info_tile[t]['alfa'] or None}
escribir('Texturas', 'texturas de los bloques (las mismas del juego web)',
         'return {\n\tCELDA = %d, POR_FILA = %d, NUM_ATLAS = %d, ALFA_DESDE = %d, NUM_TILES = %d,\n\tnombres = %s,\n\ttiles = %s,\n\tdatos = %s,\n}\n' % (
             CELDA, POR_FILA, n_atlas, base_alfa, len(orden), lua({str(t): nombre_tile.get(t) for t in orden}), lua({t: meta[t] for t in orden}), texto_en_trozos(bytes(blob))))
print('   tiles', len(orden), 'opacos', len(opacos), 'con alfa', len(alfas), 'atlas', n_atlas)

# ------------------------------------------------------------------
# Bloques
# ------------------------------------------------------------------
CAMPOS = ['clave', 'nombre', 'forma', 'solido', 'opaco', 'trans', 'luz', 'dureza', 'herr', 'nivel', 'altura', 'resistencia', 'reemplazable',
          'inflamable', 'tinte', 'gravedad', 'sinSombra', 'xp', 'inter', 'cajas', 'liquido', 'nivelL', 'orienta', 'base', 'trepable', 'cara',
          'puerta', 'cultivo', 'conecta', 'colAlta', 'resbala', 'lento', 'telarana', 'camaBW', 'opacidadLuz', 'quema', 'soloArriba', 'eterno']
salida = {}
for b in bloques:
    o = {k: b[k] for k in CAMPOS if k in b and b[k] is not None}
    o['tex'] = caras_de[b['id']]
    if 'suelta' in b:
        o['suelta'] = b['suelta']
    if 'sueltaMuestra' in b:
        o['sueltaMuestra'] = b['sueltaMuestra']
    salida[b['id']] = o
escribir('Bloques', 'los %d bloques del juego web' % len(salida), 'return ' + lua(salida).replace('}, [', '},\n\t[') + '\n')

# ------------------------------------------------------------------
# Objetos
# ------------------------------------------------------------------
objs = {}
for it in d['items']:
    o = dict(it)
    i = o.pop('id')
    objs[i] = o
escribir('Objetos', 'los %d objetos del juego web' % len(objs), 'return ' + lua(objs).replace('}, [', '},\n\t[') + '\n')

# ------------------------------------------------------------------
# Recetas, horno y biomas
# ------------------------------------------------------------------
escribir('Recetas', 'las %d recetas del juego web' % len(d['recetas']), 'return ' + lua(d['recetas']).replace('}, {', '},\n\t{') + '\n')
escribir('Hornos', 'fundición y combustibles', 'return ' + lua({'fundir': d['fundir'], 'combustible': d['combustible'], 'tiempo': d['tiempoFundir'], 'cocinado': d['cocinado']}) + '\n')
escribir('Biomas', 'biomas y sus colores', 'return ' + lua({'nombres': d['biomas']['nombres'], 'claves': d['biomas']['claves'],
                                                              'colores': d['biomas']['colores'], 'abedul': d['biomas']['abedul'], 'abeto': d['biomas']['abeto'],
                                                              'constantes': d['constantes']}) + '\n')
escribir('Claves', 'ids por clave (B y I del juego web)', 'return ' + lua({'B': d['B'], 'I': d['I']}) + '\n')

# ------------------------------------------------------------------
# Iconos
# ------------------------------------------------------------------
ic_idx = json.load(open(os.path.join(EXP, 'iconos.json')))
ic_bin = open(os.path.join(EXP, 'iconos.bin'), 'rb').read()
ic_meta = {}
blob = bytearray()
for id_, w, h, off in ic_idx:
    ic_meta[id_] = [len(blob), w, h]
    blob.extend(ic_bin[off:off + w * h * 4])
escribir('Iconos', 'los %d iconos del juego web' % len(ic_meta), 'return {\n\ttam = %d,\n\tindice = %s,\n\tdatos = %s,\n}\n' % (len(blob), lua(ic_meta), texto_en_trozos(bytes(blob))))

# ------------------------------------------------------------------
# Criaturas: definición, geometría y texturas pintadas
# ------------------------------------------------------------------
mobs = json.load(open(os.path.join(EXP, 'mobs.json')))
mt_bin = open(os.path.join(EXP, 'mobtex.bin'), 'rb').read()
tex_ids = {}
tex_blob = bytearray()
tex_meta = []
geo = bytearray()
modelos = {}
for tipo, grupos in mobs['modelos'].items():
    if isinstance(grupos, dict):
        continue
    gs = []
    for g in grupos:
        mallas = []
        for m in g['mallas']:
            k = m['tex']
            ti = None
            if k:
                if k not in tex_ids:
                    w, h, off = mobs['texturas'][k]
                    tex_ids[k] = len(tex_meta) + 1
                    tex_meta.append([len(tex_blob), w, h])
                    tex_blob.extend(mt_bin[off:off + w * h * 4])
                ti = tex_ids[k]
            nv = len(m['P']) // 3
            ofs = len(geo)
            geo.extend(struct.pack('<HH', nv, len(m['I'])))
            geo.extend(struct.pack('<%df' % len(m['P']), *m['P']))
            if ti:
                geo.extend(struct.pack('<%df' % len(m['U']), *m['U']))
            geo.extend(struct.pack('<%dH' % len(m['I']), *m['I']))
            mallas.append({'o': ofs, 't': ti, 'col': m['col'], 'emis': m['emis'] or None, 'op': m['op'] if m['op'] < 1 else None})
        gs.append({'tipo': g['tipo'], 'i': g['i'], 's': g['s'], 'm': g['m'], 'mallas': mallas})
    modelos[tipo] = gs
defs = {}
for tipo, v in d['mobs'].items():
    o = {k: x for k, x in v.items() if k not in ('partes',)}
    defs[tipo] = o
escribir('Mobs', 'las %d criaturas del juego web (datos y modelos)' % len(defs),
         'return {\n\tdefs = %s,\n\tmodelos = %s,\n\ttexturas = %s,\n\ttamTex = %d,\n\ttamGeo = %d,\n\tdatosTex = %s,\n\tdatosGeo = %s,\n}\n' % (
             lua(defs).replace('}, [', '},\n\t[').replace('}, ', '},\n\t'), lua(modelos), lua(tex_meta), len(tex_blob), len(geo), texto_en_trozos(bytes(tex_blob)), texto_en_trozos(bytes(geo))))
print('listo')
