"""Dibuja la interfaz volcada por captura.luau imitando la maquetación de Roblox.
Uso: gui.py volcado.txt nombre [fondo.png] -> nombre.png"""
import sys, json
import numpy as np
from PIL import Image, ImageDraw, ImageFont

VW, VH = 1280, 720
archivo, nombre = sys.argv[1], sys.argv[2]
fondo = sys.argv[3] if len(sys.argv) > 3 else None

imgs = {}
nodos = {}
orden = []
dentro = False
for line in open(archivo, errors='replace'):
    if line.startswith('IMG '):
        _, i, w, h, hx = line.split(' ', 4)
        a = np.frombuffer(bytes.fromhex(hx.strip()), dtype=np.uint8).reshape(int(h), int(w), 4)
        imgs[int(i)] = Image.fromarray(a, 'RGBA')
    elif line.startswith('GUI '):
        dentro = line.split()[1] == nombre
        if dentro:
            nodos.clear(); orden.clear()
    elif line.startswith('FINGUI'):
        if dentro:
            break
    elif dentro and line.startswith('G '):
        d = json.loads(line[2:])
        d['hijos'] = []
        nodos[d['id']] = d
        orden.append(d['id'])
for i in orden:
    p = nodos[i]['padre']
    if p in nodos:
        nodos[p]['hijos'].append(nodos[i])

GUIOBJ = {'Frame', 'TextLabel', 'TextButton', 'TextBox', 'ImageLabel', 'ImageButton', 'ScrollingFrame', 'ViewportFrame'}
TAM_DEF = {'Frame': [0, 100, 0, 100], 'ScrollingFrame': [0, 100, 0, 100], 'ImageLabel': [0, 100, 0, 100], 'ImageButton': [0, 100, 0, 100],
           'TextLabel': [0, 200, 0, 50], 'TextButton': [0, 200, 0, 50], 'TextBox': [0, 200, 0, 50], 'ViewportFrame': [0, 100, 0, 100]}
FUENTES = {}
def fuente(n, tam):
    tam = max(6, int(round(tam)))
    mono = n in ('Code', 'RobotoMono')
    clave = (mono, tam)
    if clave not in FUENTES:
        ruta = '/usr/share/fonts/truetype/dejavu/' + ('DejaVuSansMono-Bold.ttf' if mono else 'DejaVuSans-Bold.ttf')
        FUENTES[clave] = ImageFont.truetype(ruta, tam)
    return FUENTES[clave]

def g(n, k, d=None):
    return n.get(k, d)
def col(n, k, d):
    v = n.get(k)
    return tuple(int(c * 255) for c in v['c']) if v else d
def hijo(n, clase):
    for h in n['hijos']:
        if h['clase'] == clase:
            return h
    return None
def gui_hijos(n):
    return [h for h in n['hijos'] if h['clase'] in GUIOBJ]
def ud(v):  # UDim {"u":[s,o]}
    return v['u'] if isinstance(v, dict) and 'u' in v else [0, 0]

def lineas_texto(n, w):
    txt = g(n, 'Text', 'Label' if n['clase'] != 'TextBox' else '')
    if txt is None:
        txt = ''
    f = fuente(g(n, 'Font', 'Gotham'), g(n, 'TextSize', 14))
    if not g(n, 'TextWrapped', False):
        return txt.split('\n'), f
    res = []
    for par in txt.split('\n'):
        pal = par.split(' ')
        act = ''
        for p in pal:
            prueba = (act + ' ' + p).strip()
            if f.getlength(prueba) <= max(4, w) or not act:
                act = prueba
            else:
                res.append(act); act = p
        res.append(act)
    return res, f

def alto_texto(n, w):
    ls, f = lineas_texto(n, w)
    return len(ls) * (g(n, 'TextSize', 14) * 1.2)

def padding(n, w, h):
    p = hijo(n, 'UIPadding')
    if not p:
        return 0, 0, 0, 0
    l = ud(p.get('PaddingLeft', {'u': [0, 0]})); r = ud(p.get('PaddingRight', {'u': [0, 0]}))
    t = ud(p.get('PaddingTop', {'u': [0, 0]})); b = ud(p.get('PaddingBottom', {'u': [0, 0]}))
    return l[0] * w + l[1], r[0] * w + r[1], t[0] * h + t[1], b[0] * h + b[1]

def tam_base(n, pw, ph):
    s = g(n, 'Size', TAM_DEF.get(n['clase'], [0, 100, 0, 100]))
    return pw * s[0] + s[1], ph * s[2] + s[3]

def medir(n, pw, ph):
    """Tamaño absoluto (con AutomaticSize)."""
    w, h = tam_base(n, pw, ph)
    auto = g(n, 'AutomaticSize', 'None')
    if auto in ('Y', 'XY', 'X'):
        pl, pr, pt, pb = padding(n, w, h)
        cw = w - pl - pr
        ext_w, ext_h = 0, 0
        lista = hijo(n, 'UIListLayout')
        hs = [c for c in gui_hijos(n) if g(c, 'Visible', True)]
        if n['clase'] in ('TextLabel', 'TextButton'):
            ext_h = alto_texto(n, cw)
            ls, f = lineas_texto(n, cw)
            ext_w = max([f.getlength(l) for l in ls] + [0])
        if lista:
            pad = ud(lista.get('Padding', {'u': [0, 0]}))
            horiz = g(lista, 'FillDirection', 'Vertical') == 'Horizontal'
            tot = 0
            mx = 0
            for c in hs:
                cw2, ch2 = medir(c, cw, h)
                tot += (cw2 if horiz else ch2)
                mx = max(mx, ch2 if horiz else cw2)
            tot += max(0, len(hs) - 1) * (pad[1] + pad[0] * (w if horiz else h))
            if horiz:
                ext_w, ext_h = max(ext_w, tot), max(ext_h, mx)
            else:
                ext_h, ext_w = max(ext_h, tot), max(ext_w, mx)
        else:
            for c in hs:
                cw2, ch2 = medir(c, cw, h)
                pos = g(c, 'Position', [0, 0, 0, 0])
                ext_h = max(ext_h, pos[2] * h + pos[3] + ch2)
                ext_w = max(ext_w, pos[0] * w + pos[1] + cw2)
        if auto in ('Y', 'XY'):
            h = max(h, ext_h + pt + pb)
        if auto in ('X', 'XY'):
            w = max(w, ext_w + pl + pr)
    return w, h

lienzo = None
dib = None
def clip_rect(a, b):
    if a is None:
        return b
    x0, y0 = max(a[0], b[0]), max(a[1], b[1]); x1, y1 = min(a[2], b[2]), min(a[3], b[3])
    return (x0, y0, max(x0, x1), max(y0, y1))

def dibujar(n, x, y, w, h, clip):
    global lienzo
    if w < 1 or h < 1:
        return
    M = 6  # margen para bordes y contorno del texto
    ox, oy = int(x) - M, int(y) - M
    capa = Image.new('RGBA', (int(w) + 2 * M + 2, int(h) + 2 * M + 2), (0, 0, 0, 0))
    d = ImageDraw.Draw(capa)
    X, Y = x - ox, y - oy
    tr = g(n, 'BackgroundTransparency', 0)
    corner = hijo(n, 'UICorner')
    rad = 0
    if corner:
        cr = ud(corner.get('CornerRadius', {'u': [0, 8]}))
        rad = cr[0] * min(w, h) + cr[1]
    fondo_c = col(n, 'BackgroundColor3', (163, 162, 165))
    if tr < 1 and n['clase'] != 'ViewportFrame':
        a = int(255 * (1 - tr))
        if rad > 0:
            d.rounded_rectangle([X, Y, X + w - 1, Y + h - 1], radius=rad, fill=fondo_c + (a,))
        else:
            d.rectangle([X, Y, X + w - 1, Y + h - 1], fill=fondo_c + (a,))
    st = hijo(n, 'UIStroke')
    texto = n['clase'] in ('TextLabel', 'TextButton', 'TextBox')
    if st and (not texto or tr < 1):
        t = g(st, 'Thickness', 1)
        sc = col(st, 'Color', (0, 0, 0)) + (int(255 * (1 - g(st, 'Transparency', 0))),)
        if rad > 0:
            d.rounded_rectangle([X - t / 2, Y - t / 2, X + w + t / 2 - 1, Y + h + t / 2 - 1], radius=rad, outline=sc, width=max(1, int(t)))
        else:
            d.rectangle([X - t / 2, Y - t / 2, X + w + t / 2 - 1, Y + h + t / 2 - 1], outline=sc, width=max(1, int(t)))
    if n['clase'] in ('ImageLabel', 'ImageButton') and g(n, 'ImageTransparency', 0) < 1 and n.get('img') in imgs:
        im = imgs[n['img']]
        ro = g(n, 'ImageRectOffset'); rs = g(n, 'ImageRectSize')
        if ro and rs and rs['v'][0] > 0:
            ix, iy = ro['v']; sw, sh = rs['v']
            im = im.crop((int(ix), int(iy), int(ix + sw), int(iy + sh)))
        im = im.resize((max(1, int(w)), max(1, int(h))), Image.NEAREST)
        al = 1 - g(n, 'ImageTransparency', 0)
        if al < 1:
            arr = np.array(im); arr[..., 3] = (arr[..., 3] * al).astype(np.uint8); im = Image.fromarray(arr)
        capa.alpha_composite(im, (int(X), int(Y)))
    if texto:
        pl, pr, pt, pb = padding(n, w, h)
        X, Y, w, h = X + pl, Y + pt, w - pl - pr, h - pt - pb
        ls, f = lineas_texto(n, w)
        tam = g(n, 'TextSize', 14)
        if g(n, 'TextScaled', False):
            tam = max(6, min(h * 0.85, 100))
            while tam > 6:
                f = fuente(g(n, 'Font', 'Gotham'), tam)
                if max([f.getlength(l) for l in ls] + [0]) <= w * 0.98 and len(ls) * tam * 1.15 <= h:
                    break
                tam -= 1
            f = fuente(g(n, 'Font', 'Gotham'), tam)
        tcol = col(n, 'TextColor3', (27, 42, 53))
        ta = int(255 * (1 - g(n, 'TextTransparency', 0)))
        lh = tam * 1.2
        th = len(ls) * lh
        ya = g(n, 'TextYAlignment', 'Center')
        ty = Y + (0 if ya == 'Top' else (h - th if ya == 'Bottom' else (h - th) / 2))
        xa = g(n, 'TextXAlignment', 'Center')
        sst = g(n, 'TextStrokeTransparency', 1)
        stroke_child = st is not None and tr >= 1
        for l in ls:
            lw = f.getlength(l)
            tx = X if xa == 'Left' else (X + w - lw if xa == 'Right' else X + (w - lw) / 2)
            if (sst < 1 or stroke_child) and ta > 0:
                sa = int(255 * (1 - (sst if sst < 1 else 0)) * ta / 255)
                for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                    d.text((tx + dx, ty + dy + (lh - tam) / 2), l, font=f, fill=(0, 0, 0, sa))
            d.text((tx, ty + (lh - tam) / 2), l, font=f, fill=tcol + (ta,))
            ty += lh
    if clip:
        m = Image.new('L', capa.size, 0)
        ImageDraw.Draw(m).rectangle((clip[0] - ox, clip[1] - oy, clip[2] - ox - 1, clip[3] - oy - 1), fill=255)
        capa.putalpha(Image.fromarray(np.minimum(np.array(capa)[..., 3], np.array(m))))
    # pegar recortando a los bordes del lienzo
    # Si queda del todo fuera de la pantalla (p. ej. un aviso escondido arriba) no se dibuja
    if -ox >= capa.width or -oy >= capa.height:
        return
    lienzo.alpha_composite(capa, (max(0, ox), max(0, oy)), (max(0, -ox), max(0, -oy)))

def colocar(n, x, y, w, h, clip):
    if not g(n, 'Visible', True):
        return
    dibujar(n, x, y, w, h, clip)
    if n['clase'] == 'ScrollingFrame' or g(n, 'ClipsDescendants', False):
        clip = clip_rect(clip, (x, y, x + w, y + h))
    pl, pr, pt, pb = padding(n, w, h)
    cx, cy, cw, ch = x + pl, y + pt, w - pl - pr, h - pt - pb
    hs = gui_hijos(n)
    lista = hijo(n, 'UIListLayout'); rej = hijo(n, 'UIGridLayout')
    if lista or rej:
        vis = [c for c in hs if g(c, 'Visible', True)]
        so = g(lista or rej, 'SortOrder', 'LayoutOrder')
        if so == 'LayoutOrder':
            vis.sort(key=lambda c: g(c, 'LayoutOrder', 0))
        elif so == 'Name':
            vis.sort(key=lambda c: g(c, 'Name', ''))
    if lista:
        pad = ud(lista.get('Padding', {'u': [0, 0]}))
        horiz = g(lista, 'FillDirection', 'Vertical') == 'Horizontal'
        tams = [medir(c, cw, ch) for c in vis]
        tot = sum(t[0] if horiz else t[1] for t in tams) + max(0, len(vis) - 1) * (pad[1] + pad[0] * (cw if horiz else ch))
        ha = g(lista, 'HorizontalAlignment', 'Left'); va = g(lista, 'VerticalAlignment', 'Top')
        px = cx + ((cw - tot) / 2 if horiz and ha == 'Center' else ((cw - tot) if horiz and ha == 'Right' else 0))
        py = cy + ((ch - tot) / 2 if not horiz and va == 'Center' else ((ch - tot) if not horiz and va == 'Bottom' else 0))
        for c, (w2, h2) in zip(vis, tams):
            if horiz:
                yy = cy + ((ch - h2) / 2 if va == 'Center' else ((ch - h2) if va == 'Bottom' else 0))
                colocar(c, px, yy, w2, h2, clip); px += w2 + pad[1] + pad[0] * cw
            else:
                xx = cx + ((cw - w2) / 2 if ha == 'Center' else ((cw - w2) if ha == 'Right' else 0))
                colocar(c, xx, py, w2, h2, clip); py += h2 + pad[1] + pad[0] * ch
        return
    if rej:
        cs = g(rej, 'CellSize', [0, 100, 0, 100]); cp = g(rej, 'CellPadding', [0, 5, 0, 5])
        w2, h2 = cw * cs[0] + cs[1], ch * cs[2] + cs[3]
        gx, gy = cw * cp[0] + cp[1], ch * cp[2] + cp[3]
        por_fila = max(1, int((cw + gx) // (w2 + gx)))
        for k, c in enumerate(vis):
            colocar(c, cx + (k % por_fila) * (w2 + gx), cy + (k // por_fila) * (h2 + gy), w2, h2, clip)
        return
    for c in sorted(hs, key=lambda c: g(c, 'ZIndex', 1)):
        w2, h2 = medir(c, cw, ch)
        pos = g(c, 'Position', [0, 0, 0, 0]); an = g(c, 'AnchorPoint', {'v': [0, 0]})['v']
        colocar(c, cx + cw * pos[0] + pos[1] - an[0] * w2, cy + ch * pos[2] + pos[3] - an[1] * h2, w2, h2, clip)

# Cada ScreenGui: con su UIScale se dibuja en un lienzo virtual y se escala
base = Image.open(fondo).convert('RGBA').resize((VW, VH)) if fondo else Image.new('RGBA', (VW, VH), (70, 90, 110, 255))
for sg in [nodos[i] for i in orden if nodos[i]['clase'] == 'ScreenGui' and nodos[i]['padre'] == 0]:
    if not g(sg, 'Enabled', True):
        continue
    esc = hijo(sg, 'UIScale')
    s = g(esc, 'Scale', 1) if esc else 1
    lw, lh = int(VW / s), int(VH / s)
    lienzo = Image.new('RGBA', (lw, lh), (0, 0, 0, 0))
    hs = gui_hijos(sg)
    hs.sort(key=lambda c: g(c, 'ZIndex', 1))
    for c in hs:
        w2, h2 = medir(c, lw, lh)
        pos = g(c, 'Position', [0, 0, 0, 0]); an = g(c, 'AnchorPoint', {'v': [0, 0]})['v']
        colocar(c, lw * pos[0] + pos[1] - an[0] * w2, lh * pos[2] + pos[3] - an[1] * h2, w2, h2, None)
    base.alpha_composite(lienzo.resize((VW, VH), Image.LANCZOS))
base.convert('RGB').save(nombre + '.png')
print(nombre, len(nodos), 'nodos')
