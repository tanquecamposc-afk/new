"""Dibuja las escenas volcadas por captura.luau: mallas con la textura del atlas y el color de vértice
(tal como las crea el cliente de Roblox), piezas sueltas como cajas y carteles de texto."""
import sys, math
import numpy as np
from PIL import Image, ImageDraw, ImageFont

W, H = 1280, 720
imgs = {}
escenas = []
cur = None
for line in open(sys.argv[1], 'r', errors='replace'):
    if line.startswith('IMG '):
        _, i, w, h, hx = line.split(' ', 4)
        a = np.frombuffer(bytes.fromhex(hx.strip()), dtype=np.uint8).reshape(int(h), int(w), 4)
        imgs[int(i)] = a.astype(np.float32) / 255
    elif line.startswith('ESCENA '):
        p = line.split()
        cur = {'nombre': p[1], 'cam': np.array(list(map(float, p[2:5]))), 'mira': np.array(list(map(float, p[5:8]))),
               'fov': float(p[8]), 'T': [], 'B': [], 'L': []}
        escenas.append(cur)
    elif line.startswith('T ') and cur:
        cur['T'].append(line.split()[1:])
    elif line.startswith('B ') and cur:
        cur['B'].append(line.split()[1:])
    elif line.startswith('L ') and cur:
        p = line.rstrip('\n').split(' ', 7)
        cur['L'].append((np.array(list(map(float, p[1:4]))), tuple(int(float(c) * 255) for c in p[4:7]), p[7]))

solo = sys.argv[2:3] if len(sys.argv) > 2 else None
# Cámara a mano: render.py volcado escena cx cy cz mx my mz fov salida
if len(sys.argv) > 9:
    for E in escenas:
        if E['nombre'] == sys.argv[2]:
            E['cam'] = np.array(list(map(float, sys.argv[3:6]))); E['mira'] = np.array(list(map(float, sys.argv[6:9])))
            E['fov'] = float(sys.argv[9]); E['nombre'] = sys.argv[10]
    solo = [sys.argv[10]]

def caja_tris(p):
    c = np.array(list(map(float, p[0:3]))); r = np.array(list(map(float, p[3:12]))).reshape(3, 3)
    s = np.array(list(map(float, p[12:15]))) / 2; col = np.array(list(map(float, p[15:18]))); tr = float(p[18])
    tris = []
    caras = [((1, 0, 0), 0.8), ((-1, 0, 0), 0.8), ((0, 1, 0), 1.0), ((0, -1, 0), 0.5), ((0, 0, 1), 0.65), ((0, 0, -1), 0.65)]
    for n, sh in caras:
        n = np.array(n, float)
        a = [i for i in range(3) if n[i] == 0]
        cs = []
        for u, v in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
            q = n * s
            q = q.copy(); q[a[0]] = u * s[a[0]]; q[a[1]] = v * s[a[1]]
            cs.append(c + r @ q)
        for t in ((0, 1, 2), (0, 2, 3)):
            tris.append(([cs[k] for k in t], col * sh, tr))
    return tris

for E in escenas:
    if solo and E['nombre'] not in solo:
        continue
    cam, mira = E['cam'], E['mira']
    f = mira - cam; f /= np.linalg.norm(f)
    up = np.array([0, 1, 0.0]); rgt = np.cross(f, up); rgt /= np.linalg.norm(rgt); u = np.cross(rgt, f)
    foc = (H / 2) / math.tan(math.radians(E['fov']) / 2)
    # Cielo
    img = np.zeros((H, W, 3), np.float32)
    g = np.linspace(0, 1, H)[:, None]
    img[:] = (np.array([0.45, 0.65, 0.95]) * (1 - g) + np.array([0.78, 0.86, 0.98]) * g)[:, None, :][:, 0, :][:, None, :]
    z = np.full((H, W), np.inf, np.float32)

    def proy(P):
        d = P - cam
        x, y, w = d @ rgt, d @ u, d @ f
        return x, y, w

    def raster(V, UV, C, tex, flat=None, alfa=1.0):
        x, y, w = proy(V)
        if np.any(w < 0.3):
            return
        sx = W / 2 + foc * x / w; sy = H / 2 - foc * y / w
        x0, x1 = max(int(np.floor(sx.min())), 0), min(int(np.ceil(sx.max())), W - 1)
        y0, y1 = max(int(np.floor(sy.min())), 0), min(int(np.ceil(sy.max())), H - 1)
        if x0 > x1 or y0 > y1 or (x1 - x0) * (y1 - y0) > 2_000_000:
            return
        den = (sy[1] - sy[2]) * (sx[0] - sx[2]) + (sx[2] - sx[1]) * (sy[0] - sy[2])
        if abs(den) < 1e-9:
            return
        X, Y = np.meshgrid(np.arange(x0, x1 + 1) + 0.5, np.arange(y0, y1 + 1) + 0.5)
        l0 = ((sy[1] - sy[2]) * (X - sx[2]) + (sx[2] - sx[1]) * (Y - sy[2])) / den
        l1 = ((sy[2] - sy[0]) * (X - sx[2]) + (sx[0] - sx[2]) * (Y - sy[2])) / den
        l2 = 1 - l0 - l1
        m = (l0 >= -1e-4) & (l1 >= -1e-4) & (l2 >= -1e-4)
        if not m.any():
            return
        iw = l0 / w[0] + l1 / w[1] + l2 / w[2]
        prof = 1 / iw
        zb = z[y0:y1 + 1, x0:x1 + 1]
        m &= prof < zb
        if not m.any():
            return
        if tex is not None:
            uu = (l0 * UV[0, 0] / w[0] + l1 * UV[1, 0] / w[1] + l2 * UV[2, 0] / w[2]) * prof
            vv = (l0 * UV[0, 1] / w[0] + l1 * UV[1, 1] / w[1] + l2 * UV[2, 1] / w[2]) * prof
            th, tw = tex.shape[:2]
            tx = np.clip((uu * tw).astype(int), 0, tw - 1); ty = np.clip((vv * th).astype(int), 0, th - 1)
            t = tex[ty, tx]
            m &= t[..., 3] > 0.5
            col = t[..., :3]
            cc = (l0[..., None] * C[0] / w[0] + l1[..., None] * C[1] / w[1] + l2[..., None] * C[2] / w[2]) * prof[..., None]
            col = col * cc
        elif flat is None:
            col = (l0[..., None] * C[0] / w[0] + l1[..., None] * C[1] / w[1] + l2[..., None] * C[2] / w[2]) * prof[..., None]
        else:
            col = np.broadcast_to(flat, (y1 - y0 + 1, x1 - x0 + 1, 3))
        reg = img[y0:y1 + 1, x0:x1 + 1]
        if alfa < 1:
            reg[m] = reg[m] * (1 - alfa) + col[m] * alfa
        else:
            reg[m] = col[m]
            zb[m] = prof[m]

    for t in E['T']:
        ii = int(t[0]); v = np.array(list(map(float, t[1:]))).reshape(3, 8)
        raster(v[:, 0:3], v[:, 3:5], v[:, 5:8], imgs.get(ii))
    for b in E['B']:
        for tri, col, tr in caja_tris(b):
            if tr < 0.95:
                raster(np.array(tri), None, None, None, flat=col, alfa=1 - tr)
    # Niebla suave según la distancia
    fin = np.isfinite(z)
    k = np.clip((z - 150) / 900, 0, 0.55)[..., None]
    img = np.where(fin[..., None], img * (1 - k) + np.array([0.75, 0.84, 0.97]) * k, img)
    out = Image.fromarray((np.clip(img, 0, 1) * 255).astype(np.uint8))
    d = ImageDraw.Draw(out)
    try:
        fnt = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf', 13)
    except Exception:
        fnt = ImageFont.load_default()
    for p, col, txt in E['L']:
        x, y, w = proy(p)
        if w < 0.5:
            continue
        sx, sy = W / 2 + foc * x / w, H / 2 - foc * y / w
        if 0 <= sx < W and 0 <= sy < H and w < 120:
            tw = d.textlength(txt, font=fnt)
            d.rectangle([sx - tw / 2 - 3, sy - 9, sx + tw / 2 + 3, sy + 8], fill=(0, 0, 0))
            d.text((sx - tw / 2, sy - 8), txt, fill=col, font=fnt)
    out.save(E['nombre'] + '.png')
    print(E['nombre'], len(E['T']), 'triángulos', len(E['B']), 'cajas', len(E['L']), 'carteles')
