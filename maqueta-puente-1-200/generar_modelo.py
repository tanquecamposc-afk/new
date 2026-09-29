"""
Genera el modelo 3D de la maqueta del paso a desnivel (intercambio vial)
a escala 1/200, listo para importar en Tinkercad.

Todas las medidas de diseño están en METROS REALES; al exportar se
convierten a milímetros de maqueta:  1 m real = 1000/200 = 5 mm.

Salida (carpeta ./salida):
  - maqueta_color.obj + maqueta_color.mtl  (con colores; OBJ + vertex colors)
  - maqueta_color.zip                      (obj + mtl juntos para subir)
  - maqueta_completa.stl                   (todo en una pieza, sin color)
  - piezas_stl/*.stl                       (una pieza por color, alineadas)
"""
import os
import zipfile
import numpy as np
import trimesh
from shapely.geometry import Point, Polygon, box
from shapely import affinity

ESCALA = 1000.0 / 200.0          # mm de maqueta por metro real
BASE_MM = 3.0                    # espesor de la plancha base (mm de maqueta)
ASFALTO_MM = 0.4                 # capa de asfalto sobre la base
Z0 = (BASE_MM + ASFALTO_MM) / ESCALA   # nivel de calle en metros "equivalentes"

# ---------------------------------------------------------------- geometría
ANCHO, LARGO = 100.0, 120.0      # terreno 100 m x 120 m -> 500 x 600 mm
BORDE_VIA = 11.0                 # semiancho de cada avenida (2 carriles + berma)
BERMA_C = 2.5                    # semiancho de la berma central
H_PUENTE = 6.0                   # rasante del puente (5 m gálibo + 1 m tablero)
X_ESTRIBO = 13.0                 # inicio de estribos (vano libre 26 m)
X_RAMPA = 36.0                   # donde la rampa llega al nivel de calle
R_ESQUINA = 25.0                 # radio de las esquinas curvas de los lotes

COLORES = {
    "base":      (0.55, 0.42, 0.30),
    "asfalto":   (0.08, 0.08, 0.09),
    "lote":      (0.70, 0.52, 0.38),
    "berma":     (0.12, 0.40, 0.30),
    "linea":     (0.97, 0.97, 0.95),
    "baranda":   (0.93, 0.88, 0.76),
    "terraplen": (0.52, 0.40, 0.28),
    "isla":      (0.25, 0.38, 0.14),
    "arbusto":   (0.42, 0.52, 0.16),
    "arbusto2":  (0.28, 0.42, 0.12),
    "copa":      (0.13, 0.50, 0.22),
    "tronco":    (0.45, 0.32, 0.18),
    "poste":     (0.92, 0.92, 0.90),
    "auto":      (1.00, 1.00, 1.00),
}
piezas = {k: [] for k in COLORES}
rng = np.random.default_rng(7)


def rasante(x):
    """Altura (m) de la vía E-O sobre el nivel de calle."""
    ax = np.abs(x)
    if ax <= X_ESTRIBO:
        return H_PUENTE
    if ax >= X_RAMPA:
        return 0.0
    t = (ax - X_ESTRIBO) / (X_RAMPA - X_ESTRIBO)
    return H_PUENTE * (1 + np.cos(np.pi * t)) / 2


def losa(poly, z_bot, z_top, color):
    """Extruye un polígono 2D (m) entre dos alturas (m sobre nivel de calle)."""
    if poly.is_empty:
        return
    geoms = getattr(poly, "geoms", [poly])
    for g in geoms:
        m = trimesh.creation.extrude_polygon(g, z_top - z_bot)
        m.apply_translation([0, 0, z_bot])
        piezas[color].append(m)


def barrido(x0, x1, y0, y1, fbot, ftop, color, n=60):
    """Bloque que sigue la rasante a lo largo de x (terraplén, barandas...)."""
    xs = np.linspace(x0, x1, n)
    V = []
    for x in xs:
        b, t = fbot(x), ftop(x)
        V += [[x, y0, b], [x, y1, b], [x, y1, t], [x, y0, t]]
    V = np.array(V)
    F = []
    for i in range(n - 1):
        a, c = 4 * i, 4 * (i + 1)
        for k in range(4):
            k2 = (k + 1) % 4
            F += [[a + k, c + k, c + k2], [a + k, c + k2, a + k2]]
    F += [[0, 2, 1], [0, 3, 2]]
    e = 4 * (n - 1)
    F += [[e, e + 1, e + 2], [e, e + 2, e + 3]]
    m = trimesh.Trimesh(V, F, process=True)
    m.fix_normals()
    piezas[color].append(m)


def caja(cx, cy, cz, sx, sy, sz, color, rot=0.0):
    m = trimesh.creation.box([sx, sy, sz])
    m.apply_transform(trimesh.transformations.rotation_matrix(rot, [0, 0, 1]))
    m.apply_translation([cx, cy, cz + sz / 2])
    piezas[color].append(m)


def espejos(poly):
    """Devuelve el polígono en los 4 cuadrantes."""
    return [poly,
            affinity.scale(poly, -1, 1, origin=(0, 0)),
            affinity.scale(poly, 1, -1, origin=(0, 0)),
            affinity.scale(poly, -1, -1, origin=(0, 0))]


# ------------------------------------------------------------- base + asfalto
terreno = box(-ANCHO / 2, -LARGO / 2, ANCHO / 2, LARGO / 2)
losa(terreno, -Z0, -ASFALTO_MM / ESCALA, "base")
losa(terreno, -ASFALTO_MM / ESCALA, 0.0, "asfalto")

# ------------------------------------------------------ lotes (cartón marrón)
b, r = BORDE_VIA, R_ESQUINA
lote_ne = box(b, b, ANCHO / 2, LARGO / 2)
filete = box(b, b, b + r, b + r).difference(Point(b + r, b + r).buffer(r, 128))
lote_ne = lote_ne.difference(filete)
for p in espejos(lote_ne):
    losa(p, 0.0, 0.4, "lote")

# ------------------------------------ islas triangulares con arbustos y poste
# Arco interior que pasa por (b, b+22) y (b+22, b): deja un carril de giro
d = 22.0
c = np.linspace(b + d, b + 200, 4000)
r2 = np.sqrt((c - b) ** 2 + (c - b - d) ** 2)
prof = (c - b) * np.sqrt(2) - r2          # distancia de la esquina al arco
ci = c[np.argmin(np.abs(prof - 7.0))]
ri = np.sqrt((ci - b) ** 2 + (ci - b - d) ** 2)
isla_ne = box(b, b, b + d, b + d).difference(Point(ci, ci).buffer(ri, 256))
isla_ne = isla_ne.buffer(-0.3).buffer(0.3)
for p in espejos(isla_ne):
    losa(p, 0.0, 0.3, "isla")
    minx, miny, maxx, maxy = p.bounds
    colocados = 0
    while colocados < 70:
        x, y = rng.uniform(minx, maxx), rng.uniform(miny, maxy)
        rad = rng.uniform(0.9, 1.6)
        if not p.buffer(-rad * 0.6).contains(Point(x, y)):
            continue
        s = trimesh.creation.icosphere(1, rad)
        s.apply_scale([1, 1, 0.8])
        s.apply_translation([x, y, 0.3 + rad * 0.55])
        piezas["arbusto" if colocados % 2 else "arbusto2"].append(s)
        colocados += 1

# postes de alumbrado en cada isla (brazo apuntando hacia el puente/vía)
for sx in (1, -1):
    for sy in (1, -1):
        px, py = sx * 15.5, sy * 15.0
        poste = trimesh.creation.cylinder(0.18, 10.0, sections=12)
        poste.apply_translation([px, py, 0.3 + 5.0])
        piezas["poste"].append(poste)
        ang = np.arctan2(-sy, -sx)
        brazo = trimesh.creation.box([2.4, 0.2, 0.2])
        brazo.apply_translation([1.1, 0, 0])
        brazo.apply_transform(trimesh.transformations.rotation_matrix(ang, [0, 0, 1]))
        brazo.apply_translation([px, py, 10.2])
        piezas["poste"].append(brazo)
        lamp = trimesh.creation.box([1.0, 0.45, 0.3])
        lamp.apply_translation([2.3, 0, 0])
        lamp.apply_transform(trimesh.transformations.rotation_matrix(ang, [0, 0, 1]))
        lamp.apply_translation([px, py, 10.0])
        piezas["poste"].append(lamp)


def arbol(x, y, z):
    tronco = trimesh.creation.cylinder(0.25, 3.0, sections=8)
    tronco.apply_translation([x, y, z + 1.5])
    piezas["tronco"].append(tronco)
    copa = trimesh.creation.icosphere(1, 1.0)
    copa.apply_scale([1.7, 1.7, 2.6])
    copa.apply_translation([x, y, z + 3.0 + 2.2])
    piezas["copa"].append(copa)


# --------------------------------------- avenida N-S (a nivel, pasa por abajo)
Y_BERMA = 12.0
for s in (1, -1):
    y_a, y_b = sorted([s * Y_BERMA, s * LARGO / 2])
    losa(box(-BERMA_C, y_a, BERMA_C, y_b), 0.0, 0.2, "berma")
    for y in np.arange(Y_BERMA + 3.0, LARGO / 2 - 1, 6.5):
        arbol(0.0, s * y, 0.2)
    # línea divisoria de carriles en cada calzada
    for lx in (6.75, -6.75):
        y_a, y_b = sorted([s * (Y_BERMA + 3.0), s * LARGO / 2])
        losa(box(lx - 0.15, y_a, lx + 0.15, y_b), 0.0, 0.02, "linea")
    # cruce peatonal (cebra) junto al puente
    for cx in (1, -1):
        xs = np.linspace(BERMA_C + 0.9, BORDE_VIA - 0.9, 5)
        for x in xs:
            y_a, y_b = sorted([s * (Y_BERMA + 0.2), s * (Y_BERMA + 2.4)])
            losa(box(cx * x - 0.55, y_a, cx * x + 0.55, y_b), 0.0, 0.02, "linea")

# --------------------------------------- avenida E-O (rampas + puente)
for sx in (1, -1):
    # berma central a nivel de calle
    x_a, x_b = sorted([sx * X_RAMPA, sx * ANCHO / 2])
    losa(box(x_a, -BERMA_C, x_b, BERMA_C), 0.0, 0.2, "berma")
    for x in np.arange(X_RAMPA + 2.0, ANCHO / 2 - 1, 5.0):
        arbol(sx * x, 0.0, 0.2)
    for ly in (6.75, -6.75):
        losa(box(x_a, ly - 0.15, x_b, ly + 0.15), 0.0, 0.02, "linea")

    # terraplén de cada rampa (cuerpo + carpeta asfáltica + berma elevada)
    x_a, x_b = sorted([sx * X_ESTRIBO, sx * X_RAMPA])
    barrido(x_a, x_b, -BORDE_VIA, BORDE_VIA,
            lambda x: 0.0, lambda x: max(rasante(x) - 0.15, 0.0), "terraplen")
    for y0, y1 in ((BERMA_C, BORDE_VIA), (-BORDE_VIA, -BERMA_C)):
        barrido(x_a, x_b, y0, y1,
                lambda x: max(rasante(x) - 0.15, 0.0), lambda x: rasante(x) + 0.01, "asfalto")
    barrido(x_a, x_b, -BERMA_C, BERMA_C,
            lambda x: max(rasante(x) - 0.15, 0.0), lambda x: rasante(x) + 0.2, "berma")
    for x in np.arange(X_ESTRIBO + 3.0, X_RAMPA - 2, 5.0):
        arbol(sx * x, 0.0, rasante(x) + 0.2)

# tablero del puente (dos calzadas separadas, vacío al centro)
for y0, y1 in ((BERMA_C, BORDE_VIA), (-BORDE_VIA, -BERMA_C)):
    barrido(-X_ESTRIBO, X_ESTRIBO, y0, y1,
            lambda x: H_PUENTE - 1.0, lambda x: H_PUENTE - 0.15, "terraplen", n=2)
    barrido(-X_ESTRIBO, X_ESTRIBO, y0, y1,
            lambda x: H_PUENTE - 0.15, lambda x: H_PUENTE + 0.01, "asfalto", n=2)

# líneas de carril y barandas a lo largo de rampas + puente
for ly in (6.75, -6.75):
    barrido(-X_RAMPA, X_RAMPA, ly - 0.15, ly + 0.15,
            lambda x: rasante(x), lambda x: rasante(x) + 0.03, "linea", n=160)
for yb in (BORDE_VIA - 0.3, BERMA_C, -BERMA_C - 0.3, -BORDE_VIA):
    barrido(-X_RAMPA + 1.5, X_RAMPA - 1.5, yb, yb + 0.3,
            lambda x: rasante(x), lambda x: rasante(x) + 1.0, "baranda", n=160)

# ------------------------------------------------------------------- autos
def auto(x, y, rumbo, z=0.0):
    ang = np.radians(rumbo)
    pend = 0.0
    if abs(np.cos(ang)) > 0.9:          # autos sobre la vía E-O siguen la rampa
        h = 0.2
        pend = np.arctan2(rasante(x + h) - rasante(x - h), 2 * h) * np.sign(np.cos(ang))
    cuerpo = trimesh.creation.box([4.4, 1.8, 0.8])
    cuerpo.apply_translation([0, 0, 0.55])
    cabina = trimesh.creation.box([2.3, 1.6, 0.6])
    cabina.apply_translation([-0.3, 0, 1.25])
    m = trimesh.util.concatenate([cuerpo, cabina])
    m.apply_transform(trimesh.transformations.rotation_matrix(-pend, [0, 1, 0]))
    m.apply_transform(trimesh.transformations.rotation_matrix(ang, [0, 0, 1]))
    m.apply_translation([x, y, z])
    piezas["auto"].append(m)


for (x, y, rumbo) in [
    (-6.5, 49, 270), (7.0, 25, 90), (-7.0, -26, 270), (8.5, -42, 95),
    (-44, 8.8, 180), (8.0, 8.8, 180), (39, 8.8, 180),
    (-7.5, -4.5, 0), (-38, -8.5, 0), (45, -4.5, 0),
]:
    z = rasante(x) + 0.01 if abs(y) < BORDE_VIA else 0.0
    auto(x, y, rumbo, z)

# ------------------------------------------------------------------ exportar
salida = os.path.join(os.path.dirname(os.path.abspath(__file__)), "salida")
os.makedirs(os.path.join(salida, "piezas_stl"), exist_ok=True)

mallas = {}
for nombre, lista in piezas.items():
    if not lista:
        continue
    m = trimesh.util.concatenate(lista)
    m.apply_translation([0, 0, Z0])       # la base apoya en z = 0
    m.apply_scale(ESCALA)                 # metros reales -> mm de maqueta
    mallas[nombre] = m

todo = trimesh.util.concatenate(list(mallas.values()))
lo, hi = todo.bounds
print("Tamaño maqueta (mm):", np.round(hi - lo, 1), "triángulos:", len(todo.faces))

# STL completo (sin color)
todo.export(os.path.join(salida, "maqueta_completa.stl"))

# STL por color: cada archivo lleva dos cubitos "ancla" de 0.2 mm en las
# esquinas extremas para que Tinkercad los centre igual y queden alineados.
for nombre, m in mallas.items():
    anclas = []
    for p in (lo, hi):
        a = trimesh.creation.box([0.2, 0.2, 0.2])
        a.apply_translation(np.clip(p, lo + 0.1, hi - 0.1))
        anclas.append(a)
    trimesh.util.concatenate([m] + anclas).export(
        os.path.join(salida, "piezas_stl", f"{nombre}.stl"))

# OBJ con colores: materiales (usemtl / .mtl) + color por vértice
obj = os.path.join(salida, "maqueta_color.obj")
mtl = os.path.join(salida, "maqueta_color.mtl")
with open(mtl, "w") as f:
    for nombre in mallas:
        r_, g_, b_ = COLORES[nombre]
        f.write(f"newmtl {nombre}\nKa 0 0 0\nKd {r_:.3f} {g_:.3f} {b_:.3f}\n"
                f"Ks 0 0 0\nd 1\nillum 1\n\n")
with open(obj, "w") as f:
    f.write("# Maqueta paso a desnivel - escala 1/200 - unidades: mm\n")
    f.write("mtllib maqueta_color.mtl\n")
    off = 1
    for nombre, m in mallas.items():
        r_, g_, b_ = COLORES[nombre]
        f.write(f"o {nombre}\n")
        for v in m.vertices:
            f.write(f"v {v[0]:.3f} {v[1]:.3f} {v[2]:.3f} {r_:.3f} {g_:.3f} {b_:.3f}\n")
        f.write(f"usemtl {nombre}\n")
        for fc in m.faces + off:
            f.write(f"f {fc[0]} {fc[1]} {fc[2]}\n")
        off += len(m.vertices)
with zipfile.ZipFile(os.path.join(salida, "maqueta_color.zip"), "w",
                     zipfile.ZIP_DEFLATED) as z:
    z.write(obj, "maqueta_color.obj")
    z.write(mtl, "maqueta_color.mtl")

print("Listo ->", salida)
