"""
Reto 14 · Soporte desmontable para celular (Tinkercad + Cura/Bambu Studio)

Dos piezas que se ensamblan sin pegamento:
  1) BASE: plancha con tope delantero, 2 ranuras inclinadas y 2 cuñas de apoyo.
  2) RESPALDO: placa inclinada a 65° con 2 pestañas que entran en las ranuras.
Extra: probeta de holgura + llave para la prueba de ajuste (imprimir primero).

Límite del reto: 80 x 80 x 60 mm, PLA, <= 90 min.  Unidades: mm.
"""
import os
import numpy as np
import trimesh
from shapely.geometry import box as rect, Polygon

# ----------------------------------------------------------------- medidas
ANG = np.radians(65)                  # inclinación del respaldo
BASE_X, BASE_Y, T = 68, 62, 4         # base 68 x 62 mm, 4 mm de espesor
LABIO_Y, LABIO_Z, MUESCA = 4, 8, 16   # tope delantero y paso del cable
Y_RESP = -15                          # canal para el celular: 12 mm
RESP_X, RESP_L, RESP_E = 62, 58, 3   # respaldo: ancho, largo inclinado, espesor
PESTANAS = [(-21, -7), (7, 21)]       # pestañas de 14 mm
HOLGURA = 0.2                         # juego por lado (ajustar con la probeta)
CUNAS = [(-31, -26), (26, 31)]        # cuñas de apoyo detrás del respaldo
CUNA_H = 24

c, s = np.cos(ANG), np.sin(ANG)
B = trimesh.boolean


def marco_respaldo():
    """Sistema local del respaldo: u=ancho, v=sube por la inclinación,
    w=espesor hacia atrás. Origen: arista inferior delantera."""
    M = np.eye(4)
    M[:3, 0], M[:3, 1], M[:3, 2] = [1, 0, 0], [0, c, s], [0, s, -c]
    M[:3, 3] = [0, Y_RESP, T]
    return M


def placa_local(poly_uv, w0, w1):
    m = trimesh.creation.extrude_polygon(poly_uv, w1 - w0)
    m.apply_translation([0, 0, w0])
    m.apply_transform(marco_respaldo())
    return m


def prisma_lateral(perfil_yz, x0, x1):
    m = trimesh.creation.extrude_polygon(Polygon(perfil_yz), x1 - x0)
    m.vertices = m.vertices[:, [2, 0, 1]] + [x0, 0, 0]
    m.fix_normals()
    return m


def caja(x0, y0, z0, x1, y1, z1):
    return trimesh.creation.box(bounds=[[x0, y0, z0], [x1, y1, z1]])


# --------------------------------------------------------------------- BASE
contorno = rect(-BASE_X / 2, -BASE_Y / 2, BASE_X / 2, BASE_Y / 2).buffer(-5).buffer(5)
ventana_base = rect(-20, 0, 20, 25).buffer(-6).buffer(6)
paso_cable = rect(-MUESCA / 2, -BASE_Y / 2 - 1, MUESCA / 2, -20).buffer(-3).buffer(3)
plancha = trimesh.creation.extrude_polygon(
    contorno.difference(ventana_base).difference(paso_cable), T)

y0 = -BASE_Y / 2
perfil_labio = [(y0, 0), (y0 + LABIO_Y, 0), (y0 + LABIO_Y, T + LABIO_Z),
                (y0 + 1.2, T + LABIO_Z), (y0, T + LABIO_Z - 1.2)]
labio = [prisma_lateral(perfil_labio, a, b)
         for a, b in [(-BASE_X / 2 + 5, -MUESCA / 2), (MUESCA / 2, BASE_X / 2 - 5)]]

# la cara inclinada de cada cuña copia la espalda del respaldo (+ holgura)
y_esp = Y_RESP + RESP_E * s + RESP_E * c / np.tan(ANG) + HOLGURA
d = CUNA_H / np.tan(ANG)
perfil_cuna = [(y_esp, 0), (y_esp, T), (y_esp + d, T + CUNA_H),
               (y_esp + d + 3, T + CUNA_H), (y_esp + d + 13, 0)]
cunas = [prisma_lateral(perfil_cuna, a, b) for a, b in CUNAS]

base = B.union([plancha] + labio + cunas)
ranuras = [placa_local(rect(a - HOLGURA, -20, b + HOLGURA, 2), -HOLGURA, RESP_E + HOLGURA)
           for a, b in PESTANAS]
base = B.difference([base] + ranuras)

# ----------------------------------------------------------------- RESPALDO
perfil = rect(-RESP_X / 2, -20, RESP_X / 2, RESP_L).buffer(-8).buffer(8)   # puntas redondeadas
perfil = perfil.intersection(rect(-RESP_X / 2, -2, RESP_X / 2, RESP_L))
perfil = perfil.difference(rect(-16, 12, 16, 46).buffer(-8).buffer(8))
placa = placa_local(perfil, 0, RESP_E)
placa = B.intersection([placa, caja(-50, -50, T, 50, 50, 100)])      # pisa la base
pestanas = [placa_local(rect(a, -10, b, 1), 0, RESP_E) for a, b in PESTANAS]
pestanas = [B.intersection([p, caja(-50, -50, 0.4, 50, 50, 100)]) for p in pestanas]
respaldo = B.union([placa] + pestanas)

# respaldo acostado (cara delantera abajo) para imprimir sin soportes
respaldo_imp = respaldo.copy()
respaldo_imp.apply_transform(np.linalg.inv(marco_respaldo()))
respaldo_imp.apply_transform(trimesh.transformations.rotation_matrix(np.pi, [0, 1, 0]))
respaldo_imp.apply_translation(-respaldo_imp.bounds[0])

# ------------------------------------------------- prueba de ajuste (probeta)
anch, esp = PESTANAS[0][1] - PESTANAS[0][0], RESP_E
probeta = caja(0, 0, 0, 60, 10, 4)
holguras = [0.1, 0.2, 0.3]
for i, h in enumerate(holguras):
    cx = 10 + i * 20
    probeta = B.difference([probeta, caja(cx - anch / 2 - h, 5 - esp / 2 - h, -1,
                                          cx + anch / 2 + h, 5 + esp / 2 + h, 7)])
    for k in range(i + 1):                 # marcas: 1, 2 y 3 rayas
        probeta = B.difference([probeta, caja(cx - 3 + k * 2.5, -1, 3.4,
                                              cx - 2 + k * 2.5, 1.2, 7)])
llave = caja(0, 0, 0, anch, esp, 10)

# ----------------------------------------------------------------- chequeos
ens = trimesh.util.concatenate([base, respaldo])
print("Ensamblado (mm):", np.round(ens.extents, 1), "(límite 80 x 80 x 60)")
for n, m in (("base", base), ("respaldo", respaldo_imp), ("probeta", probeta), ("llave", llave)):
    print(f"  {n:9s} estanco={m.is_watertight}  {np.round(m.extents, 1)} mm  "
          f"vol={m.volume / 1000:5.1f} cm3  ~{m.volume / 1000 * 1.24:4.1f} g si fuera macizo")
choque = B.intersection([base, respaldo])
print("Interferencia base/respaldo:", 0 if len(choque.faces) == 0 else round(choque.volume, 3), "mm3")

# ----------------------------------------------------------------- exportar
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "salida")
os.makedirs(out, exist_ok=True)
base.export(os.path.join(out, "1_base.stl"))
respaldo_imp.export(os.path.join(out, "2_respaldo.stl"))
ens.export(os.path.join(out, "soporte_ensamblado.stl"))
probeta.export(os.path.join(out, "prueba_probeta_holgura.stl"))
llave.export(os.path.join(out, "prueba_llave.stl"))

colores = {"base": (0.13, 0.36, 0.65), "respaldo": (0.96, 0.62, 0.10)}
with open(os.path.join(out, "soporte_color.mtl"), "w") as f:
    for k, (r, g, b) in colores.items():
        f.write(f"newmtl {k}\nKd {r} {g} {b}\nKa 0 0 0\nd 1\nillum 1\n\n")
with open(os.path.join(out, "soporte_color.obj"), "w") as f:
    f.write("mtllib soporte_color.mtl\n")
    off = 1
    for k, m in (("base", base), ("respaldo", respaldo)):
        r, g, b = colores[k]
        f.write(f"o {k}\n")
        for v in m.vertices:
            f.write(f"v {v[0]:.3f} {v[1]:.3f} {v[2]:.3f} {r} {g} {b}\n")
        f.write(f"usemtl {k}\n")
        for fc in m.faces + off:
            f.write(f"f {fc[0]} {fc[1]} {fc[2]}\n")
        off += len(m.vertices)
print("Listo ->", out)
